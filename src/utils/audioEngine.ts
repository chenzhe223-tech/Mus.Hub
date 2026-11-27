import type { Song } from '../types';

/**
 * Extracts raw upstream URL from `/api/proxy?url=...` and orders playback candidates:
 * - Apple CDN (`itunes.apple.com`): direct first (fast global/Asia CDN + native HTTP 206), proxy fallback
 * - Deezer (`dzcdn.net`): proxy first (avoids regional blocks), direct fallback
 * - Local `blob:` / `data:` URLs: direct only
 */
function buildAudioCandidates(previewUrl: string): string[] {
  if (!previewUrl) return [];
  if (previewUrl.startsWith('blob:') || previewUrl.startsWith('data:')) {
    return [previewUrl];
  }

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
    proxyUrl = `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
  }

  if (rawUrl === proxyUrl) return [rawUrl];

  const isAppleCdn = /\.itunes\.apple\.com\b/i.test(rawUrl);
  return isAppleCdn ? [rawUrl, proxyUrl] : [proxyUrl, rawUrl];
}

export interface AudioPlayResult {
  ok: boolean;
  mode: 'track' | 'synth' | 'failed';
  message?: string;
}

/**
 * Mobile-First Unified Audio Engine:
 * - Plays real song previews natively via a persistent DOM `<audio playsinline>` element
 *   (NO `createMediaElementSource` hijacking, NO `currentTime = 0` on `HAVE_NOTHING` —
 *   completely eliminating iOS Safari / WeChat `InvalidStateError` & silent-audio bugs!).
 * - NEVER substitutes fake synth chords when a real song has a `previewUrl`!
 *   Synth chords are ONLY used for curated built-in songs that have no `previewUrl`.
 */
class SparkAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  private nativeAudio: HTMLAudioElement | null = null;
  private playSeq = 0;

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

  private ensureNativeAudio(): HTMLAudioElement {
    if (!this.nativeAudio) {
      const el = document.createElement('audio');
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.style.display = 'none';
      el.volume = 1.0;
      el.muted = false;
      el.addEventListener('ended', () => {
        this.stop();
      });
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(el);
      }
      this.nativeAudio = el;
    }
    return this.nativeAudio;
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
    const parts = txt.split(':').map((n) => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return Math.max(30, parts[0] * 60 + parts[1]);
    }
    return 225;
  }

  private formatSeconds(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const r = String(s % 60).padStart(2, '0');
    return `${m}:${r}`;
  }

  getFrequencyBars(barCount: number, t: number, dynamic: boolean): number[] {
    const result: number[] = new Array(barCount);

    if (this.playing && this.mode === 'synth' && this.analyser) {
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
    const phase = dynamic ? activeTime * (this.playing ? 5.2 : 2.3) : 1.15;
    const beatPulse = this.playing ? 0.8 + 0.25 * Math.abs(Math.sin(phase * 0.65)) : 0.72;

    for (let i = 0; i < barCount; i++) {
      const w1 = Math.sin(i * 0.48 + phase) * 0.5 + 0.5;
      const w2 = Math.cos(i * 0.27 - phase * 0.78) * 0.5 + 0.5;
      const env = Math.sin((i / Math.max(1, barCount - 1)) * Math.PI);
      result[i] = Math.min(
        1,
        Math.max(0.1, (0.18 + 0.82 * w1 * w2) * (0.45 + 0.55 * env) * beatPulse)
      );
    }
    return result;
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

  /**
   * Starts playback immediately within user gesture.
   * For songs with `previewUrl`: plays the real studio preview (NEVER silently substitutes unrelated synth!).
   * For built-in curated songs without `previewUrl`: plays the warm Lo-Fi chord synth.
   */
  async play(song: Song): Promise<AudioPlayResult> {
    this.stop(false);
    const seq = ++this.playSeq;
    this.currentSongId = song.id;
    this.startedAt = performance.now();

    if (song.previewUrl) {
      const candidates = buildAudioCandidates(song.previewUrl);
      const audio = this.ensureNativeAudio();

      for (let i = 0; i < candidates.length; i++) {
        if (seq !== this.playSeq) return { ok: false, mode: 'failed' };
        const candidateUrl = candidates[i];
        try {
          audio.onerror = null;
          audio.removeAttribute('crossorigin');
          // IMPORTANT: Do NOT assign `audio.currentTime = 0` right after changing `src`!
          // On iOS Safari & WeChat WebKit, `readyState` is 0 (HAVE_NOTHING) and setting
          // `currentTime` immediately throws `InvalidStateError` before `play()` even runs!
          if (audio.src !== candidateUrl) {
            audio.src = candidateUrl;
          } else if (audio.readyState >= 1) {
            try {
              audio.currentTime = 0;
            } catch {
              // Ignore
            }
          }

          // Invoke play() synchronously inside the tap gesture
          const playPromise = audio.play();
          await Promise.race([
            playPromise,
            new Promise<never>((_, reject) =>
              window.setTimeout(() => reject(new Error('Audio timeout')), 8000)
            ),
          ]);

          if (seq !== this.playSeq) {
            audio.pause();
            return { ok: false, mode: 'failed' };
          }

          this.playing = true;
          this.mode = 'track';

          // Runtime fallback if stream drops after initial play() resolves
          audio.onerror = () => {
            if (seq !== this.playSeq || !this.playing) return;
            const nextUrl = candidates[i + 1];
            if (nextUrl) {
              audio.onerror = null;
              audio.src = nextUrl;
              void audio.play().catch(() => this.stop());
            } else {
              this.stop();
            }
          };

          this.emit();
          return { ok: true, mode: 'track' };
        } catch {
          // Try next candidate URL
        }
      }

      // Real track failed both direct and proxy URLs — stop honestly instead of playing unrelated synth!
      this.playing = false;
      this.currentSongId = null;
      this.emit();
      return {
        ok: false,
        mode: 'failed',
        message: '原曲试听音频加载超时或已过期，请再点一次重试，或点击下方去外部平台听完整版',
      };
    }

    // Curated built-in songs (no previewUrl): play warm Lo-Fi electric piano chord synth
    this.playing = true;
    this.ensureContext();
    this.startSynth(song, seq);
    return { ok: true, mode: 'synth' };
  }

  stop(notify = true): void {
    this.playSeq++;
    this.playing = false;
    if (this.nativeAudio) {
      this.nativeAudio.onerror = null;
      this.nativeAudio.pause();
      if (this.nativeAudio.readyState >= 1) {
        try {
          this.nativeAudio.currentTime = 0;
        } catch {
          // Ignore
        }
      }
    }
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
