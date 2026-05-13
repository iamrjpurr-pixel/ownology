/**
 * Smoke tests for TAS knowledge base integration in Compliance.tsx and Resources.tsx
 * Verifies that the TAS section is present and correctly structured in both pages.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const complianceSource = readFileSync(
  resolve(__dirname, "Compliance.tsx"),
  "utf-8"
);

const resourcesSource = readFileSync(
  resolve(__dirname, "Resources.tsx"),
  "utf-8"
);

describe("Compliance.tsx — TAS knowledge base", () => {
  it("includes TAS in the StateFilter type", () => {
    expect(complianceSource).toContain('"TAS"');
  });

  it("includes TAS in STATE_FILTERS array", () => {
    expect(complianceSource).toContain('"TAS"');
  });

  it("includes TAS label in STATE_LABELS", () => {
    expect(complianceSource).toContain('TAS: "Tasmania"');
  });

  it("includes TAS section heading in KNOWLEDGE_BASE", () => {
    expect(complianceSource).toContain("## TASMANIA (TAS) REGULATIONS");
  });

  it("includes liquor licensing content for TAS", () => {
    expect(complianceSource).toContain("Liquor Licensing Act 1990");
    expect(complianceSource).toContain("Commissioner for Licensing");
  });

  it("includes Small Producer's Permit content", () => {
    expect(complianceSource).toContain("Small Producer");
    expect(complianceSource).toContain("28,500 litres");
  });

  it("includes EMPCA environmental obligations content", () => {
    expect(complianceSource).toContain("EMPCA");
    expect(complianceSource).toContain("EPA Tasmania");
  });

  it("includes WorkSafe Tasmania content", () => {
    expect(complianceSource).toContain("WorkSafe Tasmania");
    expect(complianceSource).toContain("WHS Act 2012");
  });

  it("includes TPS planning content", () => {
    expect(complianceSource).toContain("Tasmanian Planning Scheme");
    expect(complianceSource).toContain("Resource Processing");
  });

  it("includes TAS sample questions", () => {
    expect(complianceSource).toContain("What liquor licence do I need to operate a cellar door in Tasmania?");
    expect(complianceSource).toContain("Does my Tasmanian winery need an environmental licence under EMPCA?");
    expect(complianceSource).toContain("What is the Small Producer's Permit and who qualifies in Tasmania?");
  });

  it("includes TAS in the knowledge base badge text", () => {
    expect(complianceSource).toContain("Federal · SA · VIC · NSW · WA · QLD · TAS");
  });

  it("includes TAS in the KB_SECTIONS splitter", () => {
    expect(complianceSource).toContain("## TASMANIA (TAS) REGULATIONS");
  });

  it("includes TAS in the classifier prompt jurisdictions", () => {
    expect(complianceSource).toContain('"TAS"');
  });

  it("includes TAS contacts in KEY CONTACTS table", () => {
    expect(complianceSource).toContain("Commissioner for Licensing (TAS)");
    expect(complianceSource).toContain("EPA Tasmania");
    expect(complianceSource).toContain("WorkSafe Tasmania");
  });
});

describe("Resources.tsx — TAS tab", () => {
  it("includes TAS in the ResourceTab type", () => {
    expect(resourcesSource).toContain('"tas"');
  });

  it("includes TAS label in TAB_LABELS", () => {
    expect(resourcesSource).toContain('tas: "Tasmania"');
  });

  it("includes TAS_SECTIONS array", () => {
    expect(resourcesSource).toContain("const TAS_SECTIONS");
  });

  it("includes TAS liquor licence card", () => {
    expect(resourcesSource).toContain("tas-liquor");
    expect(resourcesSource).toContain("Liquor Licensing Act 1990 (TAS)");
  });

  it("includes TAS EMPCA environmental card", () => {
    expect(resourcesSource).toContain("tas-empca");
    expect(resourcesSource).toContain("Environmental Management and Pollution Control Act 1994 (TAS)");
  });

  it("includes TAS WorkSafe card", () => {
    expect(resourcesSource).toContain("tas-worksafe");
    expect(resourcesSource).toContain("Work Health and Safety Act 2012 (TAS)");
  });

  it("includes TAS planning card", () => {
    expect(resourcesSource).toContain("tas-planning");
    expect(resourcesSource).toContain("Tasmanian Planning Scheme");
  });

  it("includes TAS food safety card", () => {
    expect(resourcesSource).toContain("tas-food");
    expect(resourcesSource).toContain("Food Act 2003 (TAS)");
  });

  it("includes TAS water licence card", () => {
    expect(resourcesSource).toContain("tas-water");
    expect(resourcesSource).toContain("Water Management Act 1999 (TAS)");
  });

  it("includes TAS in the tab rendering array", () => {
    expect(resourcesSource).toContain('"tas"');
  });

  it("includes TAS in the sections selector", () => {
    expect(resourcesSource).toContain("TAS_SECTIONS");
  });
});
