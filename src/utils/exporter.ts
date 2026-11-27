import type { Song } from '../types';
import { audioEngine } from './audioEngine';

export function exportPosterPng(
  canvas: HTMLCanvasElement,
  songTitle: string,
  downloadNow = true
): string | null {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (downloadNow) {
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (songTitle || 'poster').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      a.download = `sparkme-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
    throw new Error('当前浏览器不支持动态视频录制，请使用高清 PNG 导出。');
  }

  // Ensure audio is playing during recording so exported video has lush sound!
  const wasPlaying = audioEngine.isPlaying();
  if (!wasPlaying) {
    await audioEngine.play(song);
  }

  let videoStream: MediaStream;
  try {
    videoStream = canvas.captureStream(30);
  } catch {
    throw new Error('当前外部封面受跨域限制无法录制，请切换精选曲目或上传本地封面图。');
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
      reject(new Error('视频编码器初始化失败，请改用 PNG 导出。'));
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

      const safeName = (song.title || 'motion').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `sparkme-motion-${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

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
