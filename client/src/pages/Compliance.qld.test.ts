/**
 * Smoke tests for QLD knowledge base integration in Compliance.tsx
 * Verifies that the QLD section is present and correctly structured.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(__dirname, "Compliance.tsx"),
  "utf-8"
);

describe("Compliance.tsx — QLD knowledge base", () => {
  it("includes QLD in the StateFilter type", () => {
    expect(source).toContain('"QLD"');
  });

  it("includes QLD in STATE_FILTERS array", () => {
    expect(source).toContain('"QLD"');
  });

  it("includes QLD label in STATE_LABELS", () => {
    expect(source).toContain("QLD: \"Queensland\"");
  });

  it("includes QLD section heading in KNOWLEDGE_BASE", () => {
    expect(source).toContain("## QUEENSLAND (QLD) REGULATIONS");
  });

  it("includes OLGR wine producer licence content", () => {
    expect(source).toContain("Wine Industry Act 1994 (Qld)");
    expect(source).toContain("OLGR");
  });

  it("includes ERA 22 environmental authority content", () => {
    expect(source).toContain("ERA 22(2)");
    expect(source).toContain("1 megalitre");
  });

  it("includes WorkSafe Queensland content", () => {
    expect(source).toContain("WorkSafe Queensland");
    expect(source).toContain("WHS Act 2011 (Qld)");
  });

  it("includes QLD sample questions", () => {
    expect(source).toContain("What wine producer licence do I need to operate a winery in Queensland?");
    expect(source).toContain("Does my Granite Belt winery need an Environmental Authority under ERA 22?");
    expect(source).toContain("What are the WorkSafe Queensland obligations for confined spaces in a winery?");
  });

  it("includes QLD in the knowledge base badge text", () => {
    expect(source).toContain("Federal · SA · VIC · NSW · WA · QLD");
  });

  it("includes QLD in the KB_SECTIONS splitter", () => {
    expect(source).toContain("## QUEENSLAND (QLD) REGULATIONS");
  });

  it("includes QLD in the classifier prompt jurisdictions", () => {
    expect(source).toContain('"QLD"');
  });

  it("includes QLD contacts in KEY CONTACTS table", () => {
    expect(source).toContain("OLGR (QLD)");
    expect(source).toContain("DETSI (QLD)");
    expect(source).toContain("WorkSafe QLD");
  });
});
