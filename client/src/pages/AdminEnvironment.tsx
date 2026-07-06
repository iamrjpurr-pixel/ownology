/**
 * AdminEnvironment — per-winery Tier 3 (Environmental) config.
 *
 * Slice 2 of the Weather widget saga. Lets a paying winery set:
 *   - Their cellar GPS (via address → geocode lookup, or manual lat/lng)
 *   - Cellar type (passive / active / mixed) — display-only for now, drives
 *     future SOP recommendations
 *   - Custom threshold overrides for the 5 alerts (fall back to AWRI TR227
 *     defaults where not set)
 *
 * Once saved, the WeatherWidget on /dashboard auto-picks up the new config
 * on next refresh — no page rebuild needed. Gated to Founding-Member+ tiers
 * (matches the contextualAdvice + saveWineryConfig plan gate).
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const AMBER = "var(--ow-amber)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const BORDER = "var(--ow-border)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // state / region
}

async function geocode(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = (await r.json()) as { results?: GeoResult[] };
  return d.results ?? [];
}

export default function AdminEnvironment() {
  const config = trpc.weather.getWineryConfig.useQuery();
  const save = trpc.weather.saveWineryConfig.useMutation({
    onSuccess: () => config.refetch(),
  });
  const utils = trpc.useContext();

  const [label, setLabel] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [cellarType, setCellarType] = useState<"passive" | "active" | "mixed">("passive");
  const [thresholds, setThresholds] = useState({
    humidity_high_pct: 75,
    humidity_low_pct: 55,
    temp_high_c: 18,
    temp_low_c: 10,
    dewpoint_approach_margin_c: 2,
    assumed_cellar_temp_c: 14,
  });
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);

  useEffect(() => {
    if (!config.data) return;
    setLabel(config.data.location.label);
    setLat(String(config.data.location.lat));
    setLng(String(config.data.location.lng));
    setCellarType(config.data.cellarType);
    setThresholds({ ...thresholds, ...config.data.thresholds });
  }, [config.data]);

  const runGeo = async () => {
    setGeoBusy(true);
    try {
      setGeoResults(await geocode(geoQuery));
    } finally {
      setGeoBusy(false);
    }
  };

  const pickGeo = (g: GeoResult) => {
    setLat(String(g.latitude));
    setLng(String(g.longitude));
    setLabel([g.name, g.admin1, g.country].filter(Boolean).join(", "));
    setGeoResults([]);
    setGeoQuery("");
  };

  const submit = () => {
    save.mutate({
      lat: Number(lat),
      lng: Number(lng),
      label: label.trim() || undefined,
      cellarType,
      thresholds,
    }, {
      onSuccess: () => {
        // Also invalidate the widget's currentAndForecast so it repulls with new coords
        utils.weather.currentAndForecast.invalidate();
      },
    });
  };

  const gated = save.data && "gated" in save.data && save.data.gated;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", paddingBottom: "5rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: 0 }}>
          Admin · Cellar Environment
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: HI, margin: "0.75rem 0 0.75rem", lineHeight: 1.15 }}>
          Where does your cellar live?
        </h1>
        <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, lineHeight: 1.6 }}>
          Set the GPS + threshold overrides for your winery. The <Link href="/dashboard" style={{ color: AMBER }}>Dashboard Weather widget</Link> uses these to stream ambient telemetry from Open-Meteo and fire the Tier 3 alerts. Anything you leave blank falls back to the AWRI TR227 defaults.
        </p>

        {/* ── Location ── */}
        <section data-testid="admin-env-location" style={{ marginTop: "2rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1.25rem 1.35rem" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", color: HI, margin: 0, marginBottom: "0.5rem" }}>
            1 · Location
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, marginBottom: "1rem", lineHeight: 1.55 }}>
            Type your winery, town, or address and pick the closest match. Or enter GPS coordinates directly if you know them.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <input
              data-testid="admin-env-geo-input"
              type="text"
              placeholder="e.g. Pokolbin, Blenheim, Barossa Valley, 138 Krondorf Road..."
              value={geoQuery}
              onChange={(e) => setGeoQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runGeo()}
              style={{ flex: "1 1 240px", padding: "0.55rem 0.75rem", background: RAISED, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontFamily: SANS, fontSize: "0.9rem" }}
            />
            <button
              data-testid="admin-env-geo-btn"
              type="button"
              onClick={runGeo}
              disabled={geoBusy || !geoQuery.trim()}
              style={{ background: AMBER, color: "oklch(0.10 0.008 60)", border: 0, padding: "0.55rem 1.1rem", borderRadius: 4, fontWeight: 700, cursor: geoBusy ? "wait" : "pointer", fontFamily: SANS, fontSize: "0.85rem" }}
            >
              {geoBusy ? "Searching…" : "Look up"}
            </button>
          </div>

          {geoResults.length > 0 && (
            <div data-testid="admin-env-geo-results" style={{ marginBottom: "0.75rem", background: RAISED, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.35rem 0" }}>
              {geoResults.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickGeo(g)}
                  data-testid={`admin-env-geo-result-${i}`}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "0.5rem 0.9rem", background: "transparent", border: 0, color: HI, cursor: "pointer", fontFamily: SANS, fontSize: "0.85rem" }}
                >
                  {g.name}{g.admin1 ? `, ${g.admin1}` : ""}{g.country ? `, ${g.country}` : ""}{" "}
                  <span style={{ color: LO, fontFamily: MONO, fontSize: "0.72rem", marginLeft: "0.4rem" }}>
                    {g.latitude.toFixed(3)}, {g.longitude.toFixed(3)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.5rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.68rem", color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>Latitude</span>
              <input data-testid="admin-env-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-32.7770" style={inp} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.68rem", color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>Longitude</span>
              <input data-testid="admin-env-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="151.3013" style={inp} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.68rem", color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>Display label</span>
              <input data-testid="admin-env-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ownology Cellars · Pokolbin, Hunter Valley" style={inp} />
            </label>
          </div>
        </section>

        {/* ── Cellar type ── */}
        <section data-testid="admin-env-cellar-type" style={{ marginTop: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1.25rem 1.35rem" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", color: HI, margin: 0, marginBottom: "0.5rem" }}>
            2 · Cellar type
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, marginBottom: "0.75rem", lineHeight: 1.55 }}>
            Passive = temperature/humidity follow ambient. Active = fully climate-controlled. Mixed = partial control (e.g. barrel hall unheated, bottling room A/C&apos;d).
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["passive", "active", "mixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`admin-env-cellar-type-${t}`}
                onClick={() => setCellarType(t)}
                style={{
                  padding: "0.45rem 1rem",
                  background: cellarType === t ? "color-mix(in oklch, var(--ow-amber) 20%, transparent)" : "transparent",
                  color: cellarType === t ? HI : MID,
                  border: `1px solid ${cellarType === t ? AMBER : BORDER}`,
                  borderRadius: 4,
                  fontFamily: SANS,
                  fontSize: "0.85rem",
                  fontWeight: cellarType === t ? 700 : 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* ── Thresholds ── */}
        <section data-testid="admin-env-thresholds" style={{ marginTop: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1.25rem 1.35rem" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", color: HI, margin: 0, marginBottom: "0.5rem" }}>
            3 · Alert thresholds
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, marginBottom: "0.85rem", lineHeight: 1.55 }}>
            Defaults come from AWRI TR227 (2017) — cellar humidity 55–75 % RH ideal, storage temp &lt; 18 °C. Override if your site or wine style needs different bands.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
            <NumInput label="Humidity HIGH (%)" testId="admin-env-th-humidity-high" value={thresholds.humidity_high_pct} onChange={(v) => setThresholds({ ...thresholds, humidity_high_pct: v })} />
            <NumInput label="Humidity LOW (%)"  testId="admin-env-th-humidity-low"  value={thresholds.humidity_low_pct}  onChange={(v) => setThresholds({ ...thresholds, humidity_low_pct: v })} />
            <NumInput label="Temp HIGH (°C)"    testId="admin-env-th-temp-high"     value={thresholds.temp_high_c}       onChange={(v) => setThresholds({ ...thresholds, temp_high_c: v })} />
            <NumInput label="Temp LOW (°C)"     testId="admin-env-th-temp-low"      value={thresholds.temp_low_c}        onChange={(v) => setThresholds({ ...thresholds, temp_low_c: v })} />
            <NumInput label="Dew-point margin (°C)" testId="admin-env-th-dp-margin"  value={thresholds.dewpoint_approach_margin_c} onChange={(v) => setThresholds({ ...thresholds, dewpoint_approach_margin_c: v })} />
            <NumInput label="Assumed cellar °C" testId="admin-env-th-cellar-temp"    value={thresholds.assumed_cellar_temp_c} onChange={(v) => setThresholds({ ...thresholds, assumed_cellar_temp_c: v })} />
          </div>
        </section>

        {/* ── Save ── */}
        <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            data-testid="admin-env-save"
            onClick={submit}
            disabled={save.isPending || !lat || !lng}
            style={{ background: AMBER, color: "oklch(0.10 0.008 60)", border: 0, padding: "0.6rem 1.4rem", borderRadius: 4, fontWeight: 700, fontFamily: SANS, fontSize: "0.9rem", cursor: save.isPending ? "wait" : "pointer" }}
          >
            {save.isPending ? "Saving…" : "💾 Save configuration"}
          </button>
          {save.data && !gated && "ok" in save.data && save.data.ok && (
            <span data-testid="admin-env-saved-ok" style={{ fontFamily: SANS, fontSize: "0.85rem", color: "oklch(0.62 0.16 145)", fontWeight: 700 }}>
              ✓ Saved. Reload /dashboard to see your widget refresh.
            </span>
          )}
          {gated && save.data && "message" in save.data && (
            <span data-testid="admin-env-gated" style={{ fontFamily: SANS, fontSize: "0.85rem", color: AMBER, fontWeight: 600 }}>
              🔒 {save.data.message}
            </span>
          )}
          {save.error && (
            <span style={{ fontFamily: SANS, fontSize: "0.85rem", color: "oklch(0.65 0.18 25)" }}>
              Save failed: {save.error.message}
            </span>
          )}
        </div>

        <div style={{ marginTop: "2rem", padding: "0.85rem 1rem", background: RAISED, border: `1px dashed ${BORDER}`, borderRadius: 6, fontFamily: SANS, fontSize: "0.8rem", color: LO, lineHeight: 1.55 }}>
          <strong style={{ color: HI }}>Data source:</strong> Open-Meteo (free tier, CC-BY-4.0, no auth). Refreshes every 5 min on the Dashboard widget.{" "}
          <Link href="/risk-briefing" style={{ color: AMBER }}>Learn more about Tier 3 risk →</Link>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  background: "var(--ow-bg-raised)",
  color: HI,
  border: `1px solid ${BORDER}`,
  borderRadius: 4,
  fontFamily: SANS,
  fontSize: "0.9rem",
};

function NumInput({ label, value, onChange, testId }: { label: string; value: number; onChange: (v: number) => void; testId: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <span style={{ fontSize: "0.68rem", color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>{label}</span>
      <input
        data-testid={testId}
        type="number"
        value={value}
        step="0.5"
        onChange={(e) => onChange(Number(e.target.value))}
        style={inp}
      />
    </label>
  );
}
