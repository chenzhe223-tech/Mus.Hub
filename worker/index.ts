import { handleAllApiRequests, type MusicApiEnv } from '../shared/apiRouter';

interface AssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env extends MusicApiEnv {
  ASSETS: AssetsBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface CloudflareCacheStorage {
  default: Cache;
}

const CACHEABLE_API_PATHS = new Set(['/api/search', '/api/discover', '/api/lyrics']);
// Bump cache version whenever API response schema / preview routing / localization changes
const EDGE_CACHE_VERSION = 'v5';

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const shouldCache = request.method === 'GET' && CACHEABLE_API_PATHS.has(url.pathname);
    const cfCache =
      typeof caches !== 'undefined'
        ? (caches as unknown as CloudflareCacheStorage).default
        : undefined;

    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.set('_cv', EDGE_CACHE_VERSION);
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

    if (shouldCache && cfCache) {
      const cached = await cfCache.match(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const apiResponse = await handleAllApiRequests(request, env);
    if (apiResponse) {
      const cacheControl = apiResponse.headers.get('Cache-Control') || '';
      if (shouldCache && cfCache && apiResponse.status === 200 && !cacheControl.includes('no-store')) {
        const toCache = apiResponse.clone();
        if (ctx) {
          ctx.waitUntil(cfCache.put(cacheKey, toCache));
        } else {
          void cfCache.put(cacheKey, toCache);
        }
      }
      return apiResponse;
    }

    return env.ASSETS.fetch(request);
  },
};
