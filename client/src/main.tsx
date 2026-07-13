import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { registerServiceWorker } from "@/lib/registerServiceWorker";
import App from "./App";
import "./index.css";

registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// ── Global 401 interceptor ───────────────────────────────────────────────
// When a JWT_SECRET rotation invalidates every existing cookie (Feb 2026),
// tRPC starts returning 401 UNAUTHORIZED on every ownerProcedure. Admin
// pages that only read { data, isLoading } and ignore { isError } silently
// render as "empty state" — Rich thinks his 34 contacts vanished.
//
// This interceptor detects any 401 response, clears the stale cookie, and
// hard-redirects the user to /login with a returnTo pointer. Runs exactly
// once per page-load (guarded by a module-level flag) so an outage doesn't
// trigger a redirect storm.
let redirectedOnce = false;
async function authAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
  if (res.status === 401 && !redirectedOnce && typeof window !== "undefined") {
    // Only auto-redirect when the current page actually needs auth.
    // Public pages (/, /pricing, etc.) may fire background tRPC calls
    // that legitimately 401 for anonymous visitors — bouncing them to
    // /login would break the marketing site.
    const path = window.location.pathname;
    const needsAuth =
      path.startsWith("/admin") ||
      path.startsWith("/dashboard") ||
      path.startsWith("/cellar-brief") ||
      path.startsWith("/cellar-tasks") ||
      path.startsWith("/quick-entry") ||
      path.startsWith("/the-press") ||
      path.startsWith("/batch-book") ||
      path.startsWith("/work-mode") ||
      path.startsWith("/todo") ||
      path.startsWith("/roadmap") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/your-vintage");
    if (needsAuth) {
      redirectedOnce = true;
      // Best-effort cookie clear — server also clears on /api/auth/logout.
      try {
        await globalThis.fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch { /* ignore — we're redirecting anyway */ }
      const returnTo = encodeURIComponent(path + window.location.search);
      window.location.href = `/login?next=${returnTo}&reason=session_expired`;
    }
  }
  return res;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: authAwareFetch,
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
