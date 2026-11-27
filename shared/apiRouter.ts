import { handleAiVoiceRequest } from './aiVoiceApi';
import { handleMusicApiRequest, jsonResponse, type MusicApiEnv } from './musicApi';
import { handleRecognizeRequest } from './recognizeApi';

export type { MusicApiEnv };

/**
 * Unified Edge API router shared 1:1 between Cloudflare Workers (`worker/index.ts`)
 * and local Vite dev/preview server (`vite.config.ts`).
 */
export async function handleAllApiRequests(
  request: Request,
  env?: MusicApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  const musicRes = await handleMusicApiRequest(request, env);
  if (musicRes) return musicRes;

  const recognizeRes = await handleRecognizeRequest(request, env);
  if (recognizeRes) return recognizeRes;

  const aiVoiceRes = await handleAiVoiceRequest(request, env);
  if (aiVoiceRes) return aiVoiceRes;

  return jsonResponse({ error: 'Not Found' }, 404);
}
