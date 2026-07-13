/**
 * viteTodoSync — Vite plugin that keeps `/todo` in sync with what
 * we actually ship, so the roadmap page never drifts silently.
 *
 * How it works
 * ────────────
 * On dev server start (and on every `memory/CHANGELOG.md` change),
 * this plugin:
 *   1. Reads `memory/CHANGELOG.md`
 *   2. Extracts all shipped-todo IDs from `[shipped: id-a, id-b]` markers
 *   3. Reads `client/src/data/todoData.ts`
 *   4. For any TODO row whose `id` matches a shipped marker AND is not
 *      already `status: "done"`, rewrites that row's status to "done"
 *      and bumps its `updatedAt` to today.
 *   5. Bumps `LAST_UPDATED` to today.
 *   6. Only writes back if anything actually changed (no dirty-write noise).
 *
 * Marker convention
 * ─────────────────
 * When you write a CHANGELOG entry, add a line anywhere in the entry:
 *
 *   [shipped: rotate-jwt-secret, custom-domain-dns]
 *
 * (Comma-separated. Whitespace tolerated. Case-sensitive to match TODO.id.)
 *
 * Design constraints
 * ──────────────────
 * - No parsing of the todoData.ts AST (regex is more robust to future
 *   drift and doesn't require a TS compiler in the dev pipeline).
 * - Idempotent — running twice does nothing.
 * - Read-only if there's nothing to do (won't touch mtime).
 * - Fails soft: any parse error is logged and skipped, dev server
 *   continues to boot normally.
 */
import type { Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const CHANGELOG_PATH = resolve(process.cwd(), "memory/CHANGELOG.md");
const TODO_PATH = resolve(process.cwd(), "client/src/data/todoData.ts");
const SHIPPED_MARKER_RE = /\[shipped:\s*([^\]]+)\]/gi;

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function extractShippedIds(changelogRaw: string): Set<string> {
  const ids = new Set<string>();
  // Valid todo IDs are kebab-case slugs (see todoData.ts). This filter
  // rejects prose examples like `<id-list>` or `todo-name-here` that
  // happen to sit inside a documentation `[shipped: ...]` snippet.
  const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  for (const match of changelogRaw.matchAll(SHIPPED_MARKER_RE)) {
    const list = match[1];
    for (const raw of list.split(",")) {
      const id = raw.trim();
      if (id && SLUG_RE.test(id)) ids.add(id);
    }
  }
  return ids;
}

/** Rewrite a single TODO row's status field to "done" and bump its
 *  updatedAt. Uses regex to keep the file parse-free — the todoData.ts
 *  layout is stable enough that this is safer than an AST rewrite. */
function markTodoDone(source: string, id: string, today: string): { updated: string; changed: boolean } {
  // Match a single object literal for the given id, e.g.
  //   {
  //     id: "rotate-jwt-secret",
  //     ...
  //     status: "not-started",
  //     ...
  //     updatedAt: "2026-02-06",
  //   },
  const idPattern = new RegExp(
    `(\\{[^{}]*?id:\\s*"${id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"[^{}]*?\\})`,
    "s"
  );
  const m = source.match(idPattern);
  if (!m) return { updated: source, changed: false };
  const block = m[1];
  // Already done? Skip.
  if (/status:\s*"done"/.test(block)) return { updated: source, changed: false };
  const patched = block
    .replace(/status:\s*"[^"]+"/, `status: "done"`)
    .replace(/updatedAt:\s*"[^"]+"/, `updatedAt: "${today}"`);
  return { updated: source.replace(block, patched), changed: patched !== block };
}

/** Bump the exported LAST_UPDATED constant. Idempotent — returns unchanged
 *  source if the constant already matches today. */
function bumpLastUpdated(source: string, today: string): { updated: string; changed: boolean } {
  const re = /(export const LAST_UPDATED\s*=\s*")([^"]+)(";)/;
  const m = source.match(re);
  if (!m) return { updated: source, changed: false };
  if (m[2] === today) return { updated: source, changed: false };
  return { updated: source.replace(re, `$1${today}$3`), changed: true };
}

function syncTodoOnce(logger: (msg: string) => void): void {
  let changelogRaw: string;
  let todoRaw: string;
  try {
    changelogRaw = readFileSync(CHANGELOG_PATH, "utf8");
    todoRaw = readFileSync(TODO_PATH, "utf8");
  } catch (e) {
    logger(`[todo-sync] skipped: ${(e as Error).message}`);
    return;
  }

  const shipped = extractShippedIds(changelogRaw);
  if (shipped.size === 0) return; // No markers, nothing to do.

  const today = todayIso();
  let src = todoRaw;
  const patched: string[] = [];
  for (const id of shipped) {
    const { updated, changed } = markTodoDone(src, id, today);
    if (changed) {
      src = updated;
      patched.push(id);
    }
  }
  // Only bump LAST_UPDATED if at least one row changed OR if it's
  // already out of sync with today. Prevents noisy touches when nothing
  // actually shipped.
  const shouldBump = patched.length > 0;
  if (shouldBump) {
    const { updated } = bumpLastUpdated(src, today);
    src = updated;
  }

  if (src !== todoRaw) {
    writeFileSync(TODO_PATH, src, "utf8");
    logger(`[todo-sync] marked ${patched.length} item(s) as shipped: ${patched.join(", ")}`);
  }
}

export function viteTodoSync(): Plugin {
  return {
    name: "ownology-todo-sync",
    // Run once on config resolve (dev + build both hit this).
    configResolved() {
      syncTodoOnce((msg) => console.log(msg));
    },
    // Watch CHANGELOG.md so ongoing edits during a dev session sync live.
    configureServer(server) {
      server.watcher.add(CHANGELOG_PATH);
      server.watcher.on("change", (path) => {
        if (path === CHANGELOG_PATH) {
          syncTodoOnce((msg) => server.config.logger.info(msg));
        }
      });
    },
  };
}
