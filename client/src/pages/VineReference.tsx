/**
 * /reference/vine — Searchable index of Vine et al. "Winemaking: From Grape Growing to Marketplace"
 * The scientific anchor (Side 3) of the Ownology Bible Triangle.
 * Design: dark warm-black, amber gold accents, Fraunces serif, Lato body
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Inlined from references/vine-et-al-index.json for client-side search

const BOOK = {
  title: "Winemaking: From Grape Growing to Marketplace",
  authors: ["Richard P. Vine", "Ellen M. Harkness", "Theresa Browning", "Cheri Wagner"],
  series: "The Chapman & Hall Enology Library",
  publisher: "Chapman & Hall",
  totalPages: 427,
  role: "Side 3 of the Bible Triangle — the scientific and industry-standard reference anchor.",
};

interface Section {
  title: string;
  page: number | string;
  subsections?: string[];
}

interface Chapter {
  number: number;
  title: string;
  pageStart?: number;
  sections: Section[];
}

const CHAPTERS: Chapter[] = [
  {
    number: 0,
    title: "Front Matter",
    sections: [
      { title: "Preface", page: "xi" },
      { title: "Acknowledgments", page: "xiii" },
      { title: "Introduction", page: "xv" },
    ],
  },
  {
    number: 1,
    title: "History of Wine in America",
    pageStart: 1,
    sections: [
      { title: "Eastern America", page: 2 },
      { title: "Western America", page: 9 },
      { title: "National Prohibition", page: 14 },
      { title: "American Wine in the 20th Century", page: 17 },
      { title: "The American Wine Booms", page: 20 },
    ],
  },
  {
    number: 2,
    title: "Viticulture (Grape Growing)",
    pageStart: 24,
    sections: [
      {
        title: "Site Selection",
        page: 26,
        subsections: ["Climate", "Soils", "The Vine"],
      },
      {
        title: "Cultivar Selection",
        page: 30,
        subsections: [
          "Vitis vinifera — Major White Varieties (p.32), Major Red Varieties (p.34)",
          "Vitis labrusca — Major White (p.38), Major Red (p.38)",
          "Vitis riparia (p.39), Vitis aestivalis (p.40), Vitis rupestris (p.40)",
          "Vitis berlandieri (p.41), Vitis rotundifolia (p.41)",
          "Hybrids and Grafting (p.41)",
          "French-American Hybrids (p.42) — Major Hybrid White (p.43), Major Hybrid Red (p.44)",
        ],
      },
      {
        title: "Vineyard Establishment",
        page: 44,
        subsections: [
          "Cost and Value (p.47)",
          "Site Preparation (p.58)",
          "Vineyard Layout (p.58)",
          "Planting (p.59)",
          "Vine Training (p.60)",
          "Trellising (p.60) — Training Systems, Machine Harvesting",
          "Weed Control (p.63)",
          "Herbicide Injury (p.64)",
        ],
      },
      {
        title: "Vineyard Management",
        page: 64,
        subsections: ["Pruning (p.64)", "Pest Control (p.65) — Diseases, Insects"],
      },
    ],
  },
  {
    number: 3,
    title: "Wine Microbiology",
    pageStart: 73,
    sections: [
      { title: "Yeasts", page: 73 },
      { title: "Bacteria", page: 80 },
      {
        title: "Yeast Nutrients",
        page: 84,
        subsections: [
          "Nitrogen (p.84)",
          "Vitamins (p.85)",
          "Minerals (p.86)",
          "Lipids (p.86)",
        ],
      },
      { title: "Yeast Inoculation", page: 87 },
      { title: "Fermentation Kinetics", page: 89 },
      { title: "Malo-Lactic Fermentation", page: 91 },
      { title: "Spoilage Organisms", page: 95 },
    ],
  },
  {
    number: 4,
    title: "Enology (Winemaking)",
    pageStart: 99,
    sections: [
      { title: "Harvesting", page: 100 },
      { title: "Crushing and Pressing", page: 104 },
      { title: "Sulfur Dioxide", page: 109 },
      { title: "Juice and Must Adjustments", page: 114 },
      { title: "Fermentation", page: 120 },
      { title: "Racking", page: 128 },
      { title: "Fining", page: 131 },
      { title: "Filtration", page: 138 },
      { title: "Stabilization", page: 143 },
      { title: "Bottling", page: 149 },
      { title: "Cellar Sanitation", page: 155 },
    ],
  },
  {
    number: 5,
    title: "Wine Classification",
    pageStart: 161,
    sections: [
      { title: "Table Wines", page: 162 },
      { title: "Sparkling Wines", page: 165 },
      { title: "Dessert and Fortified Wines", page: 168 },
      { title: "Specialty Wines", page: 172 },
    ],
  },
  {
    number: 6,
    title: "Winery Design",
    pageStart: 177,
    sections: [
      { title: "Winery Layout", page: 178 },
      { title: "Equipment", page: 183 },
      { title: "Tanks and Cooperage", page: 190 },
      { title: "Laboratory", page: 198 },
    ],
  },
  {
    number: 7,
    title: "Requirements, Restrictions, and Regulations",
    pageStart: 205,
    sections: [
      { title: "Federal Regulations", page: 206 },
      { title: "State Regulations", page: 215 },
      { title: "Labeling Requirements", page: 220 },
      { title: "Record Keeping", page: 228 },
    ],
  },
  {
    number: 8,
    title: "Getting Started",
    pageStart: 235,
    sections: [
      { title: "Business Planning", page: 236 },
      { title: "Financing", page: 242 },
      { title: "Site and Facility", page: 248 },
      { title: "Licensing", page: 253 },
    ],
  },
  {
    number: 9,
    title: "White Table Wines",
    pageStart: 259,
    sections: [
      { title: "Chardonnay", page: 260 },
      { title: "Riesling", page: 267 },
      { title: "Sauvignon Blanc", page: 272 },
      { title: "Gewurztraminer", page: 277 },
      { title: "Chenin Blanc", page: 281 },
      { title: "Other White Varieties", page: 285 },
    ],
  },
  {
    number: 10,
    title: "Red Table Wines",
    pageStart: 291,
    sections: [
      { title: "Cabernet Sauvignon", page: 292 },
      { title: "Merlot", page: 299 },
      { title: "Pinot Noir", page: 305 },
      { title: "Zinfandel", page: 311 },
      { title: "Syrah / Shiraz", page: 316 },
      { title: "Other Red Varieties", page: 321 },
    ],
  },
  {
    number: 11,
    title: "Blush Table Wines",
    pageStart: 329,
    sections: [
      { title: "White Zinfandel", page: 330 },
      { title: "White Merlot", page: 335 },
      { title: "Other Blush Styles", page: 339 },
    ],
  },
  {
    number: 12,
    title: "Fruit and Berry Wines",
    pageStart: 345,
    sections: [
      { title: "Apple and Pear Wines", page: 346 },
      { title: "Stone Fruit Wines", page: 352 },
      { title: "Berry Wines", page: 357 },
      { title: "Tropical Fruit Wines", page: 363 },
    ],
  },
  {
    number: 13,
    title: "Marketing",
    pageStart: 371,
    sections: [
      { title: "Tasting Rooms", page: 372 },
      { title: "Distribution", page: 378 },
      { title: "Wine Competitions", page: 384 },
      { title: "Direct-to-Consumer", page: 389 },
      { title: "Export Markets", page: 394 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "oklch(0.72 0.12 75 / 30%)",
          color: "oklch(0.88 0.015 75)",
          borderRadius: "2px",
          padding: "0 2px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function chapterMatchesQuery(ch: Chapter, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (ch.title.toLowerCase().includes(lower)) return true;
  return ch.sections.some(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      (s.subsections ?? []).some((sub) => sub.toLowerCase().includes(lower))
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VineReference() {
  const [query, setQuery] = useState("");
  const [activeChapter, setActiveChapter] = useState<number>(1);

  const filteredChapters = useMemo(
    () => CHAPTERS.filter((ch) => chapterMatchesQuery(ch, query)),
    [query]
  );

  const displayChapter =
    filteredChapters.find((c) => c.number === activeChapter) ??
    filteredChapters[0] ??
    null;

  // When search changes, auto-select first match
  const handleSearch = (val: string) => {
    setQuery(val);
    const first = CHAPTERS.find((ch) => chapterMatchesQuery(ch, val));
    if (first) setActiveChapter(first.number);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="container flex items-center justify-between py-5"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link href="/">
          <OwnologyLogo size={32} />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/free-run"
            className="text-xs uppercase tracking-widest"
            style={{ color: "oklch(0.55 0.012 75)" }}
          >
            Free Run
          </Link>
          <Link
            href="/pricing"
            className="text-xs uppercase tracking-widest"
            style={{ color: "oklch(0.55 0.012 75)" }}
          >
            Pricing
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div
        className="container py-10"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: "oklch(0.72 0.12 75)" }}
            >
              Bible Triangle · Side 3
            </p>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                color: "oklch(0.92 0.018 75)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {BOOK.title}
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: "oklch(0.60 0.012 75)" }}
            >
              {BOOK.authors.join(", ")} · {BOOK.publisher} · {BOOK.totalPages} pages
            </p>
          </div>

          {/* Search */}
          <div className="relative md:w-72">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ color: "oklch(0.50 0.012 75)" }}
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search chapters, sections…"
              className="w-full pl-9 pr-4 py-2.5 rounded text-sm outline-none"
              style={{
                background: "oklch(0.14 0.010 60)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.88 0.015 75)",
                fontFamily: "'Lato', sans-serif",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)")
              }
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container flex-1 flex gap-0 py-0" style={{ minHeight: 0 }}>
        {/* Chapter list — left sidebar */}
        <aside
          className="hidden md:flex flex-col py-6 pr-6"
          style={{
            width: "240px",
            flexShrink: 0,
            borderRight: "1px solid oklch(1 0 0 / 6%)",
            overflowY: "auto",
            maxHeight: "calc(100vh - 180px)",
            position: "sticky",
            top: 0,
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ color: "oklch(0.45 0.010 75)" }}
          >
            {filteredChapters.length} chapter{filteredChapters.length !== 1 ? "s" : ""}
          </p>
          {filteredChapters.map((ch) => (
            <button
              key={ch.number}
              onClick={() => setActiveChapter(ch.number)}
              className="text-left py-2.5 px-3 rounded mb-1 transition-all"
              style={{
                background:
                  activeChapter === ch.number
                    ? "oklch(0.16 0.012 60)"
                    : "transparent",
                border:
                  activeChapter === ch.number
                    ? "1px solid oklch(0.72 0.12 75 / 30%)"
                    : "1px solid transparent",
              }}
            >
              {ch.number > 0 && (
                <span
                  className="block text-xs mb-0.5"
                  style={{ color: "oklch(0.45 0.010 75)" }}
                >
                  Chapter {ch.number}
                  {ch.pageStart !== undefined ? ` · p.${ch.pageStart}` : ""}
                </span>
              )}
              <span
                className="text-sm leading-snug"
                style={{
                  color:
                    activeChapter === ch.number
                      ? "oklch(0.82 0.015 75)"
                      : "oklch(0.65 0.012 75)",
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                {highlight(ch.title, query)}
              </span>
            </button>
          ))}
        </aside>

        {/* Mobile chapter selector */}
        <div className="md:hidden w-full py-4">
          <select
            value={activeChapter}
            onChange={(e) => setActiveChapter(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={{
              background: "oklch(0.14 0.010 60)",
              border: "1px solid oklch(1 0 0 / 10%)",
              color: "oklch(0.88 0.015 75)",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {filteredChapters.map((ch) => (
              <option key={ch.number} value={ch.number}>
                {ch.number > 0 ? `Ch.${ch.number} — ` : ""}{ch.title}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter detail — right */}
        <main className="flex-1 py-8 md:pl-10 overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {displayChapter ? (
            <>
              {/* Chapter header */}
              <div className="mb-8">
                {displayChapter.number > 0 && (
                  <p
                    className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: "oklch(0.50 0.012 75)" }}
                  >
                    Chapter {displayChapter.number}
                    {displayChapter.pageStart !== undefined
                      ? ` · starts p.${displayChapter.pageStart}`
                      : ""}
                  </p>
                )}
                <h2
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 700,
                    fontSize: "1.5rem",
                    color: "oklch(0.92 0.018 75)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {highlight(displayChapter.title, query)}
                </h2>
              </div>

              {/* Sections */}
              <div className="flex flex-col gap-4">
                {displayChapter.sections.map((section, si) => {
                  const sectionMatchesQuery =
                    !query ||
                    section.title.toLowerCase().includes(query.toLowerCase()) ||
                    (section.subsections ?? []).some((sub) =>
                      sub.toLowerCase().includes(query.toLowerCase())
                    );
                  if (!sectionMatchesQuery) return null;

                  return (
                    <div
                      key={si}
                      className="p-4 rounded"
                      style={{
                        background: "oklch(0.13 0.009 60)",
                        border: "1px solid oklch(1 0 0 / 6%)",
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: "oklch(0.82 0.015 75)",
                            fontFamily: "'Lato', sans-serif",
                          }}
                        >
                          {highlight(section.title, query)}
                        </span>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{
                            color: "oklch(0.72 0.12 75)",
                            fontFamily: "'Fira Code', monospace",
                          }}
                        >
                          p.{section.page}
                        </span>
                      </div>

                      {section.subsections && section.subsections.length > 0 && (
                        <ul className="flex flex-col gap-1 mt-2 pl-3">
                          {section.subsections.map((sub, subI) => (
                            <li
                              key={subI}
                              className="text-xs leading-relaxed"
                              style={{
                                color: "oklch(0.58 0.012 75)",
                                borderLeft: "2px solid oklch(0.72 0.12 75 / 20%)",
                                paddingLeft: "8px",
                              }}
                            >
                              {highlight(sub, query)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <p
                className="text-sm"
                style={{ color: "oklch(0.50 0.012 75)" }}
              >
                No chapters match your search.
              </p>
              <button
                onClick={() => setQuery("")}
                className="mt-3 text-xs"
                style={{ color: "oklch(0.72 0.12 75)" }}
              >
                Clear search
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Footer note */}
      <div
        className="container py-6"
        style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <p
          className="text-xs"
          style={{ color: "oklch(0.40 0.010 75)", lineHeight: 1.6 }}
        >
          {BOOK.role} · {BOOK.series} · {BOOK.publisher}.{" "}
          This index is for reference and navigation only. Page numbers are approximate.
        </p>
      </div>
    </div>
  );
}
