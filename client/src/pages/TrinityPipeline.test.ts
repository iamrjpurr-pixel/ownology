/**
 * Trinity content pipeline — source-contract tests.
 *
 * This project's vitest root is `client/`, and the suite cannot import the
 * server module graph (db / drizzle / env are server-only). Following the same
 * convention as the other tests here (bridges.test, Compliance.*.test), these
 * assertions read the server source files and verify the pipeline is wired and
 * behaves per spec, covering: clustering, canonical selection, editorial +
 * private-bible accuracy pass, dedupe, auto-publish, the admin/blog/badge
 * surfaces, the monthly newsletter with a 24h preview window, and auto-FAQ.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// client/src/pages -> repo root is three levels up
const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const pipeline = read("server/trinityPipeline.ts");
const router = read("server/trinityRouter.ts");
const db = read("server/db.ts");
const index = read("server/index.ts");
const clusterHandler = read("server/scheduled/trinityCluster.ts");
const newsletterHandler = read("server/scheduled/trinityNewsletter.ts");
const schema = read("drizzle/schema.ts");
const blog = read("client/src/pages/Blog.tsx");
const freeRun = read("client/src/pages/FreeRun.tsx");
const adminTrinity = read("client/src/pages/AdminTrinity.tsx");
const faq = read("client/src/components/FAQ.tsx");

describe("data layer", () => {
  it("adds candidacy columns so reveals are not re-clustered", () => {
    expect(schema).toMatch(/clusteredAt/);
    expect(schema).toMatch(/publishedTrinityId/);
  });
  it("defines the published_trinity_responses table with the spec columns", () => {
    expect(schema).toMatch(/publishedTrinityResponses|published_trinity_responses/);
    for (const col of [
      "questionCanonical",
      "contentScience",
      "contentVineyard",
      "contentCraft",
      "excerpt",
      "status",
      "clusterSize",
      "accuracyFlag",
    ]) {
      expect(schema).toMatch(new RegExp(col));
    }
  });
  it("defines the FAQ + newsletter tables", () => {
    expect(schema).toMatch(/trinityFaqClusters|trinity_faq_clusters/);
    expect(schema).toMatch(/trinityNewsletterDrafts|trinity_newsletter_drafts/);
  });
  it("exposes raw-row db helpers for the pipeline", () => {
    for (const fn of [
      "getUnclusteredReveals",
      "getRevealFeedbackScores",
      "markRevealsClustered",
      "insertPublishedTrinity",
      "listPublishedTrinity",
      "listTrinityByStatus",
      "getTrinityStatusCounts",
      "setTrinityStatus",
      "getPublishedTrinityByReveal",
      "listFeaturedTrinity",
      "replaceTrinityFaqClusters",
      "listTrinityFaqClusters",
      "insertNewsletterDraft",
      "getNewsletterDraftByPeriod",
      "getLatestNewsletterDraft",
      "setNewsletterStatus",
    ]) {
      expect(db).toMatch(new RegExp(`export async function ${fn}\\b`));
    }
  });
});

describe("clustering + editorial pipeline", () => {
  it("requires 3+ similar reveals to publish", () => {
    expect(pipeline).toMatch(/MIN_CLUSTER_SIZE\s*=\s*3/);
  });
  it("uses an LLM semantic-grouping pass (no /v1/embeddings dependency)", () => {
    expect(pipeline).toMatch(/clusterReveals/);
    // Must not actually call an embeddings endpoint (the comment may mention it).
    expect(pipeline).not.toMatch(/fetch\([^)]*embeddings/);
    expect(pipeline).toMatch(/\/v1\/chat\/completions/);
  });
  it("filters hallucinated reveal ids out of clusters", () => {
    expect(pipeline).toMatch(/validIds\.has\(id\)/);
  });
  it("selects the canonical source reveal by highest feedback score", () => {
    expect(pipeline).toMatch(/pickSourceReveal/);
    expect(pipeline).toMatch(/getRevealFeedbackScores/);
  });
  it("runs an editorial polish pass producing the three Trinity panels", () => {
    expect(pipeline).toMatch(/editorialPass/);
    expect(pipeline).toMatch(/contentScience/);
    expect(pipeline).toMatch(/contentVineyard/);
    expect(pipeline).toMatch(/contentCraft/);
  });
  it("cross-references the private bible for accuracy without citing it", () => {
    expect(pipeline).toMatch(/accuracyPass/);
    expect(pipeline).toMatch(/diyKnowledgeChunks|diy_knowledge_chunks/);
    expect(pipeline.toLowerCase()).toMatch(/never (cite|name|mention)|do not (cite|name|mention)/);
  });
  it("suppresses duplicates of already-published pieces", () => {
    expect(pipeline).toMatch(/isDuplicate/);
  });
  it("auto-publishes to a pending state and flags accuracy issues", () => {
    // 'pending' default lives in the schema + db insert helper; the pipeline sets the flag.
    expect(schema).toMatch(/\.default\("pending"\)/);
    expect(db).toMatch(/status:\s*"pending"/);
    expect(pipeline).toMatch(/accuracyFlag:\s*accuracy\.flag/);
  });
  it("generates FAQ entries from the top clusters", () => {
    expect(pipeline).toMatch(/generateFaqFromClusters/);
    expect(pipeline).toMatch(/MAX_FAQ\s*=\s*10/);
  });
});

describe("nightly cluster Heartbeat handler", () => {
  it("registers /api/scheduled/trinity-cluster before express.json()", () => {
    const at = index.indexOf('"/api/scheduled/trinity-cluster"');
    const jsonAt = index.indexOf("app.use(express.json())");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(jsonAt);
  });
  it("runs clustering + FAQ and notifies the owner with a digest", () => {
    expect(clusterHandler).toMatch(/runTrinityClustering/);
    expect(clusterHandler).toMatch(/generateFaqFromClusters/);
    expect(clusterHandler).toMatch(/v1\/notification\/send/);
  });
});

describe("monthly newsletter (24h preview window)", () => {
  it("registers /api/scheduled/trinity-newsletter before express.json()", () => {
    const at = index.indexOf('"/api/scheduled/trinity-newsletter"');
    const jsonAt = index.indexOf("app.use(express.json())");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(jsonAt);
  });
  it("supports monthly compose + daily finalize modes", () => {
    expect(newsletterHandler).toMatch(/mode\s*===\s*"finalize"/);
    expect(newsletterHandler).toMatch(/runMonthlyNewsletter/);
    expect(newsletterHandler).toMatch(/finalizeExpiredNewsletters/);
  });
  it("composes one piece per Trinity act and integrates Buttondown", () => {
    expect(pipeline).toMatch(/selectNewsletterPieces/);
    expect(pipeline).toMatch(/composeNewsletter/);
    expect(pipeline).toMatch(/buttondown\.email|createButtondownDraft/);
  });
  it("holds the issue in a 24h preview window before auto-send", () => {
    expect(pipeline).toMatch(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000|86400000/);
    expect(pipeline).toMatch(/approveNewsletter/);
    expect(pipeline).toMatch(/skipNewsletter/);
  });
});

describe("router surfaces", () => {
  it("public: community blog + badge + faq", () => {
    expect(router).toMatch(/listPublished:\s*publicProcedure/);
    expect(router).toMatch(/getByReveal:\s*publicProcedure/);
    expect(router).toMatch(/listFaq:\s*publicProcedure/);
  });
  it("owner-gated: review + newsletter controls", () => {
    for (const proc of [
      "listPending",
      "listFeatured",
      "listSuppressed",
      "promoteToFeatured",
      "suppress",
      "unsuppress",
      "runNow",
      "latestNewsletter",
      "approveNewsletter",
      "skipNewsletter",
    ]) {
      expect(router).toMatch(new RegExp(`${proc}:\\s*ownerProcedure`));
    }
  });
});

describe("frontend surfaces", () => {
  it("admin Trinity review has tabs, run-now, and newsletter panel", () => {
    expect(adminTrinity).toMatch(/Run pipeline now/);
    expect(adminTrinity).toMatch(/NewsletterPanel/);
    expect(adminTrinity).toMatch(/Promote to Featured/);
    expect(adminTrinity).toMatch(/Suppress/);
  });
  it("blog renders published community Trinity pieces", () => {
    expect(blog).toMatch(/trinity\.listPublished/);
  });
  it("FreeRun shows an anonymised community badge", () => {
    expect(freeRun).toMatch(/trinity\.getByReveal/);
    expect(freeRun.toLowerCase()).toMatch(/shared with the community/);
  });
  it("FAQ surfaces auto-generated community questions", () => {
    expect(faq).toMatch(/trinity\.listFaq/);
  });
});
