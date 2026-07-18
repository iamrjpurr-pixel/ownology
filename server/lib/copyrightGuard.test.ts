/**
 * Unit tests for copyrightGuard — the N-gram overlap detector that keeps
 * verbatim MoreWine / AWRI / Boulton / Iland prose out of Owen's replies.
 *
 * Run:  npx vitest run server/lib/copyrightGuard.test.ts
 */

import { describe, it, expect } from "vitest";
import { detectCopyrightOverlap, buildStricterPrompt, _internal } from "./copyrightGuard";

describe("copyrightGuard.detectCopyrightOverlap", () => {
  const chunk = {
    sourceDoc: "morew_so2_mgmt",
    chapterTitle: "MoreWine! Guide to SO₂ Management",
    content:
      "Free sulphur dioxide in the ppm range provides the antimicrobial protection needed against Brettanomyces, and molecular SO2 is the fraction actually doing the work in wine at cellar pH.",
  };

  it("returns clean when the answer is entirely original prose", () => {
    const result = detectCopyrightOverlap(
      "For your 23 L batch, aim for around 25 ppm free SO2 pre-bottling. Test after 48 hours.",
      [chunk],
    );
    expect(result.scrubbed).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it("flags a near-verbatim 8+ word lift", () => {
    const result = detectCopyrightOverlap(
      "The chunk warns that free sulphur dioxide in the ppm range provides the antimicrobial protection needed against Brett.",
      [chunk],
    );
    expect(result.scrubbed).toBe(true);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.sourceHits).toContain("MoreWine! Guide to SO₂ Management");
  });

  it("does NOT flag short factual phrases (< 8 words)", () => {
    // 7-word run — under threshold; facts should reproduce freely.
    const result = detectCopyrightOverlap(
      "The target is around free sulphur dioxide in the range.",
      [chunk],
    );
    expect(result.scrubbed).toBe(false);
  });

  it("normalises punctuation and casing", () => {
    const punctChunk = {
      chapterTitle: "Test Chunk",
      content: "Add five grams of potassium metabisulphite per hectolitre to the must, thoroughly stirred.",
    };
    const result = detectCopyrightOverlap(
      "ADD FIVE GRAMS OF POTASSIUM METABISULPHITE PER HECTOLITRE TO THE MUST!",
      [punctChunk],
    );
    expect(result.scrubbed).toBe(true);
  });

  it("returns clean when there are no chunks", () => {
    const result = detectCopyrightOverlap("Any answer text here.", []);
    expect(result.scrubbed).toBe(false);
  });

  it("returns clean when the answer is shorter than N-gram threshold", () => {
    const result = detectCopyrightOverlap("Short answer.", [chunk]);
    expect(result.scrubbed).toBe(false);
  });

  it("caps hits at 5 for logging brevity", () => {
    // Answer that lifts the whole chunk verbatim → many overlapping n-grams
    const result = detectCopyrightOverlap(chunk.content, [chunk]);
    expect(result.scrubbed).toBe(true);
    expect(result.hits.length).toBeLessThanOrEqual(5);
  });
});

describe("copyrightGuard.buildStricterPrompt", () => {
  it("includes the offending phrases and a paraphrase directive", () => {
    const prompt = buildStricterPrompt([
      "free sulphur dioxide in the ppm range provides",
      "the antimicrobial protection needed against brettanomyces",
    ]);
    expect(prompt).toContain("free sulphur dioxide in the ppm range provides");
    expect(prompt).toContain("Rewrite your answer completely");
    expect(prompt).toContain("no consecutive run of 8+ words");
    expect(prompt).toContain("JSON format");
  });

  it("caps the phrase list at 5", () => {
    const many = Array.from({ length: 20 }, (_, i) => `phrase number ${i}`);
    const prompt = buildStricterPrompt(many);
    // Only first 5 should appear
    expect(prompt).toContain("phrase number 0");
    expect(prompt).toContain("phrase number 4");
    expect(prompt).not.toContain("phrase number 5");
  });
});

describe("copyrightGuard._internal helpers", () => {
  it("normalise strips punctuation and lowercases", () => {
    expect(_internal.normalise("Hello, WORLD! It's a test.")).toBe("hello world it s a test");
  });

  it("uses an 8-word ngram threshold by default", () => {
    expect(_internal.NGRAM_THRESHOLD).toBe(8);
  });
});
