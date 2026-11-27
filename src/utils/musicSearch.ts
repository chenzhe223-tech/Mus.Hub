import type { Song } from '../types';
import { CURATED_SONGS } from '../data/curated';
import {
  canonicalTrackKey,
  expandMusicQuery,
  toTraditionalChinese,
} from '../../shared/musicAliases';

export type DiscoverCategoryId =
  | 'hot_cn'
  | 'pop_west'
  | 'hot_global'
  | 'indie'
  | 'rnb_jazz'
  | 'jpop'
  | 'cantopop'
  | 'curated';

export interface SearchMusicResponse {
  cleanedQuery: string;
  songs: Song[];
  hasMore: boolean;
  mode: 'edge' | 'hybrid' | 'direct-fallback' | 'local-only';
}

export interface LyricsResult {
  found: boolean;
  lines: string[];
  highlights: string[];
}

interface ApiTrackItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
  previewUrl: string | null;
  source: 'itunes' | 'deezer' | 'netease';
  externalUrl?: string;
  neteaseId?: string;
}

interface ItunesJsonpItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

const discoverCache = new Map<DiscoverCategoryId, Song[]>();
const lyricsCache = new Map<string, LyricsResult>();
let jsonpSeq = 0;

function formatDurationMs(ms?: number): string {
  if (!ms || isNaN(ms)) return '03:30';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function cleanClientQuery(raw: string): string {
  let q = (raw || '').trim();
  if (!q) return '';
  const withoutUrls = q.replace(/https?:\/\/\S+/gi, ' ').trim();
  const bracketMatch = withoutUrls.match(/[《「『]([^》」』]{1,40})[》」』]/);
  const shareArtistMatch = withoutUrls.match(/分享\s*([^\s的《「]{1,20})\s*的(?:单曲|歌曲|音乐)/);
  if (bracketMatch) {
    const songTitle = bracketMatch[1].trim();
    const artistHint = shareArtistMatch ? shareArtistMatch[1].trim() : '';
    return artistHint ? `${artistHint} ${songTitle}` : songTitle;
  }
  q = withoutUrls
    .replace(/@网易云音乐|@QQ音乐|来自网易云音乐|来自QQ音乐|分享给你一首歌|推荐单曲|单曲/gi, ' ')
    .replace(/[()（）【】[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return q || raw.trim();
}

function proxyMediaUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const httpsUrl = rawUrl.replace(/^http:\/\//i, 'https://');
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return `/api/proxy?url=${encodeURIComponent(httpsUrl)}`;
  }
  return httpsUrl;
}

function mapApiTrackToSong(r: ApiTrackItem): Song {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    album: r.album,
    duration: r.duration,
    cover: r.cover,
    lyric: `把这首《${r.title}》印成一张唱片海报，送给此刻正在听歌的你。`,
    palette: null,
    previewUrl: r.previewUrl,
    chordFreqs: [220, 277.18, 329.63, 440],
    externalUrl: r.externalUrl,
    source: r.source,
    neteaseId: r.neteaseId,
  };
}

/**
 * Browser-side JSONP query to Apple iTunes Search API.
 * Runs directly from the user's own residential IP (never hits Cloudflare Workers shared-IP 20 req/min limit)
 * AND bypasses browser CORS restrictions completely via official iTunes JSONP callback!
 */
function fetchItunesJsonp(
  term: string,
  country: 'TW' | 'CN' | 'HK' | 'US',
  limit = 22,
  offset = 0
): Promise<Song[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !term.trim()) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const cbName = `__sonicItunesCb_${Date.now()}_${++jsonpSeq}`;
    const win = window as unknown as Record<string, unknown>;
    const lang = country === 'US' ? 'en_us' : country === 'CN' ? 'zh_cn' : 'zh_tw';
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      try {
        delete win[cbName];
      } catch {
        win[cbName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const finish = (songs: Song[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(songs);
    };

    const timer = window.setTimeout(() => finish([]), 6000);

    win[cbName] = (payload: { results?: ItunesJsonpItem[] }) => {
      const items = Array.isArray(payload?.results) ? payload.results : [];
      const mapped: Song[] = items
        .filter((item) => item.trackName && item.artistName && item.artworkUrl100)
        .map((item) => {
          const rawArt = String(item.artworkUrl100 || '').replace(/100x100bb/i, '600x600bb');
          const rawPreview = item.previewUrl ? String(item.previewUrl) : null;
          const trackName = String(item.trackName).trim();
          return {
            id: `itunes-${country.toLowerCase()}-${String(item.trackId ?? Math.random().toString(36).slice(2))}`,
            title: trackName,
            artist: String(item.artistName).trim(),
            album: String(item.collectionName || '单曲').trim(),
            duration: formatDurationMs(Number(item.trackTimeMillis)),
            cover: proxyMediaUrl(rawArt),
            lyric: `把这首《${trackName}》印成一张唱片海报，送给此刻正在听歌的你。`,
            palette: null,
            previewUrl: rawPreview ? proxyMediaUrl(rawPreview) : null,
            chordFreqs: [220, 277.18, 329.63, 440],
            externalUrl: item.trackViewUrl,
            source: 'itunes' as const,
          };
        });
      finish(mapped);
    };

    script.async = true;
    script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&media=music&entity=song&limit=${limit}&offset=${offset}&country=${country}&lang=${lang}&callback=${cbName}`;
    script.onerror = () => finish([]);
    document.head.appendChild(script);
  });
}

function scoreSongRelevance(song: Song, queryTerms: string[]): number {
  let score = song.previewUrl ? 30 : 0;
  if (!queryTerms.length) return score;

  const titleNorm = toTraditionalChinese(song.title).toLowerCase();
  const artistNorm = toTraditionalChinese(song.artist).toLowerCase();
  const combined = `${titleNorm} ${artistNorm}`;

  for (const term of queryTerms) {
    const t = toTraditionalChinese(term).toLowerCase().trim();
    if (!t) continue;
    if (titleNorm === t) score += 60;
    else if (artistNorm === t) score += 50;
    else if (titleNorm.includes(t)) score += 35;
    else if (artistNorm.includes(t)) score += 30;
    else {
      const parts = t.split(/\s+/).filter(Boolean);
      let hits = 0;
      for (const p of parts) {
        if (combined.includes(p)) hits++;
      }
      if (parts.length > 0 && hits === parts.length) score += 45;
      else score += hits * 15;
    }
  }
  return score;
}

function mergeSongs(lists: Song[][], queryTerms: string[] = []): Song[] {
  const byKey = new Map<string, Song>();
  const order: string[] = [];

  for (const list of lists) {
    for (const s of list) {
      if (!s.cover) continue;
      const key = canonicalTrackKey(s.title, s.artist);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...s });
        order.push(key);
      } else {
        if (!existing.previewUrl && s.previewUrl) {
          existing.previewUrl = s.previewUrl;
        }
        if (!existing.neteaseId && s.neteaseId) {
          existing.neteaseId = s.neteaseId;
        }
      }
    }
  }

  const merged = order.map((k) => byKey.get(k)!);
  if (queryTerms.length > 0) {
    merged.sort((a, b) => scoreSongRelevance(b, queryTerms) - scoreSongRelevance(a, queryTerms));
  } else {
    merged.sort((a, b) => Number(Boolean(b.previewUrl)) - Number(Boolean(a.previewUrl)));
  }
  return merged;
}

const CLIENT_DISCOVER_SEEDS: Record<
  Exclude<DiscoverCategoryId, 'curated'>,
  Array<{ q: string; country: 'TW' | 'CN' | 'US' }>
> = {
  hot_cn: [
    { q: '孫燕姿', country: 'TW' },
    { q: '周杰倫', country: 'TW' },
    { q: '陳奕迅', country: 'TW' },
    { q: '林俊傑', country: 'TW' },
    { q: '鄧紫棋', country: 'TW' },
    { q: '王菲', country: 'TW' },
  ],
  pop_west: [
    { q: 'Taylor Swift', country: 'US' },
    { q: 'The Weeknd', country: 'US' },
    { q: 'Bruno Mars', country: 'US' },
    { q: 'Billie Eilish', country: 'US' },
    { q: 'Coldplay', country: 'US' },
    { q: 'Adele', country: 'US' },
  ],
  hot_global: [
    { q: 'Sabrina Carpenter', country: 'US' },
    { q: 'Lady Gaga', country: 'US' },
    { q: 'The Weeknd', country: 'US' },
    { q: 'Billie Eilish', country: 'US' },
    { q: 'Ed Sheeran', country: 'US' },
  ],
  indie: [
    { q: '告五人', country: 'TW' },
    { q: '落日飛車', country: 'TW' },
    { q: '草東沒有派對', country: 'TW' },
    { q: '陳綺貞', country: 'TW' },
    { q: '房東的貓', country: 'CN' },
  ],
  rnb_jazz: [
    { q: '方大同', country: 'TW' },
    { q: '陶喆', country: 'TW' },
    { q: 'Bill Evans', country: 'US' },
    { q: 'Laufey', country: 'US' },
    { q: 'Norah Jones', country: 'US' },
  ],
  jpop: [
    { q: '坂本龍一', country: 'TW' },
    { q: '米津玄師', country: 'US' },
    { q: 'YOASOBI', country: 'US' },
    { q: '久石讓', country: 'US' },
    { q: 'Fujii Kaze', country: 'US' },
  ],
  cantopop: [
    { q: '張國榮', country: 'TW' },
    { q: '王菲', country: 'TW' },
    { q: 'Beyond', country: 'TW' },
    { q: '楊千嬅', country: 'TW' },
    { q: '林憶蓮', country: 'TW' },
  ],
};

/**
 * Loads live curated music charts & genre channels (up to 30 tracks per channel!)
 * via Edge API + automatic Browser JSONP fallback if Edge upstream is rate-limited.
 */
export async function discoverMusicCategory(category: DiscoverCategoryId): Promise<Song[]> {
  if (category === 'curated') {
    return CURATED_SONGS.map((s) => ({ ...s, source: 'curated' as const }));
  }

  const cached = discoverCache.get(category);
  if (cached && cached.length > 0) return cached;

  let edgeSongs: Song[] = [];
  try {
    const res = await fetch(`/api/discover?category=${encodeURIComponent(category)}`);
    if (res.ok) {
      const json = (await res.json()) as { results?: ApiTrackItem[] };
      edgeSongs = (json.results || []).map(mapApiTrackToSong);
    }
  } catch {
    // Fall through to client JSONP fallback
  }

  if (edgeSongs.length >= 10) {
    discoverCache.set(category, edgeSongs);
    return edgeSongs;
  }

  // Fallback / supplement with Browser JSONP directly from user's residential IP
  const seeds = CLIENT_DISCOVER_SEEDS[category] || CLIENT_DISCOVER_SEEDS.hot_cn;
  const batches = await Promise.all(seeds.map((s) => fetchItunesJsonp(s.q, s.country, 6, 0)));
  const interleaved: Song[] = [];
  const maxLen = Math.max(...batches.map((b) => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const batch of batches) {
      if (batch[i]) interleaved.push(batch[i]);
    }
  }

  const merged = mergeSongs([edgeSongs, interleaved]).slice(0, 30);
  if (merged.length > 0) {
    discoverCache.set(category, merged);
    return merged;
  }

  return CURATED_SONGS.map((s) => ({ ...s, source: 'curated' as const }));
}

/**
 * Hybrid Universal Music Search:
 * Runs Cloudflare Edge API (Deezer + Multi-Region Apple + NetEase + Edge Cache)
 * IN PARALLEL with Browser-Side iTunes JSONP (Simplified -> Traditional + English Alias expanded,
 * running from user's own IP so Apple NEVER rate-limits!).
 */
export async function searchUniversalMusic(
  rawQuery: string,
  offset = 0
): Promise<SearchMusicResponse> {
  const cleaned = cleanClientQuery(rawQuery);
  if (!cleaned) {
    return {
      cleanedQuery: '',
      songs: CURATED_SONGS.slice(),
      hasMore: false,
      mode: 'local-only',
    };
  }

  const expanded = expandMusicQuery(cleaned);
  const queryTerms = [expanded.primary, expanded.traditional, expanded.englishAlias || ''].filter(
    Boolean
  );

  const localMatches =
    offset === 0
      ? CURATED_SONGS.filter((s) =>
          `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(cleaned.toLowerCase())
        ).map((s) => ({ ...s, source: 'curated' as const }))
      : [];

  // 1. Edge API request
  const edgePromise = (async (): Promise<{
    cleanedQuery: string;
    songs: Song[];
    hasMore: boolean;
  }> => {
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(rawQuery)}&limit=28&offset=${offset}`
      );
      if (res.ok) {
        const json = (await res.json()) as {
          cleanedQuery?: string;
          hasMore?: boolean;
          results?: ApiTrackItem[];
        };
        return {
          cleanedQuery: json.cleanedQuery || cleaned,
          songs: (json.results || []).map(mapApiTrackToSong),
          hasMore: Boolean(json.hasMore),
        };
      }
    } catch {
      // Ignore; browser JSONP still succeeds!
    }
    return { cleanedQuery: cleaned, songs: [], hasMore: false };
  })();

  // 2. Browser JSONP iTunes search (zero shared-IP rate limits, full Mandopop TW/CN + Western US coverage!)
  const jsonpTasks: Array<Promise<Song[]>> = [];
  if (expanded.isCjk) {
    jsonpTasks.push(fetchItunesJsonp(expanded.traditional, 'TW', 22, offset));
    jsonpTasks.push(fetchItunesJsonp(expanded.primary, 'CN', 16, offset));
    if (expanded.englishAlias) {
      jsonpTasks.push(fetchItunesJsonp(expanded.englishAlias, 'US', 12, offset));
    }
  } else {
    jsonpTasks.push(fetchItunesJsonp(expanded.englishAlias || expanded.primary, 'US', 24, offset));
    jsonpTasks.push(fetchItunesJsonp(expanded.primary, 'TW', 10, offset));
  }

  const [edgeRes, ...jsonpBatches] = await Promise.all([edgePromise, ...jsonpTasks]);
  const jsonpSongs = jsonpBatches.flat();
  const merged = mergeSongs([localMatches, ...jsonpBatches, edgeRes.songs], queryTerms);

  if (merged.length > 0) {
    const mode =
      edgeRes.songs.length > 0 && jsonpSongs.length > 0
        ? 'hybrid'
        : edgeRes.songs.length > 0
          ? 'edge'
          : 'direct-fallback';
    return {
      cleanedQuery: edgeRes.cleanedQuery || cleaned,
      songs: merged.slice(0, 32),
      hasMore: (edgeRes.hasMore || jsonpSongs.length >= 12) && offset < 80,
      mode,
    };
  }

  return {
    cleanedQuery: cleaned,
    songs: localMatches.length > 0 ? localMatches : CURATED_SONGS.slice(),
    hasMore: false,
    mode: 'local-only',
  };
}

/**
 * Fetches real song lyrics via /api/lyrics (NetEase Chinese Lyrics + LRCLIB) with in-memory cache.
 */
export async function fetchSongLyrics(
  title: string,
  artist: string,
  neteaseId?: string
): Promise<LyricsResult> {
  const key = `${neteaseId || ''}::${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
  const cached = lyricsCache.get(key);
  if (cached) return cached;

  if (!title.trim() && !neteaseId) {
    return { found: false, lines: [], highlights: [] };
  }

  try {
    const params = new URLSearchParams({ title, artist });
    if (neteaseId) params.set('neteaseId', neteaseId);
    const res = await fetch(`/api/lyrics?${params.toString()}`);
    if (!res.ok) throw new Error('Lyrics request failed');
    const data = (await res.json()) as LyricsResult;
    const result: LyricsResult = {
      found: Boolean(data.found && Array.isArray(data.lines) && data.lines.length > 0),
      lines: Array.isArray(data.lines) ? data.lines : [],
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
    };
    lyricsCache.set(key, result);
    return result;
  } catch {
    return { found: false, lines: [], highlights: [] };
  }
}
