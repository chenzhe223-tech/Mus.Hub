import { handleMusicApiRequest } from '../shared/musicApi';

interface AssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface CloudflareCacheStorage {
  default: Cache;
}

const CACHEABLE_API_PATHS = new Set(['/api/search', '/api/discover', '/api/lyrics']);

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const shouldCache = request.method === 'GET' && CACHEABLE_API_PATHS.has(url.pathname);
    const cfCache =
      typeof caches !== 'undefined'
        ? (caches as unknown as CloudflareCacheStorage).default
        : undefined;

    if (shouldCache && cfCache) {
      const cached = await cfCache.match(request);
      if (cached) {
        return cached;
      }
    }

    const apiResponse = await handleMusicApiRequest(request);
    if (apiResponse) {
      const cacheControl = apiResponse.headers.get('Cache-Control') || '';
      if (shouldCache && cfCache && apiResponse.status === 200 && !cacheControl.includes('no-store')) {
        const toCache = apiResponse.clone();
        if (ctx) {
          ctx.waitUntil(cfCache.put(request, toCache));
        } else {
          void cfCache.put(request, toCache);
        }
      }
      return apiResponse;
    }

    return env.ASSETS.fetch(request);
  },
};
