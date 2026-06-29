/**
 * useThemeTelemetry — fire-and-forget tRPC mutation to log theme picks.
 *
 * Keeps a stable anonymous session id in localStorage (`ownology-tid`)
 * so we can compute "% currently using" per theme without auth or PII.
 * `isFirstPick` is true iff the user had no theme set in localStorage
 * before this call (only the very first pick per browser is flagged).
 *
 * Failures are silent — telemetry never breaks the user-facing flow.
 */
import { trpc } from "@/lib/trpc";
import type { ThemeId } from "@/lib/themes";

const SESSION_KEY = "ownology-tid";
const THEME_KEY = "ownology-theme";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    // Random 24-char base36 — collision-resistant for our scale (~50 users)
    id = (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, "").slice(0, 24);
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useThemeTelemetry() {
  const logPick = trpc.themes.logPick.useMutation();

  return {
    record(themeId: ThemeId) {
      if (typeof window === "undefined") return;
      const isFirstPick = !window.localStorage.getItem(THEME_KEY);
      const sessionId = getOrCreateSessionId();
      logPick.mutate(
        { themeId, sessionId, isFirstPick },
        {
          onError: () => {
            /* silent — never block UX on telemetry */
          },
        }
      );
    },
  };
}
