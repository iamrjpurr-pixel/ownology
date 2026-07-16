/**
 * viteSwCacheVersion — inject git commit hash into sw.js at serve + build time.
 *
 * The service worker at `client/public/sw.js` uses `CACHE_VERSION` to bust
 * stale caches on deploy. Historically this was a hardcoded literal ("ow-v20")
 * that had to be bumped manually before every push — easy to forget, which
 * meant users occasionally ran on stale bundles after a Railway redeploy.
 *
 * This plugin replaces the sentinel string `__COMMIT_HASH__` (in sw.js) with
 * the current git short hash. Runs in BOTH:
 *
 *   • Dev (`configureServer`): intercepts /sw.js requests, rewrites in memory
 *     — no on-disk mutation, so `git status` stays clean.
 *   • Build (`generateBundle`): rewrites the sw.js emitted into dist/public/
 *     with the same replacement, so production has a per-commit CACHE_VERSION.
 *
 * If git is unavailable (weird container), falls back to `dev-YYYYMMDD` so we
 * never emit a broken file.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const SENTINEL = "__COMMIT_HASH__";

function currentCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    const d = new Date();
    const iso = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `dev-${iso}`;
  }
}

export function viteSwCacheVersion(): Plugin {
  const commit = currentCommitHash();
  return {
    name: "ownology-sw-cache-version",

    // ─── Dev: intercept /sw.js requests and swap the sentinel in memory ──
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const [pathOnly] = req.url.split("?");
        if (pathOnly !== "/sw.js") return next();
        try {
          const file = path.resolve(import.meta.dirname, "client", "public", "sw.js");
          const src = readFileSync(file, "utf8");
          const rewritten = src.replaceAll(SENTINEL, commit);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(rewritten);
        } catch {
          // If read fails for any reason let the default static handler try.
          next();
        }
      });
    },

    // ─── Build: rewrite the emitted sw.js in dist/public/ ────────────────
    // Vite copies public/ verbatim into the build output, so we hook the
    // final bundle stage and mutate the emitted asset if present.
    closeBundle() {
      try {
        const distSw = path.resolve(import.meta.dirname, "dist", "public", "sw.js");
        const fs = require("node:fs") as typeof import("node:fs");
        if (!fs.existsSync(distSw)) return;
        const src = fs.readFileSync(distSw, "utf8");
        if (!src.includes(SENTINEL)) return;
        fs.writeFileSync(distSw, src.replaceAll(SENTINEL, commit), "utf8");
        console.log(`[sw-cache-version] rewrote CACHE_VERSION → ow-${commit} in dist/public/sw.js`);
      } catch (err) {
        console.warn("[sw-cache-version] build-time rewrite skipped:", err instanceof Error ? err.message : err);
      }
    },
  };
}
