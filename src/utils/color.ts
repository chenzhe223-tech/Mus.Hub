import type { Palette } from '../types';
import { PRESET_PALETTES } from '../data/curated';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Safely parses hex (#rgb, #rrggbb, #rrggbbaa) or rgb()/rgba() strings into RGB.
 */
export function parseColorToRgb(color: string): RGB {
  const c = (color || '').trim();
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) || 0,
        g: parseInt(hex[1] + hex[1], 16) || 0,
        b: parseInt(hex[2] + hex[2], 16) || 0,
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0,
      };
    }
  }
  const match = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (match) {
    return {
      r: Math.min(255, Math.max(0, Math.round(Number(match[1])))),
      g: Math.min(255, Math.max(0, Math.round(Number(match[2])))),
      b: Math.min(255, Math.max(0, Math.round(Number(match[3])))),
    };
  }
  return { r: 236, g: 72, b: 153 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Safe alpha modifier for ANY CSS color (hex or rgb). Never produces invalid "rgb(...)55".
 */
export function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColorToRgb(color);
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(3)})`;
}

/**
 * Extracts a curated, balanced poster palette from any loaded image (always returns hex colors).
 */
export function extractPaletteFromImage(img: HTMLImageElement): Palette {
  try {
    const sample = document.createElement('canvas');
    sample.width = 32;
    sample.height = 32;
    const sctx = sample.getContext('2d');
    if (!sctx) return PRESET_PALETTES.midnight;
    sctx.drawImage(img, 0, 0, 32, 32);
    const data = sctx.getImageData(0, 0, 32, 32).data;

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    let bestScore = -1;
    let acc1: RGB = { r: 236, g: 72, b: 153 };
    let secondScore = -1;
    let acc2: RGB = { r: 99, g: 102, b: 241 };

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sumR += r;
      sumG += g;
      sumB += b;
      count++;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const vibrancy = sat * (1 - Math.abs(lum - 0.58));

      if (vibrancy > bestScore && max > 75) {
        bestScore = vibrancy;
        acc1 = {
          r: Math.min(255, Math.round(r * 1.12 + 12)),
          g: Math.min(255, Math.round(g * 1.12 + 12)),
          b: Math.min(255, Math.round(b * 1.12 + 12)),
        };
      } else if (
        vibrancy > secondScore &&
        max > 70 &&
        Math.abs(r - acc1.r) + Math.abs(g - acc1.g) + Math.abs(b - acc1.b) > 130
      ) {
        secondScore = vibrancy;
        acc2 = { r, g, b };
      }
    }

    if (count === 0) return PRESET_PALETTES.midnight;

    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;
    const avgLum = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;

    // Very bright paper-like cover -> elegant light theme
    if (avgLum > 0.78) {
      return {
        bg1: rgbToHex({
          r: Math.min(250, avgR * 0.98 + 8),
          g: Math.min(248, avgG * 0.98 + 6),
          b: Math.min(244, avgB * 0.97 + 4),
        }),
        bg2: rgbToHex({
          r: Math.max(190, avgR * 0.87),
          g: Math.max(185, avgG * 0.86),
          b: Math.max(180, avgB * 0.85),
        }),
        accent: rgbToHex({
          r: Math.round(acc1.r * 0.65),
          g: Math.round(acc1.g * 0.65),
          b: Math.round(acc1.b * 0.65),
        }),
        accent2: rgbToHex(acc2),
        text: '#1c1917',
        muted: '#57534e',
        light: true,
      };
    }

    return {
      bg1: rgbToHex({
        r: Math.max(10, avgR * 0.2),
        g: Math.max(12, avgG * 0.2),
        b: Math.max(18, avgB * 0.26),
      }),
      bg2: rgbToHex({
        r: Math.max(24, avgR * 0.54),
        g: Math.max(22, avgG * 0.5),
        b: Math.max(36, avgB * 0.62),
      }),
      accent: rgbToHex(acc1),
      accent2: rgbToHex(acc2),
      text: '#f8fafc',
      muted: '#cbd5e1',
      light: false,
    };
  } catch {
    return PRESET_PALETTES.midnight;
  }
}
