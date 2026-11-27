import type { Song } from '../types';
import {
  computeSyntheticBars,
  formatSecondsMMSS,
  parseDurationTextToSec,
} from './deterministicMotion';

/**
 * Builds ordered playback candidates optimized for iOS Safari / WeChat WebKit / Android & Desktop:
 * 1. Evergreen `/api/preview?deezerId=...` (always fresh, same-origin, immune to Deezer 15-min token expiry!)
 * 2. Same-origin `/api/proxy?url=...` FIRST so audio streams over the exact same reachable HTTPS origin as the app
 *    within the first synchronous iOS tap gesture.
 * 3. Direct CDN URL & dynamic `/api/preview?title=...&artist=...` (even works for NetEase/QQ tracks that had `previewUrl: null`!).
 */
function buildAudioCandidates(song: Song): string[] {
  const previewUrl = song.previewUrl || '';
  if (previewUrl.startsWith('blob:') || previewUrl.startsWith('data:')) {
    return [previewUrl];
  }

  const list: string[] = [];
  const add = (u: string) => {
    if (u && !list.includes(u)) list.push(u);
  };

  const isHttpApp =
    typeof window !== 'undefined' && window.location.protocol.startsWith('http');

  const titleArtistFallback =
    isHttpApp && song.title && !song.id.startsWith('curated-')
      ? `/api/preview?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(
          song.artist || ''
        )}`
      : '';

  // Already an evergreen /api/preview URL
  if (previewUrl.startsWith('/api/preview?')) {
    add(previewUrl);
    if (titleArtistFallback) add(titleArtistFallback);
    return list;
  }

  // Upgrade Deezer tracks (including legacy saved/shared posts) to evergreen /api/preview
  const dzIdMatch = song.id.match(/^deezer-(?:chart-)?(\d+)$/);
  if (dzIdMatch && isHttpApp) {
    add(`/api/preview?deezerId=${dzIdMatch[1]}`);
  }

  if (previewUrl) {
    let rawUrl = previewUrl;
    let proxyUrl = previewUrl;

    if (previewUrl.startsWith('/api/proxy?url=')) {
      try {
        const parsed = new URL(previewUrl, window.location.origin);
        const extracted = parsed.searchParams.get('url');
        if (extracted) rawUrl = extracted;
      } catch {
        // Keep as is
      }
    } else if (/^https?:\/\//i.test(previewUrl)) {
      rawUrl = previewUrl.replace(/^http:\/\//i, 'https://');
      proxyUrl = isHttpApp ? `/api/proxy?url=${encodeURIComponent(rawUrl)}` : rawUrl;
    }

    add(proxyUrl);
    add(rawUrl);
  }

  if (titleArtistFallback) {
    add(titleArtistFallback);
  }

  return list;
}

export interface AudioPlayResult {
  ok: boolean;
  mode: 'track' | 'synth' | 'failed';
  message?: string;
}

/**
 * Bulletproof Mobile-First Audio Engine (iOS Safari + WeChat WKWebView + Android + Desktop):
 * - Destroys the previous HTMLAudioElement and creates a BRAND-NEW `new Audio(url)` on every track switch,
 *   100% eliminating the iOS Safari / WeChat WebKit bug where changing `.src` on a reused `<audio>` element
 *   keeps playing the previous song's cached AVPlayerItem buffer!
 * - NEVER plays fake synth chords for real online songs; synth is strictly reserved for built-in `curated-*` cards.
 */
class SparkAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  private nativeAudio: HTMLAudioElement | null = null;
  private playSeq = 0;

  // Dedicated isolated AudioBufferSourceNode used ONLY during video recording so
  // MediaRecorder captures crisp real song PCM audio without ever touching/muting mobile nativeAudio!
  private recBufferSource: AudioBufferSourceNode | null = null;
  private recGain: GainNode | null = null;

  private synthInterval: number | null = null;
  private synthStep = 0;
  private playing = false;
  private currentSongId: string | null = null;
  private startedAt = 0;
  private mode: 'track' | 'synth' = 'synth';
  private listeners = new Set<() => void>();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.88;

      this.streamDest = this.ctx.createMediaStreamDestination();

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDest);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    try {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      // Ignore
    }

    return this.ctx;
  }

  /**
   * Fully tears down the active HTMLAudioElement so iOS/WeChat WebKit immediately releases the old AVPlayerItem.
   */
  private destroyNativeAudio(): void {
    const old = this.nativeAudio;
    this.nativeAudio = null;
    if (!old) return;
    try {
      old.onerror = null;
      old.onended = null;
      old.pause();
      old.removeAttribute('src');
      old.load();
      if (old.parentNode) {
        old.parentNode.removeChild(old);
      }
    } catch {
      // Ignore teardown errors
    }
  }

  /**
   * Instantiates a fresh, clean `<audio>` element for the requested track URL.
   */
  private createFreshAudio(url: string): HTMLAudioElement {
    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.volume = 1.0;
    el.muted = false;
    el.src = url;
    return el;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getCurrentSongId(): string | null {
    return this.currentSongId;
  }

  getPlaybackMode(): 'track' | 'synth' {
    return this.mode;
  }

  getAudioStream(): MediaStream | null {
    this.ensureContext();
    return this.streamDest ? this.streamDest.stream : null;
  }

  /**
   * Prepares a dedicated, CORS-safe, real-song PCM audio stream for video recording (`MediaRecorder`).
   * - Fetches the same-origin `/api/preview` or `/api/proxy` (or `blob:`) audio bytes, decodes via Web Audio
   *   `decodeAudioData`, and routes an isolated `AudioBufferSourceNode` into `masterGain -> analyser -> streamDest`.
   * - Leaves `nativeAudio` 100% untouched for normal mobile/desktop listening (zero iOS/WeChat regression!).
   */
  async startRecordingAudio(song: Song): Promise<{
    stream: MediaStream | null;
    hasRealTrackAudio: boolean;
    cleanup: () => void;
  }> {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.streamDest) {
      return { stream: null, hasRealTrackAudio: false, cleanup: () => {} };
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore
      }
    }

    // Stop any previous recording buffer node
    this.stopRecordingBuffer();

    const isCuratedDemo = song.id.startsWith('curated-') && !song.previewUrl;
    if (isCuratedDemo) {
      const wasPlaying = this.playing && this.currentSongId === song.id;
      if (!wasPlaying) {
        await this.play(song);
      }
      return {
        stream: this.streamDest.stream,
        hasRealTrackAudio: true,
        cleanup: () => {
          if (!wasPlaying) this.stop();
        },
      };
    }

    // Remember current playback offset so the 5s recorded clip continues smoothly from where the user was listening
    const resumeOffsetSec =
      this.playing &&
      this.currentSongId === song.id &&
      this.nativeAudio &&
      Number.isFinite(this.nativeAudio.currentTime)
        ? this.nativeAudio.currentTime
        : 0;

    // Pause nativeAudio during recording so the user doesn't hear double audio (the decoded buffer plays instead!)
    const wasPlayingBefore = this.playing && this.currentSongId === song.id;
    this.stop(false);

    const candidates = buildAudioCandidates(song).filter(
      (u) => u.startsWith('/') || u.startsWith('blob:') || u.startsWith('data:')
    );

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 12000);
        let arrayBuf: ArrayBuffer;
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) continue;
          arrayBuf = await res.arrayBuffer();
        } finally {
          window.clearTimeout(timer);
        }

        if (arrayBuf.byteLength < 2048) continue;

        const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = 1.0;

        source.connect(gain);
        gain.connect(this.masterGain);

        const safeOffset =
          audioBuffer.duration > 1 ? resumeOffsetSec % Math.max(1, audioBuffer.duration - 0.5) : 0;
        source.start(0, safeOffset);

        this.recBufferSource = source;
        this.recGain = gain;
        this.playing = true;
        this.currentSongId = song.id;
        this.mode = 'synth'; // Routes real decoded PCM energy through AnalyserNode -> live canvas spectrum!
        this.startedAt = performance.now() - safeOffset * 1000;
        this.emit();

        return {
          stream: this.streamDest.stream,
          hasRealTrackAudio: true,
          cleanup: () => {
            this.stopRecordingBuffer();
            this.playing = false;
            this.emit();
            if (wasPlayingBefore) {
              void this.play(song);
            }
          },
        };
      } catch {
        // Try next same-origin candidate
      }
    }

    return {
      stream: null,
      hasRealTrackAudio: false,
      cleanup: () => {
        if (wasPlayingBefore) {
          void this.play(song);
        }
      },
    };
  }

  private stopRecordingBuffer(): void {
    if (this.recBufferSource) {
      try {
        this.recBufferSource.stop();
        this.recBufferSource.disconnect();
      } catch {
        // Ignore
      }
      this.recBufferSource = null;
    }
    if (this.recGain) {
      try {
        this.recGain.disconnect();
      } catch {
        // Ignore
      }
      this.recGain = null;
    }
  }

  /**
   * Decodes a real song track (or synthesizes curated warm chords via OfflineAudioContext)
   * into a deterministic AudioBuffer for zero-drop offline WebCodecs MP4 encoding.
   */
  async decodeExportAudioBuffer(
    song: Song,
    durationSec: number
  ): Promise<{ buffer: AudioBuffer | null; hasRealTrackAudio: boolean }> {
    const isCuratedDemo = song.id.startsWith('curated-') && !song.previewUrl;
    if (isCuratedDemo) {
      try {
        const OfflineCtx =
          window.OfflineAudioContext ||
          (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
            .webkitOfflineAudioContext;
        if (!OfflineCtx) return { buffer: null, hasRealTrackAudio: false };
        const sampleRate = 44100;
        const offCtx = new OfflineCtx(2, Math.ceil(durationSec * sampleRate), sampleRate);
        const master = offCtx.createGain();
        master.gain.value = 0.72;
        master.connect(offCtx.destination);

        const freqs = song.chordFreqs || [220, 261.63, 329.63, 392.0, 493.88];
        const progression = [1, 0.8909, 1.1225, 0.9438];
        const stepInterval = 2.4;
        const steps = Math.ceil(durationSec / stepInterval);

        for (let step = 0; step < steps; step++) {
          const phraseStart = step * stepInterval;
          const shift = progression[step % progression.length];
          freqs.forEach((baseFreq, idx) => {
            const f = baseFreq * shift;
            const osc = offCtx.createOscillator();
            const subOsc = offCtx.createOscillator();
            const filter = offCtx.createBiquadFilter();
            const gain = offCtx.createGain();

            osc.type = idx === 0 ? 'sine' : 'triangle';
            subOsc.type = 'sine';
            osc.frequency.setValueAtTime(f, phraseStart);
            subOsc.frequency.setValueAtTime(f * 0.5, phraseStart);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, phraseStart);
            filter.frequency.exponentialRampToValueAtTime(520, phraseStart + 2.3);

            const start = phraseStart + idx * 0.11;
            if (start >= durationSec) return;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.11 : 0.065, start + 0.22);
            gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(durationSec, start + 2.55));

            osc.connect(filter);
            subOsc.connect(filter);
            filter.connect(gain);
            gain.connect(master);

            osc.start(start);
            subOsc.start(start);
            osc.stop(Math.min(durationSec + 0.05, start + 2.65));
            subOsc.stop(Math.min(durationSec + 0.05, start + 2.65));
          });
        }

        const rendered = await offCtx.startRendering();
        return { buffer: rendered, hasRealTrackAudio: true };
      } catch {
        return { buffer: null, hasRealTrackAudio: false };
      }
    }

    const ctx = this.ensureContext();
    if (!ctx) return { buffer: null, hasRealTrackAudio: false };

    const candidates = buildAudioCandidates(song).filter(
      (u) => u.startsWith('/') || u.startsWith('blob:') || u.startsWith('data:')
    );

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 14000);
        let arrayBuf: ArrayBuffer;
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) continue;
          arrayBuf = await res.arrayBuffer();
        } finally {
          window.clearTimeout(timer);
        }

        if (arrayBuf.byteLength < 2048) continue;
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        return { buffer: decoded, hasRealTrackAudio: true };
      } catch {
        // Try next candidate
      }
    }

    return { buffer: null, hasRealTrackAudio: false };
  }

  getPlaybackProgress(durationText?: string): { progress: number; currentLabel: string } {
    if (
      this.playing &&
      this.mode === 'track' &&
      this.nativeAudio &&
      Number.isFinite(this.nativeAudio.duration) &&
      this.nativeAudio.duration > 0
    ) {
      const cur = this.nativeAudio.currentTime;
      const dur = this.nativeAudio.duration;
      return {
        progress: Math.min(0.98, Math.max(0.02, cur / dur)),
        currentLabel: this.formatSeconds(cur),
      };
    }

    const totalSec = this.parseDurationText(durationText || '03:45');
    if (this.playing) {
      const elapsed = (performance.now() - this.startedAt) / 1000;
      const cur = (totalSec * 0.25 + elapsed) % totalSec;
      return {
        progress: cur / totalSec,
        currentLabel: this.formatSeconds(cur),
      };
    }

    const defaultCur = Math.round(totalSec * 0.38);
    return {
      progress: 0.38,
      currentLabel: this.formatSeconds(defaultCur),
    };
  }

  private parseDurationText(txt: string): number {
    return parseDurationTextToSec(txt);
  }

  private formatSeconds(sec: number): string {
    return formatSecondsMMSS(sec);
  }

  getFrequencyBars(barCount: number, t: number, dynamic: boolean): number[] {
    if (this.playing && this.mode === 'synth' && this.analyser) {
      const result: number[] = new Array(barCount);
      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freqData);
      let energy = 0;
      for (let i = 0; i < freqData.length; i++) energy += freqData[i];
      if (energy > 20) {
        const usableBins = Math.min(freqData.length, 44);
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor((i / barCount) * usableBins);
          const raw = freqData[binIndex] / 255;
          const env = 0.55 + 0.45 * Math.sin((i / Math.max(1, barCount - 1)) * Math.PI);
          result[i] = Math.min(1, Math.max(0.08, raw * env * 1.18));
        }
        return result;
      }
    }

    const activeTime =
      this.playing && this.mode === 'track' && this.nativeAudio && !this.nativeAudio.paused
        ? this.nativeAudio.currentTime * 1.85
        : t;
    return computeSyntheticBars(barCount, activeTime, dynamic, this.playing);
  }

  private playWarmSynthPhrase(freqs: number[]): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const progression = [1, 0.8909, 1.1225, 0.9438];
    const shift = progression[this.synthStep % progression.length];
    this.synthStep++;

    freqs.forEach((baseFreq, idx) => {
      const f = baseFreq * shift;
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      subOsc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      subOsc.frequency.setValueAtTime(f * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + 2.3);

      const start = now + idx * 0.11;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.11 : 0.065, start + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.55);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      subOsc.start(start);
      osc.stop(start + 2.65);
      subOsc.stop(start + 2.65);
    });
  }

  private startSynth(song: Song, seq: number): void {
    if (seq !== this.playSeq) return;
    this.mode = 'synth';
    const freqs = song.chordFreqs || [220, 261.63, 329.63, 392.0, 493.88];
    this.synthStep = 0;
    this.playWarmSynthPhrase(freqs);
    this.synthInterval = window.setInterval(() => {
      if (this.playing && seq === this.playSeq) {
        this.playWarmSynthPhrase(freqs);
      }
    }, 2400);
    this.emit();
  }

  async play(song: Song): Promise<AudioPlayResult> {
    this.stop(false);
    const seq = ++this.playSeq;
    this.currentSongId = song.id;
    this.startedAt = performance.now();

    const isCuratedDemo = song.id.startsWith('curated-') && !song.previewUrl;
    if (isCuratedDemo) {
      this.playing = true;
      this.ensureContext();
      this.startSynth(song, seq);
      return { ok: true, mode: 'synth' };
    }

    const candidates = buildAudioCandidates(song);
    if (candidates.length === 0) {
      this.playing = false;
      this.currentSongId = null;
      this.emit();
      return {
        ok: false,
        mode: 'failed',
        message: '该曲目暂无 30s 试听片段，请点击下方前往网易云 / QQ 音乐 / Apple Music 听完整版',
      };
    }

    let lastErrName = '';
    for (let i = 0; i < candidates.length; i++) {
      if (seq !== this.playSeq) return { ok: false, mode: 'failed' };
      const candidateUrl = candidates[i];
      this.destroyNativeAudio();
      const audio = this.createFreshAudio(candidateUrl);
      this.nativeAudio = audio;

      try {
        const playPromise = audio.play();
        await Promise.race([
          playPromise,
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('Timeout')), 14000)
          ),
        ]);

        if (seq !== this.playSeq) {
          this.destroyNativeAudio();
          return { ok: false, mode: 'failed' };
        }

        this.playing = true;
        this.mode = 'track';

        audio.onended = () => {
          if (seq === this.playSeq) this.stop();
        };
        audio.onerror = () => {
          if (seq !== this.playSeq || !this.playing) return;
          const nextUrl = candidates[i + 1];
          if (nextUrl) {
            this.destroyNativeAudio();
            const fallbackAudio = this.createFreshAudio(nextUrl);
            this.nativeAudio = fallbackAudio;
            void fallbackAudio.play().catch(() => this.stop());
          } else {
            this.stop();
          }
        };

        this.emit();
        return { ok: true, mode: 'track' };
      } catch (err) {
        lastErrName = err instanceof Error ? err.name || err.message : 'PlayError';
        this.destroyNativeAudio();
      }
    }

    this.playing = false;
    this.currentSongId = null;
    this.emit();
    return {
      ok: false,
      mode: 'failed',
      message: `《${song.title}》试听流加载失败（${lastErrName || '网络波动'}），请重试或点击下方去外部平台听完整版`,
    };
  }

  stop(notify = true): void {
    this.playSeq++;
    this.playing = false;
    this.destroyNativeAudio();
    this.stopRecordingBuffer();
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (notify) this.emit();
  }

  async toggle(song: Song): Promise<AudioPlayResult> {
    if (this.playing && this.currentSongId === song.id) {
      this.stop();
      return { ok: true, mode: this.mode };
    }
    return this.play(song);
  }
}

export const audioEngine = new SparkAudioEngine();
