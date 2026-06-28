/**
 * Conversion-attribution hook.
 *
 * On mount, looks for the `ow_pricing_source` stash that /pricing wrote
 * to localStorage. If found and fresh (< 24h), fires
 * pricing.logConversion({source}) so /admin/funnel can compute the
 * conversion % per source. Clears the stash after a single fire.
 *
 * Safe to drop into ANY post-payment / success page (MerchSuccess,
 * FoundingMemberSuccess, future Stripe success redirects). Idempotent
 * across mounts (StrictMode-safe via the ref gate).
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

const FRESH_MS = 24 * 60 * 60 * 1000; // 24h

export function useConversionAttribution(): void {
  const logConversion = trpc.pricing.logConversion.useMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === "undefined") return;
    let source: string | null = null;
    try {
      const raw = window.localStorage.getItem("ow_pricing_source");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { source?: string; at?: number };
      if (!parsed.source || !parsed.at) return;
      if (Date.now() - parsed.at > FRESH_MS) {
        window.localStorage.removeItem("ow_pricing_source");
        return;
      }
      source = parsed.source;
    } catch {
      return;
    }
    if (!source) return;
    fired.current = true;
    logConversion.mutate({ source }, {
      onSettled: () => {
        try { window.localStorage.removeItem("ow_pricing_source"); } catch { /* ignore */ }
      },
    });
  }, []);
}
