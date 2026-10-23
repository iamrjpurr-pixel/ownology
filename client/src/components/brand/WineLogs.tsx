import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { READING_LABELS, fmtDate, type LogKind, type WineLog } from "./types";

const KINDS: { id: LogKind; label: string }[] = [
  { id: "work", label: "Cellar work" },
  { id: "reading", label: "Lab reading" },
  { id: "note", label: "Note" },
];

function LogForm({ onAdd, pending }: { onAdd: (kind: LogKind, note: string, readings: Record<string, string>) => Promise<unknown> | void; pending?: boolean }) {
  const [kind, setKind] = useState<LogKind>("work");
  const [note, setNote] = useState("");
  const [readings, setReadings] = useState<Record<string, string>>({});
  const empty = !note.trim() && !Object.values(readings).some((v) => v.trim());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (empty) return;
    await onAdd(kind, note.trim(), readings);
    setNote("");
    setReadings({});
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-[var(--ow-border)] bg-[var(--ow-bg-inset)] p-4" data-testid="log-form">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            data-testid={`log-kind-${k.id}`}
            onClick={() => setKind(k.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150 ${kind === k.id ? "border-[var(--ow-amber)] bg-[var(--ow-amber)] text-white" : "border-[var(--ow-border-md)] text-[var(--ow-text-mid)] hover:border-[var(--ow-amber)]"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      {kind === "reading" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(READING_LABELS).map(([k, l]) => (
            <Input key={k} placeholder={l} value={readings[k] ?? ""} maxLength={24}
              data-testid={`log-reading-${k}`}
              onChange={(e) => setReadings((r) => ({ ...r, [k]: e.target.value }))} />
          ))}
        </div>
      )}
      <Textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={kind === "work" ? "e.g. Pumped over T3 twice, 20 min each. Cap temp 27°C." : "What happened?"}
        data-testid="log-note-input" />
      <Button type="submit" size="sm" disabled={pending || empty} data-testid="log-submit-button">
        {pending ? "Saving…" : "Add to the record"}
      </Button>
    </form>
  );
}

export function WineLogs({ logs, onAdd, pending }: { logs: WineLog[]; onAdd?: (kind: LogKind, note: string, readings: Record<string, string>) => Promise<unknown> | void; pending?: boolean }) {
  return (
    <section className="space-y-4" data-testid="wine-logs">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--ow-text-lo)]">Cellar record</div>
      {onAdd && <LogForm onAdd={onAdd} pending={pending} />}
      {logs.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]" data-testid="wine-logs-empty">Nothing logged against this wine yet.</p>}
      <ol className="space-y-3">
        {logs.map((l) => (
          <li key={l.id} className="border-l-2 border-[var(--ow-border-md)] pl-4" data-testid={`wine-log-${l.id}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ow-text-lo)]">
              <span className="font-semibold uppercase tracking-wider text-[var(--ow-text-mid)]">{KINDS.find((k) => k.id === l.kind)?.label ?? l.kind}</span>
              <span>· {l.authorEmail}</span>
              <span className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${l.authorRole === "owner" ? "bg-[var(--ow-amber)] text-white" : "border border-[var(--ow-border-md)]"}`}>
                {l.authorRole === "owner" ? "Owner" : "Contractor"}
              </span>
              <span>· {fmtDate(l.createdAt)}</span>
            </div>
            {Object.keys(l.readings).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-4 font-mono text-xs text-[var(--ow-text-hi)]">
                {Object.entries(l.readings).map(([k, v]) => <span key={k}>{READING_LABELS[k] ?? k} {v}</span>)}
              </div>
            )}
            {l.note && <p className="mt-1 text-sm text-[var(--ow-text-mid)]">{l.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
