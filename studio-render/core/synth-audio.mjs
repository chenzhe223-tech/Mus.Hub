import fs from 'node:fs';

/**
 * Pure-code deterministic ambient/harmonic WAV synthesizer (zero external AI models).
 * Used when no local MP3/WAV track is provided so exported short videos always carry
 * warm, musical stereo audio mastered cleanly via FFmpeg.
 */
export function generateDeterministicWav({
  outPath,
  durationSec = 15,
  sampleRate = 44100,
  chordFreqs = [220, 261.63, 329.63, 392.0, 493.88],
  bpm = 88,
}) {
  const numChannels = 2;
  const totalSamples = Math.max(sampleRate, Math.round(durationSec * sampleRate));
  const dataBytes = totalSamples * numChannels * 2;
  const buf = Buffer.alloc(44 + dataBytes);

  // RIFF WAV header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buf.writeUInt16LE(numChannels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  const progression = [1, 0.8909, 1.1225, 0.9438];
  const barDur = (60 / Math.max(60, bpm)) * 4;
  const beatDur = 60 / Math.max(60, bpm);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIdx = Math.floor(t / barDur);
    const barLocalT = t - barIdx * barDur;
    const beatLocalT = t % beatDur;
    const shift = progression[barIdx % progression.length];

    // Global fade-in (0.4s) & fade-out (0.8s)
    const fadeIn = Math.min(1, t / 0.4);
    const fadeOut = Math.min(1, Math.max(0, (durationSec - t) / 0.8));
    const masterEnv = fadeIn * fadeOut;

    // Warm electric-piano style chord harmonics with gentle stereo spread
    let left = 0;
    let right = 0;
    for (let c = 0; c < chordFreqs.length; c++) {
      const f = chordFreqs[c] * shift;
      const delay = c * 0.08;
      const localT = barLocalT - delay;
      if (localT < 0) continue;
      const env = Math.min(1, localT / 0.14) * Math.exp(-localT * 0.72);
      const tone =
        Math.sin(2 * Math.PI * f * t) * 0.65 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.22 +
        Math.sin(2 * Math.PI * f * 0.5 * t) * 0.25;
      const pan = c % 2 === 0 ? 0.62 : 0.38;
      left += tone * env * pan;
      right += tone * env * (1 - pan);
    }

    // Soft rhythmic sub-kick pulse on beat
    const kickEnv = Math.exp(-beatLocalT * 18);
    const kickFreq = 58 + 75 * Math.exp(-beatLocalT * 28);
    const kick = Math.sin(2 * Math.PI * kickFreq * beatLocalT) * kickEnv * 0.32;

    const lSample = Math.max(-0.95, Math.min(0.95, (left * 0.26 + kick) * masterEnv));
    const rSample = Math.max(-0.95, Math.min(0.95, (right * 0.26 + kick) * masterEnv));

    const offset = 44 + i * 4;
    buf.writeInt16LE(Math.round(lSample * 32767), offset);
    buf.writeInt16LE(Math.round(rSample * 32767), offset + 2);
  }

  fs.writeFileSync(outPath, buf);
  return outPath;
}
