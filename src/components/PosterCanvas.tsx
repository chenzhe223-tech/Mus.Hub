import React, { useEffect, useRef } from 'react';
import type { Palette, PosterConfig, ProductionMode, PromoPlan, Song } from '../types';
import { renderPoster, type DeterministicFrameContext } from '../engine/posterRenderer';
import { renderMultiSceneProduction } from '../engine/multiSceneRenderer';
import { extractPaletteFromImage } from '../utils/color';
import { PRESET_PALETTES } from '../data/curated';

interface PosterCanvasProps {
  song: Song;
  config: PosterConfig;
  palette: Palette;
  shareUrl: string;
  isPlaying: boolean;
  isRecording?: boolean;
  deterministic?: DeterministicFrameContext;
  productionMode?: ProductionMode;
  promoPlan?: PromoPlan;
  lyricsLines?: string[];
  durationSec?: number;
  directorPlaying?: boolean;
  playbackRate?: number;
  scrubTimeSec?: number | null;
  onTimeUpdate?: (tSec: number) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  coverImageRefOut?: React.MutableRefObject<HTMLImageElement | null>;
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
  deterministic,
  productionMode = 'poster',
  promoPlan,
  lyricsLines,
  durationSec = 6,
  directorPlaying = true,
  playbackRate = 1,
  scrubTimeSec = null,
  onTimeUpdate,
  canvasRef,
  coverImageRefOut,
  onPaletteExtracted,
  className = '',
}) => {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const resolvedRef = canvasRef || internalRef;
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const customImagesRef = useRef<HTMLImageElement[]>([]);
  const startMsRef = useRef<number>(performance.now());
  const virtualTimeRef = useRef<number>(0);
  const lastRafMsRef = useRef<number>(performance.now());
  const lastUiReportRef = useRef<number>(0);

  const latestPropsRef = useRef({
    song,
    config,
    palette,
    shareUrl,
    isPlaying,
    isRecording,
    deterministic,
    productionMode,
    promoPlan,
    lyricsLines,
    durationSec,
    directorPlaying,
    playbackRate,
    scrubTimeSec,
    onTimeUpdate,
  });
  latestPropsRef.current = {
    song,
    config,
    palette,
    shareUrl,
    isPlaying,
    isRecording,
    deterministic,
    productionMode,
    promoPlan,
    lyricsLines,
    durationSec,
    directorPlaying,
    playbackRate,
    scrubTimeSec,
    onTimeUpdate,
  };

  // Sync virtual playhead when user scrubs explicitly
  useEffect(() => {
    if (typeof scrubTimeSec === 'number' && Number.isFinite(scrubTimeSec)) {
      virtualTimeRef.current = Math.max(0, Math.min(durationSec, scrubTimeSec));
    }
  }, [scrubTimeSec, durationSec]);

  // Reset playhead to 0 when switching production mode
  useEffect(() => {
    virtualTimeRef.current = 0;
    lastRafMsRef.current = performance.now();
  }, [productionMode]);

  const drawFrame = (nowMs: number) => {
    const canvas = resolvedRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cur = latestPropsRef.current;

    if (cur.productionMode !== 'poster') {
      const safeDur = Math.max(1, cur.durationSec);
      const tSec =
        !cur.isRecording && typeof cur.scrubTimeSec === 'number'
          ? Math.max(0, Math.min(safeDur, cur.scrubTimeSec))
          : virtualTimeRef.current;

      renderMultiSceneProduction({
        ctx,
        canvas,
        mode: cur.productionMode,
        song: cur.song,
        config: cur.config,
        palette: cur.palette,
        coverImage: coverImageRef.current,
        customImages: customImagesRef.current,
        promoPlan: cur.promoPlan,
        lyricsLines: cur.lyricsLines,
        shareUrl: cur.shareUrl,
        tSec,
        durationSec: safeDur,
        isPlaying: cur.isPlaying || cur.directorPlaying,
      });
      return;
    }

    renderPoster({
      ctx,
      canvas,
      song: cur.song,
      config: cur.config,
      palette: cur.palette,
      coverImage: coverImageRef.current,
      shareUrl: cur.shareUrl,
      nowMs,
      startMs: startMsRef.current,
      isPlaying: cur.isPlaying,
      deterministic: cur.deterministic,
    });
  };

  // Load cover image whenever song.cover changes & reliably extract palette
  useEffect(() => {
    let cancelled = false;
    const url = song.cover;
    if (!url) {
      coverImageRef.current = null;
      if (coverImageRefOut) coverImageRefOut.current = null;
      drawFrame(performance.now());
      return;
    }

    const img = new Image();
    let resolvedUrl = url;
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
      if (coverImageRefOut) coverImageRefOut.current = img;
      if (onPaletteExtracted) {
        if (song.palette) {
          onPaletteExtracted(song.palette);
        } else {
          onPaletteExtracted(extractPaletteFromImage(img));
        }
      }
      drawFrame(performance.now());
    };

    img.onerror = () => {
      if (cancelled) return;
      coverImageRef.current = null;
      if (coverImageRefOut) coverImageRefOut.current = null;
      if (onPaletteExtracted) {
        onPaletteExtracted(song.palette || PRESET_PALETTES.midnight);
      }
      drawFrame(performance.now());
    };

    img.src = resolvedUrl;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.cover, song.id]);

  // Preload user-uploaded custom promo gallery images whenever customImages changes
  const customImagesKey = (promoPlan?.customImages || []).join('|');
  useEffect(() => {
    let cancelled = false;
    const urls = promoPlan?.customImages || [];
    if (urls.length === 0) {
      customImagesRef.current = [];
      drawFrame(performance.now());
      return;
    }

    const loaded: HTMLImageElement[] = [];
    let pending = urls.length;
    urls.forEach((src, idx) => {
      const im = new Image();
      if (!src.startsWith('data:')) im.crossOrigin = 'anonymous';
      im.onload = () => {
        if (cancelled) return;
        loaded[idx] = im;
        pending--;
        if (pending === 0) {
          customImagesRef.current = loaded.filter(Boolean);
          drawFrame(performance.now());
        }
      };
      im.onerror = () => {
        if (cancelled) return;
        pending--;
        if (pending === 0) {
          customImagesRef.current = loaded.filter(Boolean);
          drawFrame(performance.now());
        }
      };
      im.src = src;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customImagesKey]);

  // Animation loop for poster dynamic mode OR multi-scene director mode
  useEffect(() => {
    let rafId = 0;
    const isMulti = productionMode !== 'poster';
    const shouldAnimate = isMulti
      ? (directorPlaying && scrubTimeSec === null) || isRecording
      : config.mode === 'dynamic' || isRecording || isPlaying;

    if (!shouldAnimate) {
      drawFrame(performance.now());
      return;
    }

    lastRafMsRef.current = performance.now();
    const tick = (now: number) => {
      const cur = latestPropsRef.current;
      const dtSec = Math.min(0.1, Math.max(0, (now - lastRafMsRef.current) / 1000));
      lastRafMsRef.current = now;

      if (cur.productionMode !== 'poster') {
        const safeDur = Math.max(1, cur.durationSec);
        if (cur.isRecording) {
          virtualTimeRef.current = (virtualTimeRef.current + dtSec) % safeDur;
        } else if (typeof cur.scrubTimeSec === 'number') {
          virtualTimeRef.current = Math.max(0, Math.min(safeDur, cur.scrubTimeSec));
        } else if (cur.directorPlaying) {
          virtualTimeRef.current = (virtualTimeRef.current + dtSec * cur.playbackRate) % safeDur;
        }
        if (cur.onTimeUpdate && now - lastUiReportRef.current > 45) {
          lastUiReportRef.current = now;
          cur.onTimeUpdate(virtualTimeRef.current);
        }
      }

      drawFrame(now);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config,
    palette,
    song,
    shareUrl,
    isPlaying,
    isRecording,
    productionMode,
    promoPlan,
    lyricsLines,
    durationSec,
    directorPlaying,
    playbackRate,
    scrubTimeSec,
  ]);

  return (
    <canvas
      ref={resolvedRef}
      width={900}
      height={1200}
      className={`poster-elevation rounded-2xl max-w-full h-auto object-contain transition-all duration-300 ${className}`}
    />
  );
};
