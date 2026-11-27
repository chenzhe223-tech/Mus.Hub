import type { Song } from '../types';
import { audioEngine } from './audioEngine';

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
  ext: string;
  hasAudio: boolean;
}

/**
 * Records a high-bitrate dynamic video from Canvas + live Web Audio track (with sound!).
 */
export async function recordDynamicVideoWithAudio(options: {
  canvas: HTMLCanvasElement;
  song: Song;
  durationMs?: number;
  onProgress: (percent: number) => void;
}): Promise<VideoRecordResult> {
  const { canvas, song, durationMs = 5000, onProgress } = options;

  if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    throw new Error('当前手机浏览器暂不支持录制动态视频，请点击「导出 PNG」保存高清静态海报。');
  }

  const wasPlaying = audioEngine.isPlaying();
  if (!wasPlaying) {
    await audioEngine.play(song);
  }

  let videoStream: MediaStream;
  try {
    videoStream = canvas.captureStream(30);
  } catch {
    throw new Error('当前外部封面受跨域限制无法录制，请切换曲目或上传本地封面图。');
  }

  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach((tr) => combinedStream.addTrack(tr));

  let hasAudio = false;
  const audioStream = audioEngine.getAudioStream();
  if (audioStream) {
    audioStream.getAudioTracks().forEach((tr) => {
      combinedStream.addTrack(tr);
      hasAudio = true;
    });
  }

  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
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
          })
        : new MediaRecorder(combinedStream);
    } catch {
      reject(new Error('视频编码器初始化失败，请改用高清 PNG 保存。'));
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onerror = () => {
      reject(new Error('视频录制过程中出现异常。'));
    };

    recorder.onstop = () => {
      if (!wasPlaying) {
        audioEngine.stop();
      }
      const mimeType = supportedMime || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (!isMobileOrInAppBrowser()) {
        const safeName = (song.title || 'motion').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `sonic-archive-motion-${safeName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      resolve({ blobUrl, mimeType, ext, hasAudio });
    };

    recorder.start(200);
    const recStart = performance.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((performance.now() - recStart) / durationMs) * 100));
      onProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }
    }, 100);
  });
}
