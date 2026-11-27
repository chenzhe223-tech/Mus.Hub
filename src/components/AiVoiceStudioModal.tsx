import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Disc3,
  Loader2,
  Mic,
  Music2,
  Play,
  Sparkles,
  Square,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { Song } from '../types';

export type AiSongStyleId = 'pop_ballad' | 'rnb_soul' | 'indie_folk' | 'city_pop' | 'jazz_lofi';

interface AiVoiceStudioModalProps {
  open: boolean;
  authorName: string;
  onClose: () => void;
  onApplyAiSong: (song: Song, lyric: string) => void;
  showToast: (msg: string) => void;
}

const AI_STYLES: Array<{ id: AiSongStyleId; name: string; mood: string; colors: [string, string] }> =
  [
    { id: 'pop_ballad', name: '华语抒情', mood: '钢琴弦乐 · 温柔走心', colors: ['#d96236', '#f2b872'] },
    { id: 'rnb_soul', name: '都市 R&B', mood: '电钢律动 · 丝滑松弛', colors: ['#9b5d47', '#e0a96d'] },
    { id: 'indie_folk', name: '独立民谣', mood: '木吉他 · 阳光叙事', colors: ['#4b7a5e', '#c9d9b8'] },
    { id: 'city_pop', name: '复古 City Pop', mood: '落日合成器 · 轻快兜风', colors: ['#3b6b8c', '#e68c5c'] },
    { id: 'jazz_lofi', name: '微醺爵士', mood: '黑胶鼓刷 · 深夜独白', colors: ['#3b2f26', '#d4a359'] },
  ];

function createAiVinylArtwork(title: string, artist: string, colors: [string, string]): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 600, 600);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 600);

  // Subtle concentric vinyl grooves
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  for (let r = 80; r <= 265; r += 16) {
    ctx.beginPath();
    ctx.arc(300, 300, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center warm paper label
  ctx.fillStyle = 'rgba(250, 245, 236, 0.92)';
  ctx.beginPath();
  ctx.arc(300, 300, 118, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#221c16';
  ctx.textAlign = 'center';
  ctx.font = '600 13px monospace';
  ctx.fillText('AI VOICE EDITION · 30S', 300, 258);

  ctx.font = '700 28px serif';
  ctx.fillText((title || '专属声纹单曲').slice(0, 10), 300, 306);

  ctx.fillStyle = '#6b5e50';
  ctx.font = '500 15px sans-serif';
  ctx.fillText(`Vocal · ${artist || 'Me'}`, 300, 342);

  return canvas.toDataURL('image/png');
}

export const AiVoiceStudioModal: React.FC<AiVoiceStudioModalProps> = ({
  open,
  authorName,
  onClose,
  onApplyAiSong,
  showToast,
}) => {
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voiceDurationSec, setVoiceDurationSec] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [consentOwnedVoice, setConsentOwnedVoice] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AiSongStyleId>('pop_ballad');
  const [songTitle, setSongTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isWritingLyrics, setIsWritingLyrics] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genStepText, setGenStepText] = useState('');
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [resultVoiceCloned, setResultVoiceCloned] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{
    configured: boolean;
    hasComposeApi: boolean;
    hasVoiceCloneGpu: boolean;
  }>({ configured: false, hasComposeApi: false, hasVoiceCloneGpu: false });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopRecordingCleanup();
      return;
    }
    void fetch('/api/ai-song/status')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { configured?: boolean; hasComposeApi?: boolean; hasVoiceCloneGpu?: boolean } | null) => {
          if (d) {
            setCloudStatus({
              configured: Boolean(d.configured),
              hasComposeApi: Boolean(d.hasComposeApi),
              hasVoiceCloneGpu: Boolean(d.hasVoiceCloneGpu),
            });
          }
        }
      )
      .catch(() => {});

    return () => {
      stopRecordingCleanup();
    };
  }, [open]);

  const stopRecordingCleanup = () => {
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
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
    setIsRecording(false);
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      stopRecordingCleanup();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('当前浏览器不支持麦克风录音，可直接上传本地清唱/语音文件');
      return;
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 800) {
          if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
          setVoiceBlob(blob);
          setVoicePreviewUrl(URL.createObjectURL(blob));
          showToast('声纹样本录制完成，可试听或直接进入下一步');
        }
      };

      rec.start(250);
      setIsRecording(true);
      setVoiceDurationSec(0);

      let sec = 0;
      recTimerRef.current = window.setInterval(() => {
        sec += 1;
        setVoiceDurationSec(sec);
        if (sec >= 15) {
          stopRecordingCleanup();
        }
      }, 1000);
    } catch {
      showToast('未获得麦克风权限，请在浏览器中允许录音或上传本地音频');
    }
  };

  const handleUploadVoiceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoiceBlob(file);
    setVoicePreviewUrl(URL.createObjectURL(file));
    setVoiceDurationSec(10);
    showToast(`已载入声音样本《${file.name}》`);
    e.target.value = '';
  };

  const handleComposeLyrics = async () => {
    const text = prompt.trim();
    if (!text) {
      showToast('先输入一句话故事或心情，再让 AI 帮你写 30 秒副歌');
      return;
    }
    setIsWritingLyrics(true);
    try {
      const res = await fetch('/api/ai-song/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, style }),
      });
      const data = (await res.json()) as { title?: string; lyrics?: string; error?: string };
      if (data.lyrics) {
        setLyrics(data.lyrics);
        if (data.title && !songTitle.trim()) setSongTitle(data.title);
        showToast('已谱写 30 秒副歌歌词，你可以自由修改任意字句');
      } else {
        showToast(data.error || '生成歌词失败，请稍后重试');
      }
    } catch {
      showToast('网络异常，请直接手动输入 2–4 句副歌歌词');
    } finally {
      setIsWritingLyrics(false);
    }
  };

  const handleGenerateSong = async () => {
    if (!voiceBlob) {
      showToast('请先在步骤 1 录制或上传 5–15 秒你的清唱/语音样本');
      return;
    }
    if (!consentOwnedVoice) {
      showToast('请先勾选确认：仅使用本人或已获授权的音色');
      return;
    }
    if (!prompt.trim() && !lyrics.trim()) {
      showToast('请输入一句话心情或副歌歌词');
      return;
    }

    setIsGenerating(true);
    setResultNote('');
    setResultAudioUrl(null);
    setGenStepText('正在谱写专属 30 秒原创副歌与伴奏...');

    try {
      const form = new FormData();
      form.append('voice', voiceBlob, 'voice-sample.webm');
      form.append('prompt', prompt.trim());
      form.append('lyrics', lyrics.trim());
      form.append('title', songTitle.trim());
      form.append('style', style);
      form.append('consentOwnedVoice', String(consentOwnedVoice));

      const res = await fetch('/api/ai-song/create', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as {
        configured?: boolean;
        previewMode?: boolean;
        voiceCloned?: boolean;
        title?: string;
        lyrics?: string;
        audioUrl?: string | null;
        message?: string;
        warning?: string;
        error?: string;
      };

      if (data.error) {
        showToast(data.error);
        return;
      }

      if (data.title) setSongTitle(data.title);
      if (data.lyrics) setLyrics(data.lyrics);

      if (data.audioUrl) {
        setResultAudioUrl(data.audioUrl);
        setResultVoiceCloned(Boolean(data.voiceCloned));
        setResultNote(
          data.warning ||
            (data.voiceCloned
              ? '30 秒专属原创曲已用你的克隆音色演唱并混音完成！'
              : '30 秒原创曲已生成！')
        );
        showToast('专属 30 秒 AI 音乐已生成，点击下方即可做成黑胶海报！');
      } else {
        // Preview Studio mode when API keys are not yet bound
        setResultAudioUrl(voicePreviewUrl);
        setResultVoiceCloned(false);
        setResultNote(
          data.message ||
            '云端 AI 作曲/声纹克隆密钥尚未配置，已先载入你的原始干声与生成歌词供体验海报制作。'
        );
      }
    } catch {
      showToast('生成请求超时，请稍后再试');
    } finally {
      setIsGenerating(false);
      setGenStepText('');
    }
  };

  const handleLoadIntoPosterStudio = () => {
    const styleObj = AI_STYLES.find((s) => s.id === style) || AI_STYLES[0];
    const finalTitle = songTitle.trim() || prompt.trim().slice(0, 10) || '我的专属 30 秒';
    const finalArtist = `${authorName || '我'} · AI 声纹`;
    const firstLyricLine =
      lyrics
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(' / ') || prompt.trim();

    const artwork = createAiVinylArtwork(finalTitle, authorName || 'Me', styleObj.colors);
    const aiSong: Song = {
      id: `ai-voice-${Date.now()}`,
      title: finalTitle,
      artist: finalArtist,
      album: `AI 声纹原创 · ${styleObj.name}`,
      duration: '00:30',
      cover: artwork,
      lyric: firstLyricLine.slice(0, 80),
      palette: null,
      previewUrl: resultAudioUrl || voicePreviewUrl,
      chordFreqs: [261.63, 329.63, 392.0, 493.88],
      source: 'ai-voice',
      isAiOriginal: true,
    };

    onApplyAiSong(aiSong, firstLyricLine.slice(0, 80));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col hi-fi-panel rounded-2xl overflow-hidden shadow-2xl border border-[var(--line-strong)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                  AI 声纹唱片 · 30 秒专属演唱
                </h3>
                <span className="font-tech text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                  30s 尝鲜版
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                录一段你的声音 + 写一句话故事 → AI 原创 30 秒副歌并用你的音色唱出来
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRecordingCleanup();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto custom-scroll space-y-5">
          {/* Cloud Pipeline Status Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl hi-fi-inset text-[11px]">
            <span className="text-[var(--ink-secondary)]">
              管线状态：
              <strong className="text-[var(--ink-primary)] ml-1">
                {cloudStatus.configured
                  ? 'MiniMax 原创作曲 + Seed-VC 声纹克隆已就绪'
                  : '本地体验模式（配置云端密钥后解锁真实 AI 伴奏与换声）'}
              </strong>
            </span>
            <span className="font-tech text-[10px] text-[var(--ink-muted)]">
              PRO 完整单曲敬请期待
            </span>
          </div>

          {/* Step 1: Voice Sample Capture */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
                <span className="font-tech text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                  01
                </span>
                采集你的音色样本（清唱或朗读 8–15 秒）
              </span>
              {voiceBlob && (
                <span className="text-[11px] text-[var(--accent)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已就绪
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void handleToggleRecord()}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                  isRecording
                    ? 'bg-[var(--heart)]/15 border-[var(--heart)] text-[var(--heart)]'
                    : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border-[var(--line-subtle)] text-[var(--ink-primary)]'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>停止录音 ({voiceDurationSec}s / 15s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{voiceBlob ? '重新录制清唱/语音' : '麦克风录制声音'}</span>
                  </>
                )}
              </button>

              <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>上传本地人声 (MP3/WAV)</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadVoiceFile}
                  className="hidden"
                />
              </label>
            </div>

            {voicePreviewUrl && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hi-fi-inset">
                <Play className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <audio controls src={voicePreviewUrl} className="w-full h-8" />
              </div>
            )}

            <label className="flex items-start gap-2 text-[11px] text-[var(--ink-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentOwnedVoice}
                onChange={(e) => setConsentOwnedVoice(e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                我确认上述声音样本为本人或已获明确授权的声音，且仅用于原创 30 秒音乐海报创作。
              </span>
            </label>
          </div>

          {/* Step 2: One-Sentence Story & Style */}
          <div className="space-y-2.5 pt-3 border-t border-[var(--line-subtle)]">
            <span className="text-xs font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
              <span className="font-tech text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                02
              </span>
              输入一句话心情故事 & 选择曲风
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：周五下班淋雨走过外滩，耳机里突然想起你..."
                className="flex-1 px-3.5 py-2.5 rounded-xl hi-fi-inset text-xs sm:text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)]"
              />
              <button
                type="button"
                disabled={isWritingLyrics}
                onClick={() => void handleComposeLyrics()}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--accent-border)] text-xs font-medium text-[var(--accent)] flex items-center gap-1.5 shrink-0 transition disabled:opacity-50"
              >
                {isWritingLyrics ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>AI 写副歌</span>
              </button>
            </div>

            {/* 5 Styles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {AI_STYLES.map((st) => {
                const active = style === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStyle(st.id)}
                    className={`px-2 py-2 rounded-xl border text-center transition ${
                      active
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)] font-semibold'
                        : 'bg-[var(--bg-inset)] border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    <div className="text-xs">{st.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Editable Title & 30s Chorus Lyrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="专属单曲名（可选）"
                className="px-3 py-2 rounded-xl hi-fi-inset text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)]"
              />
              <textarea
                rows={3}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="点右侧「AI 写副歌」自动生成 4 句 30s 歌词，也可自己改写..."
                className="sm:col-span-2 px-3 py-2 rounded-xl hi-fi-inset text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none"
              />
            </div>
          </div>

          {/* Step 3: Synthesize & Export to Poster */}
          <div className="space-y-3 pt-3 border-t border-[var(--line-subtle)]">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGenerateSong()}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{genStepText || '正在创作并融合你的音色...'}</span>
                </>
              ) : (
                <>
                  <Music2 className="w-4 h-4" />
                  <span>生成我的 30 秒专属演唱</span>
                </>
              )}
            </button>

            {resultAudioUrl && (
              <div className="rounded-xl hi-fi-inset border border-[var(--accent-border)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ink-primary)]">
                    《{songTitle || '我的专属 30 秒'}》试听成品
                  </span>
                  <span className="font-tech text-[10px] text-[var(--accent)]">
                    {resultVoiceCloned ? 'CLONED VOCAL · 30S' : 'STUDIO PREVIEW'}
                  </span>
                </div>
                {resultNote && (
                  <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                    {resultNote}
                  </p>
                )}
                <audio controls src={resultAudioUrl} className="w-full h-9" />
                <button
                  type="button"
                  onClick={handleLoadIntoPosterStudio}
                  className="w-full py-2.5 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-ink)] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Disc3 className="w-4 h-4" />
                  <span>载入制片室 · 印成我的专属黑胶海报</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
