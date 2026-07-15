/**
 * weeklyRecoDigest.ts — Feb 2026
 *
 * One-Aus-wine-per-week email digest. Subscribers opt in from the quiz
 * results footer (or admin-added). Rich previews + approves each week's
 * pick on /admin/digests/weekly-reco, then hits Send.
 *
 * Pick strategy is seasonal — Feb/Mar picks chilled whites, Jun/Aug picks
 * big reds, etc. See SEASONAL_ROTATION below. A weekly rotation within
 * the month's shortlist gives variety without random-feeling picks. The
 * pickSlug we send is written to weeklyRecoDigestHistory so we never
 * repeat within a rolling ~90-day window.
 */
import { z } from "zod";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { publicProcedure, ownerProcedure, router } from "../trpc";
import { db } from "../db";
import * as schema from "../../drizzle/schema";

// ── Seasonal pick rotation — southern hemisphere calendar ──────────────
// Slugs must match entries in client/src/data/quizData.ts::WINES. Owner
// can override the pick each week via the admin page; this is the default.
// Rotation within each month cycles through the shortlist week-by-week.
const SEASONAL_ROTATION: Record<number, { slugs: string[]; theme: string }> = {
  1:  { theme: "Peak summer · chilled whites + rosé",       slugs: ["riesling-clare-valley", "sauvignon-blanc-marlborough", "rose-au-dry", "prosecco-king-valley"] },
  2:  { theme: "Late summer · aromatic whites + light reds",slugs: ["gewurztraminer-au-alpine", "chenin-blanc-au", "gamay-au-beechworth", "pinot-noir-yarra-entry"] },
  3:  { theme: "Autumn transition · medium bodies",         slugs: ["chardonnay-adelaide-hills", "assyrtiko-au-clare", "sangiovese-au", "grenache-mclaren-vale"] },
  4:  { theme: "Autumn · savoury + food-friendly reds",     slugs: ["sangiovese-au", "nebbiolo-au-alpine", "montepulciano-au", "malbec-au-rutherglen"] },
  5:  { theme: "Cool nights · warming reds",                slugs: ["shiraz-barossa", "grenache-mclaren-vale", "cabernet-coonawarra", "nebbiolo-au-alpine"] },
  6:  { theme: "Mid-winter · big + brooding",               slugs: ["shiraz-barossa", "amarone-style-au", "cabernet-coonawarra", "vintage-fortified-au"] },
  7:  { theme: "Depths of winter · fortifieds + Amarone",   slugs: ["amarone-style-au", "vintage-fortified-au", "shiraz-barossa", "malbec-au-rutherglen"] },
  8:  { theme: "Late winter · aged whites + structured reds", slugs: ["burgundy-old-white", "chardonnay-adelaide-hills", "nebbiolo-au-alpine", "shiraz-barossa"] },
  9:  { theme: "Early spring · aromatic whites return",     slugs: ["riesling-clare-valley", "gewurztraminer-au-alpine", "chenin-blanc-au", "assyrtiko-au-clare"] },
  10: { theme: "Spring · fresh whites + light reds",        slugs: ["sauvignon-blanc-marlborough", "chardonnay-adelaide-hills", "pinot-noir-yarra-entry", "gamay-au-beechworth"] },
  11: { theme: "Warming weather · rosé + sparkling season", slugs: ["rose-au-dry", "prosecco-king-valley", "sparkling-tasmanian-vintage", "riesling-clare-valley"] },
  12: { theme: "Christmas & summer parties · sparkling + noble sweet", slugs: ["sparkling-tasmanian-vintage", "noble-one-au", "prosecco-king-valley", "rose-au-dry"] },
};

// ── ISO week helpers ───────────────────────────────────────────────────
function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ── Pick logic — seasonal + no-repeat within 90 days ────────────────────
async function pickForWeek(now = new Date()): Promise<{ slug: string; theme: string; monthName: string }> {
  const month = now.getUTCMonth() + 1;
  const rotation = SEASONAL_ROTATION[month] ?? SEASONAL_ROTATION[1];
  const monthName = now.toLocaleString("en-AU", { month: "long", timeZone: "Australia/Sydney" });

  const recent = await db
    .select({ pickSlug: schema.weeklyRecoDigestHistory.pickSlug })
    .from(schema.weeklyRecoDigestHistory)
    .where(gte(schema.weeklyRecoDigestHistory.sentAt, Date.now() - 90 * 86_400_000));
  const recentSlugs = new Set(recent.map((r) => r.pickSlug));

  const fresh = rotation.slugs.filter((s) => !recentSlugs.has(s));
  const chosen = fresh.length > 0 ? fresh[0] : rotation.slugs[0];
  return { slug: chosen, theme: rotation.theme, monthName };
}

// ── Wine data lookup — small server-side mirror ─────────────────────────
// Not importing client/src/data/quizData.ts directly to avoid tsconfig
// path awkwardness. Kept slim — only fields the digest email needs. If
// this drifts from the client catalogue, refresh from quizData.ts.
interface DigestWine {
  slug: string;
  variety: string;
  region: string;
  producers: string[];
  ageWindow: string;
  richsPick: string;
}
const DIGEST_WINE_INDEX: Record<string, DigestWine> = {
  "riesling-clare-valley": { slug: "riesling-clare-valley", variety: "Riesling", region: "Clare Valley", producers: ["Grosset", "Pikes", "Kilikanoon"], ageWindow: "1–15 years", richsPick: "Clare Valley Riesling is the most under-priced great wine in Australia — laser-sharp lime, chalk, ageing potential rivalling German Kabinett. Grosset Polish Hill at $60 is world-class; supermarket Pikes Traditionale at $22 punches way above its weight." },
  "sauvignon-blanc-marlborough": { slug: "sauvignon-blanc-marlborough", variety: "Sauvignon Blanc", region: "Marlborough", producers: ["Cloudy Bay", "Greywacke", "Dog Point"], ageWindow: "1–3 years", richsPick: "Marlborough Sauv is the world's most successful wine category for a reason — passionfruit, cut grass, gooseberry, buzzy acid. Cloudy Bay at $30 remains the benchmark. Drink young + cold." },
  "rose-au-dry": { slug: "rose-au-dry", variety: "Grenache Rosé (dry)", region: "Barossa / McLaren Vale / Adelaide Hills", producers: ["Charles Melton Rose of Virginia", "Turkey Flat", "Bekkers"], ageWindow: "Current vintage only", richsPick: "Charles Melton's Rose of Virginia is the Aus benchmark — pale, savoury, dry, watermelon and rose petal. Turkey Flat and Bekkers are the natural progression. Half the price of Provence, better cellar temp getting to your bottle-o." },
  "prosecco-king-valley": { slug: "prosecco-king-valley", variety: "Prosecco (Glera)", region: "King Valley", producers: ["Dal Zotto", "Chrismont", "Pizzini", "Brown Brothers"], ageWindow: "1–2 years", richsPick: "The King Valley Italian-Australian community started planting Glera in the '90s and now makes some of the best Prosecco outside Italy. Dal Zotto and Chrismont at $22-28 — pear, green apple, chalk, fine mousse. Better than most Valdobbiadene landing here after freight." },
  "gewurztraminer-au-alpine": { slug: "gewurztraminer-au-alpine", variety: "Gewürztraminer", region: "Alpine Valleys / King Valley / Tasmania", producers: ["Delatite", "Pizzini", "Bream Creek", "Ashton Hills"], ageWindow: "1–5 years", richsPick: "The Aus Gewürz nobody talks about. Delatite has made the definitive bottling since the '70s — cool nights preserving the rose oxide. Half the price of Alsace, no import surcharge." },
  "chenin-blanc-au": { slug: "chenin-blanc-au", variety: "Chenin Blanc", region: "Margaret River / Canberra District", producers: ["Nick O'Leary", "McHenry Hohnen", "L.A.S. Vino"], ageWindow: "2–8 years", richsPick: "Aus Chenin is a sleeper category. Nick O'Leary in Canberra makes a Vouvray-adjacent bottling under $30. McHenry Hohnen Rocky Road down in Margaret River goes off-dry with real weight." },
  "gamay-au-beechworth": { slug: "gamay-au-beechworth", variety: "Gamay", region: "Beechworth / Yarra / Tasmania", producers: ["Sorrenberg", "Bass Phillip", "Sailor Seeks Horse"], ageWindow: "2–5 years", richsPick: "Sorrenberg in Beechworth has quietly made Australia's best Gamay for 30 years — semi-carbonic, bright cherry, feather tannin. A genuine Beaujolais replica at $45. Serve slightly chilled." },
  "pinot-noir-yarra-entry": { slug: "pinot-noir-yarra-entry", variety: "Pinot Noir (entry-level)", region: "Yarra Valley or Tasmania", producers: ["De Bortoli Villages", "Delatite", "Josef Chromy"], ageWindow: "1–3 years", richsPick: "Under $25 Aussie Pinot used to be a gamble. That's changed. Second-label bottlings from serious cool-climate producers now deliver bright red cherry, faint sous-bois, gentle grip." },
  "chardonnay-adelaide-hills": { slug: "chardonnay-adelaide-hills", variety: "Chardonnay", region: "Adelaide Hills", producers: ["Shaw + Smith M3", "Ashton Hills", "Tapanappa"], ageWindow: "3–8 years", richsPick: "Adelaide Hills has become Aus's answer to Meursault. Shaw + Smith M3, Tapanappa Tiers — restrained oak, stone-fruit tension, mineral finish. This is what Aus Chardonnay looks like when it's grown up." },
  "assyrtiko-au-clare": { slug: "assyrtiko-au-clare", variety: "Assyrtiko", region: "Clare Valley", producers: ["Jim Barry"], ageWindow: "2–5 years", richsPick: "Jim Barry planted Assyrtiko in the Clare Valley in 2006 — the first commercial planting outside Greece. Closest thing to Santorini without a flight. Lemon, chalk, sea-salt minerality, laser acid." },
  "sangiovese-au": { slug: "sangiovese-au", variety: "Sangiovese", region: "McLaren Vale / Heathcote / King Valley", producers: ["Coriole", "Chalmers", "Pizzini", "Vinea Marson"], ageWindow: "3–8 years", richsPick: "Sangio has quietly become one of Australia's most exciting Italian varieties. Coriole, Chalmers, Pizzini — bright, dusty, sour-cherry Aus interpretations that drink like Chianti at Chianti prices." },
  "grenache-mclaren-vale": { slug: "grenache-mclaren-vale", variety: "Grenache", region: "McLaren Vale", producers: ["Yangarra Old Vine", "SC Pannell", "Aphelion"], ageWindow: "3–8 years", richsPick: "McLaren Vale Grenache is having a moment. Under $30 quality has jumped dramatically — this is the current Aus sweet spot for craft red." },
  "nebbiolo-au-alpine": { slug: "nebbiolo-au-alpine", variety: "Nebbiolo", region: "King Valley / Alpine Victoria", producers: ["Pizzini", "Luke Lambert", "Vinea Marson"], ageWindow: "5–12 years", richsPick: "Pizzini in the King Valley started planting Nebbiolo in the '80s and now makes the definitive Aus expression. Rose petal, tar, dried cherry — same aromatic playbook as Barolo, at half the price." },
  "montepulciano-au": { slug: "montepulciano-au", variety: "Montepulciano", region: "Heathcote / McLaren Vale", producers: ["Chalmers", "Coriole", "Vinea Marson"], ageWindow: "2–5 years", richsPick: "Chalmers in Heathcote is doing more for Italian varieties in Australia than any other family. Their Montepulciano at $22 outperforms most $20 Chianti landing here." },
  "malbec-au-rutherglen": { slug: "malbec-au-rutherglen", variety: "Malbec", region: "Rutherglen / Wrattonbully", producers: ["Campbells", "All Saints", "Buller Wines"], ageWindow: "3–8 years", richsPick: "Rutherglen's continental climate is essentially Mendoza with different soils. Campbells and Buller have made Malbec since the '60s — plush black plum, violet, more savoury complexity than most Argentine bottlings." },
  "shiraz-barossa": { slug: "shiraz-barossa", variety: "Shiraz", region: "Barossa Valley", producers: ["Torbreck", "Rockford Basket Press", "Standish"], ageWindow: "5–20 years", richsPick: "The most Australian wine there is. Under $45 the Barossa turns into supermarket blends — jump up to $60+ for real character. Cellar door tastings are the best value." },
  "cabernet-coonawarra": { slug: "cabernet-coonawarra", variety: "Cabernet Sauvignon", region: "Coonawarra", producers: ["Wynns", "Katnook", "Balnaves"], ageWindow: "5–20 years", richsPick: "Coonawarra Cab is quintessentially Australian — every bottle shop stocks Wynns. Wynns Black Label ($30-40) is the value gold standard." },
  "amarone-style-au": { slug: "amarone-style-au", variety: "Shiraz Amarone-style", region: "Barossa Valley", producers: ["Mitolo Serpico", "Peter Lehmann Wigan", "Alkoomi"], ageWindow: "5–12 years", richsPick: "Amarone in Aus is a small experimental scene led by Mitolo's Serpico — Shiraz picked ripe then partially dried on racks for 30-60 days before fermentation. Raisined dark fruit, chocolate, 15-16% ABV, ~$70 vs $140+ for classical Valpolicella." },
  "vintage-fortified-au": { slug: "vintage-fortified-au", variety: "Vintage Fortified", region: "Barossa / Rutherglen", producers: ["Seppeltsfield Vintage Fortified", "All Saints Estate", "Chambers Rosewood"], ageWindow: "15–40 years", richsPick: "Australia used to legally call these 'Vintage Port'. Seppeltsfield and All Saints are chemically indistinguishable from Douro Vintage Port — blackberry, chocolate, cedar, 20% ABV. Half the price of Portuguese." },
  "burgundy-old-white": { slug: "burgundy-old-white", variety: "Aged Chardonnay (Meursault-style)", region: "Adelaide Hills alternative", producers: ["Tapanappa Tiers (aged)", "Kumeu River (NZ)", "Domaine Roulot"], ageWindow: "8–15 years", richsPick: "For the aged-white lovers: Tapanappa Tiers with 5+ years bottle age is the closest Aus equivalent to Meursault. Nut, honey, wet stone, gentle oxidative complexity." },
  "sparkling-tasmanian-vintage": { slug: "sparkling-tasmanian-vintage", variety: "Vintage Sparkling", region: "Tasmania", producers: ["House of Arras", "Jansz Tasmania", "Deviation Road"], ageWindow: "6–15 years", richsPick: "Tasmania is now producing the closest thing to vintage Champagne outside Champagne itself — House of Arras EJ Carr sits alongside Bollinger in blind tastings. Half the price of French vintage after freight." },
  "noble-one-au": { slug: "noble-one-au", variety: "Sémillon (Botrytis)", region: "Riverina", producers: ["De Bortoli Noble One", "Brown Brothers Patricia", "Yalumba FSE"], ageWindow: "8–20 years", richsPick: "De Bortoli Noble One is Australia's answer to Sauternes — honey, apricot, saffron, marmalade, all the noble-rot magic at half the price of Château d'Yquem." },
};

// ── Email HTML composer ────────────────────────────────────────────────
function buildDigestHtml(w: DigestWine, weekOf: string, monthName: string, theme: string, unsubscribeUrl: string): string {
  const producersList = w.producers.slice(0, 4).map((p) => `<li>${p}</li>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4efe7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe7;padding:24px 0;">
<tr><td align="center"><table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-top:3px solid #b45309;border-radius:6px;overflow:hidden;">
<tr><td style="padding:22px 28px 6px;">
  <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#b45309;font-weight:700;">Ownology · Weekly Reco · ${weekOf}</p>
  <p style="margin:6px 0 0;font-size:12px;color:#666;font-style:italic;">${monthName} · ${theme}</p>
</td></tr>
<tr><td style="padding:12px 28px 0;">
  <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#1a1a1a;">${w.variety}</h1>
  <p style="margin:4px 0 0;font-size:15px;color:#555;">${w.region} · ${w.ageWindow}</p>
</td></tr>
<tr><td style="padding:18px 28px 0;">
  <p style="margin:0;font-size:15px;line-height:1.55;color:#1a1a1a;">${w.richsPick}</p>
</td></tr>
<tr><td style="padding:18px 28px 0;">
  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;font-weight:700;">Producers to look for</p>
  <ul style="margin:2px 0 0;padding-left:18px;font-size:14px;line-height:1.6;color:#333;">${producersList}</ul>
</td></tr>
<tr><td style="padding:22px 28px 12px;">
  <a href="https://ownology.ai/quiz" style="display:inline-block;padding:10px 18px;background:#b45309;color:#fff;text-decoration:none;font-weight:700;border-radius:4px;font-size:13px;">Take the quiz to find your match →</a>
</td></tr>
<tr><td style="padding:12px 28px 20px;font-size:11px;color:#888;border-top:1px solid #ebe5da;">
  You&#39;re getting this because you subscribed on ownology.ai. <a href="${unsubscribeUrl}" style="color:#b45309;">Unsubscribe</a> · Ownology, Sydney NSW · Built by a working winemaker.
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── tRPC router ────────────────────────────────────────────────────────
export const weeklyRecoDigestRouter = router({
  // PUBLIC — opt in from the quiz-results footer or elsewhere.
  subscribe: publicProcedure
    .input(z.object({ email: z.string().email().max(255), source: z.string().max(64).default("unknown") }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const existing = await db.select().from(schema.weeklyRecoSubscribers).where(eq(schema.weeklyRecoSubscribers.email, email)).limit(1);
      const token = crypto.randomBytes(24).toString("hex");
      const now = Date.now();
      if (existing[0]) {
        // Re-subscribe: clear unsubscribed marker, refresh token
        await db.update(schema.weeklyRecoSubscribers)
          .set({ unsubscribedAt: null, unsubscribeToken: token, source: input.source, subscribedAt: now })
          .where(eq(schema.weeklyRecoSubscribers.id, existing[0].id));
        return { ok: true, resubscribed: true };
      }
      await db.insert(schema.weeklyRecoSubscribers).values({
        email, source: input.source, unsubscribeToken: token, subscribedAt: now,
      });
      return { ok: true, resubscribed: false };
    }),

  // PUBLIC — one-tap unsubscribe from email footer link
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string().min(16).max(80) }))
    .mutation(async ({ input }) => {
      const rows = await db.update(schema.weeklyRecoSubscribers)
        .set({ unsubscribedAt: Date.now() })
        .where(and(eq(schema.weeklyRecoSubscribers.unsubscribeToken, input.token), isNull(schema.weeklyRecoSubscribers.unsubscribedAt)));
      return { ok: true, affected: (rows as unknown as { affectedRows?: number }).affectedRows ?? 0 };
    }),

  // PUBLIC — active-subscriber count for opt-in social proof
  count: publicProcedure.query(async () => {
    const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.weeklyRecoSubscribers).where(isNull(schema.weeklyRecoSubscribers.unsubscribedAt));
    return { active: Number(rows[0]?.n ?? 0) };
  }),

  // OWNER — full subscriber list for the admin page
  subscribers: ownerProcedure.query(async () => {
    const active = await db.select().from(schema.weeklyRecoSubscribers)
      .where(isNull(schema.weeklyRecoSubscribers.unsubscribedAt))
      .orderBy(desc(schema.weeklyRecoSubscribers.subscribedAt));
    const inactive = await db.select().from(schema.weeklyRecoSubscribers)
      .where(sql`${schema.weeklyRecoSubscribers.unsubscribedAt} IS NOT NULL`)
      .orderBy(desc(schema.weeklyRecoSubscribers.unsubscribedAt))
      .limit(100);
    return { active, inactive };
  }),

  // OWNER — computes this week's draft (or overrides with a specified slug)
  previewDraft: ownerProcedure
    .input(z.object({ slugOverride: z.string().max(80).optional(), weekOffset: z.number().int().min(-4).max(4).default(0) }))
    .query(async ({ input }) => {
      const target = new Date();
      target.setUTCDate(target.getUTCDate() + input.weekOffset * 7);
      const weekOf = isoWeekKey(target);
      const auto = await pickForWeek(target);
      const chosenSlug = input.slugOverride ?? auto.slug;
      const wine = DIGEST_WINE_INDEX[chosenSlug];
      if (!wine) throw new Error(`No digest metadata for slug: ${chosenSlug}`);
      const unsubscribeUrl = `https://ownology.ai/unsubscribe/weekly-reco?t=PREVIEW_TOKEN`;
      const html = buildDigestHtml(wine, weekOf, auto.monthName, auto.theme, unsubscribeUrl);
      const already = await db.select().from(schema.weeklyRecoDigestHistory).where(eq(schema.weeklyRecoDigestHistory.weekOf, weekOf)).limit(1);
      return { weekOf, chosenSlug, wine, theme: auto.theme, monthName: auto.monthName, html, alreadySent: !!already[0], rotationCatalogue: SEASONAL_ROTATION[target.getUTCMonth() + 1]?.slugs ?? [] };
    }),

  // OWNER — send this week's digest to all active subscribers
  send: ownerProcedure
    .input(z.object({ weekOf: z.string(), slug: z.string(), html: z.string() }))
    .mutation(async ({ input }) => {
      const already = await db.select().from(schema.weeklyRecoDigestHistory).where(eq(schema.weeklyRecoDigestHistory.weekOf, input.weekOf)).limit(1);
      if (already[0]) throw new Error(`Digest for ${input.weekOf} was already sent at ${new Date(already[0].sentAt).toISOString()}`);
      const wine = DIGEST_WINE_INDEX[input.slug];
      if (!wine) throw new Error(`Unknown slug: ${input.slug}`);
      const subs = await db.select().from(schema.weeklyRecoSubscribers).where(isNull(schema.weeklyRecoSubscribers.unsubscribedAt));
      if (subs.length === 0) throw new Error("No active subscribers");
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("RESEND_API_KEY not configured");
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const from = process.env.RESEND_FROM_EMAIL || "Ownology <hello@ownology.ai>";
      // Send individually so each recipient gets a unique unsubscribe token
      const results: Array<{ email: string; ok: boolean; error?: string }> = [];
      let firstBatchId: string | null = null;
      for (const s of subs) {
        try {
          const personalisedHtml = input.html.replace(/PREVIEW_TOKEN/g, s.unsubscribeToken);
          const r = await resend.emails.send({
            from,
            to: s.email,
            subject: `This week's Aus wine pick: ${wine.variety}`,
            html: personalisedHtml,
            headers: { "List-Unsubscribe": `<https://ownology.ai/unsubscribe/weekly-reco?t=${s.unsubscribeToken}>` },
          });
          if (r.error) throw new Error(r.error.message);
          if (!firstBatchId && r.data?.id) firstBatchId = r.data.id;
          await db.update(schema.weeklyRecoSubscribers).set({ lastSentAt: Date.now() }).where(eq(schema.weeklyRecoSubscribers.id, s.id));
          results.push({ email: s.email, ok: true });
        } catch (e) {
          results.push({ email: s.email, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      const okCount = results.filter((r) => r.ok).length;
      await db.insert(schema.weeklyRecoDigestHistory).values({
        weekOf: input.weekOf, pickSlug: input.slug, htmlSnapshot: input.html, sentAt: Date.now(), recipientCount: okCount, resendBatchId: firstBatchId,
      });
      return { ok: true, sent: okCount, failed: results.length - okCount, results };
    }),

  // OWNER — send history for auditing
  history: ownerProcedure.query(async () => {
    return await db.select().from(schema.weeklyRecoDigestHistory).orderBy(desc(schema.weeklyRecoDigestHistory.sentAt)).limit(52);
  }),

  // OWNER — bulk add subscribers (from a CSV paste)
  bulkAdd: ownerProcedure
    .input(z.object({ emails: z.array(z.string().email()).max(500) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      let added = 0, skipped = 0;
      for (const raw of input.emails) {
        const email = raw.toLowerCase().trim();
        const exists = await db.select().from(schema.weeklyRecoSubscribers).where(eq(schema.weeklyRecoSubscribers.email, email)).limit(1);
        if (exists[0]) { skipped++; continue; }
        await db.insert(schema.weeklyRecoSubscribers).values({
          email, source: "admin_bulk_add", unsubscribeToken: crypto.randomBytes(24).toString("hex"), subscribedAt: now,
        });
        added++;
      }
      return { added, skipped };
    }),
});
