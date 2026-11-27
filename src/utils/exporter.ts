import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { Palette, PosterConfig, ProductionMode, PromoPlan, Song } from '../types';
import { RATIOS } from '../data/curated';
import { renderPoster } from '../engine/posterRenderer';
import { renderMultiSceneProduction } from '../engine/multiSceneRenderer';
import { audioEngine } from './audioEngine';
import { computeBarsFromPcm, formatSecondsMMSS, parseDurationTextToSec } from './deterministicMotion';

export function isMobileOrInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|MicroMessenger|Weibo|QQ\/|Mobile|HarmonyOS/i.test(
    navigator.userAgent
  );
}

export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Triggers a clean Blob-backed file download (far more reliable than huge `data:` URIs on mobile Chrome & Safari).
 */
export function triggerImageDownload(dataUrl: string, songTitle: string): boolean {
  try {
    const safeName = (songTitle || 'poster').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `sonic-archive-${safeName}.png`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts native mobile Web Share Sheet (saves straight to iOS/Android Camera Roll / 相册),
 * returning 'shared' | 'cancelled' | 'unsupported'.
 */
export async function tryNativeSaveImage(
  dataUrl: string,
  songTitle: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return 'unsupported';
  }
  try {
    const safeName = (songTitle || 'poster').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], `sonic-archive-${safeName}.png`, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) {
      return 'unsupported';
    }
    await navigator.share({
      title: `音画 · ${songTitle}`,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export function exportPosterPng(
  canvas: HTMLCanvasElement,
  songTitle: string,
  downloadNow = true
): string | null {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (downloadNow) {
      triggerImageDownload(dataUrl, songTitle);
    }
    return dataUrl;
  } catch {
    return null;
  }
}

export interface VideoRecordResult {
  blobUrl: string;
  mimeType: string;
  ext: 'mp4' | 'webm';
  hasAudio: boolean;
  encoderMode: 'webcodecs' | 'mediarecorder';
  posterDataUrl?: string;
}

export interface RecordVideoOptions {
  canvas: HTMLCanvasElement;
  song: Song;
  config?: PosterConfig;
  palette?: Palette;
  coverImage?: HTMLImageElement | null;
  productionMode?: ProductionMode;
  promoPlan?: PromoPlan;
  lyricsLines?: string[];
  shareUrl?: string;
  durationMs?: number;
  fps?: number;
  onProgress: (percent: number) => void;
}

function triggerBlobDownload(blobUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function preloadImageElements(urls: string[]): Promise<HTMLImageElement[]> {
  if (!urls.length) return [];
  const loaded = await Promise.all(
    urls.map(
      (src) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const im = new Image();
          if (!src.startsWith('data:')) im.crossOrigin = 'anonymous';
          im.onload = () => resolve(im);
          im.onerror = () => resolve(null);
          im.src = src;
        })
    )
  );
  return loaded.filter((x): x is HTMLImageElement => Boolean(x));
}

/**
 * Deterministic zero-drop MP4 export using WebCodecs (VideoEncoder + AudioEncoder) + mp4-muxer.
 * Renders every frame offline via `renderPoster(..., { deterministic })` with real PCM spectrum sync.
 */
async function tryWebCodecsDeterministicMp4(
  options: RecordVideoOptions
): Promise<VideoRecordResult | null> {
  if (
    typeof VideoEncoder === 'undefined' ||
    typeof VideoFrame === 'undefined' ||
    typeof AudioEncoder === 'undefined' ||
    typeof AudioData === 'undefined'
  ) {
    return null;
  }

  const {
    song,
    config,
    palette,
    coverImage = null,
    productionMode = 'poster',
    promoPlan,
    lyricsLines,
    shareUrl = '',
    durationMs = 5000,
    fps = 30,
    onProgress,
  } = options;
  if (!config || !palette) return null;

  const customImageEls =
    productionMode === 'promo' && promoPlan?.customImages?.length
      ? await preloadImageElements(promoPlan.customImages)
      : [];

  const dim = RATIOS[config.ratio] || RATIOS['3:4'];
  const width = dim.w & ~1;
  const height = dim.h & ~1;
  const durationSec = Math.max(1, durationMs / 1000);

  // Probe H.264 video support
  const videoCandidates = ['avc1.420028', 'avc1.42E01E', 'avc1.4D002A'];
  let chosenVideoCodec: string | null = null;
  for (const codec of videoCandidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 5_500_000,
        framerate: fps,
      });
      if (support.supported) {
        chosenVideoCodec = codec;
        break;
      }
    } catch {
      // Ignore
    }
  }
  if (!chosenVideoCodec) return null;

  // Decode track or synthesize curated warm chords offline
  onProgress(3);
  const { buffer: audioBuffer, hasRealTrackAudio } = await audioEngine.decodeExportAudioBuffer(
    song,
    durationSec
  );

  let audioConfig: { codec: 'mp4a.40.2'; numberOfChannels: number; sampleRate: number; bitrate: number } | null =
    null;
  if (audioBuffer) {
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    try {
      const aSupport = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        numberOfChannels: channels,
        sampleRate,
        bitrate: 128_000,
      });
      if (aSupport.supported) {
        audioConfig = { codec: 'mp4a.40.2', numberOfChannels: channels, sampleRate, bitrate: 128_000 };
      }
    } catch {
      audioConfig = null;
    }
    // If real track audio exists but browser lacks AAC AudioEncoder, let MediaRecorder handle real audio
    if (!audioConfig && hasRealTrackAudio) {
      return null;
    }
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return null;

  // Check if coverImage would taint offscreen canvas
  try {
    offCtx.clearRect(0, 0, 2, 2);
    if (coverImage && coverImage.naturalWidth > 0) {
      offCtx.drawImage(coverImage, 0, 0, 2, 2);
      offCtx.getImageData(0, 0, 1, 1);
    }
  } catch {
    throw new Error('当前外部封面受跨域限制无法导出，请切换曲目或上传本地封面图。');
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    fastStart: 'in-memory',
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    ...(audioConfig
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: audioConfig.numberOfChannels,
            sampleRate: audioConfig.sampleRate,
          },
        }
      : {}),
  });

  let encodeError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encodeError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: chosenVideoCodec,
    width,
    height,
    bitrate: 5_500_000,
    framerate: fps,
  });

  let audioEncoder: AudioEncoder | null = null;
  if (audioConfig && audioBuffer) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (err) => {
        encodeError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure(audioConfig);

    // Feed planar float32 AudioData chunks covering durationSec
    const sr = audioConfig.sampleRate;
    const chCount = audioConfig.numberOfChannels;
    const totalOutSamples = Math.round(durationSec * sr);
    const chunkFrames = 1024;
    const srcLen = audioBuffer.length;
    const chData = Array.from({ length: chCount }, (_, c) =>
      audioBuffer.getChannelData(Math.min(c, audioBuffer.numberOfChannels - 1))
    );

    for (let offset = 0; offset < totalOutSamples; offset += chunkFrames) {
      if (encodeError) break;
      const frames = Math.min(chunkFrames, totalOutSamples - offset);
      const planar = new Float32Array(frames * chCount);
      for (let c = 0; c < chCount; c++) {
        const src = chData[c];
        const dstBase = c * frames;
        for (let i = 0; i < frames; i++) {
          planar[dstBase + i] = src[(offset + i) % srcLen];
        }
      }
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: sr,
        numberOfFrames: frames,
        numberOfChannels: chCount,
        timestamp: Math.round((offset / sr) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }
  }

  const totalFrames = Math.round(durationSec * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);
  const today = new Date();
  const dateLabel = `'${String(today.getFullYear()).slice(2)} ${String(today.getMonth() + 1).padStart(2, '0')} ${String(today.getDate()).padStart(2, '0')}`;
  const totalSongSec = parseDurationTextToSec(song.duration || '03:45');
  const pcmMono = audioBuffer ? audioBuffer.getChannelData(0) : null;
  const pcmSr = audioBuffer ? audioBuffer.sampleRate : 44100;

  const dynamicConfig: PosterConfig = { ...config, mode: 'dynamic' };
  let posterDataUrl: string | undefined;

  for (let f = 0; f < totalFrames; f++) {
    if (encodeError) break;
    const tSec = f / fps;
    const bars = pcmMono ? computeBarsFromPcm(pcmMono, pcmSr, tSec, 36) : undefined;
    const curSongSec = (totalSongSec * 0.25 + tSec) % totalSongSec;

    if (productionMode !== 'poster') {
      renderMultiSceneProduction({
        ctx: offCtx,
        canvas: offCanvas,
        mode: productionMode,
        song,
        config: dynamicConfig,
        palette,
        coverImage,
        customImages: customImageEls,
        promoPlan,
        lyricsLines,
        shareUrl,
        tSec,
        durationSec,
        bars,
        isPlaying: true,
      });
    } else {
      renderPoster({
        ctx: offCtx,
        canvas: offCanvas,
        song,
        config: dynamicConfig,
        palette,
        coverImage,
        shareUrl,
        nowMs: tSec * 1000,
        startMs: 0,
        isPlaying: true,
        deterministic: {
          tSec,
          bars,
          progress: curSongSec / totalSongSec,
          currentLabel: formatSecondsMMSS(curSongSec),
          dateLabel,
        },
      });
    }

    const frame = new VideoFrame(offCanvas, {
      timestamp: Math.round(tSec * 1_000_000),
      duration: frameDurationUs,
    });
    if (f === 0) {
      try {
        posterDataUrl = offCanvas.toDataURL('image/png');
      } catch {
        // Ignore
      }
    }
    const keyFrame = f % (fps * 2) === 0;
    videoEncoder.encode(frame, { keyFrame });
    frame.close();

    // Yield periodically so UI progress updates smoothly
    if (f % 4 === 0 || f === totalFrames - 1) {
      onProgress(Math.min(95, 8 + Math.round(((f + 1) / totalFrames) * 87)));
      await new Promise<void>((r) => window.setTimeout(r, 0));
    }
  }

  if (encodeError) {
    try {
      videoEncoder.close();
      audioEncoder?.close();
    } catch {
      // Ignore
    }
    return null;
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (audioEncoder) {
    await audioEncoder.flush();
    audioEncoder.close();
  }
  muxer.finalize();
  onProgress(100);

  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  const blobUrl = URL.createObjectURL(blob);
  if (!isMobileOrInAppBrowser()) {
    const safeName = (song.title || 'motion').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
    triggerBlobDownload(blobUrl, `sonic-archive-motion-${safeName}.mp4`);
  }

  return {
    blobUrl,
    mimeType: 'video/mp4',
    ext: 'mp4',
    hasAudio: Boolean(audioConfig && hasRealTrackAudio),
    encoderMode: 'webcodecs',
    posterDataUrl,
  };
}

/**
 * Exports a deterministic dynamic poster/short video with real audio.
 * Prioritizes WebCodecs + mp4-muxer (zero dropped frames, true H.264 MP4),
 * seamlessly falling back to MediaRecorder if unsupported.
 */
export async function recordDynamicVideoWithAudio(
  options: RecordVideoOptions
): Promise<VideoRecordResult> {
  const { canvas, song, durationMs = 5000, onProgress } = options;

  // Attempt zero-drop deterministic WebCodecs MP4 export first
  const webCodecsResult = await tryWebCodecsDeterministicMp4(options);
  if (webCodecsResult) {
    return webCodecsResult;
  }

  // Fallback: live MediaRecorder capture
  if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    throw new Error('当前手机浏览器暂不支持录制动态视频，请点击「导出 PNG」保存高清静态海报。');
  }

  let videoStream: MediaStream;
  try {
    videoStream = canvas.captureStream(30);
  } catch {
    throw new Error('当前外部封面受跨域限制无法录制，请切换曲目或上传本地封面图。');
  }

  // Prepare isolated real-song PCM audio track (leaves mobile nativeAudio untouched)
  const recAudio = await audioEngine.startRecordingAudio(song);

  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach((tr) => combinedStream.addTrack(tr));

  const hasAudio = Boolean(recAudio.stream && recAudio.hasRealTrackAudio);
  if (recAudio.stream && recAudio.hasRealTrackAudio) {
    recAudio.stream.getAudioTracks().forEach((tr) => {
      combinedStream.addTrack(tr);
    });
  }

  const mimeCandidates = hasAudio
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
    : [
        'video/mp4;codecs=avc1.42E01E',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/mp4',
        'video/webm',
      ];

  const supportedMime =
    mimeCandidates.find(
      (m) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)
    ) || '';

  return new Promise<VideoRecordResult>((resolve, reject) => {
    let recorder: MediaRecorder;
    try {
      recorder = supportedMime
        ? new MediaRecorder(combinedStream, {
            mimeType: supportedMime,
            videoBitsPerSecond: 5200000,
            audioBitsPerSecond: 128000,
          })
        : new MediaRecorder(combinedStream);
    } catch {
      recAudio.cleanup();
      reject(new Error('视频编码器初始化失败，请改用高清 PNG 保存。'));
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onerror = () => {
      recAudio.cleanup();
      reject(new Error('视频录制过程中出现异常。'));
    };

    recorder.onstop = () => {
      recAudio.cleanup();
      const mimeType = supportedMime || 'video/webm';
      const ext: 'mp4' | 'webm' = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (!isMobileOrInAppBrowser()) {
        const safeName = (song.title || 'motion').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
        triggerBlobDownload(blobUrl, `sonic-archive-motion-${safeName}.${ext}`);
      }

      resolve({ blobUrl, mimeType, ext, hasAudio, encoderMode: 'mediarecorder' });
    };

    recorder.start(200);
    const recStart = performance.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((performance.now() - recStart) / durationMs) * 100));
      onProgress(pct);
    }, 100);

    window.setTimeout(() => {
      window.clearInterval(timer);
      onProgress(100);
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationMs);
  });
}

export interface StudioProjectBundle {
  schemaVersion: '1.0';
  exportedAt: string;
  durationSec: number;
  fps: number;
  scenePreset: 'lyric-mv-9x16' | 'poster-loop';
  song: Song;
  config: PosterConfig;
  palette: Palette;
  promoPlan?: PromoPlan;
  lyricsLines: string[];
  shareUrl: string;
}

/**
 * Exports a portable StudioProjectBundle JSON consumed directly by `studio-render/` (HyperFrames + FFmpeg).
 */
export function buildStudioProjectBundle(params: {
  song: Song;
  config: PosterConfig;
  palette: Palette;
  promoPlan?: PromoPlan;
  lyricsLines: string[];
  shareUrl: string;
  durationSec: number;
  scenePreset?: 'lyric-mv-9x16' | 'poster-loop';
}): StudioProjectBundle {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    durationSec: params.durationSec,
    fps: 30,
    scenePreset: params.scenePreset || (params.config.ratio === '9:16' ? 'lyric-mv-9x16' : 'poster-loop'),
    song: params.song,
    config: params.config,
    palette: params.palette,
    promoPlan: params.promoPlan,
    lyricsLines: params.lyricsLines,
    shareUrl: params.shareUrl,
  };
}

export function exportStudioProjectBundle(params: {
  song: Song;
  config: PosterConfig;
  palette: Palette;
  promoPlan?: PromoPlan;
  lyricsLines: string[];
  shareUrl: string;
  durationSec: number;
}): StudioProjectBundle {
  const bundle = buildStudioProjectBundle(params);
  const safeName = (params.song.title || 'project').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const blobUrl = URL.createObjectURL(blob);
  triggerBlobDownload(blobUrl, `sonic-project-${safeName}.json`);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return bundle;
}
