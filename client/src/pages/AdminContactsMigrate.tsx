/**
 * /admin/contacts-migrate — one-shot dev→prod migration bridge.
 *
 * Two actions:
 *   1. Download all contacts on THIS environment as JSON.
 *   2. Upload a JSON file (from a previous export) and upsert the
 *      contacts into this environment (skips duplicates by slug).
 *
 * Volatile pipeline state (sms sent/reply/booking timestamps, view
 * counts) is DELIBERATELY stripped in the export so prod starts with
 * fresh pipeline state — a stale "sent 6 months ago" on a new
 * environment would corrupt the pipeline board.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Upload, ArrowLeft } from "lucide-react";

export default function AdminContactsMigrate() {
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPayload, setImportPayload] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number; skippedSlugs: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportQuery = trpc.outreach.exportAllContacts.useQuery(undefined, { enabled: false });
  const importMut = trpc.outreach.importContacts.useMutation();

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const res = await exportQuery.refetch();
      if (!res.data) throw new Error("Export returned no data");
      const filename = `ownology-contacts-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const contacts = Array.isArray(parsed) ? parsed : parsed.contacts;
      if (!Array.isArray(contacts)) throw new Error("JSON does not contain a `contacts` array");
      setImportPayload(JSON.stringify(contacts));
      setImportPreview({
        count: contacts.length,
        sample: contacts.slice(0, 5).map((c: { firstName?: string; lastName?: string; winery?: string }) =>
          `${c.firstName ?? "?"} ${c.lastName ?? ""} · ${c.winery ?? "no winery"}`.trim()
        ),
      });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Invalid JSON file");
      setImportPayload(null);
      setImportPreview(null);
    }
    e.target.value = "";
  }

  async function handleImport() {
    if (!importPayload) return;
    setError(null);
    setImporting(true);
    setResult(null);
    try {
      const contacts = JSON.parse(importPayload);
      const res = await importMut.mutateAsync({ contacts });
      setResult(res);
      setImportPayload(null);
      setImportPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="contacts-migrate-page">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest mb-6"
        style={{ color: "var(--ow-text-lo)", textDecoration: "none" }}
      >
        <ArrowLeft size={12} /> Back to admin
      </Link>

      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}
      >
        Contacts migration bridge
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--ow-text-mid)", maxWidth: "62ch", lineHeight: 1.6 }}>
        One-shot dev→prod migration. Download every contact on THIS environment as JSON,
        then upload the same file on the destination environment. Pipeline timestamps
        (SMS sent / view counts / bookings) are stripped so prod starts with fresh
        pipeline state.
      </p>

      {/* ── Step 1: Download ── */}
      <section
        className="mb-6 rounded p-5"
        style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
      >
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-amber)" }}>
          Step 1 · Download from this environment
        </p>
        <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
          Export all contacts as JSON
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--ow-text-mid)" }}>
          Downloads a file like <code>ownology-contacts-2026-02-15-04-32-11.json</code> containing
          every contact&rsquo;s name, mobile, winery, notes, persona, and status. Do this on DEV.
        </p>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          data-testid="contacts-migrate-export"
          className="font-semibold h-11"
          style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
        >
          {downloading ? (
            <><Loader2 size={16} className="mr-2 animate-spin" /> Preparing download…</>
          ) : (
            <><Download size={16} className="mr-2" /> Download all contacts as JSON</>
          )}
        </Button>
      </section>

      {/* ── Step 2: Upload ── */}
      <section
        className="mb-6 rounded p-5"
        style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
      >
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-amber)" }}>
          Step 2 · Import on the destination environment
        </p>
        <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
          Upload JSON &amp; insert contacts
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--ow-text-mid)" }}>
          Do this on PROD. Existing contacts (same slug) are SKIPPED — never overwritten.
          Safe to re-run.
        </p>
        <label
          htmlFor="migrate-file"
          data-testid="contacts-migrate-file-label"
          className="inline-flex items-center gap-2 h-11 px-4 rounded font-semibold cursor-pointer"
          style={{ background: "transparent", border: "1.5px solid var(--ow-amber)", color: "var(--ow-amber)" }}
        >
          <Upload size={16} /> Choose JSON file
        </label>
        <input
          id="migrate-file"
          data-testid="contacts-migrate-file"
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        {importPreview && (
          <div
            data-testid="contacts-migrate-preview"
            className="mt-4 p-4 rounded"
            style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-border-md)" }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--ow-text-hi)" }}>
              Ready to import {importPreview.count} contact{importPreview.count === 1 ? "" : "s"}
            </p>
            <ul className="text-xs" style={{ color: "var(--ow-text-mid)", fontFamily: "'Fira Code',monospace", lineHeight: 1.7 }}>
              {importPreview.sample.map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
              {importPreview.count > importPreview.sample.length && (
                <li style={{ fontStyle: "italic" }}>+ {importPreview.count - importPreview.sample.length} more…</li>
              )}
            </ul>
            <Button
              onClick={handleImport}
              disabled={importing}
              data-testid="contacts-migrate-import"
              className="mt-4 font-semibold h-10"
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
            >
              {importing ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Importing…</>
              ) : (
                <><Upload size={16} className="mr-2" /> Import {importPreview.count} contacts</>
              )}
            </Button>
          </div>
        )}
      </section>

      {result && (
        <div
          data-testid="contacts-migrate-result"
          className="rounded p-5"
          style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" }}
        >
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-amber)", fontWeight: 700 }}>
            Import complete
          </p>
          <p className="text-lg font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
            {result.inserted} inserted · {result.skipped} skipped
          </p>
          {result.skipped > 0 && (
            <details className="mt-2 text-xs" style={{ color: "var(--ow-text-mid)" }}>
              <summary style={{ cursor: "pointer" }}>Skipped slugs (already existed):</summary>
              <ul className="mt-1" style={{ fontFamily: "'Fira Code',monospace", listStyle: "none", padding: 0 }}>
                {result.skippedSlugs.slice(0, 20).map((s) => <li key={s}>· {s}</li>)}
                {result.skippedSlugs.length > 20 && <li style={{ fontStyle: "italic" }}>+ {result.skippedSlugs.length - 20} more…</li>}
              </ul>
            </details>
          )}
          <div className="mt-3 flex gap-3">
            <Link href="/admin/contacts" data-testid="contacts-migrate-goto-list" style={{ color: "var(--ow-amber)", fontWeight: 600, fontSize: "0.85rem" }}>
              → Open contacts list
            </Link>
            <Link href="/admin/contacts/pipeline" data-testid="contacts-migrate-goto-pipeline" style={{ color: "var(--ow-amber)", fontWeight: 600, fontSize: "0.85rem" }}>
              → Open pipeline board
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div
          data-testid="contacts-migrate-error"
          className="mt-4 p-4 rounded"
          style={{ background: "color-mix(in oklch, oklch(0.65 0.18 25) 12%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.65 0.18 25) 45%, transparent)" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.65 0.18 25)" }}>
            Error
          </p>
          <p className="text-sm" style={{ color: "var(--ow-text-mid)" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
