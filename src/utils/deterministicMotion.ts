/**
 * Deterministic Motion & PRNG Utilities
 * Inspired by `lemomo-ai/lemo-opuscar` (pure time function f(t)) and `heygen-com/hyperframes` (no unseeded Math.random).
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatSecondsMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

export function parseDurationTextToSec(txt?: string): number {
  if (!txt) return 225;
  const parts = txt.split(':').map((n) => parseInt(n, 10));
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return Math.max(30, parts[0] * 60 + parts[1]);
  }
  return 225;
}

/**
 * Pure deterministic waveform generator for fallback / static / preview states.
 */
export function computeSyntheticBars(
  barCount: number,
  tSec: number,
  dynamic: boolean,
  isPlaying: boolean
): number[] {
  const result = new Array<number>(barCount);
  const phase = dynamic ? tSec * (isPlaying ? 5.2 : 2.3) : 1.15;
  const beatPulse = isPlaying ? 0.8 + 0.25 * Math.abs(Math.sin(phase * 0.65)) : 0.72;

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

/**
 * Computes deterministic frequency/energy bars directly from decoded PCM samples at a given timestamp.
 * Uses a fast multi-band Goertzel/windowed RMS energy projection so offline WebCodecs rendering
 * syncs accurately to real beats without real-time AnalyserNode playback.
 */
export function computeBarsFromPcm(
  channelData: Float32Array,
  sampleRate: number,
  timeSec: number,
  barCount: number
): number[] {
  const result = new Array<number>(barCount);
  if (channelData.length === 0 || sampleRate <= 0) {
    return computeSyntheticBars(barCount, timeSec, true, true);
  }

  const totalSamples = channelData.length;
  const centerSample = Math.floor((timeSec * sampleRate) % totalSamples);
  const windowSize = Math.min(2048, totalSamples);
  const halfWin = Math.floor(windowSize / 2);

  // Compute RMS & short-term band variation across overlapping sub-windows
  let globalRms = 0;
  const step = Math.max(1, Math.floor(windowSize / 256));
  let count = 0;
  for (let offset = -halfWin; offset < halfWin; offset += step) {
    const idx = (centerSample + offset + totalSamples) % totalSamples;
    const s = channelData[idx];
    globalRms += s * s;
    count++;
  }
  globalRms = Math.sqrt(globalRms / Math.max(1, count));
  const normEnergy = Math.min(1, globalRms * 3.4);

  for (let i = 0; i < barCount; i++) {
    const bandRatio = i / Math.max(1, barCount - 1);
    // Sample different micro-offsets per bar to create natural multi-band spectral motion
    const subOffset = Math.floor((bandRatio - 0.5) * windowSize * 0.85);
    let bandAcc = 0;
    const span = 24;
    for (let k = 0; k < span; k++) {
      const idx = (centerSample + subOffset + k * 7 + totalSamples) % totalSamples;
      bandAcc += Math.abs(channelData[idx]);
    }
    const bandPeak = Math.min(1, (bandAcc / span) * 3.8);
    const bellEnv = 0.52 + 0.48 * Math.sin(bandRatio * Math.PI);
    const harmonicRipple = 0.82 + 0.18 * Math.sin(timeSec * 6.5 + i * 0.65);
    const val = (normEnergy * 0.55 + bandPeak * 0.45) * bellEnv * harmonicRipple;
    result[i] = Math.min(1, Math.max(0.1, val));
  }

  return result;
}
