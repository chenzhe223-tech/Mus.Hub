import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleAllApiRequests, type MusicApiEnv } from './shared/apiRouter';

async function readNodeRequestBody(req: IncomingMessage): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return chunks.length ? new Uint8Array(Buffer.concat(chunks)) : undefined;
}

/**
 * Serves the exact same /api/* endpoints (search, discover, lyrics, proxy, recognize, ai-song)
 * locally during `npm run dev` / `npm run preview` so local dev matches Cloudflare Workers 1:1.
 */
function sonicLocalApiPlugin(): Plugin {
  const attach = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
  }) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/')) {
        next();
        return;
      }

      try {
        const host = req.headers.host || 'localhost:5173';
        const fullUrl = `http://${host}${req.url}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === 'string') headers.set(k, v);
          else if (Array.isArray(v)) headers.set(k, v.join(', '));
        }

        const bodyBytes = await readNodeRequestBody(req);
        const webReq = new Request(fullUrl, {
          method: req.method || 'GET',
          headers,
          body: bodyBytes ? (bodyBytes as unknown as BodyInit) : undefined,
        });

        const localEnv: MusicApiEnv = {
          APPLE_MUSIC_TOKEN: process.env.APPLE_MUSIC_TOKEN,
          MUSIC_GATEWAY_URL: process.env.MUSIC_GATEWAY_URL,
          ACR_HOST: process.env.ACR_HOST,
          ACR_ACCESS_KEY: process.env.ACR_ACCESS_KEY,
          ACR_ACCESS_SECRET: process.env.ACR_ACCESS_SECRET,
          AUDD_API_TOKEN: process.env.AUDD_API_TOKEN,
          MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
          VOICE_CLONE_ENDPOINT: process.env.VOICE_CLONE_ENDPOINT,
          VOICE_CLONE_SECRET: process.env.VOICE_CLONE_SECRET,
        };

        const webRes = await handleAllApiRequests(webReq, localEnv);
        if (!webRes) {
          next();
          return;
        }

        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (webRes.body) {
          Readable.fromWeb(webRes.body as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(
            res
          );
        } else {
          res.end();
        }
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  };

  return {
    name: 'sonic-local-api',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sonicLocalApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
