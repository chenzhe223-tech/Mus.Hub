import type { Song } from '../types';
import { CURATED_SONGS } from '../data/curated';
import {
  buildExternalMusicLinks,
  canonicalTrackKey,
  expandMusicQuery,
  hasCjk,
  localizeTrackDisplay,
  toTraditionalChinese,
  type ExternalMusicLinks,
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
  source: 'itunes' | 'apple-music' | 'deezer' | 'netease' | 'qq';
  externalUrl?: string;
  externalLinks?: ExternalMusicLinks;
  neteaseId?: string;
  qqMid?: string;
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

export function ensureExternalLinks(song: Song): ExternalMusicLinks {
  if (song.externalLinks?.netease && song.externalLinks?.qq && song.externalLinks?.apple) {
    return {
      netease: song.externalLinks.netease,
      qq: song.externalLinks.qq,
      apple: song.externalLinks.apple,
      spotify:
        song.externalLinks.spotify ||
        buildExternalMusicLinks(song.title, song.artist).spotify,
    };
  }
  return buildExternalMusicLinks(song.title, song.artist, {
    neteaseId: song.neteaseId,
    qqMid: song.qqMid,
    appleUrl: song.externalUrl,
  });
}

function mapApiTrackToSong(r: ApiTrackItem): Song {
  const loc = localizeTrackDisplay({ title: r.title, artist: r.artist, album: r.album });
  return {
    id: r.id,
    title: loc.title,
    artist: loc.artist,
    album: loc.album,
    duration: r.duration,
    cover: r.cover,
    lyric: `把这首《${loc.title}》印成一张唱片海报，送给此刻正在听歌的你。`,
    palette: null,
    previewUrl: r.previewUrl,
    chordFreqs: [220, 277.18, 329.63, 440],
    externalUrl: r.externalUrl,
    externalLinks:
      r.externalLinks ||
      buildExternalMusicLinks(loc.title, loc.artist, {
        neteaseId: r.neteaseId,
        qqMid: r.qqMid,
        appleUrl: r.externalUrl,
      }),
    source: r.source,
    neteaseId: r.neteaseId,
    qqMid: r.qqMid,
  };
}

/**
 * Browser-side JSONP query to Apple iTunes Search API.
 * Runs directly from user's own residential IP (immune to Cloudflare shared-IP 20 req/min limit)
 * AND bypasses browser CORS restrictions completely via official iTunes JSONP callback.
 */
function fetchItunesJsonp(
  term: string,
  country: 'TW' | 'HK' | 'SG' | 'CN' | 'US',
  limit = 22,
  offset = 0
): Promise<Song[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !term.trim()) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const cbName = `__sonicItunesCb_${Date.now()}_${++jsonpSeq}`;
    const win = window as unknown as Record<string, unknown>;
    // Request zh_cn for TW/HK/SG/CN so Apple returns Chinese track & album titles instead of English!
    const lang = country === 'US' ? 'en_us' : 'zh_cn';
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

    const timer = window.setTimeout(() => finish([]), 6500);

    win[cbName] = (payload: { results?: ItunesJsonpItem[] }) => {
      const items = Array.isArray(payload?.results) ? payload.results : [];
      const mapped: Song[] = items
        .filter((item) => item.trackName && item.artistName && item.artworkUrl100)
        .map((item) => {
          const rawArt = String(item.artworkUrl100 || '').replace(/100x100bb/i, '600x600bb');
          const rawPreview = item.previewUrl ? String(item.previewUrl) : null;
          const trackName = String(item.trackName).trim();
          const artistName = String(item.artistName).trim();
          return {
            id: `itunes-${country.toLowerCase()}-${String(item.trackId ?? Math.random().toString(36).slice(2))}`,
            title: trackName,
            artist: artistName,
            album: String(item.collectionName || '单曲').trim(),
            duration: formatDurationMs(Number(item.trackTimeMillis)),
            cover: proxyMediaUrl(rawArt),
            lyric: `把这首《${trackName}》印成一张唱片海报，送给此刻正在听歌的你。`,
            palette: null,
            previewUrl: rawPreview ? proxyMediaUrl(rawPreview) : null,
            chordFreqs: [220, 277.18, 329.63, 440],
            externalUrl: item.trackViewUrl,
            externalLinks: buildExternalMusicLinks(trackName, artistName, {
              appleUrl: item.trackViewUrl,
            }),
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
  let score = song.previewUrl ? 40 : 0;
  if (!queryTerms.length) return score;

  const queryHasCjk = queryTerms.some((q) => hasCjk(q));
  if (queryHasCjk && hasCjk(song.title)) {
    score += 25;
  }

  const titleNorm = toTraditionalChinese(song.title).toLowerCase();
  const artistNorm = toTraditionalChinese(song.artist).toLowerCase();
  const combined = `${titleNorm} ${artistNorm}`;

  for (const term of queryTerms) {
    const t = toTraditionalChinese(term).toLowerCase().trim();
    if (!t) continue;
    if (titleNorm === t) score += 70;
    else if (artistNorm === t) score += 55;
    else if (titleNorm.includes(t)) score += 38;
    else if (artistNorm.includes(t)) score += 32;
    else {
      const parts = t.split(/\s+/).filter(Boolean);
      let hits = 0;
      for (const p of parts) {
        if (combined.includes(p)) hits++;
      }
      if (parts.length > 0 && hits === parts.length) score += 55;
      else score += hits * 16;
    }
  }
  return score;
}

function mergeSongs(lists: Song[][], queryTerms: string[] = []): Song[] {
  const byKey = new Map<string, Song>();
  const order: string[] = [];

  for (const list of lists) {
    for (const rawSong of list) {
      if (!rawSong.cover) continue;
      // Localize Chinese artists' titles/albums to clean Simplified Chinese (e.g. "Sunny Day - Jay Chou" -> "晴天 - 周杰伦")
      const loc = localizeTrackDisplay({
        title: rawSong.title,
        artist: rawSong.artist,
        album: rawSong.album,
      });
      const s: Song = {
        ...rawSong,
        title: loc.title,
        artist: loc.artist,
        album: loc.album,
        lyric: rawSong.lyric.startsWith('把这首《')
          ? `把这首《${loc.title}》印成一张唱片海报，送给此刻正在听歌的你。`
          : rawSong.lyric,
      };
      const key = canonicalTrackKey(s.title, s.artist);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...s, externalLinks: ensureExternalLinks(s) });
        order.push(key);
      } else {
        if (!hasCjk(existing.title) && hasCjk(s.title)) {
          existing.title = s.title;
        }
        if (!hasCjk(existing.artist) && hasCjk(s.artist)) {
          existing.artist = s.artist;
        }
        if (!hasCjk(existing.album) && hasCjk(s.album)) {
          existing.album = s.album;
        }
        if (!existing.previewUrl && s.previewUrl) {
          existing.previewUrl = s.previewUrl;
        } else if (
          existing.previewUrl &&
          s.previewUrl &&
          (existing.previewUrl.includes('dzcdn.net') || existing.previewUrl.includes('deezerId=')) &&
          s.previewUrl.includes('itunes.apple.com')
        ) {
          existing.previewUrl = s.previewUrl;
        }
        if (!existing.neteaseId && s.neteaseId) {
          existing.neteaseId = s.neteaseId;
          existing.externalLinks = ensureExternalLinks({ ...existing, neteaseId: s.neteaseId });
        }
        if (!existing.qqMid && s.qqMid) {
          existing.qqMid = s.qqMid;
          existing.externalLinks = ensureExternalLinks({ ...existing, qqMid: s.qqMid });
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
  Array<{ q: string; country: 'TW' | 'HK' | 'SG' | 'CN' | 'US' }>
> = {
  hot_cn: [
    { q: '孫燕姿', country: 'SG' },
    { q: '周杰倫', country: 'TW' },
    { q: '陳奕迅', country: 'HK' },
    { q: '林俊傑', country: 'TW' },
    { q: '鄧紫棋', country: 'HK' },
    { q: '王菲', country: 'HK' },
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
    { q: '方大同', country: 'HK' },
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
    { q: '張國榮', country: 'HK' },
    { q: '王菲', country: 'HK' },
    { q: 'Beyond', country: 'HK' },
    { q: '楊千嬅', country: 'HK' },
    { q: '林憶蓮', country: 'HK' },
  ],
};

export async function discoverMusicCategory(category: DiscoverCategoryId): Promise<Song[]> {
  if (category === 'curated') {
    return CURATED_SONGS.map((s) => ({
      ...s,
      source: 'curated' as const,
      externalLinks: ensureExternalLinks(s),
    }));
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

  return CURATED_SONGS.map((s) => ({
    ...s,
    source: 'curated' as const,
    externalLinks: ensureExternalLinks(s),
  }));
}

export async function searchUniversalMusic(
  rawQuery: string,
  offset = 0
): Promise<SearchMusicResponse> {
  const cleaned = cleanClientQuery(rawQuery);
  if (!cleaned) {
    return {
      cleanedQuery: '',
      songs: CURATED_SONGS.map((s) => ({ ...s, externalLinks: ensureExternalLinks(s) })),
      hasMore: false,
      mode: 'local-only',
    };
  }

  const expanded = expandMusicQuery(cleaned);
  const queryTerms = [
    expanded.primary,
    expanded.traditional,
    expanded.songHintTrad || '',
    expanded.englishAlias || '',
  ].filter(Boolean);

  const localMatches =
    offset === 0
      ? CURATED_SONGS.filter((s) =>
          `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(cleaned.toLowerCase())
        ).map((s) => ({
          ...s,
          source: 'curated' as const,
          externalLinks: ensureExternalLinks(s),
        }))
      : [];

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

  const jsonpTasks: Array<Promise<Song[]>> = [];
  if (expanded.isCjk) {
    if (expanded.songHintTrad) {
      jsonpTasks.push(fetchItunesJsonp(expanded.songHintTrad, 'TW', 16, offset));
      jsonpTasks.push(fetchItunesJsonp(expanded.songHintTrad, 'SG', 12, offset));
    }
    jsonpTasks.push(fetchItunesJsonp(expanded.traditional, 'TW', 20, offset));
    jsonpTasks.push(fetchItunesJsonp(expanded.traditional, 'HK', 16, offset));
    jsonpTasks.push(fetchItunesJsonp(expanded.primary, 'CN', 14, offset));
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
    songs:
      localMatches.length > 0
        ? localMatches
        : CURATED_SONGS.map((s) => ({ ...s, externalLinks: ensureExternalLinks(s) })),
    hasMore: false,
    mode: 'local-only',
  };
}

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
