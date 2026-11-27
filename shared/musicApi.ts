import { canonicalTrackKey, expandMusicQuery, toTraditionalChinese } from './musicAliases';

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
  source: 'itunes' | 'deezer' | 'netease';
  externalUrl?: string;
  neteaseId?: string;
}

const ALLOWED_PROXY_SUFFIXES = [
  '.mzstatic.com',
  '.itunes.apple.com',
  '.dzcdn.net',
  '.deezer.com',
  '.music.126.net',
];

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
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

/**
 * Extracts clean search query from plain text OR pasted NetEase / QQ Music / Apple Music / Spotify share text.
 */
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

function buildProxyPath(targetUrl: string): string {
  const httpsUrl = targetUrl.replace(/^http:\/\//i, 'https://');
  return `/api/proxy?url=${encodeURIComponent(httpsUrl)}`;
}

async function searchItunes(
  term: string,
  country: 'CN' | 'TW' | 'HK' | 'US',
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
      return {
        id: `itunes-${country.toLowerCase()}-${item.trackId ?? Math.random().toString(36).slice(2)}`,
        title: item.trackName!.trim(),
        artist: item.artistName!.trim(),
        album: (item.collectionName || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'itunes' as const,
        externalUrl: item.trackViewUrl,
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
      return {
        id: `deezer-${item.id ?? Math.random().toString(36).slice(2)}`,
        title: item.title!.trim(),
        artist: item.artist!.name!.trim(),
        album: (item.album?.title || 'Single').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'deezer' as const,
        externalUrl: item.link,
      };
    });
}

/**
 * NetEase Cloud Music public web search (extra Mainland Mandopop coverage + Chinese lyrics ID).
 */
async function searchNetease(term: string, limit: number, offset = 0): Promise<UnifiedTrack[]> {
  if (!term.trim()) return [];
  const url = `https://music.163.com/api/search/get/web?csrf_token=&type=1&offset=${offset}&total=true&limit=${limit}&s=${encodeURIComponent(
    term
  )}`;

  interface NeteaseResponse {
    result?: {
      songs?: Array<{
        id?: number;
        name?: string;
        duration?: number;
        artists?: Array<{ name?: string }>;
        album?: {
          name?: string;
          picUrl?: string;
          artist?: { img1v1Url?: string };
        };
      }>;
    };
  }

  const data = await fetchJsonWithTimeout<NeteaseResponse>(url, 4000, {
    Referer: 'https://music.163.com/',
  });
  const songs = data?.result?.songs;
  if (!songs?.length) return [];

  return songs
    .filter((s) => s.id && s.name && s.artists?.length)
    .map((s) => {
      const pic = s.album?.picUrl || s.album?.artist?.img1v1Url || '';
      const rawCover = pic ? `${pic.replace(/^http:\/\//i, 'https://')}?param=600y600` : '';
      const artist = s.artists!
        .map((a) => a.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' / ');
      const ms = Number(s.duration) || 210000;
      return {
        id: `netease-${s.id}`,
        neteaseId: String(s.id),
        title: s.name!.trim(),
        artist: artist || '未知歌手',
        album: (s.album?.name || '单曲').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: null,
        rawPreviewUrl: null,
        source: 'netease' as const,
        externalUrl: `https://music.163.com/#/song?id=${s.id}`,
      };
    });
}

function scoreTrackRelevance(track: UnifiedTrack, queryTerms: string[]): number {
  let score = track.rawPreviewUrl ? 30 : 0;
  if (!queryTerms.length) return score;

  const titleNorm = toTraditionalChinese(track.title).toLowerCase();
  const artistNorm = toTraditionalChinese(track.artist).toLowerCase();
  const combined = `${titleNorm} ${artistNorm}`;

  for (const term of queryTerms) {
    const t = toTraditionalChinese(term).toLowerCase().trim();
    if (!t) continue;
    if (titleNorm === t) score += 60;
    else if (artistNorm === t) score += 50;
    else if (titleNorm.includes(t)) score += 35;
    else if (artistNorm.includes(t)) score += 30;
    else {
      const parts = t.split(/\s+/).filter((p) => p.length > 0);
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
        // Cross-enrich audio preview & NetEase ID across sources!
        if (!existing.neteaseId && track.neteaseId) {
          existing.neteaseId = track.neteaseId;
        }
        if (!existing.previewUrl && track.previewUrl) {
          existing.previewUrl = track.previewUrl;
          existing.rawPreviewUrl = track.rawPreviewUrl;
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

async function handleSearch(url: URL): Promise<Response> {
  const rawQ = url.searchParams.get('q') || '';
  const cleaned = cleanMusicQuery(rawQ);
  const limit = Math.min(40, Math.max(8, Number(url.searchParams.get('limit')) || 28));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  if (!cleaned) {
    return jsonResponse({ query: '', cleanedQuery: '', total: 0, hasMore: false, results: [] });
  }

  const expanded = expandMusicQuery(cleaned);
  const queryTerms = [expanded.primary, expanded.traditional, expanded.englishAlias || ''].filter(
    Boolean
  );

  // Query Deezer (high rate limit: 50 req/5s) + multi-region Apple Music (TW/HK/CN/US) + NetEase in parallel
  const tasks: Array<Promise<UnifiedTrack[]>> = [];

  // 1. Deezer with English alias (if known, e.g. "Stefanie Sun" or "Taylor Swift") + primary
  if (expanded.englishAlias) {
    tasks.push(searchDeezer(expanded.englishAlias, 20, offset));
  }
  tasks.push(searchDeezer(expanded.traditional, 16, offset));

  // 2. Apple iTunes: TW (full Mandopop/Cantopop catalog w/ Traditional Chinese), US (Western + global), CN (Mainland)
  if (expanded.isCjk) {
    tasks.push(searchItunes(expanded.traditional, 'TW', 20, offset));
    tasks.push(searchItunes(expanded.primary, 'CN', 16, offset));
    if (expanded.englishAlias) {
      tasks.push(searchItunes(expanded.englishAlias, 'US', 12, offset));
    }
    tasks.push(searchNetease(expanded.primary, 14, offset));
  } else {
    tasks.push(searchItunes(expanded.englishAlias || expanded.primary, 'US', 22, offset));
    tasks.push(searchItunes(expanded.primary, 'TW', 12, offset));
  }

  const batches = await Promise.all(tasks);
  const deduped = mergeAndDedupeTracks(batches, queryTerms);

  return jsonResponse(
    {
      query: rawQ,
      cleanedQuery: cleaned,
      expanded,
      offset,
      total: deduped.length,
      hasMore: deduped.length >= 10 && offset < 80,
      results: deduped.slice(0, limit),
    },
    200,
    {
      // Only cache non-empty search results at edge so transient rate limits never stick
      'Cache-Control': deduped.length > 0 ? 'public, max-age=3600' : 'no-store',
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
      return {
        id: `deezer-chart-${item.id}`,
        title: item.title!.trim(),
        artist: item.artist!.name!.trim(),
        album: (item.album?.title || 'Global Chart').trim(),
        duration: formatDurationMs(ms),
        durationMs: ms,
        cover: rawCover ? buildProxyPath(rawCover) : '',
        rawCover,
        previewUrl: rawPreview ? buildProxyPath(rawPreview) : null,
        rawPreviewUrl: rawPreview,
        source: 'deezer' as const,
        externalUrl: item.link,
      };
    });
}

const DISCOVER_SEEDS: Record<
  string,
  Array<{ q: string; dz?: string; country: 'CN' | 'TW' | 'US' }>
> = {
  hot_cn: [
    { q: '孫燕姿', dz: 'Stefanie Sun', country: 'TW' },
    { q: '周杰倫', dz: 'Jay Chou', country: 'TW' },
    { q: '陳奕迅', dz: 'Eason Chan', country: 'TW' },
    { q: '林俊傑', dz: 'JJ Lin', country: 'TW' },
    { q: '鄧紫棋', dz: 'G.E.M.', country: 'TW' },
    { q: '王菲', dz: 'Faye Wong', country: 'TW' },
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
    { q: '方大同', dz: 'Khalil Fong', country: 'TW' },
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
    { q: '張國榮', dz: 'Leslie Cheung', country: 'TW' },
    { q: '王菲', dz: 'Faye Wong', country: 'TW' },
    { q: 'Beyond', dz: 'Beyond', country: 'TW' },
    { q: '楊千嬅', dz: 'Miriam Yeung', country: 'TW' },
    { q: '林憶蓮', dz: 'Sandy Lam', country: 'TW' },
  ],
};

async function handleDiscover(url: URL): Promise<Response> {
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

  // Use Deezer first (never rate-limited on Workers) + iTunes TW/US in parallel for maximum resilience!
  const batches = await Promise.all(
    seeds.map(async (s) => {
      const [dz, it] = await Promise.all([
        s.dz ? searchDeezer(s.dz, 6) : Promise.resolve([]),
        searchItunes(s.q, s.country, 5),
      ]);
      return mergeAndDedupeTracks([it, dz]).slice(0, 6);
    })
  );

  // Round-robin interleave so user sees diverse artists right from track #1!
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

  // 1. Direct NetEase Lyric API if ID is known
  if (neteaseId) {
    lines = await fetchNeteaseLyricsById(neteaseId);
  }

  // 2. LRCLIB (worldwide synced/plain lyrics)
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

  // 3. Fallback: Search NetEase by title+artist to get Chinese lyrics
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
    'User-Agent': 'Mozilla/5.0 (compatible; SonicArchive/2.0)',
  });
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    upstreamHeaders.set('range', rangeHeader);
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
    });

    const outHeaders = new Headers();
    const copyHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
    ];
    for (const h of copyHeaders) {
      const v = upstream.headers.get(h);
      if (v) outHeaders.set(h, v);
    }
    outHeaders.set('Access-Control-Allow-Origin', '*');
    outHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
    outHeaders.set('Cache-Control', 'public, max-age=86400');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return jsonResponse({ error: 'Upstream media fetch failed' }, 502);
  }
}

export async function handleMusicApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      },
    });
  }

  if (url.pathname === '/api/health') {
    return jsonResponse({
      ok: true,
      service: 'sonic-archive-edge',
      sources: ['itunes-tw', 'itunes-cn', 'itunes-us', 'deezer', 'netease', 'lrclib'],
      features: ['s2t-alias-expansion', 'edge-cache', 'client-jsonp-hybrid'],
    });
  }

  if (url.pathname === '/api/search') {
    return handleSearch(url);
  }

  if (url.pathname === '/api/discover') {
    return handleDiscover(url);
  }

  if (url.pathname === '/api/lyrics') {
    return handleLyrics(url);
  }

  if (url.pathname === '/api/proxy') {
    return handleProxy(request, url);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
