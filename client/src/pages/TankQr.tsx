/**
 * /tank-qr — Printable QR codes for cellar tanks.
 *
 * Each QR encodes a deep link to /quick-entry?tank=<TankName>&variety=<Variety>
 * so cellar staff can scan a tank's printed QR with their phone and land on
 * a pre-filled QuickEntry form. Physical → digital bridge.
 *
 * Value-engineering check: 4/5 — single client-side page, no backend changes
 * (the URL params reading on QuickEntry comes next, separate change).
 */
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { trpc } from "../lib/trpc";

type TankQrRow = { tank: string; varieties: string[]; dataUrl: string };

export default function TankQr() {
  const { data: entries } = trpc.vintageLog.list.useQuery(undefined, { retry: false });
  const [rows, setRows] = useState<TankQrRow[]>([]);

  // Build a unique tank+variety list (skipping duplicates)
  const items = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of entries ?? []) {
      if (!map.has(e.tankName)) map.set(e.tankName, new Set());
      map.get(e.tankName)!.add(e.variety || "");
    }
    return Array.from(map.entries())
      .map(([tank, vs]) => ({ tank, varieties: Array.from(vs).filter(Boolean) }))
      .sort((a, b) => a.tank.localeCompare(b.tank));
  }, [entries]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://ownology.ai";
      const next: TankQrRow[] = [];
      for (const item of items) {
        const variety = item.varieties[0] ?? "";
        const url = `${origin}/quick-entry?tank=${encodeURIComponent(item.tank)}${variety ? `&variety=${encodeURIComponent(variety)}` : ""}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1, color: { dark: "#000", light: "#FFF" } });
        next.push({ tank: item.tank, varieties: item.varieties, dataUrl });
      }
      if (!cancelled) setRows(next);
    })();
    return () => { cancelled = true; };
  }, [items]);

  return (
    <div data-testid="tank-qr-page" className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Tank QR codes</p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
            Print &amp; tape one to every tank
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ow-text-mid)" }}>
            Scan with a phone → opens Quick Entry pre-filled for that tank.
          </p>
        </div>
        <button onClick={() => window.print()} data-testid="tank-qr-print-button" className="px-4 py-2 rounded font-semibold" style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}>
          🖨 Print all
        </button>
      </div>

      {rows.length === 0 && (
        <p data-testid="tank-qr-empty" style={{ color: "var(--ow-text-mid)" }}>
          No tanks yet — log an entry on Quick Entry first, then come back here.
        </p>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {rows.map((r) => (
          <div
            key={r.tank}
            data-testid={`tank-qr-${r.tank.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-center rounded p-4"
            style={{ background: "#FFF", border: "1px solid var(--ow-border)" }}
          >
            <img src={r.dataUrl} alt={`QR for ${r.tank}`} style={{ width: "100%", maxWidth: 200, height: "auto" }} />
            <p style={{ color: "#000", fontFamily: "'Fraunces',serif", fontSize: "1.1rem", margin: "8px 0 4px" }}>{r.tank}</p>
            <p style={{ color: "#666", fontSize: "0.78rem", margin: 0 }}>{r.varieties.join(" · ") || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
