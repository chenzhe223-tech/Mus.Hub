import { jsonResponse, type MusicApiEnv } from './musicApi';

export type AiSongStyleId = 'pop_ballad' | 'rnb_soul' | 'indie_folk' | 'city_pop' | 'jazz_lofi';

const STYLE_PROMPTS: Record<
  AiSongStyleId,
  { name: string; promptEn: string; bpm: number; defaultTitle: string }
> = {
  pop_ballad: {
    name: '华语抒情流行',
    promptEn: 'Warm Mandopop emotional piano ballad chorus, cinematic strings, intimate lead vocal, 78 BPM, studio master quality',
    bpm: 78,
    defaultTitle: '晚风寄给你的信',
  },
  rnb_soul: {
    name: '丝滑都市 R&B',
    promptEn: 'Silky modern Mandarin R&B soul chorus, Rhodes electric piano, groovy bassline, crisp snare, smooth vocal runs, 92 BPM',
    bpm: 92,
    defaultTitle: '午夜霓虹节拍',
  },
  indie_folk: {
    name: '温暖独立民谣',
    promptEn: 'Warm acoustic indie folk chorus, fingerpicked acoustic guitar, subtle tambourine, nostalgic storytelling vocal, 86 BPM',
    bpm: 86,
    defaultTitle: '街角晴朗日记',
  },
  city_pop: {
    name: '复古 City Pop',
    promptEn: 'Breezy 80s Tokyo-Taipei City Pop chorus, sparkling synth brass, funky slap bass, sunny nostalgic chorus vocal, 108 BPM',
    bpm: 108,
    defaultTitle: '落日海岸线',
  },
  jazz_lofi: {
    name: '微醺爵士 Lo-Fi',
    promptEn: 'Cozy late-night jazz lo-fi chorus, warm upright bass, brushed drums, smoky cafe piano, intimate whispered vocal, 82 BPM',
    bpm: 82,
    defaultTitle: '黑胶慢时光',
  },
};

function composeBuiltInChorus(sentence: string, style: AiSongStyleId): { title: string; lyrics: string } {
  const clean = sentence.trim().replace(/[。！？!?.]+$/g, '');
  const shortTitle =
    clean.length >= 2 && clean.length <= 10
      ? clean
      : clean.slice(0, 8) || STYLE_PROMPTS[style].defaultTitle;

  const templates: Record<AiSongStyleId, string[]> = {
    pop_ballad: [
      `${clean || '这一刻的晚风轻轻吹过街角'}`,
      '把没说完的心事折进旋律里收藏',
      '哪怕明天人海茫茫各自奔向远方',
      '这三十秒的副歌只为你一个人唱响',
    ],
    rnb_soul: [
      `${clean || '霓虹倒映在微醺的玻璃窗上'}`,
      '心跳跟着鼓点慢慢坠入温柔波浪',
      '别管时间嘀嗒走得多匆忙',
      '此刻只剩我和你在这节拍里摇晃',
    ],
    indie_folk: [
      `${clean || '阳光斜斜落在旧吉他的弦上'}`,
      '我们把平凡的日子哼成清澈乐章',
      '路过风吹麦浪也路过晴朗的窗',
      '唱给此刻听见这首歌的你别慌张',
    ],
    city_pop: [
      `${clean || '夏夜海风吹起橘色的晚霞光'}`,
      '收音机里正放着复古的合成器声响',
      '沿着海岸线把所有烦恼都遗忘',
      '跟着这三十秒的律动一起去流浪',
    ],
    jazz_lofi: [
      `${clean || '唱针落下时咖啡正冒着温热微光'}`,
      '黑胶沙沙声里藏着今晚最慢的时光',
      '不问明天答案只听音符在房间流淌',
      '让这一段专属旋律陪你安静入梦乡',
    ],
  };

  return {
    title: shortTitle,
    lyrics: templates[style].join('\n'),
  };
}

async function composeLyricsWithGemini(
  sentence: string,
  style: AiSongStyleId,
  apiKey: string
): Promise<{ title: string; lyrics: string } | null> {
  const styleMeta = STYLE_PROMPTS[style];
  const prompt = [
    '你是华语流行音乐顶级词曲作词人。请根据用户的一句话心情/故事，写一段适合30秒副歌演唱的中文歌词。',
    `曲风：${styleMeta.name}`,
    `用户的话：${sentence}`,
    '要求：',
    '1. 严格输出 JSON 格式：{"title": "2-8字中文歌名", "lyrics": "4行押韵副歌歌词，用\\n分隔"}',
    '2. 每行 10-18 个汉字，画面感强、上口好唱、情绪真挚，不要任何多余解释。',
  ].join('\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.85,
          },
        }),
      }
    );
    if (!res.ok) return null;
    interface GeminiResp {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }
    const data = (await res.json()) as GeminiResp;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText) as { title?: string; lyrics?: string };
    if (parsed.title && parsed.lyrics) {
      return {
        title: parsed.title.trim().slice(0, 18),
        lyrics: parsed.lyrics.trim().slice(0, 220),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Step 2: Compose a 30-second original vocal chorus via MiniMax Music API.
 */
async function generateMinimaxChorus(
  lyrics: string,
  style: AiSongStyleId,
  apiKey: string
): Promise<{ ok: boolean; audioUrl?: string; audioHex?: string; error?: string }> {
  const styleMeta = STYLE_PROMPTS[style];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const res = await fetch('https://api.minimax.io/v1/music_generation', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'music-2.6',
        prompt: styleMeta.promptEn,
        lyrics: `[Chorus]\n${lyrics}`,
        output_format: 'url',
        audio_setting: {
          sample_rate: 44100,
          bitrate: 128000,
          format: 'mp3',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `MiniMax API HTTP ${res.status}: ${errText.slice(0, 120)}` };
    }

    interface MiniMaxResp {
      base_resp?: { status_code?: number; status_msg?: string };
      data?: { audio?: string; audio_url?: string };
    }
    const data = (await res.json()) as MiniMaxResp;
    if (data.base_resp && data.base_resp.status_code !== 0) {
      return { ok: false, error: data.base_resp.status_msg || 'MiniMax generation failed' };
    }

    const audioField = data.data?.audio_url || data.data?.audio || '';
    if (!audioField) {
      return { ok: false, error: 'MiniMax returned empty audio payload' };
    }
    if (audioField.startsWith('http')) {
      return { ok: true, audioUrl: audioField };
    }
    return { ok: true, audioHex: audioField };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'MiniMax request timeout' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Step 3: Zero-shot Singing Voice Conversion (Demucs stem split -> Seed-VC -> ffmpeg 30s mixdown)
 * hosted on a Serverless GPU worker (see ai-gpu-worker/seed_vc_worker.py).
 */
async function convertSingingVoiceOnGpu(opts: {
  sourceAudioUrl?: string;
  sourceAudioHex?: string;
  voiceSampleBase64: string;
  voiceMimeType: string;
  endpoint: string;
  secret?: string;
}): Promise<{ ok: boolean; audioDataUrl?: string; audioUrl?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.secret) headers['X-Worker-Secret'] = opts.secret;

    const res = await fetch(opts.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        source_audio_url: opts.sourceAudioUrl,
        source_audio_hex: opts.sourceAudioHex,
        reference_voice_b64: opts.voiceSampleBase64,
        reference_mime: opts.voiceMimeType,
        max_duration_sec: 30,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Voice Clone GPU HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      audio_url?: string;
      audio_b64?: string;
      error?: string;
    };
    if (data.error) return { ok: false, error: data.error };
    if (data.audio_url) return { ok: true, audioUrl: data.audio_url };
    if (data.audio_b64) {
      return { ok: true, audioDataUrl: `data:audio/mpeg;base64,${data.audio_b64}` };
    }
    return { ok: false, error: 'GPU worker returned empty audio' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'GPU voice conversion failed' };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleAiVoiceRequest(
  request: Request,
  env?: MusicApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/ai-song')) return null;

  const hasCompose = Boolean(env?.MINIMAX_API_KEY);
  const hasVoiceGpu = Boolean(env?.VOICE_CLONE_ENDPOINT);
  const hasLyricsLlm = Boolean(env?.GEMINI_API_KEY);

  if (url.pathname === '/api/ai-song/status' && request.method === 'GET') {
    return jsonResponse(
      {
        configured: hasCompose && hasVoiceGpu,
        hasComposeApi: hasCompose,
        hasVoiceCloneGpu: hasVoiceGpu,
        hasLyricsLlm,
        clipDurationSec: 30,
        freeDailyLimit: 2,
        proComingSoon: true,
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  if (url.pathname === '/api/ai-song/lyrics' && request.method === 'POST') {
    let body: { prompt?: string; style?: AiSongStyleId } = {};
    try {
      body = (await request.json()) as { prompt?: string; style?: AiSongStyleId };
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const sentence = (body.prompt || '').trim();
    const style: AiSongStyleId =
      body.style && body.style in STYLE_PROMPTS ? body.style : 'pop_ballad';
    if (!sentence) {
      return jsonResponse({ error: '请输入一句你想唱进歌里的话' }, 400);
    }

    let composed: { title: string; lyrics: string } | null = null;
    if (env?.GEMINI_API_KEY) {
      composed = await composeLyricsWithGemini(sentence, style, env.GEMINI_API_KEY);
    }
    if (!composed) {
      composed = composeBuiltInChorus(sentence, style);
    }

    return jsonResponse(
      {
        title: composed.title,
        lyrics: composed.lyrics,
        style,
        styleName: STYLE_PROMPTS[style].name,
        source: env?.GEMINI_API_KEY ? 'gemini' : 'builtin-poet',
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  if (url.pathname === '/api/ai-song/create' && request.method === 'POST') {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ error: 'Invalid multipart upload' }, 400);
    }

    const consent = String(formData.get('consentOwnedVoice') || '') === 'true';
    if (!consent) {
      return jsonResponse({ error: '请先勾选确认：仅使用本人或已获授权的音色进行合成' }, 400);
    }

    const voiceFile = formData.get('voice');
    const prompt = String(formData.get('prompt') || '').trim();
    const styleRaw = String(formData.get('style') || 'pop_ballad') as AiSongStyleId;
    const style: AiSongStyleId = styleRaw in STYLE_PROMPTS ? styleRaw : 'pop_ballad';
    let lyrics = String(formData.get('lyrics') || '').trim();
    let title = String(formData.get('title') || '').trim();

    if (!(voiceFile instanceof Blob) || voiceFile.size < 1000) {
      return jsonResponse({ error: '请先录制或上传一段 5–15 秒的清唱或语音样本' }, 400);
    }
    if (voiceFile.size > 10 * 1024 * 1024) {
      return jsonResponse({ error: '人声样本请控制在 10MB 以内' }, 413);
    }

    if (!lyrics) {
      const built = composeBuiltInChorus(prompt || '把此刻写成歌', style);
      lyrics = built.lyrics;
      if (!title) title = built.title;
    }
    if (!title) title = STYLE_PROMPTS[style].defaultTitle;

    // If AI keys are not yet configured, return clear setup status + ready studio metadata
    if (!hasCompose) {
      return jsonResponse(
        {
          configured: false,
          previewMode: true,
          title,
          lyrics,
          style,
          styleName: STYLE_PROMPTS[style].name,
          duration: '00:30',
          message:
            'AI 原创作曲与声纹克隆云端密钥尚未配置。你可以先用你的干声样本试听并做成专属声纹海报；按 docs/API_SETUP_GUIDE.md 配好 MINIMAX_API_KEY 与 Seed-VC GPU 端点后，将自动输出 30 秒完整伴奏 + 你的音色 AI 演唱！',
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    // 1. Compose 30s original chorus with MiniMax Music
    const composed = await generateMinimaxChorus(lyrics, style, env!.MINIMAX_API_KEY!);
    if (!composed.ok) {
      return jsonResponse({ configured: true, error: composed.error || 'AI 作曲失败' }, 502);
    }

    // 2. If Seed-VC GPU worker is configured, swap lead vocal to user's cloned voice
    if (hasVoiceGpu) {
      const buf = await voiceFile.arrayBuffer();
      const voiceB64 = arrayBufferToBase64(buf);
      const cloned = await convertSingingVoiceOnGpu({
        sourceAudioUrl: composed.audioUrl,
        sourceAudioHex: composed.audioHex,
        voiceSampleBase64: voiceB64,
        voiceMimeType: voiceFile.type || 'audio/webm',
        endpoint: env!.VOICE_CLONE_ENDPOINT!,
        secret: env?.VOICE_CLONE_SECRET,
      });

      if (!cloned.ok) {
        return jsonResponse(
          {
            configured: true,
            partial: true,
            title,
            lyrics,
            style,
            styleName: STYLE_PROMPTS[style].name,
            duration: '00:30',
            audioUrl: composed.audioUrl || null,
            warning: `原创旋律已生成，音色克隆服务暂忙（${cloned.error}），已先返回 AI 原唱版本`,
          },
          200,
          { 'Cache-Control': 'no-store' }
        );
      }

      return jsonResponse(
        {
          configured: true,
          voiceCloned: true,
          title,
          lyrics,
          style,
          styleName: STYLE_PROMPTS[style].name,
          duration: '00:30',
          audioUrl: cloned.audioDataUrl || cloned.audioUrl,
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    // MiniMax configured without GPU voice swap yet
    return jsonResponse(
      {
        configured: true,
        voiceCloned: false,
        title,
        lyrics,
        style,
        styleName: STYLE_PROMPTS[style].name,
        duration: '00:30',
        audioUrl: composed.audioUrl || null,
        warning:
          '已完成 MiniMax 30s 原创作曲！如需替换为你本人的克隆音色演唱，请部署 ai-gpu-worker/seed_vc_worker.py 并配置 VOICE_CLONE_ENDPOINT。',
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  return null;
}
