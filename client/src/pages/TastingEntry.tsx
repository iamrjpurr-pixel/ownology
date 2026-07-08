/**
 * /tasting — log a sensory evaluation for a single vessel.
 *
 * Cellar-floor mobile-first flow: tap each of the 10 dimensions (5 flavor +
 * 5 structure) on a 0–5 scale, optional note, submit. Persisted as a
 * vintage_log_entries row with type="observation" and
 * details_json.tasting = { flavor: {...}, structure: {...}, note }.
 *
 * The cellar brief engine reads the latest such entry per vessel and
 * surfaces it in the Sensory Block — so logging one tasting here → the
 * bars snap to real numbers next brief. This is the flywheel: real
 * tastings compound into a genuine tasting-history dashboard, not a
 * fermentation panel with faked bars.
 *
 * Query params:
 *   ?tank=T7                — pre-fills the vessel picker
 *   ?variety=Shiraz         — pre-fills the variety label
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  SensoryBlock,
  type FlavorProfile,
  type StructureProfile,
} from "@/components/SensoryBlock";
import { OwenDisclaimer } from "@/components/OwenDisclaimer";

const FLAVOR_KEYS: Array<{ key: keyof FlavorProfile; label: string; hint: string }> = [
  { key: "fruit",  label: "Fruit",  hint: "Primary fruit expression (cherry, blackcurrant, citrus, tropical)" },
  { key: "earth",  label: "Earth",  hint: "Minerality, forest floor, mushroom, wet stone" },
  { key: "oak",    label: "Oak",    hint: "Vanilla, coconut, toast, cedar, smoke" },
  { key: "spice",  label: "Spice",  hint: "Pepper, clove, cinnamon, star anise" },
  { key: "floral", label: "Floral", hint: "Violet, rose, jasmine, elderflower" },
];

const STRUCTURE_KEYS: Array<{ key: keyof StructureProfile; label: string; hint: string }> = [
  { key: "body",      label: "Body",      hint: "Light (0) to full/dense (5)" },
  { key: "acid",      label: "Acidity",   hint: "Flabby (0) to razor-sharp (5)" },
  { key: "tannin",    label: "Tannin",    hint: "None (0) to firm/drying (5) — whites usually 0" },
  { key: "sweetness", label: "Sweetness", hint: "Bone-dry (0) to noticeably sweet (5)" },
  { key: "finish",    label: "Finish",    hint: "Short (0) to long/persistent (5)" },
];

const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const BORDER = "var(--ow-border)";
const CARD = "var(--ow-bg-card)";
const SERIF = "'Fraunces', serif";

export default function TastingEntry() {
  const qs = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const initialTank = qs.get("tank") || "";
  const initialVariety = qs.get("variety") || "";

  const [tank, setTank] = useState(initialTank);
  const [variety, setVariety] = useState(initialVariety);
  const [flavor, setFlavor] = useState<FlavorProfile>({
    fruit: 3, earth: 2, oak: 2, spice: 2, floral: 2,
  });
  const [structure, setStructure] = useState<StructureProfile>({
    body: 3, acid: 3, tannin: 2, sweetness: 1, finish: 3,
  });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const usedTanks = trpc.vintageLog.getUsedTanks.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const addEntry = trpc.vintageLog.add.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success(`Tasting logged for ${tank}${variety ? ` (${variety})` : ""}`);
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit() {
    if (!tank.trim()) {
      toast.error("Pick a vessel first");
      return;
    }
    const payload = {
      tankName: tank.trim(),
      variety: variety.trim() || "Unknown",
      eventType: "observation" as const,
      details: {
        tasting: {
          flavor,
          structure,
          ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
        },
      },
      noteText: note.trim() || "Tasting logged",
    };
    addEntry.mutate(payload);
  }

  if (saved) {
    return (
      <div style={pageStyle} data-testid="tasting-success">
        <div style={{ maxWidth: 520, margin: "3rem auto 0", textAlign: "center" }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 999,
              background: "color-mix(in oklch, var(--ow-amber) 22%, transparent)",
              border: `1px solid ${AMBER}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Check size={26} style={{ color: AMBER }} />
          </div>
          <h1
            style={{
              fontFamily: SERIF, fontSize: "1.75rem", color: HI,
              margin: "1.25rem 0 0.5rem",
            }}
            data-testid="tasting-success-heading"
          >
            Tasting logged.
          </h1>
          <p style={{ color: MID, fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
            Your Sensory Snapshot on <strong>{tank}</strong>{variety && ` · ${variety}`} will
            update on the next brief. This is the flywheel: log one tasting → see it in your
            brief tomorrow morning → let the wine tell its story over the vintage.
          </p>
          <div style={{ marginTop: "1.5rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1rem 1.15rem" }}>
            <SensoryBlock flavor={flavor} structure={structure} compact testid="tasting-success-preview" />
          </div>
          <div style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/cellar-brief" style={btnPrimary} data-testid="tasting-success-brief">
              → View the brief
            </Link>
            <button
              onClick={() => { setSaved(false); setNote(""); }}
              style={btnSecondary}
              data-testid="tasting-log-another"
            >
              Log another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle} data-testid="tasting-page">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/cellar-brief"
          style={{
            color: LO, fontSize: "0.8rem", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
          }}
          data-testid="tasting-back"
        >
          <ArrowLeft size={12} /> Back to brief
        </Link>

        <h1
          style={{
            margin: "1rem 0 0.5rem",
            fontFamily: SERIF,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: HI,
            lineHeight: 1.15,
          }}
          data-testid="tasting-heading"
        >
          Log a tasting.
        </h1>
        <p style={{ margin: 0, fontSize: "0.95rem", color: MID, lineHeight: 1.5 }}>
          Tap once per dimension on a 0–5 scale. Feeds the Sensory Snapshot on
          tomorrow's brief. 45 seconds if you know the wine.
        </p>

        {/* Vessel picker */}
        <div style={panelStyle}>
          <label style={labelStyle}>Vessel</label>
          {usedTanks.data && usedTanks.data.length > 0 ? (
            <div
              style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}
              data-testid="tasting-tank-chips"
            >
              {usedTanks.data.slice(0, 12).map((t: string) => (
                <button
                  key={t}
                  onClick={() => setTank(t)}
                  data-testid={`tasting-tank-${t.replace(/[^A-Za-z0-9]+/g, "-")}`}
                  style={{
                    ...chipStyle,
                    background: tank === t ? AMBER : "transparent",
                    color: tank === t ? "#1a1210" : HI,
                    borderColor: tank === t ? AMBER : BORDER,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
          <input
            type="text"
            value={tank}
            onChange={(e) => setTank(e.target.value)}
            placeholder="e.g. T7"
            style={inputStyle}
            data-testid="tasting-tank-input"
          />

          <label style={{ ...labelStyle, marginTop: "0.85rem" }}>Variety (optional)</label>
          <input
            type="text"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            placeholder="e.g. Shiraz"
            style={inputStyle}
            data-testid="tasting-variety-input"
          />
        </div>

        {/* Flavor */}
        <div style={panelStyle} data-testid="tasting-flavor-panel">
          <div style={labelStyle}>Flavor profile</div>
          {FLAVOR_KEYS.map(({ key, label, hint }) => (
            <ScaleRow
              key={key}
              label={label}
              hint={hint}
              value={flavor[key]}
              onChange={(v) => setFlavor((f) => ({ ...f, [key]: v }))}
              testid={`tasting-flavor-${key}`}
            />
          ))}
        </div>

        {/* Structure */}
        <div style={panelStyle} data-testid="tasting-structure-panel">
          <div style={labelStyle}>Structure</div>
          {STRUCTURE_KEYS.map(({ key, label, hint }) => (
            <ScaleRow
              key={key}
              label={label}
              hint={hint}
              value={structure[key]}
              onChange={(v) => setStructure((s) => ({ ...s, [key]: v }))}
              testid={`tasting-structure-${key}`}
            />
          ))}
        </div>

        {/* Live preview */}
        <div style={panelStyle}>
          <div style={labelStyle}>Preview</div>
          <SensoryBlock flavor={flavor} structure={structure} compact testid="tasting-preview" />
        </div>

        {/* Note + submit */}
        <div style={panelStyle}>
          <label style={labelStyle}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything specific — off-notes, evolution, decisions to consider…"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "'Lato', sans-serif" }}
            data-testid="tasting-note-input"
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={addEntry.isPending || !tank.trim()}
          style={{
            ...btnPrimary,
            marginTop: "1rem",
            width: "100%",
            padding: "0.85rem",
            fontSize: "0.95rem",
          }}
          data-testid="tasting-submit"
        >
          {addEntry.isPending ? "Saving…" : "Log tasting"}
        </button>

        <OwenDisclaimer testid="tasting-owen-disclaimer" compact />
      </div>
    </div>
  );
}

function ScaleRow({
  label, hint, value, onChange, testid,
}: {
  label: string; hint: string; value: number;
  onChange: (v: number) => void; testid: string;
}) {
  return (
    <div style={{ margin: "0.7rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: "0.9rem", color: HI, fontFamily: SERIF }}>{label}</span>
        <span style={{ fontSize: "0.68rem", color: LO, fontStyle: "italic" }}>{hint}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }} data-testid={testid}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            data-testid={`${testid}-${n}`}
            style={{
              padding: "0.55rem 0",
              borderRadius: 6,
              border: `1px solid ${value === n ? AMBER : BORDER}`,
              background: value === n ? AMBER : "transparent",
              color: value === n ? "#1a1210" : HI,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              fontWeight: value === n ? 700 : 500,
              cursor: "pointer",
              minHeight: 38,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--ow-bg-base)",
  color: HI,
  padding: "2rem 1.25rem 4rem",
  fontFamily: "'Lato', sans-serif",
};

const panelStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "1rem 1.15rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: LO,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontFamily: "'Lato', sans-serif",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: "var(--ow-bg-base)",
  color: HI,
  fontSize: "0.9rem",
  boxSizing: "border-box",
};

const chipStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: 999,
  border: `1px solid ${BORDER}`,
  fontSize: "0.8rem",
  fontFamily: "'Lato', sans-serif",
  cursor: "pointer",
  minHeight: 32,
};

const btnPrimary: React.CSSProperties = {
  background: AMBER,
  color: "#1a1210",
  border: "none",
  borderRadius: 999,
  padding: "0.65rem 1.25rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  fontFamily: "'Lato', sans-serif",
  textDecoration: "none",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: HI,
  border: `1px solid ${BORDER}`,
  borderRadius: 999,
  padding: "0.65rem 1.25rem",
  fontSize: "0.9rem",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'Lato', sans-serif",
};
