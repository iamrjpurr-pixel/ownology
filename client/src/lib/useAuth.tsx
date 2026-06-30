/**
 * useAuth — minimal client auth hook for Emergent Google sign-in.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 *
 * Provides:
 *   - currentUser          {openId,name,email,role,picture?} | null
 *   - status               "loading" | "authed" | "anon"
 *   - login()              redirect to Emergent OAuth
 *   - logout()             POST /api/auth/logout + reload
 *   - refresh()            re-check /api/auth/me
 *
 * Implementation notes:
 *   - We skip the /me check while window.location.hash contains
 *     "session_id=" — AuthCallback owns that case (avoids the documented
 *     race in the integration playbook).
 *   - Cookies travel automatically thanks to credentials: "include".
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type AuthUser = {
  openId: string;
  name?: string;
  email?: string;
  role: "admin" | "user";
  picture?: string | null;
};

type AuthCtx = {
  user: AuthUser | null;
  status: "loading" | "authed" | "anon";
  login: (returnPath?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (!r.ok) {
        setUser(null);
        setStatus("anon");
        return;
      }
      const data = await r.json();
      setUser(data.user);
      setStatus("authed");
    } catch (e: unknown) {
      // AbortError (HMR / navigation) shouldn't flip us to "anon" — the
      // next render will retry. Only treat real failures as anonymous.
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") return;
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    // CRITICAL: if returning from OAuth, let AuthCallback exchange the
    // session_id first. /me would 401 here because the cookie isn't set yet.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setStatus("loading");
      return;
    }
    refresh();
  }, [refresh]);

  const login = useCallback((returnPath?: string) => {
    // Stash where the user came from so AuthCallback can land them back there.
    try {
      if (returnPath) sessionStorage.setItem("ow_auth_return", returnPath);
      else sessionStorage.removeItem("ow_auth_return");
    } catch { /* noop */ }
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirect = window.location.origin + "/auth/callback";
    window.location.href =
      "https://auth.emergentagent.com/?redirect=" + encodeURIComponent(redirect);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* noop */ }
    setUser(null);
    setStatus("anon");
    // Hard reload so tRPC client drops any cached "I'm logged in" state.
    window.location.href = "/";
  }, []);

  return (
    <Ctx.Provider value={{ user, status, login, logout, refresh }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
