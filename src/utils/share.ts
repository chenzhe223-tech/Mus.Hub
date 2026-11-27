import type { Palette, PosterConfig, Song } from '../types';
import { CURATED_SONGS } from '../data/curated';

export interface SharedPayload {
  title: string;
  artist: string;
  album: string;
  duration: string;
  lyric: string;
  cover?: string;
  curatedId?: string;
  template: PosterConfig['template'];
  ratio: PosterConfig['ratio'];
  paletteKey: PosterConfig['paletteKey'];
  fontStyle: PosterConfig['fontStyle'];
  authorName?: string;
  caption?: string;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function unwrapProxyUrl(cover?: string): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith('/api/proxy?url=')) {
    try {
      const decoded = decodeURIComponent(cover.slice('/api/proxy?url='.length));
      return decoded.startsWith('https://') ? decoded : undefined;
    } catch {
      return undefined;
    }
  }
  return cover.startsWith('https://') ? cover : undefined;
}

/**
 * Builds a compact, real shareable URL (works in static hosting & QR scanning).
 */
export function buildShareUrl(
  song: Song,
  config: PosterConfig,
  authorName?: string,
  caption?: string
): string {
  const isCurated = CURATED_SONGS.some((s) => s.id === song.id);
  const payload: SharedPayload = {
    title: song.title.slice(0, 48),
    artist: song.artist.slice(0, 40),
    album: song.album.slice(0, 40),
    duration: song.duration,
    lyric: config.lyric.slice(0, 80),
    template: config.template,
    ratio: config.ratio,
    paletteKey: config.paletteKey,
    fontStyle: config.fontStyle,
    authorName: authorName?.slice(0, 20),
    caption: caption?.slice(0, 90),
  };

  if (isCurated) {
    payload.curatedId = song.id;
  } else {
    const cleanHttpsCover = unwrapProxyUrl(song.cover);
    if (cleanHttpsCover && cleanHttpsCover.length < 220) {
      payload.cover = cleanHttpsCover;
    }
  }

  const encoded = toBase64Url(JSON.stringify(payload));
  const origin =
    typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin + window.location.pathname
      : 'https://sparkme.studio/';
  return `${origin}#share=${encoded}`;
}

export function parseShareHash(hash: string): {
  song: Song;
  config: PosterConfig;
  authorName: string;
  caption: string;
  palette?: Palette | null;
} | null {
  if (!hash || !hash.includes('share=')) return null;
  try {
    const raw = hash.split('share=')[1].split('&')[0];
    const data = JSON.parse(fromBase64Url(raw)) as SharedPayload;
    const curated = data.curatedId
      ? CURATED_SONGS.find((s) => s.id === data.curatedId)
      : undefined;

    const proxiedSharedCover =
      data.cover && data.cover.startsWith('https://')
        ? `/api/proxy?url=${encodeURIComponent(data.cover)}`
        : undefined;

    const song: Song = {
      id: curated ? curated.id : `shared-${Date.now()}`,
      title: data.title || curated?.title || '未知曲目',
      artist: data.artist || curated?.artist || '未知歌手',
      album: data.album || curated?.album || '单曲',
      duration: data.duration || curated?.duration || '03:45',
      cover: proxiedSharedCover || curated?.cover || CURATED_SONGS[0].cover,
      lyric: data.lyric || curated?.lyric || '',
      palette: curated?.palette || null,
      previewUrl: curated?.previewUrl || null,
      chordFreqs: curated?.chordFreqs || [220, 261.63, 329.63, 392.0],
    };

    const config: PosterConfig = {
      mode: 'dynamic',
      template: data.template || 'vinyl',
      ratio: data.ratio || '3:4',
      paletteKey: data.paletteKey || 'auto',
      fontStyle: data.fontStyle || 'modern',
      lyric: data.lyric || song.lyric,
      showLyric: true,
      showWave: true,
      showProgress: true,
      showQr: true,
      filmGrain: true,
    };

    return {
      song,
      config,
      authorName: data.authorName || '音画创作者',
      caption: data.caption || `把这首《${song.title}》分享给你。`,
      palette: curated?.palette || null,
    };
  } catch {
    return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}
