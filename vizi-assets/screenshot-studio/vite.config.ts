import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const CONFIG_PATH = resolve(import.meta.dirname, 'config/slides.config.json');

/**
 * Tiny dev-server API so the dashboard can persist its edits to disk. The
 * export script reads the same file, which is how "what you see in the
 * dashboard" and "what `npm run export` writes" stay in sync.
 */
function configApi(): Plugin {
  return {
    name: 'vizi-config-api',
    configureServer(server) {
      server.middlewares.use('/__config', (req, res) => {
        if (req.method === 'GET') {
          readFile(CONFIG_PATH, 'utf8')
            .then((body) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(body);
            })
            .catch(() => {
              // No saved config yet — the app falls back to its defaults.
              res.statusCode = 404;
              res.end('{}');
            });
          return;
        }
        if (req.method === 'POST' || req.method === 'PUT') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk as Buffer));
          req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            try {
              // Parse first: never write a file the export script cannot read.
              const parsed = JSON.parse(body);
              mkdir(dirname(CONFIG_PATH), { recursive: true })
                .then(() => writeFile(CONFIG_PATH, `${JSON.stringify(parsed, null, 2)}\n`))
                .then(() => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end('{"ok":true}');
                })
                .catch((err: Error) => {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                });
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), configApi()],
  server: { port: 5178, strictPort: false },
});
