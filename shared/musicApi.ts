import {
  buildExternalMusicLinks,
  canonicalTrackKey,
  expandMusicQuery,
  toTraditionalChinese,
  type ExternalMusicLinks,
} from './musicAliases';

export interface MusicApiEnv {
  APPLE_MUSIC_TOKEN?: string;
  MUSIC_GATEWAY_URL?: string;
  ACR_HOST?: string;
  ACR_ACCESS_KEY?: string;
  ACR_ACCESS_SECRET?: string;
  AUDD_API_TOKEN?: string;
  MINIMAX_API_KEY?: string;
  GEMINI_API_KEY?: string;
  VOICE_CLONE_ENDPOINT?: string;
  VOICE_CLONE_SECRET?: string;
}

export interface UnifiedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationMs: number;
  cover: string;
  rawCover: string;
  previewUrl: string | null;
  rawPreviewUrl: string | null;
  source: 'itunes' | 'apple-music' | 'deezer' | 'netease' | 'qq';
  externalUrl?: string;
  externalLinks: ExternalMusicLinks;
  neteaseId?: string;
  qqMid?: string;
}

const ALLOWED_PROXY_SUFFIXES = [
  '.mzstatic.com',
  '.itunes.apple.com',
  '.dzcdn.net',
  '.deezer.com',
  '.music.126.net',
  '.gtimg.cn',
  '.qqmusic.qq.com',
];

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
      ...extraHeaders,
    },
  });
}

function formatDurationMs(ms: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '03:30';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = 5500,
  extraHeaders?: Record<string, string>
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json',
        ...extraHeaders,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function cleanMusicQuery(raw: string): string {
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

export function buildProxyPath(targetUrl: string): string {
  const httpsUrl = targetUrl.replace(/^http:\/\//i, 'https://');
  return `/api/proxy?url=${encodeURIComponent(httpsUrl)}`;
}

/**
 * Official Apple Music Catalog API (auto-activates when APPLE_MUSIC_TOKEN secret is configured).
 * High quota, zero shared-IP throttling, official 30s AAC previews across TW/HK/SG/US/CN!
 */
async function searchAppleMusicOfficial(
  term: string,
  storefront: 'tw' | 'hk' | 'sg' | 'us' | 'cn',
  token: string,
  limit = 20,
  offset = 0
): Promise<UnifiedTrack[]> {
  if (!term.trim() || !token) return [];
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=${encodeURIComponent(
    term
  )}&types=songs&limit=${limit}&offset=${offset}`;

  interface AppleMusicResp {
    results?: {
      songs?: {
        data?: Array<{
          id?: string;
          attributes?: {
            name?: string;
            artistName?: string;
            albumName?: string;
            durationInMillis?: number;
            url?: string;
            artwork?: { url?: string };
            previews?: Array<{ url?: string }>;
          };
        }>;
      };
    };
  }

  const data = await fetchJsonWithTimeout<AppleMusicResp>(url, 5000, {
    Authorization: `Bearer ${token}`,
  });
  const songs = data?.results?.songs?.data;
  if (!songs?.length) return [];

  return songs
    .filter((s) => s.attributes?.name && s.attributes?.artistName)
    .map((s) => {
      const a = s.attributes!;
      const rawCover = (a.artwork?.url || '').replace('{w}', '600').replace('{h}', '600');
      const rawPreview = a.previews?.[0]?.url || null;
      const ms = Number(a.durationInMillis) || 210000;
      const title = a.name!.trim();
      const artist = a.artistName!.trim();
      return {
        id: `apple-${storefront}-${s.id || Math.random().toString(36).slice(2)}`,
        title,
        artist,
        album: (a.albumName || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'apple-music' as const,
        externalUrl: a.url,
        externalLinks: buildExternalMusicLinks(title, artist, { appleUrl: a.url }),
      };
    });
}

async function searchItunes(
  term: string,
  country: 'CN' | 'TW' | 'HK' | 'SG' | 'US',
  limit: number,
  offset = 0
): Promise<UnifiedTrack[]> {
  if (!term.trim()) return [];
  const lang = country === 'US' ? 'en_us' : country === 'CN' ? 'zh_cn' : 'zh_tw';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&media=music&entity=song&limit=${limit}&offset=${offset}&country=${country}&lang=${lang}`;

  interface ItunesResponse {
    results?: Array<{
      trackId?: number;
      trackName?: string;
      artistName?: string;
      collectionName?: string;
      trackTimeMillis?: number;
      artworkUrl100?: string;
      previewUrl?: string;
      trackViewUrl?: string;
    }>;
  }

  const data = await fetchJsonWithTimeout<ItunesResponse>(url, 5000);
  if (!data?.results?.length) return [];

  return data.results
    .filter((item) => item.trackName && item.artistName)
    .map((item) => {
      const rawCover = (item.artworkUrl100 || '').replace(/100x100bb/i, '600x600bb');
      const rawPreview = item.previewUrl || null;
      const ms = Number(item.trackTimeMillis) || 210000;
      const title = item.trackName!.trim();
      const artist = item.artistName!.trim();
      return {
        id: `itunes-${country.toLowerCase()}-${item.trackId ?? Math.random().toString(36).slice(2)}`,
        title,
        artist,
        album: (item.collectionName || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'itunes' as const,
        externalUrl: item.trackViewUrl,
        externalLinks: buildExternalMusicLinks(title, artist, { appleUrl: item.trackViewUrl }),
      };
    });
}

async function searchDeezer(term: string, limit: number, offset = 0): Promise<UnifiedTrack[]> {
  if (!term.trim()) return [];
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(
    term
  )}&limit=${limit}&index=${offset}`;

  interface DeezerResponse {
    data?: Array<{
      id?: number;
      title?: string;
      duration?: number;
      preview?: string;
      link?: string;
      artist?: { name?: string };
      album?: { title?: string; cover_xl?: string; cover_big?: string; cover_medium?: string };
    }>;
  }

  const data = await fetchJsonWithTimeout<DeezerResponse>(url, 5000);
  if (!data?.data?.length) return [];

  return data.data
    .filter((item) => item.title && item.artist?.name)
    .map((item) => {
      const rawCover = item.album?.cover_big || item.album?.cover_xl || item.album?.cover_medium || '';
      const rawPreview = item.preview || null;
      const ms = (Number(item.duration) || 210) * 1000;
      const title = item.title!.trim();
      const artist = item.artist!.name!.trim();
      return {
        id: `deezer-${item.id ?? Math.random().toString(36).slice(2)}`,
        title,
        artist,
        album: (item.album?.title || 'Single').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'deezer' as const,
        externalUrl: item.link,
        externalLinks: buildExternalMusicLinks(title, artist),
      };
    });
}

/**
 * QQ Music public search endpoint (best-effort metadata + exact QQ Music songmid deep link + HD cover).
 */
async function searchQQMusic(term: string, limit: number, page = 1): Promise<UnifiedTrack[]> {
  if (!term.trim()) return [];
  const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(
    term
  )}&n=${limit}&p=${page}&format=json&cr=1&new_json=1`;

  interface QQSearchResp {
    data?: {
      song?: {
        list?: Array<{
          mid?: string;
          songmid?: string;
          name?: string;
          songname?: string;
          interval?: number;
          singer?: Array<{ name?: string }>;
          album?: { name?: string; mid?: string };
          albumname?: string;
          albummid?: string;
        }>;
      };
    };
  }

  const data = await fetchJsonWithTimeout<QQSearchResp>(url, 3800, {
    Referer: 'https://y.qq.com/',
  });
  const list = data?.data?.song?.list;
  if (!list?.length) return [];

  return list
    .filter((s) => (s.name || s.songname) && (s.mid || s.songmid))
    .map((s) => {
      const mid = (s.mid || s.songmid)!;
      const albumMid = s.album?.mid || s.albummid || '';
      const rawCover = albumMid
        ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg`
        : '';
      const title = (s.name || s.songname || '').trim();
      const artist =
        (s.singer || [])
          .map((a) => a.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(' / ') || '未知歌手';
      const ms = (Number(s.interval) || 210) * 1000;
      return {
        id: `qq-${mid}`,
        qqMid: mid,
        title,
        artist,
        album: (s.album?.name || s.albumname || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: null,
        rawPreviewUrl: null,
        source: 'qq' as const,
        externalUrl: `https://y.qq.com/n/ryqq/songDetail/${mid}`,
        externalLinks: buildExternalMusicLinks(title, artist, { qqMid: mid }),
      };
    });
}

/**
 * NetEase Cloud Music search (tries cloudsearch/pc then fallback get/web; provides exact neteaseId + CN lyrics).
 */
async function searchNetease(term: string, limit: number, offset = 0): Promise<UnifiedTrack[]> {
  if (!term.trim()) return [];
  const endpoints = [
    `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(
      term
    )}&type=1&limit=${limit}&offset=${offset}`,
    `https://music.163.com/api/search/get/web?csrf_token=&type=1&offset=${offset}&total=true&limit=${limit}&s=${encodeURIComponent(
      term
    )}`,
  ];

  interface NeteaseSong {
    id?: number;
    name?: string;
    dt?: number;
    duration?: number;
    ar?: Array<{ name?: string }>;
    artists?: Array<{ name?: string }>;
    al?: { name?: string; picUrl?: string };
    album?: { name?: string; picUrl?: string; artist?: { img1v1Url?: string } };
  }
  interface NeteaseResponse {
    result?: { songs?: NeteaseSong[] };
  }

  let songs: NeteaseSong[] | undefined;
  for (const ep of endpoints) {
    const data = await fetchJsonWithTimeout<NeteaseResponse>(ep, 3500, {
      Referer: 'https://music.163.com/',
    });
    if (data?.result?.songs?.length) {
      songs = data.result.songs;
      break;
    }
  }
  if (!songs?.length) return [];

  return songs
    .filter((s) => s.id && s.name && (s.ar?.length || s.artists?.length))
    .map((s) => {
      const pic = s.al?.picUrl || s.album?.picUrl || s.album?.artist?.img1v1Url || '';
      const rawCover = pic ? `${pic.replace(/^http:\/\//i, 'https://')}?param=600y600` : '';
      const artistList = s.ar || s.artists || [];
      const artist =
        artistList
          .map((a) => a.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(' / ') || '未知歌手';
      const ms = Number(s.dt || s.duration) || 210000;
      const title = s.name!.trim();
      const neteaseId = String(s.id);
      return {
        id: `netease-${neteaseId}`,
        neteaseId,
        title,
        artist,
        album: (s.al?.name || s.album?.name || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: null,
        rawPreviewUrl: null,
        source: 'netease' as const,
        externalUrl: `https://music.163.com/#/song?id=${neteaseId}`,
        externalLinks: buildExternalMusicLinks(title, artist, { neteaseId }),
      };
    });
}

function scoreTrackRelevance(track: UnifiedTrack, queryTerms: string[]): number {
  let score = track.rawPreviewUrl ? 40 : 0;
  if (!queryTerms.length) return score;

  const titleNorm = toTraditionalChinese(track.title).toLowerCase();
  const artistNorm = toTraditionalChinese(track.artist).toLowerCase();
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

function mergeAndDedupeTracks(lists: UnifiedTrack[][], queryTerms: string[] = []): UnifiedTrack[] {
  const byKey = new Map<string, UnifiedTrack>();
  const orderedKeys: string[] = [];

  for (const list of lists) {
    for (const track of list) {
      if (!track.rawCover) continue;
      const key = canonicalTrackKey(track.title, track.artist);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, track);
        orderedKeys.push(key);
      } else {
        if (!existing.neteaseId && track.neteaseId) {
          existing.neteaseId = track.neteaseId;
          existing.externalLinks.netease = track.externalLinks.netease;
        }
        if (!existing.qqMid && track.qqMid) {
          existing.qqMid = track.qqMid;
          existing.externalLinks.qq = track.externalLinks.qq;
        }
        if (!existing.previewUrl && track.previewUrl) {
          existing.previewUrl = track.previewUrl;
          existing.rawPreviewUrl = track.rawPreviewUrl;
        }
        if (track.externalUrl?.includes('music.apple.com')) {
          existing.externalLinks.apple = track.externalUrl;
        }
      }
    }
  }

  const deduped = orderedKeys.map((k) => byKey.get(k)!);
  if (queryTerms.length > 0) {
    deduped.sort((a, b) => scoreTrackRelevance(b, queryTerms) - scoreTrackRelevance(a, queryTerms));
  } else {
    deduped.sort((a, b) => Number(Boolean(b.rawPreviewUrl)) - Number(Boolean(a.rawPreviewUrl)));
  }
  return deduped;
}

export async function searchUnifiedTracks(
  rawQ: string,
  opts?: { limit?: number; offset?: number; env?: MusicApiEnv }
): Promise<{
  cleanedQuery: string;
  expanded: ReturnType<typeof expandMusicQuery>;
  tracks: UnifiedTrack[];
  hasMore: boolean;
}> {
  const cleaned = cleanMusicQuery(rawQ);
  const limit = Math.min(40, Math.max(8, opts?.limit || 28));
  const offset = Math.max(0, opts?.offset || 0);
  const expanded = expandMusicQuery(cleaned);

  if (!cleaned) {
    return { cleanedQuery: '', expanded, tracks: [], hasMore: false };
  }

  const queryTerms = [
    expanded.primary,
    expanded.traditional,
    expanded.songHintTrad || '',
    expanded.englishAlias || '',
  ].filter(Boolean);

  const tasks: Array<Promise<UnifiedTrack[]>> = [];
  const appleToken = opts?.env?.APPLE_MUSIC_TOKEN;

  // 1. Official Apple Music API if developer token is present
  if (appleToken) {
    const storefront = expanded.isCjk ? 'tw' : 'us';
    tasks.push(
      searchAppleMusicOfficial(
        expanded.songHintTrad || expanded.traditional,
        storefront,
        appleToken,
        24,
        offset
      )
    );
    if (expanded.isCjk) {
      tasks.push(searchAppleMusicOfficial(expanded.traditional, 'hk', appleToken, 14, offset));
    }
  }

  // 2. Deezer (50 req/5s generous limit, real 30s MP3 previews!)
  if (expanded.englishAlias) {
    tasks.push(searchDeezer(expanded.englishAlias, 20, offset));
  }
  if (expanded.songHintTrad && expanded.songHintTrad !== expanded.englishAlias) {
    tasks.push(searchDeezer(expanded.songHintTrad, 14, offset));
  }
  tasks.push(searchDeezer(expanded.traditional, 16, offset));

  // 3. Multi-Region Apple iTunes (TW + HK + SG + CN + US)
  if (expanded.isCjk) {
    if (expanded.songHintTrad) {
      tasks.push(searchItunes(expanded.songHintTrad, 'TW', 16, offset));
      tasks.push(searchItunes(expanded.songHintTrad, 'SG', 12, offset));
    }
    tasks.push(searchItunes(expanded.traditional, 'TW', 18, offset));
    tasks.push(searchItunes(expanded.traditional, 'HK', 14, offset));
    tasks.push(searchItunes(expanded.primary, 'CN', 14, offset));
    tasks.push(searchNetease(expanded.primary, 12, offset));
    tasks.push(searchQQMusic(expanded.primary, 10, Math.floor(offset / 10) + 1));
  } else {
    tasks.push(searchItunes(expanded.englishAlias || expanded.primary, 'US', 24, offset));
    tasks.push(searchItunes(expanded.primary, 'TW', 10, offset));
  }

  const batches = await Promise.all(tasks);
  const deduped = mergeAndDedupeTracks(batches, queryTerms);

  return {
    cleanedQuery: cleaned,
    expanded,
    tracks: deduped.slice(0, limit),
    hasMore: deduped.length >= 10 && offset < 80,
  };
}

async function handleSearch(url: URL, env?: MusicApiEnv): Promise<Response> {
  const rawQ = url.searchParams.get('q') || '';
  const limit = Math.min(40, Math.max(8, Number(url.searchParams.get('limit')) || 28));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const { cleanedQuery, expanded, tracks, hasMore } = await searchUnifiedTracks(rawQ, {
    limit,
    offset,
    env,
  });

  return jsonResponse(
    {
      query: rawQ,
      cleanedQuery,
      expanded,
      offset,
      total: tracks.length,
      hasMore,
      results: tracks,
    },
    200,
    {
      'Cache-Control': tracks.length > 0 ? 'public, max-age=3600' : 'no-store',
    }
  );
}

async function fetchDeezerGlobalChart(limit = 28): Promise<UnifiedTrack[]> {
  interface DeezerChartResp {
    data?: Array<{
      id?: number;
      title?: string;
      duration?: number;
      preview?: string;
      link?: string;
      artist?: { name?: string };
      album?: { title?: string; cover_xl?: string; cover_big?: string; cover_medium?: string };
    }>;
  }

  const data = await fetchJsonWithTimeout<DeezerChartResp>(
    `https://api.deezer.com/chart/0/tracks?limit=${limit}`,
    5000
  );
  if (!data?.data?.length) return [];

  return data.data
    .filter((item) => item.title && item.artist?.name)
    .map((item) => {
      const rawCover = item.album?.cover_big || item.album?.cover_xl || item.album?.cover_medium || '';
      const rawPreview = item.preview || null;
      const ms = (Number(item.duration) || 210) * 1000;
      const title = item.title!.trim();
      const artist = item.artist!.name!.trim();
      return {
        id: `deezer-chart-${item.id}`,
        title,
        artist,
        album: (item.album?.title || 'Global Chart').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'deezer' as const,
        externalUrl: item.link,
        externalLinks: buildExternalMusicLinks(title, artist),
      };
    });
}

const DISCOVER_SEEDS: Record<
  string,
  Array<{ q: string; dz?: string; country: 'CN' | 'TW' | 'HK' | 'SG' | 'US' }>
> = {
  hot_cn: [
    { q: '孫燕姿', dz: 'Stefanie Sun', country: 'SG' },
    { q: '周杰倫', dz: 'Jay Chou', country: 'TW' },
    { q: '陳奕迅', dz: 'Eason Chan', country: 'HK' },
    { q: '林俊傑', dz: 'JJ Lin', country: 'TW' },
    { q: '鄧紫棋', dz: 'G.E.M.', country: 'HK' },
    { q: '王菲', dz: 'Faye Wong', country: 'HK' },
  ],
  pop_west: [
    { q: 'Taylor Swift', dz: 'Taylor Swift', country: 'US' },
    { q: 'The Weeknd', dz: 'The Weeknd', country: 'US' },
    { q: 'Bruno Mars', dz: 'Bruno Mars', country: 'US' },
    { q: 'Billie Eilish', dz: 'Billie Eilish', country: 'US' },
    { q: 'Coldplay', dz: 'Coldplay', country: 'US' },
    { q: 'Adele', dz: 'Adele', country: 'US' },
  ],
  indie: [
    { q: '告五人', dz: 'Accusefive', country: 'TW' },
    { q: '落日飛車', dz: 'Sunset Rollercoaster', country: 'TW' },
    { q: '草東沒有派對', dz: 'No Party For Cao Dong', country: 'TW' },
    { q: '陳綺貞', dz: 'Cheer Chen', country: 'TW' },
    { q: '房東的貓', dz: '房东的猫', country: 'CN' },
  ],
  rnb_jazz: [
    { q: '方大同', dz: 'Khalil Fong', country: 'HK' },
    { q: '陶喆', dz: 'David Tao', country: 'TW' },
    { q: 'Bill Evans', dz: 'Bill Evans', country: 'US' },
    { q: 'Laufey', dz: 'Laufey', country: 'US' },
    { q: 'Norah Jones', dz: 'Norah Jones', country: 'US' },
  ],
  jpop: [
    { q: '坂本龍一', dz: 'Ryuichi Sakamoto', country: 'TW' },
    { q: '米津玄師', dz: 'Kenshi Yonezu', country: 'US' },
    { q: 'YOASOBI', dz: 'YOASOBI', country: 'US' },
    { q: '久石讓', dz: 'Joe Hisaishi', country: 'US' },
    { q: 'Fujii Kaze', dz: 'Fujii Kaze', country: 'US' },
  ],
  cantopop: [
    { q: '張國榮', dz: 'Leslie Cheung', country: 'HK' },
    { q: '王菲', dz: 'Faye Wong', country: 'HK' },
    { q: 'Beyond', dz: 'Beyond', country: 'HK' },
    { q: '楊千嬅', dz: 'Miriam Yeung', country: 'HK' },
    { q: '林憶蓮', dz: 'Sandy Lam', country: 'HK' },
  ],
};

async function handleDiscover(url: URL, env?: MusicApiEnv): Promise<Response> {
  const category = (url.searchParams.get('category') || 'hot_cn').trim();

  if (category === 'hot_global') {
    const [chart, popUs] = await Promise.all([
      fetchDeezerGlobalChart(30),
      searchDeezer('top hits', 10),
    ]);
    const tracks = mergeAndDedupeTracks([chart, popUs]).slice(0, 30);
    return jsonResponse(
      { category, total: tracks.length, results: tracks },
      200,
      { 'Cache-Control': tracks.length > 0 ? 'public, max-age=3600' : 'no-store' }
    );
  }

  const seeds = DISCOVER_SEEDS[category] || DISCOVER_SEEDS.hot_cn;
  const appleToken = env?.APPLE_MUSIC_TOKEN;

  const batches = await Promise.all(
    seeds.map(async (s) => {
      const [dz, it] = await Promise.all([
        s.dz ? searchDeezer(s.dz, 6) : Promise.resolve([]),
        appleToken
          ? searchAppleMusicOfficial(
              s.q,
              s.country.toLowerCase() as 'cn' | 'tw' | 'hk' | 'sg' | 'us',
              appleToken,
              5
            )
          : searchItunes(s.q, s.country, 5),
      ]);
      return mergeAndDedupeTracks([it, dz]).slice(0, 6);
    })
  );

  const interleaved: UnifiedTrack[] = [];
  const maxLen = Math.max(...batches.map((b) => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const batch of batches) {
      if (batch[i]) interleaved.push(batch[i]);
    }
  }

  const tracks = mergeAndDedupeTracks([interleaved]).slice(0, 30);
  return jsonResponse(
    { category, total: tracks.length, results: tracks },
    200,
    { 'Cache-Control': tracks.length > 0 ? 'public, max-age=3600' : 'no-store' }
  );
}

function parseLyricLines(synced?: string | null, plain?: string | null): string[] {
  const raw = synced || plain || '';
  if (!raw.trim()) return [];
  const skipMeta =
    /^(作词|作曲|编曲|制作人|演唱|录音|混音|母带|出品|发行|吉他|贝斯|鼓|弦乐|和声|词\s*[:：]|曲\s*[:：]|ti:|ar:|al:|by:)/i;

  const lines: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const text = rawLine.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    if (!text || text.length < 3) continue;
    if (skipMeta.test(text)) continue;
    if (lines[lines.length - 1] === text) continue;
    lines.push(text);
  }
  return lines.slice(0, 70);
}

async function fetchNeteaseLyricsById(neteaseId: string): Promise<string[]> {
  interface NeteaseLyricResp {
    lrc?: { lyric?: string };
  }
  const data = await fetchJsonWithTimeout<NeteaseLyricResp>(
    `https://music.163.com/api/song/lyric?id=${encodeURIComponent(neteaseId)}&lv=1`,
    4000,
    { Referer: 'https://music.163.com/' }
  );
  return parseLyricLines(data?.lrc?.lyric, null);
}

async function handleLyrics(url: URL): Promise<Response> {
  const title = (url.searchParams.get('title') || '').trim();
  const artist = (url.searchParams.get('artist') || '').trim();
  const neteaseId = (url.searchParams.get('neteaseId') || '').trim();
  if (!title && !neteaseId) {
    return jsonResponse({ found: false, lines: [], highlights: [] });
  }

  let lines: string[] = [];

  if (neteaseId) {
    lines = await fetchNeteaseLyricsById(neteaseId);
  }

  if (lines.length === 0 && title) {
    interface LrcLibItem {
      syncedLyrics?: string | null;
      plainLyrics?: string | null;
    }

    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      title
    )}&artist_name=${encodeURIComponent(artist)}`;

    let record = await fetchJsonWithTimeout<LrcLibItem>(getUrl, 4000);
    if (!record || (!record.syncedLyrics && !record.plainLyrics)) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
        `${artist} ${title}`.trim()
      )}`;
      const list = await fetchJsonWithTimeout<LrcLibItem[]>(searchUrl, 4000);
      if (Array.isArray(list) && list.length > 0) {
        record = list.find((item) => item.syncedLyrics || item.plainLyrics) || list[0];
      }
    }
    lines = parseLyricLines(record?.syncedLyrics, record?.plainLyrics);
  }

  if (lines.length === 0 && title) {
    const neHits = await searchNetease(`${artist} ${title}`.trim(), 3);
    const firstId = neHits[0]?.neteaseId;
    if (firstId) {
      lines = await fetchNeteaseLyricsById(firstId);
    }
  }

  const highlights = lines.filter((l) => l.length >= 8 && l.length <= 36).slice(0, 6);

  return jsonResponse(
    {
      found: lines.length > 0,
      lines,
      highlights,
    },
    200,
    { 'Cache-Control': lines.length > 0 ? 'public, max-age=86400' : 'no-store' }
  );
}

function isAllowedProxyUrl(target: URL): boolean {
  if (target.protocol !== 'https:') return false;
  const host = target.hostname.toLowerCase();
  return ALLOWED_PROXY_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}

async function handleProxy(request: Request, url: URL): Promise<Response> {
  const targetStr = url.searchParams.get('url');
  if (!targetStr) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetStr);
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
  }

  if (!isAllowedProxyUrl(targetUrl)) {
    return jsonResponse({ error: 'Host not permitted by media allowlist' }, 403);
  }

  const upstreamHeaders = new Headers({
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  if (targetUrl.hostname.endsWith('.gtimg.cn')) {
    upstreamHeaders.set('Referer', 'https://y.qq.com/');
  }
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    upstreamHeaders.set('range', rangeHeader);
  }
  const ifRangeHeader = request.headers.get('if-range');
  if (ifRangeHeader) {
    upstreamHeaders.set('if-range', ifRangeHeader);
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const outHeaders = new Headers();
    const copyHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified',
    ];
    for (const h of copyHeaders) {
      const v = upstream.headers.get(h);
      if (v) outHeaders.set(h, v);
    }
    if (!outHeaders.has('accept-ranges')) {
      outHeaders.set('accept-ranges', 'bytes');
    }
    outHeaders.set('Access-Control-Allow-Origin', '*');
    outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    outHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
    // `no-transform` prevents mobile proxies from re-encoding/compressing audio byte-ranges (fixes iOS AVPlayer!)
    outHeaders.set('Cache-Control', 'no-transform, public, max-age=86400');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return jsonResponse({ error: 'Upstream media fetch failed' }, 502);
  }
}

export async function handleMusicApiRequest(
  request: Request,
  env?: MusicApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      },
    });
  }

  if (url.pathname === '/api/health') {
    return jsonResponse({
      ok: true,
      service: 'sonic-archive-edge',
      sources: [
        ...(env?.APPLE_MUSIC_TOKEN ? ['apple-music-official'] : []),
        'itunes-tw',
        'itunes-hk',
        'itunes-sg',
        'itunes-cn',
        'itunes-us',
        'deezer',
        'netease',
        'qq',
        'lrclib',
      ],
      capabilities: {
        appleMusicOfficial: Boolean(env?.APPLE_MUSIC_TOKEN),
        acrCloudRecognize: Boolean(env?.ACR_HOST && env?.ACR_ACCESS_KEY && env?.ACR_ACCESS_SECRET),
        auddRecognize: Boolean(env?.AUDD_API_TOKEN),
        aiVoiceCompose: Boolean(env?.MINIMAX_API_KEY),
        aiVoiceCloneGpu: Boolean(env?.VOICE_CLONE_ENDPOINT),
      },
    });
  }

  if (url.pathname === '/api/search') {
    return handleSearch(url, env);
  }

  if (url.pathname === '/api/discover') {
    return handleDiscover(url, env);
  }

  if (url.pathname === '/api/lyrics') {
    return handleLyrics(url);
  }

  if (url.pathname === '/api/proxy') {
    return handleProxy(request, url);
  }

  return null;
}
