import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleMusicApiRequest } from './shared/musicApi';

/**
 * Serves the exact same /api/search, /api/lyrics, and /api/proxy endpoints
 * locally during `npm run dev` so local development matches Cloudflare Workers 1:1.
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

        const webReq = new Request(fullUrl, {
          method: req.method || 'GET',
          headers,
        });

        const webRes = await handleMusicApiRequest(webReq);
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
