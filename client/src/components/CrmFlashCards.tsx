/**
 * CrmFlashCards — an "idiot's guide" flash-card deck for the operator's
 * daily CRM workflow. Lives inside /admin/operator-guide.
 *
 * Design goals:
 *   - Idiot-proof. Every step is a single verb-first action. No jargon
 *     without a translation.
 *   - Phone-first. Horizontal snap-scroll on mobile; grid on desktop.
 *   - Scannable. Each card has: number · title · one-line-outcome ·
 *     numbered steps · gotcha · next-card jump.
 *   - Deep-linkable. Each card has a data-testid AND a URL anchor so we
 *     can send a lost operator to card #08 with one link.
 *
 * Grouped into 6 decks for mental chunking. The decks show up as pill
 * tabs above the card strip; clicking a tab filters + auto-scrolls the
 * strip to the first card in that deck.
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";

type Deck = "add" | "prep" | "send" | "call" | "track" | "bulk" | "fix";

interface FlashCard {
  n: string;           // sticky card number ("01" … "19")
  deck: Deck;
  title: string;
  outcome: string;     // one-line "what happens when you do this"
  steps: string[];     // exact taps/clicks, numbered
  gotcha?: string;     // pitfall / pro-tip
  jumpTo?: string;     // literal URL to the surface this card is about
  jumpLabel?: string;
}

const DECKS: Array<{ id: Deck; label: string; hint: string }> = [
  { id: "add",   label: "① Get them in",     hint: "Add · Research · Persona" },
  { id: "prep",  label: "② Prep the pitch",   hint: "Preview · Edit SMS · Copy" },
  { id: "send",  label: "③ Send the SMS",     hint: "Copy → Paste → Send" },
  { id: "call",  label: "④ Or call them",     hint: "When to call · How to call" },
  { id: "track", label: "⑤ Track replies",    hint: "Pipeline · Replied · Booked" },
  { id: "bulk",  label: "⑥ Bulk send",        hint: "Send 20 at once" },
  { id: "fix",   label: "⑦ Fix problems",     hint: "Sales · Wrong persona · Cold" },
];

const CARDS: FlashCard[] = [
  // ── ① Get them in ──────────────────────────────────────────────
  {
    n: "01",
    deck: "add",
    title: "Add a winemaker manually",
    outcome: "A row appears with a personalised /hi/<slug> URL and an SMS draft ready to send.",
    steps: [
      "Go to /admin/contacts.",
      "Scroll to the Add-contact form (below the KPI strip).",
      "Fill: first name, last name, winery, mobile (+61 4xx xxx xxx), event (optional).",
      "Pick a persona chip (Winemaker · Chef · Sommelier · Retailer · Home-winemaker · Cellar-hand). This changes the pitch.",
      "Tap Add contact.",
    ],
    gotcha: "No mobile? You can still add them — the SMS draft is hidden until you add one via the mobile-chip pencil later.",
    jumpTo: "/admin/contacts",
    jumpLabel: "Open contacts",
  },
  {
    n: "02",
    deck: "add",
    title: "Paste an event URL — let AI extract the lineup",
    outcome: "One page (Humanitix, Eventbrite, festival site) becomes 20+ pre-filled contact drafts.",
    steps: [
      "Go to /admin/event-ingest.",
      "Paste the event URL. Tap Parse.",
      "The system pulls event metadata + every producer listed.",
      "Tick the producers you want to research. Tap Run deep research.",
      "Perplexity fills in emails, socials, notes for each ticked row.",
      "Tap Save selected — they land in /admin/contacts tagged with the event.",
    ],
    gotcha: "Deep research burns Perplexity credits. Only tick the producers you actually want to pitch — not the whole list.",
    jumpTo: "/admin/event-ingest",
    jumpLabel: "Event ingest",
  },
  {
    n: "03",
    deck: "add",
    title: "Deep-research an existing contact",
    outcome: "Fills in likely emails, Instagram, LinkedIn, and one-sentence background notes.",
    steps: [
      "On /admin/contacts, open the Deep Research panel at the top.",
      "Type the winemaker's name + winery (e.g. \"Nathan Bailey, Brokenwood Wines\").",
      "Tap Run deep research.",
      "Wait 15–30 seconds. Review the citations + email guesses.",
      "Tap each email chip to copy it. Tap Save to notes to attach the research to the contact.",
    ],
    gotcha: "Emails are GUESSES from patterns (name@winery.com). Verify at least one lands before you pitch — a bounced email tips off spam filters for future sends.",
    jumpTo: "/admin/contacts",
    jumpLabel: "Contacts",
  },
  {
    n: "04",
    deck: "add",
    title: "Pick their persona (this changes the pitch)",
    outcome: "The /hi/<slug> page renders a completely different message based on persona.",
    steps: [
      "Find their row on /admin/contacts. Expand it if collapsed.",
      "Look for the persona chip row (below their name/winery).",
      "Tap one of: Winemaker · Chef · Sommelier · Retailer · Home-winemaker · Cellar-hand.",
      "The SMS draft AND the /hi/<slug> landing page instantly update.",
      "Tap Preview /hi/<slug> to see the difference.",
    ],
    gotcha: "Default is Winemaker. If in doubt, keep it there — that's the pitch we've polished the most.",
    jumpTo: "/admin/contacts",
    jumpLabel: "Contacts",
  },

  // ── ② Prep the pitch ───────────────────────────────────────────
  {
    n: "05",
    deck: "prep",
    title: "Preview their landing page",
    outcome: "See exactly what the winemaker will see when they tap your SMS link.",
    steps: [
      "On the contact row, tap Preview /hi/<slug>.",
      "A new tab opens with their fully-personalised landing card.",
      "Check: their name reads right? Winery correct? Persona pitch feels natural?",
      "If any of those are off, fix them on the contact row FIRST, then re-preview.",
    ],
    gotcha: "The preview counts as a view. Don't preview 30 times in a row or the pipeline board will think they opened it. Once is enough.",
  },
  {
    n: "06",
    deck: "prep",
    title: "Edit the SMS draft inline",
    outcome: "Personalise the auto-generated SMS with a one-line human touch before sending.",
    steps: [
      "On their contact row, look for the SMS draft box (opens automatically for non-sales contacts).",
      "Tap into the textarea. Type any personal addition — \"loved your 2023 Grenache\" etc.",
      "Tap Save draft. Your edit becomes the effective SMS.",
      "The counter at the top-right shows characters — SMS caps at ~160 for a single-segment send.",
    ],
    gotcha: "Keep the /hi/<slug> URL in the message. Removing it kills view tracking — you'll be blind to whether they opened your pitch.",
  },
  {
    n: "07",
    deck: "prep",
    title: "Copy: link only, or the whole SMS draft?",
    outcome: "You now have EITHER just the URL OR the full pitch on your clipboard.",
    steps: [
      "Tap Copy link if you just want the URL (for a DM, a WhatsApp, or copy-paste into a spreadsheet).",
      "Tap Copy SMS draft (the amber one) if you're about to send an actual text message.",
      "A green ✓ appears for ~1.5 seconds to confirm the copy landed.",
    ],
    gotcha: "The clipboard only holds ONE thing. If you tap Copy link and then Copy SMS, the second copy overwrites the first.",
  },

  // ── ③ Send the SMS ─────────────────────────────────────────────
  {
    n: "08",
    deck: "send",
    title: "Send the SMS — the exact taps",
    outcome: "Your winemaker receives a personal text with a link they can tap.",
    steps: [
      "On the contact row, tap the amber Copy SMS draft button.",
      "See the ✓ SMS copied confirmation? Good — it's on your clipboard.",
      "Open Messages on your iPhone (or your default SMS app).",
      "Tap the compose (pencil) icon. Type or paste their mobile number.",
      "Tap into the message body → long-press → Paste. The full SMS with /hi/<slug> URL lands.",
      "Tap send.",
      "Come back to /admin/contacts. Tap Mark SMS sent on their row.",
    ],
    gotcha: "Mark SMS sent is EASY to forget. Do it immediately — the pipeline board relies on that timestamp to know they're in play.",
  },
  {
    n: "09",
    deck: "send",
    title: "Sanity-check before sending",
    outcome: "Zero embarrassing sends. No \"Hi {firstName}\" going out with the braces still visible.",
    steps: [
      "After copying, paste into ANY blank note (Notes app is fine) before Messages.",
      "Read the whole thing back once, out loud.",
      "Check: name resolved? Winery resolved? URL present? Character count under 160?",
      "Now paste into Messages and send.",
    ],
    gotcha: "The system replaces {firstName} etc automatically — but if a contact was added without a first name field, the placeholder can leak. Read once, always.",
  },

  // ── ④ Or call them ─────────────────────────────────────────────
  {
    n: "10",
    deck: "call",
    title: "Tap the mobile chip to grab the number",
    outcome: "Their phone number is now on your clipboard, ready to paste into the dialer.",
    steps: [
      "On the contact row, find the mobile chip (looks like: 📱 04xx xxx xxx).",
      "Tap it. A ✓ URL copied confirmation flashes.",
      "Open your Phone app → dial pad → long-press → Paste → tap the green call button.",
      "OR on iPhone, tap the mobile chip THEN switch to your Contacts and add them so future calls are one-tap.",
    ],
    gotcha: "There's no tel: shortcut yet — the chip just copies. If you're on desktop, use your phone. If mobile, paste into the dialer.",
  },
  {
    n: "11",
    deck: "call",
    title: "Call vs text — the rule of thumb",
    outcome: "You stop wasting cold calls on people who'd rather text.",
    steps: [
      "SMS first for: cold contacts, event-lineup contacts, anyone under 45.",
      "CALL first for: warm intros (someone referred them), senior winemakers (50+), anyone who replied to a previous SMS with a question.",
      "If SMS gets opened but no reply within 48h, THEN call. That's your warmest window.",
      "Never call before 9am or after 5pm winery time. Vintage crush is the one exception — winemakers are up at 4am anyway.",
    ],
    gotcha: "If the pipeline board shows Awaiting for 3+ days, that's a call-worthy signal. They've seen your pitch and are thinking. A gentle voice nudge often closes.",
  },
  {
    n: "12",
    deck: "call",
    title: "Log a call outcome",
    outcome: "The pipeline moves forward even for phone conversations that never touched SMS.",
    steps: [
      "After the call, decide the outcome: they said yes? Not right now? Send info later?",
      "For \"yes / demo booked\" — tap Mark booked on the row.",
      "For \"not right now\" — tap the status dropdown → Cold or Skip.",
      "For \"send me more info\" — tap Copy link, email or WhatsApp them the /hi/<slug> URL, then tap Mark SMS sent so the pipeline can track their eventual view.",
    ],
    gotcha: "Don't leave a phone-only outcome untagged. If it's not in the CRM, it didn't happen — you'll double-pitch them a month later.",
  },

  // ── ⑤ Track replies ────────────────────────────────────────────
  {
    n: "13",
    deck: "track",
    title: "The pipeline board is your morning check-in",
    outcome: "You see every prospect's status at a glance — Trello-style.",
    steps: [
      "Go to /admin/contacts/pipeline.",
      "Read the 5 columns left-to-right: Lead → Sent → Awaiting → Replied → Booked.",
      "Focus on Awaiting first — those are people who OPENED your link but haven't replied yet.",
      "Focus on Replied next — those need a follow-up from you today.",
      "Ignore Lead unless you're doing a fresh add-and-send session.",
    ],
    gotcha: "Awaiting is the money column. A prospect there for >48h is the biggest signal you should call them.",
    jumpTo: "/admin/contacts/pipeline",
    jumpLabel: "Pipeline board",
  },
  {
    n: "14",
    deck: "track",
    title: "Mark replied when they text you back",
    outcome: "Their card moves from Awaiting → Replied on the pipeline board.",
    steps: [
      "You get an SMS reply on your phone.",
      "Open /admin/contacts. Find their row (search / sort by Newest).",
      "Tap 💬 Mark replied.",
      "The pipeline board updates in real-time — you'll see them shift columns.",
    ],
    gotcha: "The system CAN'T auto-detect SMS replies (Twilio integration is still mocked). You have to tap Mark replied manually. Do it the moment you reply back.",
  },
  {
    n: "15",
    deck: "track",
    title: "Mark booked when they commit to a demo",
    outcome: "They graduate out of the sales pipeline into the customer world.",
    steps: [
      "On their row, tap Mark booked.",
      "Their card moves to the Booked column.",
      "This bumps your Booking rate KPI (top of the pipeline page) — that's the number you actually care about.",
    ],
    gotcha: "\"Booked\" means calendar-confirmed, not \"we agreed to talk soon\". If it's not in your calendar, don't mark it — the KPI has to be honest.",
  },

  // ── ⑥ Bulk send ────────────────────────────────────────────────
  {
    n: "16",
    deck: "bulk",
    title: "Send 20 SMS at once — the batch card",
    outcome: "One clipboard blob, one paste into Messages, twenty pitches out the door.",
    steps: [
      "On /admin/contacts, scroll to the Bulk SMS card (appears when there are ≥2 unsent contacts with mobiles).",
      "Tap Copy N SMS drafts →.",
      "The clipboard now holds a TSV: Name, Mobile, personalised SMS for every pending contact.",
      "Paste that into Messages one-by-one (each row is one contact), OR into a spreadsheet if you're mail-merging.",
      "When done, tap Mark all N as sent — advances every contact at once.",
    ],
    gotcha: "TSV format = one row per contact, tab-separated. Numbers app or Excel opens it cleanly. Copy-pasting into a single Messages thread won't work — each contact is a separate send.",
  },
  {
    n: "17",
    deck: "bulk",
    title: "Sort your contacts before you batch",
    outcome: "You send to the highest-priority contacts first, not in random order.",
    steps: [
      "On /admin/contacts, use the Sort dropdown (top of the list).",
      "Pick: Newest (fresh event ingest), Region (batch by geography), Status (Warm→Cold), or Winery A→Z.",
      "The sort preference is saved — reload-safe.",
      "NOW hit Bulk SMS — you're batching in the order that makes sense.",
    ],
    gotcha: "Batching cold contacts before warm ones wastes your best window. Always: Warm → Lukewarm → Cold.",
  },

  // ── ⑦ Fix problems ─────────────────────────────────────────────
  {
    n: "18",
    deck: "fix",
    title: "Contact is a sales rep / vendor — mark them Sales",
    outcome: "SMS draft hides so you never accidentally pitch a rep. Row goes grey.",
    steps: [
      "On their row, tap the Status dropdown.",
      "Pick Sales/vendor.",
      "The SMS draft box disappears. The row dims.",
      "They stay in the CRM for reference (in case they reach out later) but won't clutter your pipeline.",
    ],
    gotcha: "Same applies for competitors and journalists. Use Skip for those — same behaviour, different label.",
  },
  {
    n: "19",
    deck: "fix",
    title: "Wrong persona? Swap it in place",
    outcome: "The SMS draft + /hi/<slug> page instantly re-render with the new pitch.",
    steps: [
      "On the contact row, find the persona chip row.",
      "Tap the correct persona.",
      "The draft below updates immediately.",
      "If you'd already copied the old draft — copy again with the fresh one.",
    ],
    gotcha: "If you've ALREADY sent the SMS, don't change persona — it makes tracking messy. Add a note instead: \"persona was Chef; actually a Sommelier.\"",
  },
  {
    n: "20",
    deck: "fix",
    title: "Someone went cold — don't delete, downgrade",
    outcome: "They stay in your CRM but stop appearing in daily pipeline noise.",
    steps: [
      "On their row, tap the Status dropdown.",
      "Pick Cold.",
      "They drop out of the Bulk SMS pool and the pipeline board still shows them but greyed.",
      "Six months later you can re-warm them by flipping back to Lukewarm and sending a fresh pitch.",
    ],
    gotcha: "Delete is destructive — you'll lose their history + notes. Cold is almost always the right move.",
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export function CrmFlashCards() {
  const [activeDeck, setActiveDeck] = useState<Deck | "all">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (activeDeck === "all" ? CARDS : CARDS.filter((c) => c.deck === activeDeck)),
    [activeDeck],
  );

  function switchDeck(d: Deck | "all") {
    setActiveDeck(d);
    // Scroll strip back to the start when switching decks
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  }

  return (
    <section
      id="crm-flash-cards"
      data-testid="crm-flash-cards"
      className="scroll-mt-24"
      style={{
        background: "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-card))",
        border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
        borderRadius: 12,
        padding: "1.5rem 1.25rem 1.25rem",
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-1.5"
          style={{ color: "var(--ow-amber)" }}
        >
          Idiot&rsquo;s guide · CRM workflow
        </p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}
        >
          Every button, every tap, in order.
        </h2>
        <p
          className="text-sm mt-1.5"
          style={{ color: "var(--ow-text-mid)", maxWidth: "56ch", lineHeight: 1.6 }}
        >
          20 flash cards covering the full loop: adding a winemaker → prepping the pitch → sending
          the SMS → tracking replies → calling instead → bulk sending → fixing problems.
          Read left-to-right. Skim the deck tabs first if you know what you&rsquo;re after.
        </p>
      </div>

      {/* Deck tabs */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        data-testid="crm-flash-decks"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeDeck === "all"}
          data-testid="crm-deck-all"
          onClick={() => switchDeck("all")}
          style={pillStyle(activeDeck === "all")}
        >
          All 20 cards
        </button>
        {DECKS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={activeDeck === d.id}
            data-testid={`crm-deck-${d.id}`}
            onClick={() => switchDeck(d.id)}
            title={d.hint}
            style={pillStyle(activeDeck === d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Card strip — horizontal snap-scroll on all viewports */}
      <div
        ref={scrollRef}
        data-testid="crm-flash-strip"
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "min(90vw, 340px)",
          gap: "0.75rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "0.25rem 0.25rem 1rem",
          margin: "0 -0.25rem",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {filtered.map((card) => (
          <FlashCardTile key={card.n} card={card} />
        ))}
      </div>

      {/* Deck hint footer */}
      <p
        className="text-xs italic mt-2 pt-3 border-t"
        style={{
          color: "var(--ow-text-lo)",
          borderColor: "color-mix(in oklch, var(--ow-amber) 20%, transparent)",
        }}
      >
        Deep-link any card by adding <code style={{ color: "var(--ow-amber)" }}>#crm-flash-cards</code>{" "}
        to the URL — <Link href="/admin/operator-guide#crm-flash-cards" style={{ color: "var(--ow-amber)" }}>bookmark it on your phone</Link>.
      </p>
    </section>
  );
}

// ── FlashCardTile ────────────────────────────────────────────────────────────
function FlashCardTile({ card }: { card: FlashCard }) {
  return (
    <article
      data-testid={`crm-flash-card-${card.n}`}
      style={{
        scrollSnapAlign: "start",
        background: "var(--ow-bg-base)",
        border: "1px solid var(--ow-bg-inset)",
        borderRadius: 10,
        padding: "1rem 1.15rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        minHeight: 380,
      }}
    >
      {/* Card number + deck badge */}
      <div className="flex items-baseline justify-between mb-2">
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "var(--ow-amber)",
            lineHeight: 1,
          }}
        >
          {card.n}
        </span>
        <span
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.62rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
            fontWeight: 600,
          }}
        >
          {DECKS.find((d) => d.id === card.deck)?.label.replace(/^[①-⑦]\s*/, "")}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "var(--ow-text-hi)",
          lineHeight: 1.25,
          margin: "0 0 0.4rem",
        }}
      >
        {card.title}
      </h3>

      {/* Outcome */}
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.82rem",
          fontStyle: "italic",
          color: "var(--ow-text-mid)",
          lineHeight: 1.55,
          margin: "0 0 0.85rem",
        }}
      >
        → {card.outcome}
      </p>

      {/* Numbered steps */}
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "var(--ow-text-hi)",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          flex: 1,
        }}
      >
        {card.steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <span
              style={{
                flexShrink: 0,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "color-mix(in oklch, var(--ow-amber) 22%, transparent)",
                color: "var(--ow-amber)",
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.62rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      {/* Gotcha */}
      {card.gotcha && (
        <div
          style={{
            marginTop: "0.9rem",
            padding: "0.55rem 0.7rem",
            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
            border: "1px dashed color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            borderRadius: 6,
          }}
        >
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              lineHeight: 1.5,
              margin: 0,
              color: "var(--ow-text-mid)",
            }}
          >
            <strong style={{ color: "var(--ow-amber)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.62rem" }}>
              Gotcha ·{" "}
            </strong>
            {card.gotcha}
          </p>
        </div>
      )}

      {/* Jump-to link */}
      {card.jumpTo && card.jumpLabel && (
        <Link
          href={card.jumpTo}
          data-testid={`crm-flash-card-${card.n}-jump`}
          style={{
            marginTop: "0.75rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--ow-amber)",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          {card.jumpLabel} →
        </Link>
      )}
    </article>
  );
}

// ── Pill style helper ────────────────────────────────────────────────────────
function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.35rem 0.85rem",
    borderRadius: 999,
    border: active
      ? "1.5px solid var(--ow-amber)"
      : "1px solid var(--ow-bg-inset)",
    background: active
      ? "color-mix(in oklch, var(--ow-amber) 18%, transparent)"
      : "transparent",
    color: active ? "var(--ow-amber)" : "var(--ow-text-mid)",
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
