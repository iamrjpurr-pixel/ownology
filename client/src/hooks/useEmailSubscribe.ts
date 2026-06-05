/**
 * useEmailSubscribe
 * Thin wrapper around trpc.email.subscribe that replaces all direct
 * Buttondown fetch calls across pages. Every call saves to the CRM DB
 * first, then forwards to Buttondown if configured.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Status = "idle" | "loading" | "success" | "error";

interface SubscribeOptions {
  source: string;
  tags?: string[];
  name?: string;
  wineryName?: string;
}

export function useEmailSubscribe(options: SubscribeOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const mutation = trpc.email.subscribe.useMutation();

  const subscribe = async (email: string) => {
    if (!email.trim() || status === "loading") return false;
    setStatus("loading");
    try {
      await mutation.mutateAsync({
        email: email.trim(),
        source: options.source,
        tags: options.tags ?? [options.source],
        name: options.name,
        wineryName: options.wineryName,
      });
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  };

  const reset = () => setStatus("idle");

  return { subscribe, status, reset, isPending: status === "loading" };
}
