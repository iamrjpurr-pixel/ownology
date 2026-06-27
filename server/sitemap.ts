/**
 * SEO endpoints — sitemap + robots.
 *
 * Served from Express (port 8001) under /api/* so they're reachable through
 * the existing ingress routing. Production deploys should add a rewrite at
 * the edge so `https://ownology.ai/sitemap.xml` proxies to
 * `https://ownology.ai/api/sitemap.xml` (Cloudflare / Vercel / Caddy all
 * support this in one line).
 */
import type { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

const SITE_ORIGIN = process.env.PUBLIC_SITE_URL || "https://ownology.ai";

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** GET /api/cellar-journal/sitemap.xml — every published journal entry */
export async function cellarJournalSitemapHandler(_req: Request, res: Response) {
  try {
    const rows = await db
      .select({
        slug: schema.cellarJournal.slug,
        lastAskedAt: schema.cellarJournal.lastAskedAt,
        askedCount: schema.cellarJournal.askedCount,
        featured: schema.cellarJournal.featured,
      })
      .from(schema.cellarJournal)
      .where(eq(schema.cellarJournal.published, true))
      .orderBy(desc(schema.cellarJournal.lastAskedAt))
      .limit(50000);

    const urls = [
      // Index page itself
      `  <url>
    <loc>${SITE_ORIGIN}/cellar-journal</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      ...rows.map(
        (r) => `  <url>
    <loc>${SITE_ORIGIN}/cellar-journal/${xmlEscape(r.slug)}</loc>
    <lastmod>${isoFromMs(r.lastAskedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${r.featured ? "0.9" : r.askedCount >= 5 ? "0.8" : "0.6"}</priority>
  </url>`
      ),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600"); // 10 minutes
    res.send(xml);
  } catch (err) {
    console.error("[sitemap] failed:", err);
    res.status(500).send("sitemap generation failed");
  }
}

/** GET /api/robots.txt */
export async function robotsTxtHandler(_req: Request, res: Response) {
  const txt = `# Ownology — robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

# Sitemap
Sitemap: ${SITE_ORIGIN}/api/sitemap.xml
Sitemap: ${SITE_ORIGIN}/api/cellar-journal/sitemap.xml
`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(txt);
}

/** GET /api/cellar-journal/rss.xml — RSS 2.0 feed of recent entries.
 *  Consumed by Zapier, IFTTT, Buffer, Feedly, NetNewsWire, news aggregators
 *  and platform-specific bots (Mastodon, Bluesky). One feed → infinite reach.
 */
export async function cellarJournalRssHandler(_req: Request, res: Response) {
  try {
    const rows = await db
      .select({
        slug: schema.cellarJournal.slug,
        question: schema.cellarJournal.question,
        diagnosis: schema.cellarJournal.diagnosis,
        teaser: schema.cellarJournal.teaserAnswer,
        topicTag: schema.cellarJournal.topicTag,
        firstAskedAt: schema.cellarJournal.firstAskedAt,
        lastAskedAt: schema.cellarJournal.lastAskedAt,
        askedCount: schema.cellarJournal.askedCount,
      })
      .from(schema.cellarJournal)
      .where(eq(schema.cellarJournal.published, true))
      .orderBy(desc(schema.cellarJournal.firstAskedAt))
      .limit(50);

    const items = rows
      .map((r) => {
        const url = `${SITE_ORIGIN}/cellar-journal/${xmlEscape(r.slug)}`;
        const description =
          (r.diagnosis ? r.diagnosis + "\n\n" : "") + (r.teaser ?? "").slice(0, 400);
        return `    <item>
      <title>${xmlEscape(r.question)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <category>${xmlEscape(r.topicTag)}</category>
      <pubDate>${new Date(r.firstAskedAt).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ownology — Cellar Journal</title>
    <link>${SITE_ORIGIN}/cellar-journal</link>
    <description>Notes from the cellar floor. Winemaking questions, answered.</description>
    <language>en-AU</language>
    <atom:link href="${SITE_ORIGIN}/api/cellar-journal/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(xml);
  } catch (err) {
    console.error("[rss] failed:", err);
    res.status(500).send("rss generation failed");
  }
}
