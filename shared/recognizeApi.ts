import { buildExternalMusicLinks } from './musicAliases';
import { jsonResponse, searchUnifiedTracks, type MusicApiEnv } from './musicApi';

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

interface RecognizedCandidate {
  title: string;
  artist: string;
  album: string;
  score: number;
  releaseDate?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  deezerId?: string;
}

async function recognizeWithAcrCloud(
  audioBlob: Blob,
  env: MusicApiEnv
): Promise<{ ok: boolean; candidate?: RecognizedCandidate; error?: string }> {
  const host = (env.ACR_HOST || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const accessKey = env.ACR_ACCESS_KEY || '';
  const accessSecret = env.ACR_ACCESS_SECRET || '';
  if (!host || !accessKey || !accessSecret) {
    return { ok: false, error: 'ACRCloud credentials missing' };
  }

  const httpMethod = 'POST';
  const httpUri = '/v1/identify';
  const dataType = 'audio';
  const signatureVersion = '1';
  const timestamp = String(Math.floor(Date.now() / 1000));

  const stringToSign = [httpMethod, httpUri, accessKey, dataType, signatureVersion, timestamp].join(
    '\n'
  );
  const signature = await hmacSha1Base64(accessSecret, stringToSign);

  const form = new FormData();
  form.append('sample', audioBlob, 'sample.webm');
  form.append('sample_bytes', String(audioBlob.size));
  form.append('access_key', accessKey);
  form.append('data_type', dataType);
  form.append('signature_version', signatureVersion);
  form.append('signature', signature);
  form.append('timestamp', timestamp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`https://${host}${httpUri}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `ACRCloud HTTP ${res.status}` };
    }

    interface AcrTrackItem {
      title?: string;
      score?: number;
      release_date?: string;
      album?: { name?: string };
      artists?: Array<{ name?: string }>;
      external_metadata?: {
        spotify?: { track?: { id?: string } };
        deezer?: { track?: { id?: string } };
        applemusic?: { track?: { id?: string } };
      };
    }

    interface AcrResponse {
      status?: { code?: number; msg?: string };
      metadata?: {
        music?: AcrTrackItem[];
        humming?: AcrTrackItem[];
      };
    }

    const data = (await res.json()) as AcrResponse;
    if (data.status?.code !== 0) {
      return { ok: true, candidate: undefined };
    }

    const match: AcrTrackItem | undefined =
      data.metadata?.music?.[0] || data.metadata?.humming?.[0];
    if (!match?.title) {
      return { ok: true, candidate: undefined };
    }

    const artist =
      (match.artists || [])
        .map((a) => a.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' / ') || '未知歌手';

    const ext = match.external_metadata;
    const spotifyId = ext?.spotify?.track?.id;

    return {
      ok: true,
      candidate: {
        title: match.title.trim(),
        artist,
        album: match.album?.name?.trim() || '单曲',
        score: Number(match.score) || 95,
        releaseDate: match.release_date,
        spotifyUrl: spotifyId ? `https://open.spotify.com/track/${spotifyId}` : undefined,
        deezerId: ext?.deezer?.track?.id,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'ACRCloud request failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function recognizeWithAudD(
  audioBlob: Blob,
  token: string
): Promise<{ ok: boolean; candidate?: RecognizedCandidate; error?: string }> {
  const form = new FormData();
  form.append('api_token', token);
  form.append('file', audioBlob, 'sample.webm');
  form.append('return', 'apple_music,spotify,deezer');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `AudD HTTP ${res.status}` };

    interface AudDResp {
      status?: string;
      result?: {
        title?: string;
        artist?: string;
        album?: string;
        release_date?: string;
        apple_music?: { url?: string };
        spotify?: { external_urls?: { spotify?: string } };
      } | null;
    }

    const data = (await res.json()) as AudDResp;
    if (!data.result?.title) return { ok: true, candidate: undefined };

    return {
      ok: true,
      candidate: {
        title: data.result.title.trim(),
        artist: (data.result.artist || '未知歌手').trim(),
        album: (data.result.album || '单曲').trim(),
        score: 96,
        releaseDate: data.result.release_date,
        appleUrl: data.result.apple_music?.url,
        spotifyUrl: data.result.spotify?.external_urls?.spotify,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'AudD request failed' };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleRecognizeRequest(
  request: Request,
  env?: MusicApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/recognize')) return null;

  const hasAcr = Boolean(env?.ACR_HOST && env?.ACR_ACCESS_KEY && env?.ACR_ACCESS_SECRET);
  const hasAudD = Boolean(env?.AUDD_API_TOKEN);
  const provider = hasAcr ? 'acrcloud' : hasAudD ? 'audd' : 'none';

  if (url.pathname === '/api/recognize/status' && request.method === 'GET') {
    return jsonResponse(
      {
        configured: hasAcr || hasAudD,
        provider,
        supportsHumming: hasAcr,
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  if (url.pathname === '/api/recognize' && request.method === 'POST') {
    if (!hasAcr && !hasAudD) {
      return jsonResponse(
        {
          configured: false,
          matched: false,
          provider: 'none',
          message:
            '听歌识曲服务尚未配置 ACRCloud 密钥。请按 docs/API_SETUP_GUIDE.md 申请 14 天免费试用并配置 ACR_HOST / ACR_ACCESS_KEY / ACR_ACCESS_SECRET。',
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ configured: true, matched: false, error: 'Invalid multipart payload' }, 400);
    }

    const audioFile = formData.get('audio');
    if (!(audioFile instanceof Blob) || audioFile.size < 1000) {
      return jsonResponse(
        { configured: true, matched: false, error: '录音过短，请靠近音源录制 5–8 秒' },
        400
      );
    }
    if (audioFile.size > 5 * 1024 * 1024) {
      return jsonResponse(
        { configured: true, matched: false, error: '音频文件过大，请控制在 5MB 以内' },
        413
      );
    }

    const result = hasAcr
      ? await recognizeWithAcrCloud(audioFile, env!)
      : await recognizeWithAudD(audioFile, env!.AUDD_API_TOKEN!);

    if (!result.ok) {
      return jsonResponse(
        { configured: true, matched: false, provider, error: result.error || '识别服务暂时不可用' },
        502
      );
    }

    if (!result.candidate) {
      return jsonResponse(
        {
          configured: true,
          matched: false,
          provider,
          message: '暂未听出这首歌，请靠近扬声器、避开杂音再试一次（支持原曲外放与哼唱）',
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    const cand = result.candidate;
    // Enrich recognized song with HD cover, 30s studio preview & exact platform links
    const enriched = await searchUnifiedTracks(`${cand.artist} ${cand.title}`, {
      limit: 5,
      env,
    });
    const best = enriched.tracks[0];
    const links = buildExternalMusicLinks(cand.title, cand.artist, {
      neteaseId: best?.neteaseId,
      qqMid: best?.qqMid,
      appleUrl: cand.appleUrl || best?.externalLinks?.apple,
      spotifyUrl: cand.spotifyUrl || best?.externalLinks?.spotify,
    });

    return jsonResponse(
      {
        configured: true,
        matched: true,
        provider,
        score: cand.score,
        track: best
          ? {
              ...best,
              externalLinks: links,
            }
          : {
              id: `recognized-${Date.now()}`,
              title: cand.title,
              artist: cand.artist,
              album: cand.album,
              duration: '03:30',
              cover: '',
              previewUrl: null,
              source: 'itunes',
              externalLinks: links,
            },
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  return null;
}
