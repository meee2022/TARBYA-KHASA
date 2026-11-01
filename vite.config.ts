import { defineConfig, type ViteDevServer, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import { createAIHandler } from './server/ai.mjs';
import { createAdminService } from './server/admin.mjs';

function configureLocalAPI(server: ViteDevServer | PreviewServer) {
  const admin = createAdminService();
  server.middlewares.use((req, res, next) => {
    let path: string;
    try { path = decodeURIComponent((req.url || '').split('?')[0]).replace(/\\/g, '/'); }
    catch { res.statusCode = 400; res.end('Invalid path'); return; }
    if (/(^|\/)\.local-data(\/|$)/i.test(path)) { res.statusCode = 403; res.end('Forbidden'); return; }
    next();
  });
  server.middlewares.use(admin.handler);
  server.middlewares.use(createAIHandler({ getSite: admin.getSite }));
}

export default defineConfig({
  plugins: [react(), { name: 'local-platform-api', configureServer: configureLocalAPI, configurePreviewServer: configureLocalAPI }],
  server: { port: 5173, host: '127.0.0.1', fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local-data/**'] } },
  preview: { host: '127.0.0.1' },
});
