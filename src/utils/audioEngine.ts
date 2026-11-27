import type { Song } from '../types';

/**
 * Unified Web Audio Engine:
 * - Plays real previewUrl or local uploaded audio file (MP3/WAV)
 * - Falls back to a lush, warm Lo-Fi electric piano + pad synthesizer for curated songs
 * - Routes BOTH sources through a live AnalyserNode (drives real-time canvas waveform!)
 *   AND a MediaStreamAudioDestinationNode (so exported dynamic videos have real sound!).
 */
class SparkAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));

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
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.streamDest = this.ctx.createMediaStreamDestination();

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDest);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private ensureAudioEl(): HTMLAudioElement {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.loop = true;
      this.audioEl.addEventListener('ended', () => {
        this.stop();
      });
    }
    return this.audioEl;
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
   * Returns normalized [0..1] playback progress and formatted current time.
   */
  getPlaybackProgress(durationText?: string): { progress: number; currentLabel: string } {
    if (this.playing && this.mode === 'track' && this.audioEl && this.audioEl.duration > 0) {
      const cur = this.audioEl.currentTime;
      const dur = this.audioEl.duration;
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

  /**
   * Returns live frequency bars (values 0..1) from Web Audio AnalyserNode when playing,
   * or smooth organic ambient wave when paused/static.
   */
  getFrequencyBars(barCount: number, t: number, dynamic: boolean): number[] {
    const result: number[] = new Array(barCount);
    if (this.playing && this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      let energy = 0;
      for (let i = 0; i < this.freqData.length; i++) energy += this.freqData[i];
      if (energy > 20) {
        const usableBins = Math.min(this.freqData.length, 44);
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor((i / barCount) * usableBins);
          const raw = this.freqData[binIndex] / 255;
          const env = 0.55 + 0.45 * Math.sin((i / Math.max(1, barCount - 1)) * Math.PI);
          result[i] = Math.min(1, Math.max(0.08, raw * env * 1.18));
        }
        return result;
      }
    }

    const phase = dynamic ? t * (this.playing ? 5.0 : 2.3) : 1.15;
    for (let i = 0; i < barCount; i++) {
      const w1 = Math.sin(i * 0.46 + phase) * 0.5 + 0.5;
      const w2 = Math.cos(i * 0.25 - phase * 0.72) * 0.5 + 0.5;
      const env = Math.sin((i / Math.max(1, barCount - 1)) * Math.PI);
      result[i] = Math.min(1, Math.max(0.1, (0.16 + 0.84 * w1 * w2) * (0.45 + 0.55 * env)));
    }
    return result;
  }

  private playWarmSynthPhrase(freqs: number[]): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const progression = [1, 0.8909, 1.1225, 0.9438]; // Gentle dreamy harmonic shift
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
      gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.08 : 0.048, start + 0.22);
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

  async play(song: Song): Promise<void> {
    this.stop(false);
    const ctx = this.ensureContext();
    this.currentSongId = song.id;
    this.startedAt = performance.now();
    this.playing = true;

    if (song.previewUrl && ctx && this.masterGain) {
      const candidates: string[] = [song.previewUrl];
      if (song.previewUrl.startsWith('/api/proxy?url=')) {
        try {
          const parsed = new URL(song.previewUrl, window.location.origin);
          const rawUrl = parsed.searchParams.get('url');
          if (rawUrl) candidates.push(rawUrl);
        } catch {
          // Ignore URL parse error
        }
      }

      for (const candidateUrl of candidates) {
        try {
          const audio = this.ensureAudioEl();
          audio.src = candidateUrl;
          audio.load();
          audio.currentTime = 0;

          if (!this.mediaSource) {
            this.mediaSource = ctx.createMediaElementSource(audio);
            this.mediaSource.connect(this.masterGain);
          }

          await audio.play();
          this.mode = 'track';
          this.emit();
          return;
        } catch {
          // Try next candidate or fall back to synth seamlessly
        }
      }
    }

    this.mode = 'synth';
    const freqs = song.chordFreqs || [220, 261.63, 329.63, 392.0, 493.88];
    this.synthStep = 0;
    this.playWarmSynthPhrase(freqs);
    this.synthInterval = window.setInterval(() => {
      if (this.playing) this.playWarmSynthPhrase(freqs);
    }, 2400);
    this.emit();
  }

  stop(notify = true): void {
    this.playing = false;
    if (this.audioEl) {
      this.audioEl.pause();
      try {
        this.audioEl.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    if (this.synthInterval !== null) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (notify) this.emit();
  }

  async toggle(song: Song): Promise<void> {
    if (this.playing && this.currentSongId === song.id) {
      this.stop();
    } else {
      await this.play(song);
    }
  }
}

export const audioEngine = new SparkAudioEngine();
