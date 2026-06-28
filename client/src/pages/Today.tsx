/**
 * Today — unified harvest-floor view.
 *
 * Composes three existing endpoints client-side (no new backend, no LLM cost):
 *  - vintageLog.alerts  (DAP due, high temp, stuck ferment, ready to rack, tank quiet)
 *  - cellarTasks.list   (equipment / process tasks)
 *  - vintageReminder.list (tank reminders set by the user)
 *
 * Merges into one chronological "everything I need to deal with right now" feed
 * for the cellar floor. Value-engineering check: 5/5 — pure data composition.
 */
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

type FeedItem = {
  id: string;
  severity: "high" | "medium" | "low";
  source: "alert" | "task" | "reminder";
  title: string;
  detail: string;
  action?: string;
  tank?: string;
  dueAt?: number;
};

const SEV_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function Today() {
  const { data: alerts } = trpc.vintageLog.alerts.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const { data: tasks } = trpc.cellarTasks.list.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const { data: reminders } = trpc.vintageReminder.list.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const now = Date.now();
  const day = 86400 * 1000;

  const feed: FeedItem[] = [];

  // Alerts → feed
  for (const a of alerts?.alerts ?? []) {
    feed.push({
      id: `alert-${a.kind}-${a.tankName}`,
      severity: a.severity,
      source: "alert",
      title: a.title,
      detail: a.detail,
      action: a.action,
      tank: a.tankName,
    });
  }

  // Tasks due today or overdue (or no due date — show as low priority)
  for (const t of tasks ?? []) {
    if (t.completedAt) continue;
    const due = t.dueAt ?? 0;
    const overdue = due && due < now;
    const dueToday = due && due >= now && due < now + day;
    const severity: FeedItem["severity"] = overdue ? "high" : dueToday ? "medium" : "low";
    feed.push({
      id: `task-${t.id}`,
      severity,
      source: "task",
      title: t.title,
      detail: `${t.equipmentName}${t.taskType ? ` · ${t.taskType}` : ""}${overdue ? " · overdue" : dueToday ? " · due today" : ""}`,
      action: t.methodNotes ?? undefined,
      dueAt: t.dueAt ?? undefined,
    });
  }

  // Reminders — show if due in next 24h or overdue
  for (const r of reminders ?? []) {
    const nextAt = r.nextRunAt ?? 0;
    if (!nextAt || nextAt > now + day) continue;
    const overdue = nextAt < now;
    feed.push({
      id: `reminder-${r.id}`,
      severity: overdue ? "high" : "medium",
      source: "reminder",
      title: `${r.tankName}: ${r.eventType} reminder`,
      detail: `${overdue ? "Overdue" : "Due today"} · ${r.cadence ?? "scheduled"}`,
      tank: r.tankName,
    });
  }

  feed.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  const sevColor = (s: FeedItem["severity"]) =>
    s === "high" ? "oklch(0.65 0.18 25)" : s === "medium" ? "oklch(0.70 0.15 70)" : "oklch(0.68 0.08 240)";

  return (
    <div data-testid="today-page" className="container py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
            Today on the cellar floor
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
            {feed.length === 0 ? "All clear" : `${feed.length} thing${feed.length === 1 ? "" : "s"} to handle`}
          </h1>
        </div>
        <Link href="/quick-entry" data-testid="today-log-link" className="text-sm px-3 py-2 rounded font-semibold" style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}>
          + Log entry
        </Link>
      </div>

      {feed.length === 0 && (
        <div data-testid="today-empty" className="rounded p-6 text-center" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
          <p style={{ color: "var(--ow-text-mid)", margin: 0 }}>
            No alerts, tasks, or reminders due. Walk the cellar — log what you see.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {feed.map((item) => {
          const c = sevColor(item.severity);
          return (
            <div
              key={item.id}
              data-testid={`today-item-${item.source}-${item.severity}`}
              className="flex items-start gap-3 rounded p-3"
              style={{
                background: `color-mix(in oklch, ${c} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${c} 40%, transparent)`,
              }}
            >
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm" style={{ color: "var(--ow-text-hi)", margin: 0 }}>
                    {item.title}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ color: "var(--ow-text-lo)", background: "var(--ow-bg-inset)" }}>
                    {item.source}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--ow-text-mid)" }}>{item.detail}</p>
                {item.action && (
                  <p className="text-xs mt-1" style={{ color: c, fontWeight: 600 }}>→ {item.action}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
