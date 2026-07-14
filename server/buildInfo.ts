/**
 * buildInfo.ts — checkpoint manifest generator.
 *
 * Answers "is prod current?" without me being in the loop.
 *
 * Computes a small, cache-safe snapshot of what code is currently
 * running: commit hash, SW cache version, tRPC procedure count,
 * DB table count, page count, and the top CHANGELOG entry title.
 *
 * Served publicly via GET /api/build-info so the operator can:
 *   - Open /admin/build-check locally → sees local manifest
 *   - Same page fetches https://ownology.app/api/build-info
 *   - Diff shows whether prod caught the last "Save to Github" push.
 *
 * We intentionally expose only surface counters + hash + version.
 * No secrets, no schema shape, no procedure names.
 *
 * Result is cached in-process for 60s so a curl loop cannot hammer
 * the disk.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type BuildInfo = {
  /** Short 7-char git commit hash, or "unknown" if git unavailable. */
  commit: string;
  /** ISO timestamp of the commit, or "unknown". */
  commitAt: string;
  /** Wall-clock time the manifest was computed. */
  computedAt: string;
  /** Service Worker CACHE_VERSION from client/public/sw.js */
  swCacheVersion: string;
  /** Count of tRPC procedures across server/routers/*.ts */
  trpcProcedures: number;
  /** Count of Drizzle mysqlTable declarations in drizzle/schema.ts */
  dbTables: number;
  /** Count of .tsx pages under client/src/pages/ */
  clientPages: number;
  /** Title / first heading of the most recent CHANGELOG entry. */
  latestChange: string;
  /** package.json version field. */
  appVersion: string;
  /** NODE_ENV. */
  nodeEnv: string;
};

let cache: { at: number; value: BuildInfo } | null = null;
const CACHE_MS = 60_000;

const ROOT = process.cwd();

function safeRead(rel: string): string {
  try {
    const p = path.join(ROOT, rel);
    if (!existsSync(p)) return "";
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function readCommit(): { hash: string; at: string } {
  // Prefer env vars set by Railway / build-time so runtime doesn't
  // need the .git folder.
  const envHash =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.SOURCE_VERSION ||
    "";
  if (envHash) {
    return {
      hash: envHash.slice(0, 7),
      at: process.env.RAILWAY_GIT_COMMIT_MESSAGE_DATE || "unknown",
    };
  }
  // Fallback: shell out to git. Ignore failures silently.
  try {
    const hash = execSync("git rev-parse --short HEAD", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const at = execSync("git log -1 --format=%aI", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return { hash, at };
  } catch {
    return { hash: "unknown", at: "unknown" };
  }
}

function readSwCacheVersion(): string {
  const sw = safeRead("client/public/sw.js");
  const m = sw.match(/CACHE_VERSION\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : "unknown";
}

function countTrpcProcedures(): number {
  try {
    let total = 0;
    // Scan both server/routers/*.ts and server/routers.ts (the main file).
    const scanFile = (filepath: string) => {
      const text = readFileSync(filepath, "utf8");
      const matches = text.match(
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*(publicProcedure|protectedProcedure|adminProcedure|ownerProcedure)\b/gm
      );
      total += matches ? matches.length : 0;
    };
    const dir = path.join(ROOT, "server", "routers");
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
        scanFile(path.join(dir, f));
      }
    }
    const mainRouter = path.join(ROOT, "server", "routers.ts");
    if (existsSync(mainRouter)) scanFile(mainRouter);
    return total;
  } catch {
    return 0;
  }
}

function countDbTables(): number {
  const schema = safeRead("drizzle/schema.ts");
  const matches = schema.match(/^export\s+const\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*mysqlTable\b/gm);
  return matches ? matches.length : 0;
}

function countClientPages(): number {
  try {
    const root = path.join(ROOT, "client", "src", "pages");
    if (!existsSync(root)) return 0;
    let total = 0;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) total++;
      }
    };
    walk(root);
    return total;
  } catch {
    return 0;
  }
}

function readLatestChange(): string {
  const changelog = safeRead("memory/CHANGELOG.md");
  if (!changelog) return "unknown";
  // CHANGELOG is written newest-at-bottom, so grab the LAST "### <title>"
  // heading rather than the first.
  const matches = changelog.match(/^###\s+(.+)$/gm);
  if (!matches || matches.length === 0) return "unknown";
  const last = matches[matches.length - 1];
  return last.replace(/^###\s+/, "").trim();
}

function readAppVersion(): string {
  try {
    const pkg = JSON.parse(safeRead("package.json") || "{}");
    return String(pkg.version || "unknown");
  } catch {
    return "unknown";
  }
}

export function computeBuildInfo(): BuildInfo {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const { hash, at } = readCommit();
  const value: BuildInfo = {
    commit: hash,
    commitAt: at,
    computedAt: new Date().toISOString(),
    swCacheVersion: readSwCacheVersion(),
    trpcProcedures: countTrpcProcedures(),
    dbTables: countDbTables(),
    clientPages: countClientPages(),
    latestChange: readLatestChange(),
    appVersion: readAppVersion(),
    nodeEnv: process.env.NODE_ENV || "development",
  };
  cache = { at: Date.now(), value };
  return value;
}
