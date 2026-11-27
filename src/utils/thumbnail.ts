import type { Palette, PosterConfig, Song } from '../types';
import { renderPoster } from '../engine/posterRenderer';
import { buildShareUrl } from './share';

/**
 * Generates an offscreen poster thumbnail image for social feed cards and saved drafts.
 */
export function generatePosterThumbnail(
  song: Song,
  config: PosterConfig,
  palette: Palette,
  authorName?: string
): Promise<string> {
  return new Promise((resolve) => {
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      resolve(song.cover);
      return;
    }

    const shareUrl = buildShareUrl(song, config, authorName);

    const drawWithImage = (img: HTMLImageElement | null) => {
      renderPoster({
        ctx,
        canvas: offscreen,
        song,
        config: { ...config, mode: 'static' },
        palette,
        coverImage: img,
        shareUrl,
        nowMs: 1200,
        startMs: 0,
        isPlaying: false,
      });

      // Downscale gracefully for fast social feed cards & small localStorage footprint
      const thumb = document.createElement('canvas');
      const targetW = 480;
      const targetH = Math.round((offscreen.height / offscreen.width) * targetW);
      thumb.width = targetW;
      thumb.height = targetH;
      const tctx = thumb.getContext('2d');
      if (tctx) {
        tctx.drawImage(offscreen, 0, 0, targetW, targetH);
        try {
          resolve(thumb.toDataURL('image/jpeg', 0.86));
          return;
        } catch {
          // Tainted canvas fallback
        }
      }
      resolve(song.cover);
    };

    if (!song.cover) {
      drawWithImage(null);
      return;
    }

    const img = new Image();
    if (!song.cover.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => drawWithImage(img);
    img.onerror = () => drawWithImage(null);
    img.src = song.cover;
  });
}
