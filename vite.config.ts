import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { viteGateWall } from "./viteGateWall";
import { viteTodoSync } from "./viteTodoSync";
import { viteSwCacheVersion } from "./viteSwCacheVersion";

// Ownology — Emergent-compatible Vite config.
// Manus-specific plugins (jsx-loc, manus-runtime, debug-collector, storage-proxy,
// merch-api proxy, vitePluginApi proxy) have been removed. In this environment
// the Express backend runs as a separate process on port 8001, and Vite simply
// proxies all /api/* requests to it during development.

/** Clean URL alias for the sample vintage log static asset.
 *  /sample-vintage-log → serves client/public/sample-vintage-log.html
 *  Mirrors the Express route in server/index.ts so the alias works in BOTH
 *  dev (Vite middleware) and prod (Express). Query params pass through.
 */
function sampleVintageLogAlias(): Plugin {
  return {
    name: "ownology-sample-vintage-log-alias",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const [pathOnly] = req.url.split("?");
        if (pathOnly === "/sample-vintage-log") {
          const file = path.resolve(import.meta.dirname, "client", "public", "sample-vintage-log.html");
          fs.readFile(file, (err, data) => {
            if (err) {
              res.statusCode = 404;
              res.end("sample-vintage-log.html not found");
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(data);
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sampleVintageLogAlias(), viteGateWall(), viteTodoSync(), viteSwCacheVersion()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      // Public vanity audit pages — `/audit/:slug` is served by Express,
      // not the SPA. Without this proxy entry Vite would intercept the URL
      // and return index.html, breaking the public audit page in dev.
      "/audit": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      // Magic-link invite bypass — `/i/:token` is an Express handler that
      // sets an ow_gate cookie + 302 → /admin. On K8s ingress deploys
      // (preview.emergentagent.com) non-/api paths land on Vite (port 3000),
      // so without this proxy the SPA shell is served and the cookie is
      // never set. In Railway prod Express serves everything anyway.
      "/i": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      // Built asset bundles — on the Emergent K8s preview edge, HTML
      // requests land on Express (:8001) which serves dist/public/index.html
      // (referencing hashed /assets/*.js files). Sub-resource requests for
      // those hashed assets, however, land on Vite (:3000) which doesn't
      // have prebuilt bundles and 404s. Proxy /assets to Express so both
      // legs hit the same static tree. In Railway prod Express serves
      // everything anyway.
      "/assets": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
