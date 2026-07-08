/**
 * PipelineFlashCards — "idiot's guide" for the /admin/contacts/pipeline board.
 * Focus: understanding the 5 columns, moving cards, reading the KPIs, and
 * turning the board into a repeatable morning ritual.
 */
import { Link } from "wouter";
import { FlashCardDeck, type FlashCard, type FlashDeckMeta } from "./FlashCardDeck";

const DECKS: FlashDeckMeta[] = [
  { id: "layout",  label: "① The layout",       hint: "5 columns, 4 KPIs, what they mean" },
  { id: "move",    label: "② Move a card",       hint: "Drag & drop rules" },
  { id: "read",    label: "③ Read the signals",  hint: "View count, timings, badges" },
  { id: "ritual",  label: "④ Morning ritual",    hint: "5-minute repeatable flow" },
  { id: "pitfall", label: "⑤ Common pitfalls",   hint: "Things that trip up new operators" },
];

const CARDS: FlashCard[] = [
  // ── ① Layout ─────────────────────────────────────────────────────
  {
    n: "01", deck: "layout",
    title: "The 5 columns, left-to-right",
    outcome: "You understand where each prospect sits in the sales journey.",
    steps: [
      "Lead — added to the CRM, but no SMS sent yet. Cold territory.",
      "Sent — SMS is out, but the winemaker hasn't opened the link yet.",
      "Awaiting — they opened your link. No reply, no booking yet. The money column.",
      "Replied — they texted you back. Time-sensitive; act today.",
      "Booked — demo is calendar-confirmed. Sales pipeline done for this prospect.",
    ],
    gotcha: "Each column has a coloured left-border on its cards: grey, blue, amber, purple, green. Learn the colours — you'll read the whole board in one glance.",
    jumpTo: "/admin/contacts/pipeline", jumpLabel: "Open pipeline",
  },
  {
    n: "02", deck: "layout",
    title: "The 4 KPIs at the top",
    outcome: "You know the four numbers that tell you whether outreach is working.",
    steps: [
      "In pipeline — total active prospects (Lead + Sent + Awaiting + Replied + Booked). Roughly how much sales inventory you have.",
      "Awaiting reply — Awaiting + Replied combined. This is your \"needs my attention today\" count.",
      "Booked demos — total demos calendared this cycle.",
      "Booking rate — Booked ÷ In pipeline, as a %. Target: 8-12% for outbound; anything above 15% means your pitch is dialled.",
    ],
    gotcha: "Booking rate below 3% means the SMS pitch itself needs work — not that you need to send more. Fix the message, then scale.",
    jumpTo: "/admin/contacts/pipeline", jumpLabel: "Open pipeline",
  },
  {
    n: "03", deck: "layout",
    title: "Who is NOT on the board",
    outcome: "You don't waste time wondering where certain contacts vanished to.",
    steps: [
      "Sales/vendor-tagged contacts are hidden from the pipeline board — they live on /admin/contacts only.",
      "Skip-tagged contacts are hidden too — same reason.",
      "The board is deliberately \"prospects only\" so KPI maths stays clean.",
      "If a contact disappeared from the pipeline, check /admin/contacts first — they likely got Sales or Skip status.",
    ],
    gotcha: "The KPI counters only count board-visible contacts. If your \"In pipeline\" number seems low, filter /admin/contacts by Sales/Skip to see what's excluded.",
    jumpTo: "/admin/contacts", jumpLabel: "Full contacts list",
  },

  // ── ② Move a card ────────────────────────────────────────────────
  {
    n: "04", deck: "move",
    title: "Drag a card to a new column",
    outcome: "You manually override the stage when a phone call or in-person chat changed the reality.",
    steps: [
      "Grip the card by any edge — cursor turns to a grab hand.",
      "Drag it horizontally to the target column.",
      "The target column highlights on hover.",
      "Release. The card snaps in place. Timestamps update automatically.",
    ],
    gotcha: "Drag-and-drop uses native HTML5 (no library). On mobile Safari, hold the card for ~200ms before dragging to avoid triggering scroll instead.",
  },
  {
    n: "05", deck: "move",
    title: "What the timestamps become",
    outcome: "You understand why a card can't be dragged backwards without consequences.",
    steps: [
      "Drop to Lead — clears smsSentAt, repliedAt, demoBookedAt. Effectively re-cools the contact.",
      "Drop to Sent — sets smsSentAt if empty; clears reply/booking.",
      "Drop to Awaiting — same as Sent (viewCount is separate).",
      "Drop to Replied — sets both smsSentAt and repliedAt.",
      "Drop to Booked — sets all three: smsSentAt, repliedAt (if empty), demoBookedAt.",
    ],
    gotcha: "Dropping a Booked card back to Lead ERASES the booking timestamp — you lose the conversion timing. Don't do it for calendar reasons; use \"Skip\" on the row instead.",
  },
  {
    n: "06", deck: "move",
    title: "Optimistic drag = instant snap",
    outcome: "The card moves in the UI immediately, even before the server confirms.",
    steps: [
      "Drop the card. It snaps to the new column instantly.",
      "In the background, /api/trpc/outreach.setPipelineStage is called.",
      "If it succeeds, the card stays put.",
      "If it fails (network drop, auth expired), the card silently rolls back to the old column.",
    ],
    gotcha: "If a card keeps snapping BACK after you drop it — check your network. Refetch the page. Twenty seconds later, you're back in business.",
  },

  // ── ③ Read the signals ───────────────────────────────────────────
  {
    n: "07", deck: "read",
    title: "The 👁 view badge",
    outcome: "You see how many times the winemaker opened your link.",
    steps: [
      "Each card shows 👁 N if the winemaker has viewed their /hi/<slug> page at least once.",
      "1 view — polite skim; keep the pitch warm.",
      "2–4 views — actively considering. Sent them to a colleague, or came back with questions.",
      "5+ views — either extremely interested, or the pitch is confusing and they keep re-reading. Time to call.",
    ],
    gotcha: "Your OWN preview clicks count. When you tap Preview /hi/<slug>, the viewCount ticks up. Preview once, and don't spam it.",
  },
  {
    n: "08", deck: "read",
    title: "The 📨 · 💬 · ✅ time-since badges",
    outcome: "You know how stale each prospect is at a glance.",
    steps: [
      "📨 = time since SMS was sent. Example: 📨 3d = SMS went out 3 days ago.",
      "💬 = time since they replied. Example: 💬 6h = they replied 6 hours ago — chase today.",
      "✅ = time since they booked. Example: ✅ 2d = booked 2 days ago — put in your onboarding queue.",
      "The absence of a badge is a signal too. No 📨 means SMS never went — go send it.",
    ],
    gotcha: "Time-since is calculated at page-load. Refresh the page every ~30 seconds during a live outreach session so the numbers don't get stale.",
  },
  {
    n: "09", deck: "read",
    title: "Awaiting for >48h = call today",
    outcome: "You catch warm-but-quiet prospects before they cool off.",
    steps: [
      "Scan the Awaiting column.",
      "For any card showing 📨 ≥ 2d — they've had two full days to reply and haven't.",
      "That's your call-today list. Follow flash card #10 in the CRM deck: tap the mobile chip, dial.",
      "After the call, either drag them to Replied (they answered) or update status.",
    ],
    gotcha: "Don't send a second SMS to Awaiting >48h — it reads as chasing. A voice call reads as personal. Big difference.",
  },

  // ── ④ Morning ritual ─────────────────────────────────────────────
  {
    n: "10", deck: "ritual",
    title: "The 5-minute morning loop",
    outcome: "Every day, in 5 minutes, you handle every prospect who needs you.",
    steps: [
      "Open /admin/contacts/pipeline.",
      "Read the Awaiting reply KPI — that's your target for the session.",
      "Scan Replied first — anyone new here? Text them back RIGHT NOW.",
      "Scan Awaiting — anyone with 📨 ≥ 2d? Add to your call list.",
      "If there's headroom, sort /admin/contacts by Newest and send 3-5 fresh SMS.",
      "Done. Close the tab. Come back tomorrow.",
    ],
    gotcha: "The pipeline board is best consumed once per day. Refreshing it hourly is a productivity trap — the ticks don't come faster because you're watching.",
    jumpTo: "/admin/contacts/pipeline", jumpLabel: "Pipeline board",
  },
  {
    n: "11", deck: "ritual",
    title: "End of day: capture the outcomes",
    outcome: "Everything you did today is on the board tomorrow morning.",
    steps: [
      "Any SMS you sent from your phone? Mark SMS sent on the corresponding /admin/contacts row.",
      "Any prospect who texted back? Mark replied.",
      "Any calendar booking that came through? Mark booked.",
      "If someone said no, drop their status to Skip.",
      "Log any voice-call outcomes as notes so future-you remembers the context.",
    ],
    gotcha: "The board is only as accurate as your capture. Skip a day of stamping and the whole pipeline turns into fiction.",
  },

  // ── ⑤ Pitfalls ───────────────────────────────────────────────────
  {
    n: "12", deck: "pitfall",
    title: "Don't fake-move cards to inflate KPIs",
    outcome: "Your Booking rate stays honest, which means you can trust it.",
    steps: [
      "Only drop to Booked when a demo is on your calendar with a time.",
      "Only drop to Replied when there's an actual SMS reply thread.",
      "If you're tempted to inflate — write a note instead: \"Verbal interest, no calendar yet.\"",
    ],
    gotcha: "The board is a decision-support tool for YOU, not a sales-manager scoreboard. Lying to it means you'll make bad decisions about which pitches to double down on.",
  },
  {
    n: "13", deck: "pitfall",
    title: "Don't panic-empty the Lead column",
    outcome: "You stop mass-sending SMS to under-researched contacts.",
    steps: [
      "A big Lead column is FINE — it's a backlog of prospects.",
      "Don't feel obliged to blast SMS at everyone in there. Research first (persona, notes, event context), then batch.",
      "Aim for 5-10 quality sends per day, not 50 low-quality ones.",
    ],
    gotcha: "SMS delivered to a stranger with the wrong persona chosen is worse than no SMS at all — you've burned that lead for months.",
  },
  {
    n: "14", deck: "pitfall",
    title: "Twilio is still mocked — the board doesn't auto-update",
    outcome: "You know the board reflects YOUR taps, not any real-time SMS state.",
    steps: [
      "smsSentAt is set when YOU tap Mark SMS sent (not when Twilio actually sends).",
      "repliedAt is set when YOU tap Mark replied (not when Twilio receives).",
      "viewCount IS auto-updated when the winemaker actually opens the link — that part is real.",
      "So the board is a hybrid: real view data + manual send/reply data.",
    ],
    gotcha: "When we un-mock Twilio (P1 backlog), the send/reply stamping will go auto. Until then, discipline yourself to tap Mark buttons immediately.",
  },
];

export function PipelineFlashCards() {
  return (
    <FlashCardDeck
      anchorId="pipeline-flash-cards"
      testIdPrefix="pipeline-flash"
      eyebrow="Idiot's guide · Pipeline board"
      title="Read the board. Move the cards. Ship the demos."
      intro="14 flash cards for the /admin/contacts/pipeline board — the Trello-style morning check-in. Covers what each column means, how to move cards without breaking timestamps, how to read the view/time badges, and the 5-minute daily ritual that keeps the KPIs honest."
      decks={DECKS}
      cards={CARDS}
      footerNote={
        <>
          Deep-link:{" "}
          <code style={{ color: "var(--ow-amber)" }}>#pipeline-flash-cards</code>. Board itself:{" "}
          <Link href="/admin/contacts/pipeline" style={{ color: "var(--ow-amber)" }}>
            /admin/contacts/pipeline
          </Link>
          .
        </>
      }
    />
  );
}
