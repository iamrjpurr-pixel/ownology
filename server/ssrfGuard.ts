/**
 * ssrfGuard — reject URLs that would resolve to internal / metadata
 * endpoints before we send an outbound fetch.
 *
 * Jul 2026 audit (SEC-003): `outreach.parseFromUrl` and
 * `outreach.parseEventUrl` accepted any user-supplied URL and called
 * fetch() with `redirect: "follow"`. Combined with SEC-001 (anonymous
 * admin over shared prod DB), an attacker could pivot to internal
 * services (cloud metadata endpoints, Redis, MySQL admin panels, etc.).
 *
 * This guard resolves the URL's hostname to its IPs (v4 + v6) and
 * rejects any that fall inside a documented private / link-local /
 * loopback / cloud-metadata range. Callers should:
 *
 *   1. Call assertSafeUrl(url) BEFORE fetch — throws SsrfError on bad URL.
 *   2. Pass { redirect: "manual" } to fetch and call assertSafeUrl again
 *      for every Location header if they want to follow redirects.
 *
 * DNS rebinding is out of scope for a first pass — a determined attacker
 * with control over an authoritative DNS server can return a public IP
 * for the pre-fetch resolution then a private IP for the fetch itself.
 * A full fix requires wiring a custom fetch agent with the resolved IP.
 * Deferred until we see any evidence of exploitation attempts.
 */

import dns from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** IPv4 CIDR blocks that are ALWAYS unsafe. Sourced from RFC 6890 +
 *  cloud-provider metadata endpoints (AWS/Azure/GCP/Oracle/DO). */
const BLOCKED_V4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8],           // RFC 6890 "this host"
  ["10.0.0.0", 8],          // RFC 1918 private
  ["100.64.0.0", 10],       // RFC 6598 CGNAT
  ["127.0.0.0", 8],         // loopback
  ["169.254.0.0", 16],      // link-local — INCLUDES AWS/Azure/GCP metadata (169.254.169.254)
  ["172.16.0.0", 12],       // RFC 1918 private
  ["192.0.0.0", 24],        // IETF assignments
  ["192.0.2.0", 24],        // TEST-NET-1
  ["192.168.0.0", 16],      // RFC 1918 private
  ["198.18.0.0", 15],       // benchmarking
  ["198.51.100.0", 24],     // TEST-NET-2
  ["203.0.113.0", 24],      // TEST-NET-3
  ["224.0.0.0", 4],         // multicast
  ["240.0.0.0", 4],         // reserved / broadcast
];

/** IPv6 prefixes to reject. */
const BLOCKED_V6_PREFIXES = [
  "::",         // unspecified
  "::1",        // loopback
  "fc00:",      // unique local (fc00::/7)
  "fd00:",      // unique local
  "fe80:",      // link-local
  "ff00:",      // multicast
  "::ffff:",    // IPv4-mapped — must recheck the mapped v4 too
  "2001:db8:",  // documentation range
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipv4InCidr(ip: string, cidrIp: string, cidrBits: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const cidrInt = ipv4ToInt(cidrIp);
  const mask = cidrBits === 0 ? 0 : (~0 << (32 - cidrBits)) >>> 0;
  return (ipInt & mask) === (cidrInt & mask);
}

function isBlockedV4(ip: string): boolean {
  return BLOCKED_V4_CIDRS.some(([cidrIp, bits]) => ipv4InCidr(ip, cidrIp, bits));
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  for (const prefix of BLOCKED_V6_PREFIXES) {
    if (lower.startsWith(prefix)) {
      // For IPv4-mapped addresses (::ffff:a.b.c.d), extract and check the v4 part.
      if (prefix === "::ffff:") {
        const v4 = lower.slice("::ffff:".length);
        if (net.isIPv4(v4) && isBlockedV4(v4)) return true;
        continue;
      }
      return true;
    }
  }
  return false;
}

/** Validate a URL string. Throws SsrfError on any unsafe target. */
export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError(`Blocked protocol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isBlockedV4(hostname)) {
      throw new SsrfError(`Blocked private / metadata IP: ${hostname}`);
    }
    if (net.isIPv6(hostname) && isBlockedV6(hostname)) {
      throw new SsrfError(`Blocked private IPv6: ${hostname}`);
    }
    return;
  }

  // Otherwise resolve the DNS name and check every A / AAAA record.
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new SsrfError(`DNS lookup failed for ${hostname}: ${err instanceof Error ? err.message : "unknown"}`);
  }
  for (const r of records) {
    if (r.family === 4 && isBlockedV4(r.address)) {
      throw new SsrfError(`Hostname ${hostname} resolves to blocked address ${r.address}`);
    }
    if (r.family === 6 && isBlockedV6(r.address)) {
      throw new SsrfError(`Hostname ${hostname} resolves to blocked IPv6 ${r.address}`);
    }
  }
}

/**
 * Safe wrapper around fetch() that validates the URL, disables auto-redirect,
 * and re-validates each hop. Preserves the caller's request options.
 *
 * Max 5 redirects (mirrors browser default). Every hop resolved + checked.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeUrl(currentUrl);
    const resp = await fetch(currentUrl, { ...init, redirect: "manual" });
    // 3xx with a Location header → follow after re-validating.
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get("location");
      if (!location) return resp; // redirect without target — return as-is
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return resp;
  }
  throw new SsrfError(`Too many redirects (>${maxRedirects})`);
}
