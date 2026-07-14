/**
 * /admin/brand-assets — inventory of Ownology's brand assets with
 * click-to-copy URLs and platform-sizing metadata (Rich, Feb 2026).
 *
 * Assets live in /client/public/ and are served directly by Vite at
 * the site root (e.g. /ownology-logo-1024.png).
 *
 * Categories:
 *   - Logos (mono/light/dark/mark)
 *   - Social banners (LinkedIn personal + company, X, Facebook, Google)
 *   - Marketing (og-image, hero covers)
 *   - Icons (favicon, PWA manifest)
 */
import { useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

type Asset = {
  label: string;
  file: string;
  dims: string;
  purpose: string;
  target?: string; // Platform-specification for provenance / re-upload
  bg?: "dark" | "light" | "checker";
};

type Category = {
  key: string;
  title: string;
  intro: string;
  assets: Asset[];
};

const CATEGORIES: Category[] = [
  {
    key: "logos",
    title: "Logos",
    intro: "Primary marks in dark, light, mono variants. Use the 1024 px versions as originals — downscale on demand.",
    assets: [
      { label: "Logo · dark bg",  file: "/ownology-logo-1024.png",           dims: "1024 × 1024", purpose: "For dark surfaces (default cellar theme, wine glass, deep amber CTAs)", bg: "dark" },
      { label: "Logo · light bg", file: "/ownology-logo-1024-light.png",     dims: "1024 × 1024", purpose: "For parchment/white surfaces (pitch decks, printed collateral, day-mode UI)", bg: "light" },
      { label: "Logo mark only",  file: "/ownology-logo-mark-512.png",       dims: "512 × 512",   purpose: "Trinity emblem without wordmark. App icon fallback, social avatar, small badges.", bg: "checker" },
    ],
  },
  {
    key: "profile-icons",
    title: "Profile icons (1024²)",
    intro: "Square profile-picture variants sized for LinkedIn/Google/Facebook avatar upload. Keep 1024² so downscaling stays crisp.",
    assets: [
      { label: "Profile · dark",  file: "/ownology-profile-icon-dark-1024.png",  dims: "1024 × 1024", purpose: "LinkedIn/Google Business logo (dark backdrop)", target: "LinkedIn 400²+ · Google 250²+ · FB 170²+ · IG 320²+", bg: "dark" },
      { label: "Profile · light", file: "/ownology-profile-icon-light-1024.png", dims: "1024 × 1024", purpose: "For light-heavy platforms or when host UI is dark", target: "Same targets — pick based on host UI contrast", bg: "light" },
      { label: "Profile · mono",  file: "/ownology-profile-icon-mono-1024.png",  dims: "1024 × 1024", purpose: "Monochrome amber-on-black. Distinctive on crowded profile feeds.", target: "Same targets — mono variant", bg: "dark" },
    ],
  },
  {
    key: "banners",
    title: "Social banners",
    intro: "Cover art tuned per platform. Never crop these — each is already at native platform dimensions.",
    assets: [
      { label: "LinkedIn · personal banner", file: "/ownology-linkedin-personal-v2-1584x396.png",     dims: "1584 × 396", purpose: "Your personal LinkedIn profile hero (safe area: middle 60%)", target: "LinkedIn personal profile → Edit background → Upload", bg: "dark" },
      { label: "LinkedIn · personal (v1)",   file: "/ownology-logo-linkedin-personal-1584x396.png",   dims: "1584 × 396", purpose: "Older variant, kept for archive/A-B", target: "LinkedIn personal profile", bg: "dark" },
      { label: "LinkedIn · company banner",  file: "/ownology-logo-linkedin-company-1128x191.png",    dims: "1128 × 191", purpose: "Ownology company page hero", target: "LinkedIn company page → Cover image → Upload", bg: "dark" },
      { label: "LinkedIn · company (v2)",    file: "/ownology-linkedin-cover-v2-1128x191.png",        dims: "1128 × 191", purpose: "Second company banner variant", target: "LinkedIn company page", bg: "dark" },
      { label: "LinkedIn banner (extra)",    file: "/ownology-logo-linkedin-banner.png",              dims: "auto",       purpose: "Utility banner — check dimensions before upload", target: "LinkedIn (verify sizing)", bg: "dark" },
      { label: "X (Twitter) header",         file: "/ownology-logo-x-header-1500x500.png",            dims: "1500 × 500", purpose: "X/Twitter profile header", target: "X profile → Edit profile → Header photo", bg: "dark" },
      { label: "Site cover (wide)",          file: "/ownology-cover-4200x700.png",                    dims: "4200 × 700", purpose: "Very wide hero. Suitable for print, expo backdrop, retina desktop hero.", target: "Print + retina hero", bg: "dark" },
    ],
  },
  {
    key: "social-post",
    title: "Social & OG images",
    intro: "OG/Twitter card image + previews. These render when someone shares an Ownology URL on social.",
    assets: [
      { label: "OG image · home",  file: "/og-image.png", dims: "1200 × 630", purpose: "Default Open Graph card for ownology.ai — used when the marketing site is shared", target: "Facebook / LinkedIn / iMessage / Slack link previews", bg: "dark" },
      { label: "OG image · /try",  file: "/og-try.png",   dims: "1200 × 630", purpose: "Custom OG for the /try gate. Higher intent → warmer copy", target: "Shares of /try (early-access invite)", bg: "dark" },
    ],
  },
  {
    key: "icons",
    title: "Favicons & PWA",
    intro: "Small icons used by browsers, PWAs, and mobile OS.",
    assets: [
      { label: "Favicon (SVG)", file: "/favicon.svg", dims: "vector", purpose: "Browser tab icon. SVG scales cleanly on every DPR.", target: "index.html <link rel=\"icon\">", bg: "checker" },
    ],
  },
];

const PLATFORM_SPECS = [
  { platform: "LinkedIn personal profile picture", dim: "400 × 400 (min); recommended 800 × 800", tip: "Use /ownology-profile-icon-*-1024.png — dark for busy feeds" },
  { platform: "LinkedIn personal banner",          dim: "1584 × 396",  tip: "Use /ownology-linkedin-personal-v2-1584x396.png" },
  { platform: "LinkedIn company page logo",        dim: "300 × 300",   tip: "Use profile-icon 1024, LinkedIn downscales" },
  { platform: "LinkedIn company page banner",      dim: "1128 × 191",  tip: "Use /ownology-logo-linkedin-company-1128x191.png" },
  { platform: "Instagram profile",                 dim: "320 × 320 (displays 110 × 110)", tip: "Upload 1024²; IG downscales" },
  { platform: "Instagram post (square)",           dim: "1080 × 1080", tip: "Repurpose /ownology-logo-1024.png with padding" },
  { platform: "Instagram post (portrait)",         dim: "1080 × 1350", tip: "Extend cover-4200x700.png or design custom" },
  { platform: "Facebook profile picture",          dim: "170 × 170",   tip: "Upload 1024²" },
  { platform: "Facebook cover",                    dim: "820 × 312",   tip: "Crop from /ownology-cover-4200x700.png" },
  { platform: "Google Business Profile logo",      dim: "720 × 720 (min 250 × 250)", tip: "Upload 1024²" },
  { platform: "Google Business Profile cover",     dim: "1080 × 608",  tip: "Crop from /ownology-cover-4200x700.png" },
  { platform: "X (Twitter) profile photo",         dim: "400 × 400",   tip: "Upload 1024²" },
  { platform: "X (Twitter) header",                dim: "1500 × 500",  tip: "Use /ownology-logo-x-header-1500x500.png" },
];

function bgStyle(bg?: "dark" | "light" | "checker"): React.CSSProperties {
  if (bg === "light") return { background: "oklch(0.97 0.010 75)" };
  if (bg === "checker") return { backgroundImage: "linear-gradient(45deg, oklch(0 0 0 / 0.06) 25%, transparent 25%), linear-gradient(-45deg, oklch(0 0 0 / 0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, oklch(0 0 0 / 0.06) 75%), linear-gradient(-45deg, transparent 75%, oklch(0 0 0 / 0.06) 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0", background: "oklch(0.16 0.012 60)" };
  return { background: "oklch(0.16 0.012 60)" };
}

export default function AdminBrandAssets() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState<string | null>(null);

  async function copyUrl(fullUrl: string) {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(fullUrl);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* no-op */ }
  }

  return (
    <div data-testid="admin-brand-assets" style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.68rem", color: "var(--ow-amber)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Brand library</p>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>Brand assets</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Every logo, banner, and social size in one place. Click any URL to copy — paste straight into LinkedIn / Instagram / your press kit.
          </p>
        </div>
        <Link href="/admin-hub" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>← admin hub</Link>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat.key} data-testid={`cat-${cat.key}`} style={{ padding: "20px 24px 8px" }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", margin: "0 0 4px", color: "var(--ow-text-hi)" }}>{cat.title}</h2>
          <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "var(--ow-text-mid)" }}>{cat.intro}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {cat.assets.map((a) => {
              const fullUrl = `${origin}${a.file}`;
              const isCopied = copied === fullUrl;
              return (
                <div key={a.file} data-testid={`asset-${a.file}`} style={{ border: "1px solid var(--ow-border)", borderRadius: 4, overflow: "hidden", background: "var(--ow-bg-card)" }}>
                  <div style={{ ...bgStyle(a.bg), padding: 12, minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={a.file} alt={a.label} style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} />
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Fraunces',serif", fontSize: "0.9rem", fontWeight: 600 }}>{a.label}</span>
                      <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.68rem", color: "var(--ow-text-lo)" }}>{a.dims}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "var(--ow-text-mid)", lineHeight: 1.4 }}>{a.purpose}</p>
                    {a.target && <p style={{ margin: "3px 0 0", fontSize: "0.65rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>→ {a.target}</p>}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        data-testid={`copy-${a.file}`}
                        onClick={() => copyUrl(fullUrl)}
                        style={{ padding: "3px 10px", background: isCopied ? "#16a34a" : "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 3, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}
                      >
                        {isCopied ? "✓ URL copied" : "Copy URL"}
                      </button>
                      <a href={a.file} target="_blank" rel="noopener noreferrer" style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.7rem", textDecoration: "none" }}>
                        Open ↗
                      </a>
                      <a href={a.file} download style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.7rem", textDecoration: "none" }}>
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section style={{ padding: "24px" }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", margin: "0 0 4px", color: "var(--ow-text-hi)" }}>Platform size cheat-sheet</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--ow-text-mid)" }}>Quick reference when you're uploading to LinkedIn / IG / FB / X / Google Business. Recommended source file listed against each spec.</p>
        <div style={{ border: "1px solid var(--ow-border)", borderRadius: 4, overflow: "hidden", background: "var(--ow-bg-card)" }}>
          <table data-testid="platform-specs" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Platform</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Native size</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recommended source</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_SPECS.map((s) => (
                <tr key={s.platform} style={{ borderTop: "1px solid var(--ow-border)" }}>
                  <td style={{ padding: "6px 12px", color: "var(--ow-text-hi)" }}>{s.platform}</td>
                  <td style={{ padding: "6px 12px", color: "var(--ow-text-mid)", fontFamily: "'Fira Code',monospace", fontSize: "0.72rem" }}>{s.dim}</td>
                  <td style={{ padding: "6px 12px", color: "var(--ow-text-lo)" }}>{s.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "16px 0 0", fontSize: "0.75rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
          Missing a size? Drop a request in the todo — cropping the 4200 × 700 cover is a 60-sec design job.
        </p>
      </section>
    </div>
  );
}
