import React, { useEffect, useRef } from 'react';
import type { Palette, PosterConfig, Song } from '../types';
import { renderPoster } from '../engine/posterRenderer';
import { extractPaletteFromImage } from '../utils/color';
import { PRESET_PALETTES } from '../data/curated';

interface PosterCanvasProps {
  song: Song;
  config: PosterConfig;
  palette: Palette;
  shareUrl: string;
  isPlaying: boolean;
  isRecording?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onPaletteExtracted?: (palette: Palette) => void;
  className?: string;
}

export const PosterCanvas: React.FC<PosterCanvasProps> = ({
  song,
  config,
  palette,
  shareUrl,
  isPlaying,
  isRecording = false,
  canvasRef,
  onPaletteExtracted,
  className = '',
}) => {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const resolvedRef = canvasRef || internalRef;
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const startMsRef = useRef<number>(performance.now());
  const latestPropsRef = useRef({ song, config, palette, shareUrl, isPlaying, isRecording });
  latestPropsRef.current = { song, config, palette, shareUrl, isPlaying, isRecording };

  const renderOnce = () => {
    const canvas = resolvedRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cur = latestPropsRef.current;
    renderPoster({
      ctx,
      canvas,
      song: cur.song,
      config: cur.config,
      palette: cur.palette,
      coverImage: coverImageRef.current,
      shareUrl: cur.shareUrl,
      nowMs: performance.now(),
      startMs: startMsRef.current,
      isPlaying: cur.isPlaying,
    });
  };

  // Load cover image whenever song.cover changes & reliably extract palette
  useEffect(() => {
    let cancelled = false;
    const url = song.cover;
    if (!url) {
      coverImageRef.current = null;
      renderOnce();
      return;
    }

    const img = new Image();
    let resolvedUrl = url;
    // Automatically proxy external http(s) covers through same-origin /api/proxy so Canvas NEVER taints!
    if (
      /^https?:\/\//i.test(url) &&
      typeof window !== 'undefined' &&
      window.location.protocol.startsWith('http') &&
      !url.startsWith(window.location.origin)
    ) {
      resolvedUrl = `/api/proxy?url=${encodeURIComponent(url.replace(/^http:\/\//i, 'https://'))}`;
    }
    if (!resolvedUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (cancelled) return;
      coverImageRef.current = img;
      if (onPaletteExtracted) {
        if (song.palette) {
          onPaletteExtracted(song.palette);
        } else {
          onPaletteExtracted(extractPaletteFromImage(img));
        }
      }
      renderOnce();
    };

    img.onerror = () => {
      if (cancelled) return;
      coverImageRef.current = null;
      if (onPaletteExtracted) {
        onPaletteExtracted(song.palette || PRESET_PALETTES.midnight);
      }
      renderOnce();
    };

    img.src = resolvedUrl;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.cover, song.id]);

  // Animation loop when dynamic or recording; single crisp render when static
  useEffect(() => {
    let rafId = 0;
    const shouldAnimate = config.mode === 'dynamic' || isRecording || isPlaying;

    if (!shouldAnimate) {
      renderOnce();
      return;
    }

    const tick = (now: number) => {
      const canvas = resolvedRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cur = latestPropsRef.current;
          renderPoster({
            ctx,
            canvas,
            song: cur.song,
            config: cur.config,
            palette: cur.palette,
            coverImage: coverImageRef.current,
            shareUrl: cur.shareUrl,
            nowMs: now,
            startMs: startMsRef.current,
            isPlaying: cur.isPlaying,
          });
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, palette, song, shareUrl, isPlaying, isRecording]);

  return (
    <canvas
      ref={resolvedRef}
      width={900}
      height={1200}
      className={`poster-elevation rounded-2xl max-w-full h-auto object-contain transition-all duration-300 ${className}`}
    />
  );
};
