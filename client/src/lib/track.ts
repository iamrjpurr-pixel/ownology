// Site-wide click-sequence tracker. Records page views, clicks on elements with
// a data-testid and section views (data-track-section). Never records typed values.
type Ev = { event: "page_view" | "click" | "section_view" | "guide_step" | "custom"; path: string; detail: string; at: number };

const SESSION_KEY = "ow_track_session";
const INVITE_KEY = "ow_track_invite";
let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 64);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function captureInvite() {
  const v = new URLSearchParams(window.location.search).get("for");
  if (v) localStorage.setItem(INVITE_KEY, v.slice(0, 120));
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 50);
  const invite = localStorage.getItem(INVITE_KEY) ?? undefined;
  fetch("/api/trpc/events.batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({ json: { sessionId: sessionId(), invite, events } }),
  })
    .then((r) => r.json())
    .then((d) => { if (d?.result?.data?.json?.inviteValid === false) localStorage.removeItem(INVITE_KEY); })
    .catch(() => {});
  if (queue.length) flush();
}

export function track(event: Ev["event"], detail = "") {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return;
  queue.push({ event, path: path.slice(0, 300), detail: detail.slice(0, 600), at: Date.now() });
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(flush, 4000);
}

export function flushNow() {
  if (timer) clearTimeout(timer);
  flush();
}
