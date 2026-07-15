/**
 * vcardExport.ts — client-side vCard 3.0 exporter for Ownology contacts.
 *
 * Feb 2026 — Rich wants to send Ownology's enriched contact list to his
 * Android phone so Google Messages autocompletes winemaker names when he
 * SMSes them, and so WhatsApp sees them in his address book. Same file
 * works on iOS Contacts.
 *
 * vCard 3.0 chosen over 4.0 because Android's Contacts app + WhatsApp
 * import both handle 3.0 cleanly; 4.0 occasionally loses fields on older
 * Samsung / Xiaomi builds.
 *
 * Each contact becomes ONE VCARD entry, concatenated into one .vcf file.
 * Android and iOS both accept multi-vCard files — tapping the file opens
 * the "Import N contacts?" prompt.
 *
 * Design decisions worth remembering:
 *  - FN (formatted name) is prefixed with "OW · " so imported contacts
 *    sort together at the top of the O section — easy to find + easy to
 *    bulk-delete later if the operator wants to purge the import.
 *  - ORG carries the winery so Google Messages shows "Sarah Feehan ·
 *    Parley Wines" when you start typing.
 *  - URL points to their personalised /hi/:slug page so tapping the
 *    contact card in iOS/Android takes the operator straight to the
 *    landing page (useful during a live phone call).
 *  - NOTE carries the region + event + hook so context is right there
 *    in the contact card.
 */

/** Escape a string per vCard 3.0 spec: escape commas, semicolons,
 *  backslashes, and newlines. Line-folding at 75 chars is handled by the
 *  caller via `foldLine`. */
function vcardEscape(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/** vCard 3.0 requires lines to be ≤75 octets; longer lines are folded
 *  onto continuation lines starting with a single space. Every field we
 *  emit runs through this so long NOTEs don't blow up Samsung's parser. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

export interface VcardContact {
  firstName: string;
  lastName?: string | null;
  winery?: string | null;
  mobileAu?: string | null;
  email?: string | null;
  slug: string;
  region?: string | null;
  event?: string | null;
  hookText?: string | null;
  painPoint?: string | null;
}

/** Build a single vCard entry from an Ownology contact. Returns "" (empty
 *  string) if there's no mobile AND no email — nothing to import into a
 *  phone book. */
function contactToVcard(c: VcardContact, siteBase: string): string {
  if (!c.mobileAu && !c.email) return "";

  const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  const displayName = c.winery ? `OW · ${fullName} · ${c.winery}` : `OW · ${fullName}`;

  const noteParts: string[] = [];
  if (c.region) noteParts.push(`Region: ${c.region}`);
  if (c.event) noteParts.push(`Met: ${c.event}`);
  if (c.hookText) noteParts.push(`Hook: ${c.hookText}`);
  else if (c.painPoint) noteParts.push(`Focus: ${c.painPoint}`);
  const noteBody = noteParts.join("  ·  ");

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    foldLine(`FN:${vcardEscape(displayName)}`),
    // N: Family;Given;Middle;Prefix;Suffix
    foldLine(`N:${vcardEscape(c.lastName ?? "")};${vcardEscape(c.firstName)};;;`),
  ];
  if (c.winery) lines.push(foldLine(`ORG:${vcardEscape(c.winery)}`));
  if (c.mobileAu) lines.push(foldLine(`TEL;TYPE=CELL,VOICE:${vcardEscape(c.mobileAu)}`));
  if (c.email) lines.push(foldLine(`EMAIL;TYPE=INTERNET:${vcardEscape(c.email)}`));
  lines.push(foldLine(`URL:${vcardEscape(`${siteBase}/hi/${c.slug}`)}`));
  if (noteBody) lines.push(foldLine(`NOTE:${vcardEscape(noteBody)}`));
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Turn an array of Ownology contacts into a single downloadable .vcf
 *  blob. Skips any contact with no mobile AND no email — those are
 *  unroutable and would just clutter the imported address book.
 *
 *  Returns { blob, count, filename } — count is the number of vcards
 *  actually written (may be less than input.length if some had no phone
 *  or email). */
export function buildVcardBlob(
  contacts: VcardContact[],
  opts: { siteBase?: string; filenameHint?: string } = {},
): { blob: Blob; count: number; filename: string } {
  const siteBase = opts.siteBase
    ?? (typeof window !== "undefined" ? window.location.origin : "https://ownology.ai");
  const cards = contacts
    .map((c) => contactToVcard(c, siteBase))
    .filter((s) => s.length > 0);
  const body = cards.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  const hint = opts.filenameHint ? `-${opts.filenameHint.replace(/[^a-z0-9-]+/gi, "-")}` : "";
  const filename = `ownology-contacts${hint}-${stamp}.vcf`;
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  return { blob, count: cards.length, filename };
}

/** Trigger a browser download of the vCard blob. Uses a temporary
 *  anchor + revokeObjectURL to avoid leaking blob URLs. */
export function downloadVcardBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Slight delay so Safari finishes handing the download to the OS
  // before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

/** Convenience: build + download in one call. Returns the export count so
 *  the caller can show a "✓ Exported N contacts" toast. */
export function exportContactsAsVcard(
  contacts: VcardContact[],
  opts: { siteBase?: string; filenameHint?: string } = {},
): number {
  const { blob, count, filename } = buildVcardBlob(contacts, opts);
  downloadVcardBlob(blob, filename);
  return count;
}
