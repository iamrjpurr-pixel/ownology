/**
 * Auto-crop the master cover (4200×700) into platform-specific variants.
 *
 * Strategy: the master is horizontally-oriented. For square/portrait
 * targets we take a centred crop. For same-aspect targets we resize.
 *
 * Rich, Feb 2026 — kills the "I need X size for LinkedIn/IG/FB but the
 * master is the wrong aspect" bottleneck. Idempotent — overwrites
 * existing derivatives, no versioning.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const src = "/app/client/public/ownology-cover-4200x700.png";
const outDir = "/app/client/public";
await mkdir(outDir, { recursive: true });

type Crop = {
  file: string;
  width: number;
  height: number;
  strategy: "center" | "attention" | "entropy" | "fit"; // "fit" = letterbox with brand bg
  purpose: string;
};

// Source is 4200×700 (aspect 6:1). Target aspects:
//   IG square 1:1        — need center crop from middle band
//   FB cover 820×312     — aspect 2.63:1 — extract wide horizontal strip
//   Google 1080×608      — aspect 1.78:1 — moderate horizontal strip
//   X header 1500×500    — already exists but include for completeness
//   IG portrait 1080×1350 — aspect 0.8 — needs a portrait design, we'll do letterbox

const crops: Crop[] = [
  { file: "ownology-ig-square-1080x1080.png",         width: 1080, height: 1080, strategy: "center",    purpose: "IG profile / square post" },
  { file: "ownology-ig-portrait-1080x1350.png",       width: 1080, height: 1350, strategy: "fit",       purpose: "IG portrait post (letterboxed on brand bg)" },
  { file: "ownology-fb-cover-820x312.png",            width: 820,  height: 312,  strategy: "attention", purpose: "Facebook page cover" },
  { file: "ownology-google-business-1080x608.png",    width: 1080, height: 608,  strategy: "attention", purpose: "Google Business Profile cover" },
  { file: "ownology-profile-square-1024x1024.png",    width: 1024, height: 1024, strategy: "center",    purpose: "Generic square profile — LinkedIn/Google/FB avatar" },
];

const results: Array<{ file: string; ok: boolean; note?: string }> = [];

for (const c of crops) {
  const outPath = path.join(outDir, c.file);
  try {
    let pipeline = sharp(src);
    if (c.strategy === "fit") {
      // Letterbox: fit the whole image inside target dimensions, pad with
      // brand dark background so the crop preserves everything.
      pipeline = pipeline
        .resize(c.width, c.height, {
          fit: "contain",
          background: { r: 25, g: 20, b: 15, alpha: 1 }, // near-black oklch(0.10 0.008 60)
        });
    } else {
      // Cover-crop with position strategy (center/attention/entropy)
      pipeline = pipeline
        .resize(c.width, c.height, {
          fit: "cover",
          position: c.strategy === "center" ? "center" : c.strategy,
        });
    }
    await pipeline.png({ quality: 92, compressionLevel: 9 }).toFile(outPath);
    results.push({ file: c.file, ok: true });
  } catch (err) {
    results.push({ file: c.file, ok: false, note: err instanceof Error ? err.message : String(err) });
  }
}

console.log("Crop results:");
for (const r of results) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.file}${r.note ? ` — ${r.note}` : ""}`);
}
