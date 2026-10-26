import { useEffect, useState } from "react";
import { Link, type LinkProps } from "wouter";
import { useAuth } from "@/lib/useAuth";
import { isPublicPath } from "@shared/publicPaths";

// Members-only pages → the closest thing a visitor can open without signing in.
const VISITOR_EQUIVALENT: [string, string][] = [
  ["/knowledge", "/curriculum"],
  ["/compliance", "/compliance-score"],
  ["/regulations", "/compliance-score"],
];

let gateStatus: Promise<boolean> | null = null;
const fetchGateUnlocked = () =>
  (gateStatus ??= fetch("/api/gate/status", { credentials: "include" })
    .then((r) => r.json())
    .then((d) => Boolean(d.unlocked))
    .catch(() => false));

export function visitorHref(href: string): string {
  const path = href.split(/[?#]/)[0];
  if (!path.startsWith("/") || isPublicPath(path)) return href;
  const match = VISITOR_EQUIVALENT.find(([p]) => path === p || path.startsWith(p + "/"));
  return match ? match[1] : "/demo/tour";
}

export function useIsVisitor(): boolean {
  const { status } = useAuth();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  useEffect(() => {
    if (status === "anon") fetchGateUnlocked().then(setUnlocked);
  }, [status]);
  return status === "anon" && unlocked === false;
}

// Drop-in for wouter's Link: visitors who aren't signed in never hit the members wall.
export function VisitorLink(props: LinkProps) {
  const isVisitor = useIsVisitor();
  const href = typeof props.href === "string" && isVisitor ? visitorHref(props.href) : props.href;
  return <Link {...({ ...props, href } as LinkProps)} />;
}
