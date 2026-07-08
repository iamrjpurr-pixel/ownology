/**
 * ImportFlashCards — "idiot's guide" for the /import surface (Voice · Camera ·
 * Paste · CSV · Bulk) plus the Review-and-Save step in The Press.
 *
 * This deck is the practical field manual for the flagship "get data OUT of
 * whiteboards, notebooks and Excel and INTO the CRM" workflow. Written for
 * a winemaker with muddy hands at 3am who has never opened the app before.
 */
import { Link } from "wouter";
import { FlashCardDeck, type FlashCard, type FlashDeckMeta } from "./FlashCardDeck";

const DECKS: FlashDeckMeta[] = [
  { id: "pick",    label: "① Pick the right tab",  hint: "Voice · Camera · Paste · CSV · Bulk" },
  { id: "voice",   label: "② Voice import",         hint: "Speak · Transcribe · Extract" },
  { id: "camera",  label: "③ Camera / OCR",         hint: "Photo lab slip · scan notebook" },
  { id: "paste",   label: "④ Paste anything",       hint: "Excel · email · notes" },
  { id: "csv",     label: "⑤ CSV / spreadsheet",    hint: "Column mapping" },
  { id: "bulk",    label: "⑥ Bulk / folder drop",   hint: "50 files at once" },
  { id: "review",  label: "⑦ Review & save",        hint: "Verify before commit" },
  { id: "fix",     label: "⑧ Fix mistakes",         hint: "Bad parse · retry · undo" },
];

const CARDS: FlashCard[] = [
  // ── ① Pick the right tab ─────────────────────────────────────────
  {
    n: "01", deck: "pick",
    title: "Which tab for which situation",
    outcome: "You never waste time in the wrong tab.",
    steps: [
      "Muddy hands, mid-cellar → Voice.",
      "Handwritten lab slip / notebook page → Camera.",
      "Excel column you copied, an email from a supplier, notes in a text file → Paste.",
      "A spreadsheet file you've been keeping for years → CSV.",
      "A whole folder of scanned PDFs / photos → Bulk.",
    ],
    gotcha: "Voice is fastest for events happening RIGHT NOW. Camera/Paste is better for historical data you already have written down.",
    jumpTo: "/import", jumpLabel: "Open Import",
  },
  {
    n: "02", deck: "pick",
    title: "All tabs land in the same review screen",
    outcome: "You understand the tabs are just DIFFERENT WAYS IN to the same save flow.",
    steps: [
      "Voice → transcribe → extract → review → save.",
      "Camera → photograph → parse → review → save.",
      "Paste → paste text → extract → review → save.",
      "CSV → upload → map columns → review → save.",
      "Bulk → drop folder → auto-process → review → save.",
      "The last step is always the same: a preview table you approve, then Save.",
    ],
    gotcha: "Switching tabs DISCARDS the entries you were reviewing. Finish one tab's save before switching.",
  },

  // ── ② Voice ──────────────────────────────────────────────────────
  {
    n: "03", deck: "voice",
    title: "Voice — hands-free logging",
    outcome: "You dictate a full cellar event in 15 seconds and it's in the log.",
    steps: [
      "Open /import. Voice tab is the default.",
      "Tap the amber Start recording button.",
      "Speak naturally: \"Tank 7 Shiraz. Brix 14.2. Added 2.6 kilos of DAP. pH 3.42.\"",
      "Tap Stop.",
      "Tap Transcribe. The AI turns your speech into structured entries.",
      "Review the preview table. Tap Save.",
    ],
    gotcha: "Voice sample rate matters. Wet, gloved fingers can accidentally toggle mute. Watch the level meter — if it's flat, the mic isn't picking up.",
  },
  {
    n: "04", deck: "voice",
    title: "Speak the way you'd write it",
    outcome: "The AI parses correctly the first time.",
    steps: [
      "Start with the container: \"Tank 7\", \"Barrel 12\", \"Fermenter B\".",
      "State the variety: \"Shiraz\", \"Chardonnay\", \"Pinot Noir\".",
      "Then the readings, one at a time, with units: \"Brix 14.2\", \"pH 3.42\", \"Temperature 22 degrees\", \"YAN 120 parts per million\".",
      "Then the action if any: \"Added 2.6 kilograms of DAP\".",
      "Pause between each phrase — natural rhythm parses better than a fire-hose.",
    ],
    gotcha: "Say \"kilograms\" not \"kilos\". Say \"parts per million\" not \"ppm\". The transcription is more accurate on unabbreviated words.",
  },
  {
    n: "05", deck: "voice",
    title: "Discard and re-record",
    outcome: "You never save a bad transcription.",
    steps: [
      "After Stop, use the playback bar to hear your recording.",
      "If it sounds bad — background noise, you fumbled the numbers — tap Discard.",
      "Start over. Better take, cleaner transcription.",
      "Only tap Transcribe when the playback sounds usable.",
    ],
    gotcha: "Transcribe burns LLM credits. Discarding a bad take is FREE and saves you a bigger review-and-fix later.",
  },

  // ── ③ Camera / OCR ───────────────────────────────────────────────
  {
    n: "06", deck: "camera",
    title: "Camera — photograph a lab slip",
    outcome: "Your handwritten notebook page becomes structured data.",
    steps: [
      "Open /import. Tap the Camera tab.",
      "Tap the big dropzone. On phone, this opens the camera. On desktop, a file picker.",
      "Take the photo (or pick an existing image) — lab slip, notebook page, whiteboard.",
      "Tap Extract entries. The AI reads the image and pulls out structured fields.",
      "Review the preview table.",
      "Tap Save.",
    ],
    gotcha: "The AI's vision model is Claude / Gemini — not a specialised OCR engine. If it can't read the photo, YOU probably can't easily either. Reshoot in better light.",
  },
  {
    n: "07", deck: "camera",
    title: "How to shoot a lab slip for best OCR",
    outcome: "First-try success rate goes from ~60% to ~95%.",
    steps: [
      "FLAT surface — no wrinkles, no curl. If it's a notebook, hold the page open.",
      "EVEN LIGHT — no harsh shadows, no direct sun. Overhead cellar lighting is usually best.",
      "STRAIGHT ANGLE — hold the phone directly above the paper, not tilted.",
      "FILL THE FRAME — get close enough that the writing takes up most of the image.",
      "ONE SLIP PER PHOTO — don't try to fit three lab slips in one shot.",
    ],
    gotcha: "Reflective glossy paper (some lab printouts) causes glare. Angle the light source, or use the Paste tab to type it in manually as a fallback.",
  },
  {
    n: "08", deck: "camera",
    title: "What the AI can and can't read",
    outcome: "You know when Camera will work and when it won't.",
    steps: [
      "GREAT for: printed lab reports, typed spreadsheets photographed, clear block handwriting.",
      "OK for: cursive handwriting IF it's yours and consistent.",
      "STRUGGLES with: cursive from multiple people, scrawled numbers, faded pencil, receipts with tiny thermal-print text.",
      "USELESS for: whiteboards that have been half-erased, moisture-damaged notes, notes in colour ink on coloured paper.",
    ],
    gotcha: "If the AI misreads numbers (14.2 vs 1.42), always double-check the review table before saving. A wrong Brix reading corrupts every calculation downstream.",
  },

  // ── ④ Paste ──────────────────────────────────────────────────────
  {
    n: "09", deck: "paste",
    title: "Paste anything — text OR a clipboard image",
    outcome: "Data from ANY source becomes structured entries — screenshots included.",
    steps: [
      "Open /import. Tap the Paste tab.",
      "For TEXT — copy from Excel/email/notes, click the textarea, paste. Tap Extract Entries.",
      "For an IMAGE — copy a screenshot (Cmd+Shift+Ctrl+4 on Mac, Snip on Windows, or copy any image), click the textarea, paste.",
      "The system detects the image, runs OCR, spell-checks, shows a quality score, then auto-fills the textarea with the cleaned text.",
      "Review the cleaned text (or tap Show raw to see the verbatim OCR). Edit if needed.",
      "Tap Extract Entries.",
    ],
    gotcha: "Screenshots paste beautifully. Actual .jpg / .png FILES go via the Camera tab instead (or drop into Bulk).",
  },
  {
    n: "09b", deck: "paste",
    title: "Reading the OCR quality score",
    outcome: "You know whether to trust the OCR or reshoot the source.",
    steps: [
      "After image paste, look for the amber card at the top: \"N / M words recognised · X%\".",
      "≥ 85% (green) — trust it, review the cleaned text briefly, extract.",
      "60-84% (amber) — check the corrections list AND toggle Show raw to spot-check unclear words before extracting.",
      "< 60% (red) — the source is too messy. Discard, retake the photo, or type it manually.",
      "The score comes from counting bracketed uncertainty markers in the raw OCR — the AI's own confidence signal.",
    ],
    gotcha: "The score is about WORDS RECOGNISED, not accuracy. A 100% recognised transcription can still be wrong — always sanity-check numeric readings (Brix / pH) against the original before saving.",
  },
  {
    n: "10", deck: "paste",
    title: "When Paste beats Camera",
    outcome: "You pick the faster tool for the situation.",
    steps: [
      "Someone emails you a table of lab readings → Paste (5 seconds vs Camera's screenshot-then-photograph dance).",
      "You already typed the data in a notes app → Paste.",
      "You have an Excel column showing the last vintage's tank history → Paste one column at a time.",
      "You have a scanned PDF → screenshot the relevant page and use Camera, OR select-copy text from the PDF and use Paste.",
    ],
    gotcha: "Paste doesn't need a photo — no light, no angle, no OCR risk. If the data is already digital, always prefer Paste.",
  },

  // ── ⑤ CSV ────────────────────────────────────────────────────────
  {
    n: "11", deck: "csv",
    title: "CSV — bringing in years of history",
    outcome: "A structured spreadsheet becomes a fully populated Vintage Log.",
    steps: [
      "Open /import. Tap the CSV tab.",
      "Drop your .csv file into the dropzone (or click to browse).",
      "The system shows the first few rows + a column-mapping panel.",
      "Match each of YOUR columns to Ownology fields: date, tank, variety, Brix, pH, TA, action, notes.",
      "Any column you don't map is ignored.",
      "Tap Import. Rows land in the review table.",
    ],
    gotcha: "CSV parsing is client-side — it never leaves your browser until you hit Save. Big privacy win for winemakers with sensitive historical data.",
  },
  {
    n: "12", deck: "csv",
    title: "CSV mapping — the 3 columns you can't skip",
    outcome: "Your imported history is actually queryable, not a formless blob.",
    steps: [
      "DATE — every entry needs one. If your source has \"2024-03-15\" or \"15/3/24\" formats, the parser handles both.",
      "TANK / VESSEL — the container the reading belongs to. Reuse the same tank name across rows.",
      "AT LEAST ONE MEASUREMENT — Brix, or pH, or Temperature, or an action note. A row with only Date + Tank has nothing to say.",
      "Save the mapping preset if the parser offers to — next year's import will be one click.",
    ],
    gotcha: "If your CSV uses different tank names than your live system (\"T7\" in the CSV vs \"Tank 7\" in the app), fix in the CSV FIRST, then import. Otherwise you'll have duplicate tanks in the log.",
  },

  // ── ⑥ Bulk ──────────────────────────────────────────────────────
  {
    n: "13", deck: "bulk",
    title: "Bulk — drop a whole folder",
    outcome: "50 scanned lab slips import in one session instead of 50 sessions.",
    steps: [
      "Open /import. Tap the Bulk tab.",
      "Read the privacy panel first. Understand what leaves your device.",
      "Drop a folder or select multiple files. Images, PDFs, mixed types all accepted.",
      "The system processes them in the background — a file list appears with per-row confidence chips.",
      "Review the summary, expand any low-confidence rows to double-check, then save the batch.",
    ],
    gotcha: "Max 50 files per batch. Above that, split into two batches. This is a memory + LLM-credit safeguard.",
  },
  {
    n: "14", deck: "bulk",
    title: "The confidence chip — what green vs amber means",
    outcome: "You know which entries need a second look before Save.",
    steps: [
      "GREEN chip — the AI is confident the parse is right. Skim, don't obsess.",
      "AMBER chip — the AI hedged. Open the row, verify at least ONE reading before saving.",
      "RED chip — the AI failed. Either reshoot (Camera) or delete the row and re-enter manually via Quick Entry.",
      "The Amber-only toggle filters the list to just the rows that need attention — save time on big batches.",
    ],
    gotcha: "Amber is not a rejection — it's a warning. Some of your best data will come back amber because the AI is honest about confidence.",
  },

  // ── ⑦ Review & Save ─────────────────────────────────────────────
  {
    n: "15", deck: "review",
    title: "Review — the last check before Save",
    outcome: "No bad data ever enters The Press.",
    steps: [
      "Every tab lands you in the same preview table.",
      "Each row has: date, tank, event type, key measurements, and a Remove (×) button.",
      "Skim each row. Anything obviously wrong (Brix 142 instead of 14.2)? Tap × to remove.",
      "If more than 30% of the rows are wrong, tap the browser back button — DON'T save partial garbage. Retry the source with a better photo/paste.",
      "When the preview looks right, tap the big Save button at the bottom.",
    ],
    gotcha: "The Save button commits ALL rows in the preview. Deletions must happen row-by-row via × before Save. There's no per-row Save.",
  },
  {
    n: "16", deck: "review",
    title: "Where the data lands after Save",
    outcome: "You know how to find your imported entries afterward.",
    steps: [
      "Tap Save. A green success toast appears.",
      "Entries flow into /the-press (the live Vintage Log).",
      "Each is tagged with its import source: voice-imported, image-imported, paste-imported, csv-imported, bulk-imported.",
      "Filter The Press by source to see JUST what you imported today, verify counts match.",
    ],
    gotcha: "The Press view sorts by log-date, not import-date. If you imported historical entries from 2023, they'll appear in the 2023 section, not at the top.",
    jumpTo: "/the-press", jumpLabel: "Open The Press",
  },

  // ── ⑧ Fix mistakes ───────────────────────────────────────────────
  {
    n: "17", deck: "fix",
    title: "The parse is bad — retry loop",
    outcome: "You get to a good parse without wasting the whole session.",
    steps: [
      "If Extract Entries came back with garbage, DON'T save.",
      "For Camera: retake the photo with better light/angle (see card #07).",
      "For Voice: discard and re-record, speaking slower with unabbreviated units (card #04).",
      "For Paste: reformat your source (add line breaks, add \"Brix:\" prefixes) then paste again.",
      "For CSV: fix column headers in the file, re-upload.",
      "For Bulk: filter the list to Amber/Red and delete problem rows, then process just the good ones.",
    ],
    gotcha: "Do NOT save a partial-garbage batch \"just to keep some of it\". Corrupt entries pollute the whole tank's history. Retry, don't accept.",
  },
  {
    n: "18", deck: "fix",
    title: "You saved a bad entry by mistake — undo",
    outcome: "You clean it up before it affects downstream calculations.",
    steps: [
      "Open /the-press.",
      "Filter by the import source that saved the bad batch (e.g. csv-imported today).",
      "Find the offending row.",
      "Tap the row → Edit (fix inline) or Delete (remove entirely).",
      "If the whole batch was bad, filter + select-all → delete-all (if supported), OR delete row-by-row.",
    ],
    gotcha: "Deleting entries is destructive — the audit trail keeps a stub, but the values are gone. Prefer Edit unless the entry is completely wrong.",
    jumpTo: "/the-press", jumpLabel: "Open The Press",
  },
  {
    n: "19", deck: "fix",
    title: "When to fall back to Quick Entry",
    outcome: "You don't waste 20 minutes fighting the AI when 60 seconds of typing solves it.",
    steps: [
      "You've retried Voice / Camera / Paste twice and the parse is still bad → Quick Entry.",
      "You only need to log ONE event (not a batch) → Quick Entry from the start.",
      "You're at your desk with no phone camera handy → Quick Entry.",
      "Quick Entry: tap /quick-entry. Fill the form. Tap Save. Twenty seconds, guaranteed correct.",
    ],
    gotcha: "Quick Entry is the safety valve, not the default. Use it when Import fails or when you have one event. For batches, ALWAYS Import first — you save hours over the long run.",
    jumpTo: "/quick-entry", jumpLabel: "Quick Entry",
  },
];

export function ImportFlashCards() {
  return (
    <FlashCardDeck
      anchorId="import-flash-cards"
      testIdPrefix="import-flash"
      eyebrow="Idiot's guide · Import & OCR workflow"
      title="Speak it, photo it, paste it, upload it. Then save it."
      intro="19 flash cards for /import — the flagship data-in surface. Covers picking the right tab, the exact steps for Voice, Camera OCR, Paste, CSV mapping, and Bulk folder drop. Ends with the review-and-save discipline that keeps bad data out of The Press."
      decks={DECKS}
      cards={CARDS}
      footerNote={
        <>
          Deep-link:{" "}
          <code style={{ color: "var(--ow-amber)" }}>#import-flash-cards</code>. Live surface:{" "}
          <Link href="/import" style={{ color: "var(--ow-amber)" }}>
            /import
          </Link>{" "}
          · Fallback for single events:{" "}
          <Link href="/quick-entry" style={{ color: "var(--ow-amber)" }}>
            /quick-entry
          </Link>
          .
        </>
      }
    />
  );
}
