import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

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
  plugins: [react(), tailwindcss(), sampleVintageLogAlias()],
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
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
