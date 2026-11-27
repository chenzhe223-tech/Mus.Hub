import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  ExternalLink,
  Headphones,
  Loader2,
  Mic,
  Radio,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import type { Song } from '../types';
import { ensureExternalLinks, searchUniversalMusic } from '../utils/musicSearch';
import { CURATED_SONGS } from '../data/curated';

interface RecognizeModalProps {
  open: boolean;
  onClose: () => void;
  onApplySong: (song: Song) => void;
  showToast: (msg: string) => void;
}

type RecognizePhase = 'idle' | 'listening' | 'analyzing' | 'matched' | 'unconfigured' | 'nomatch';

interface RecognizeApiResponse {
  configured?: boolean;
  matched?: boolean;
  provider?: string;
  score?: number;
  message?: string;
  error?: string;
  track?: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: string;
    cover: string;
    previewUrl: string | null;
    source: Song['source'];
    externalUrl?: string;
    externalLinks?: Song['externalLinks'];
    neteaseId?: string;
    qqMid?: string;
  };
}

const LISTEN_SECONDS = 7;

export const RecognizeModal: React.FC<RecognizeModalProps> = ({
  open,
  onClose,
  onApplySong,
  showToast,
}) => {
  const [phase, setPhase] = useState<RecognizePhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);
  const [micLevel, setMicLevel] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    '点击下方按钮，将手机或电脑靠近正在播放音乐的音源（支持原曲与哼唱）'
  );
  const [matchedSong, setMatchedSong] = useState<Song | null>(null);
  const [matchScore, setMatchScore] = useState<number>(96);
  const [providerInfo, setProviderInfo] = useState<{ configured: boolean; provider: string }>({
    configured: false,
    provider: 'none',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!open) {
      cleanupAudio();
      return;
    }
    setPhase('idle');
    setMatchedSong(null);
    setSecondsLeft(LISTEN_SECONDS);
    setStatusMessage('点击下方按钮，将麦克风靠近正在播放音乐的音源（支持原曲外放与哼唱）');

    void fetch('/api/recognize/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { configured?: boolean; provider?: string } | null) => {
        if (d) {
          setProviderInfo({
            configured: Boolean(d.configured),
            provider: d.provider || 'none',
          });
        }
      })
      .catch(() => {});

    return () => {
      cleanupAudio();
    };
  }, [open]);

  const cleanupAudio = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  };

  const submitAudioBlob = async (blob: Blob) => {
    setPhase('analyzing');
    setStatusMessage('正在提取音频指纹并比对全球华语/欧美曲库...');

    try {
      const form = new FormData();
      form.append('audio', blob, 'capture.webm');
      const res = await fetch('/api/recognize', { method: 'POST', body: form });
      const data = (await res.json()) as RecognizeApiResponse;

      if (data.configured === false) {
        setPhase('unconfigured');
        setStatusMessage(
          data.message || '尚未配置 ACRCloud 识别密钥，请参考 docs/API_SETUP_GUIDE.md 完成配置。'
        );
        return;
      }

      if (data.matched && data.track) {
        const t = data.track;
        const song: Song = {
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration || '03:30',
          cover: t.cover || CURATED_SONGS[0].cover,
          lyric: `刚刚通过听歌识曲捕捉到这首《${t.title}》，把这一刻印成黑胶海报。`,
          palette: null,
          previewUrl: t.previewUrl,
          chordFreqs: [220, 277.18, 329.63, 440],
          externalUrl: t.externalUrl,
          externalLinks: t.externalLinks,
          source: t.source || 'itunes',
          neteaseId: t.neteaseId,
          qqMid: t.qqMid,
        };
        song.externalLinks = ensureExternalLinks(song);
        setMatchedSong(song);
        setMatchScore(data.score || 96);
        setPhase('matched');
        setStatusMessage('已精准识别曲目，可直接生成海报或前往外部音乐平台听全曲');
        return;
      }

      setPhase('nomatch');
      setStatusMessage(data.message || data.error || '暂未识别出曲目，请靠近音源重试');
    } catch {
      setPhase('nomatch');
      setStatusMessage('识别请求失败，请检查网络连接后重试');
    }
  };

  const startListening = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('当前浏览器不支持麦克风录音，请使用 Chrome / Safari / Edge');
      return;
    }

    cleanupAudio();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Live volume meter for concentric analog radar
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        src.connect(analyser);
        const arr = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(arr);
          let sum = 0;
          for (let i = 0; i < arr.length; i++) sum += arr[i];
          setMicLevel(Math.min(1, sum / (arr.length * 140)));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupAudio();
        if (blob.size > 800) {
          void submitAudioBlob(blob);
        } else {
          setPhase('idle');
          setStatusMessage('录音时间过短，请至少录制 4 秒以上');
        }
      };

      recorder.start(250);
      setPhase('listening');
      setSecondsLeft(LISTEN_SECONDS);
      setStatusMessage('正在聆听周围音乐，请保持靠近音源...');

      let remaining = LISTEN_SECONDS;
      timerRef.current = window.setInterval(() => {
        remaining -= 1;
        setSecondsLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch {
      showToast('无法访问麦克风，请在浏览器地址栏允许麦克风权限');
    }
  };

  const stopEarlyAndAnalyze = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const runDemoRecognition = async () => {
    setPhase('analyzing');
    setStatusMessage('正在模拟识别经典华语曲目《孙燕姿 - 逆光》...');
    const res = await searchUniversalMusic('孙燕姿 逆光', 0);
    const hit = res.songs[0] || CURATED_SONGS[0];
    const enriched: Song = {
      ...hit,
      externalLinks: ensureExternalLinks(hit),
    };
    setMatchedSong(enriched);
    setMatchScore(98);
    setPhase('matched');
    setStatusMessage('模拟识曲演示完成：配置 ACRCloud 密钥后即可对任意真实环境音乐识曲');
  };

  if (!open) return null;

  const links = matchedSong ? ensureExternalLinks(matchedSong) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md hi-fi-panel rounded-2xl overflow-hidden shadow-2xl border border-[var(--line-strong)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-subtle)]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">听歌识曲</h3>
              <p className="font-tech text-[10px] text-[var(--ink-muted)] tracking-wider">
                AUDIO FINGERPRINT ·{' '}
                {providerInfo.configured
                  ? providerInfo.provider.toUpperCase()
                  : 'ACRCLOUD READY'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {phase !== 'matched' && (
            <div className="flex flex-col items-center text-center space-y-5 py-2">
              {/* Analog Radar Button */}
              <div className="relative flex items-center justify-center w-36 h-36">
                {phase === 'listening' && (
                  <>
                    <span
                      className="absolute inset-0 rounded-full border border-[var(--accent)]/40 transition-transform duration-150"
                      style={{ transform: `scale(${1.05 + micLevel * 0.45})` }}
                    />
                    <span
                      className="absolute inset-3 rounded-full bg-[var(--accent-soft)] transition-transform duration-150"
                      style={{ transform: `scale(${1 + micLevel * 0.3})` }}
                    />
                  </>
                )}

                <button
                  type="button"
                  disabled={phase === 'analyzing'}
                  onClick={() => {
                    if (phase === 'listening') stopEarlyAndAnalyze();
                    else void startListening();
                  }}
                  className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 border-2 shadow-lg transition active:scale-95 ${
                    phase === 'listening'
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--accent-border)] text-[var(--ink-primary)] hover:border-[var(--accent)]'
                  }`}
                >
                  {phase === 'analyzing' ? (
                    <Loader2 className="w-7 h-7 text-[var(--accent)] animate-spin" />
                  ) : phase === 'listening' ? (
                    <>
                      <Square className="w-5 h-5 fill-current" />
                      <span className="font-tech text-[11px]">{secondsLeft}s</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-7 h-7 text-[var(--accent)]" />
                      <span className="text-[11px] font-medium">开始听歌</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <p className="text-xs sm:text-sm text-[var(--ink-primary)] font-medium leading-relaxed">
                  {statusMessage}
                </p>
                {phase === 'listening' && (
                  <p className="text-[11px] text-[var(--ink-muted)]">
                    再次点击中间按钮可提前结束录音并立即识别
                  </p>
                )}
              </div>

              {(phase === 'unconfigured' || !providerInfo.configured) && (
                <div className="w-full rounded-xl hi-fi-inset p-3.5 text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--ink-primary)]">
                      {phase === 'unconfigured' ? '尚未配置 ACRCloud 密钥' : '准备就绪 · 需绑定识曲密钥'}
                    </span>
                    <span className="font-tech text-[10px] text-[var(--accent)]">14 天免费试用</span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                    在 Cloudflare Workers 配置 <code className="font-tech">ACR_HOST</code>、
                    <code className="font-tech">ACR_ACCESS_KEY</code>、
                    <code className="font-tech">ACR_ACCESS_SECRET</code> 即可开启真机华语+哼唱识曲（见仓库{' '}
                    <code className="font-tech">docs/API_SETUP_GUIDE.md</code>）。
                  </p>
                  <button
                    type="button"
                    onClick={() => void runDemoRecognition()}
                    className="w-full py-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--accent-border)] text-xs font-medium text-[var(--accent)] flex items-center justify-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>先模拟识别一首《逆光》体验完整流程</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'matched' && matchedSong && links && (
            <div className="space-y-4">
              {/* Matched Song Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl hi-fi-inset border border-[var(--accent-border)]">
                <img
                  src={matchedSong.cover}
                  alt={matchedSong.title}
                  className="w-16 h-16 rounded-lg object-cover shadow-md shrink-0 bg-[var(--bg-panel)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                      匹配度 {matchScore}%
                    </span>
                    {matchedSong.previewUrl && (
                      <span className="font-tech text-[10px] text-[var(--ink-muted)]">30s 原曲就绪</span>
                    )}
                  </div>
                  <h4 className="text-base font-semibold text-[var(--ink-primary)] truncate mt-1">
                    {matchedSong.title}
                  </h4>
                  <p className="text-xs text-[var(--ink-secondary)] truncate">
                    {matchedSong.artist} · {matchedSong.album}
                  </p>
                </div>
              </div>

              {/* Primary CTA: Load to Poster Studio */}
              <button
                type="button"
                onClick={() => {
                  onApplySong(matchedSong);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Disc3 className="w-4 h-4" />
                <span>立即载入制片室 · 生成唱片海报</span>
              </button>

              {/* External Music Apps (Listen to Full Song) */}
              <div className="space-y-2 pt-2 border-t border-[var(--line-subtle)]">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-secondary)]">
                  <Headphones className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>跳转到外部音乐平台继续听完整版</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '网易云音乐', href: links.netease },
                    { label: 'QQ 音乐', href: links.qq },
                    { label: 'Apple Music', href: links.apple },
                    { label: 'Spotify', href: links.spotify },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] transition"
                    >
                      <span>{item.label}</span>
                      <ExternalLink className="w-3 h-3 text-[var(--ink-muted)]" />
                    </a>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMatchedSong(null);
                  setPhase('idle');
                  setStatusMessage('点击下方按钮，继续识别下一首歌');
                }}
                className="w-full py-2 rounded-lg text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition"
              >
                重新听歌识曲
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
