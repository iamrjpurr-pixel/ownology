/**
 * Leitner-box spaced-repetition scheduler (Feb 2026, Rich).
 *
 * Five boxes with fixed intervals — the classic paper-cardbox algorithm,
 * simplified for local-storage persistence. Not as sophisticated as Anki's
 * SM-2, but honest and predictable, which is what a self-taught learner
 * actually benefits from at 50 cards.
 *
 * Persistence: localStorage per browser. No sync across devices. If Rich
 * or Geraldine want cross-device progress later, promote CardState[] to a
 * tRPC mutation-backed DB table.
 */

export type Grade = "again" | "good" | "easy";

export interface CardState {
  id: string;
  box: 1 | 2 | 3 | 4 | 5;
  dueAt: number; // epoch ms
  timesSeen: number;
  timesCorrect: number;
  lastGrade: Grade | null;
}

// Intervals in days for each Leitner box after a successful review.
// Box 1 = tomorrow. Box 5 = 14 days. Predictable and honest.
const INTERVAL_DAYS: Record<CardState["box"], number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "ownology.learn.leitner.v1";

export function loadState(): Record<string, CardState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CardState>;
  } catch {
    return {};
  }
}

export function saveState(state: Record<string, CardState>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or blocked — silently drop; user can still study,
    // just no progress persistence this session.
  }
}

// Bootstrap a card the first time we see it — everything starts in box 1
// and is due immediately.
export function ensureCard(state: Record<string, CardState>, id: string): CardState {
  if (!state[id]) {
    state[id] = { id, box: 1, dueAt: Date.now(), timesSeen: 0, timesCorrect: 0, lastGrade: null };
  }
  return state[id];
}

// Apply a grade to a card. Mutates the returned state; caller is responsible
// for persisting.
export function applyGrade(prev: CardState, grade: Grade): CardState {
  const now = Date.now();
  const nextBox = ((): CardState["box"] => {
    if (grade === "again") return 1;
    if (grade === "easy") return Math.min(5, prev.box + 2) as CardState["box"];
    return Math.min(5, prev.box + 1) as CardState["box"];
  })();
  const interval = INTERVAL_DAYS[nextBox];
  return {
    ...prev,
    box: nextBox,
    dueAt: now + interval * DAY_MS,
    timesSeen: prev.timesSeen + 1,
    timesCorrect: prev.timesCorrect + (grade === "again" ? 0 : 1),
    lastGrade: grade,
  };
}

// Return the deck's due-set ordered by "most overdue first". Cards not yet
// seen bubble to the top too — they're due immediately by definition.
export function selectDue(
  state: Record<string, CardState>,
  allIds: string[]
): string[] {
  const now = Date.now();
  const scored = allIds.map((id) => {
    const s = state[id];
    if (!s) return { id, dueAt: 0 }; // never seen → most urgent
    return { id, dueAt: s.dueAt };
  });
  return scored
    .filter((s) => s.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .map((s) => s.id);
}

// Progress metrics — bucketed for the header UI.
export interface Progress {
  total: number;
  due: number;
  reviewing: number; // box 2-4
  mastered: number;  // box 5
  unseen: number;
}
export function computeProgress(
  state: Record<string, CardState>,
  allIds: string[]
): Progress {
  const now = Date.now();
  let due = 0;
  let reviewing = 0;
  let mastered = 0;
  let unseen = 0;
  for (const id of allIds) {
    const s = state[id];
    if (!s) { unseen++; due++; continue; }
    if (s.dueAt <= now) due++;
    if (s.box >= 2 && s.box <= 4) reviewing++;
    if (s.box === 5) mastered++;
  }
  return { total: allIds.length, due, reviewing, mastered, unseen };
}

// Full reset — call from a "Start over" button. Erases all progress.
export function resetState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
