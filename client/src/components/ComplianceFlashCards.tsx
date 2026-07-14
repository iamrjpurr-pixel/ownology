/**
 * ComplianceFlashCards — "idiot's guide" for /compliance and adjacent
 * regulatory surfaces (LIP Audit Pack, Audit trail PDF, APCO Assistant,
 * Regulations library).
 *
 * Audience: Rich, when a regulator emails, when APCO deadline nears, or
 * when a winemaker asks "am I doing X right?" in the middle of harvest.
 */
import { Link } from "wouter";
import { FlashCardDeck, type FlashCard, type FlashDeckMeta } from "./FlashCardDeck";

const DECKS: FlashDeckMeta[] = [
  { id: "ask",    label: "① Ask a question",  hint: "The compliance AI, cited answers" },
  { id: "audit",  label: "② Audit trail PDF", hint: "For regulator inquiries" },
  { id: "lip",    label: "③ LIP Audit Pack",  hint: "Wine Australia s.39F" },
  { id: "apco",   label: "④ APCO Assistant",  hint: "31 March deadline · Annual Report" },
  { id: "regs",   label: "⑤ Regulations lib", hint: "State-by-state browse" },
  { id: "when",   label: "⑥ When to escalate", hint: "AI is not a lawyer" },
];

const CARDS: FlashCard[] = [
  // ── ① Ask a compliance question ──────────────────────────────────
  {
    n: "01", deck: "ask",
    title: "Ask any compliance question — the fast path",
    outcome: "A cited, jurisdiction-specific answer in ~30 seconds.",
    steps: [
      "Go to /compliance.",
      "Scroll to the Ask box near the bottom.",
      "Type your question in plain English — e.g. \"Can I use metatartaric acid to stabilise a Chardonnay for the AU market?\"",
      "(Optional) Pick a state filter if the question is jurisdiction-specific.",
      "Tap Ask. Wait ~30s for the cited answer.",
    ],
    gotcha: "Include the country + jurisdiction in your question if it matters (\"in South Australia\", \"under FSANZ\"). The AI's answer is only as specific as your ask.",
    jumpTo: "/compliance", jumpLabel: "Open compliance",
  },
  {
    n: "02", deck: "ask",
    title: "Read the citations before you act",
    outcome: "You know the answer is real, not hallucinated.",
    steps: [
      "Every answer ends with a Sources block — click through each source link.",
      "Prefer sources from: Wine Australia, FSANZ, state EPAs, AWRI, official state government.",
      "Ignore or double-check sources from: blogs, forums, wine-marketing sites.",
      "If ALL sources look weak, re-ask the question with more specificity (add state, product type, exact regulation number).",
    ],
    gotcha: "Compliance AI is grounded in cellar + regulatory refs, but it can still generalise. Two citations from authoritative sources = safe. Zero citations = re-ask.",
  },
  {
    n: "03", deck: "ask",
    title: "Keep a conversation going",
    outcome: "Follow-ups stay in context — you don't have to re-explain the setup.",
    steps: [
      "Your first question sets the context.",
      "Follow up in the same box: \"What about for a wine going to NZ?\", \"Does the residual sugar limit change if it's above 15% ABV?\"",
      "The AI remembers the previous exchange for this session.",
      "Hit Clear conversation to start fresh when the topic changes.",
    ],
    gotcha: "The conversation resets if you reload the page or navigate away. Use Download PDF (see card #04) before you close the tab if the answers are important.",
  },
  {
    n: "04", deck: "ask",
    title: "Download the conversation as a PDF",
    outcome: "You have a hard record of what the AI said, for your files and for the regulator.",
    steps: [
      "After a useful compliance conversation, scroll to the bottom.",
      "Tap Download PDF.",
      "A PDF with all Q&A + citations downloads.",
      "Save it in your compliance folder alongside the regulation itself.",
    ],
    gotcha: "The PDF is a snapshot of THIS session only. If you keep chatting after downloading, the new answers aren't in the file — re-download.",
  },

  // ── ② Audit trail PDF ────────────────────────────────────────────
  {
    n: "05", deck: "audit",
    title: "Download the last 365 days as a PDF",
    outcome: "A chronological record of every cellar operation, ready for a regulator's inbox.",
    steps: [
      "Go to /compliance.",
      "Look for the Download audit trail PDF (last 365 days) button.",
      "Tap it. The PDF generates and downloads.",
      "Attach it to your reply.",
    ],
    gotcha: "The audit trail includes YOUR decision-logic notes (\"why did we add DAP?\"). If those are informal / rude, they'll be in the PDF. Review before sending to a regulator.",
    jumpTo: "/compliance", jumpLabel: "Compliance page",
  },
  {
    n: "06", deck: "audit",
    title: "Change the timeframe if 365 days is wrong",
    outcome: "You send exactly the window the regulator asked for.",
    steps: [
      "Right-click / long-press the Download audit trail PDF button.",
      "Copy link. It looks like /api/compliance/audit-trail.pdf?days=365.",
      "Paste into a new tab.",
      "Change days=365 to whatever the regulator asked for: days=90, days=730, etc.",
      "Hit enter. PDF downloads for the new window.",
    ],
    gotcha: "The days parameter counts BACKWARDS from today. There's no start/end date picker yet — that's on the backlog.",
  },

  // ── ③ LIP Audit Pack ─────────────────────────────────────────────
  {
    n: "07", deck: "lip",
    title: "What the LIP Audit Pack actually is",
    outcome: "You know why it matters and when to send it.",
    steps: [
      "LIP = Label Integrity Programme, Wine Australia Act s.39F.",
      "Australian wineries must be able to prove every label claim (vintage, variety, geographic indication) with a paper trail.",
      "The LIP Audit Pack is a single PDF containing: batch inventory, 85% variety-rule check, grower one-step-back, supplier one-step-back.",
      "Wine Australia auditors ask for this on inspection. Not sending one = penalty.",
    ],
    gotcha: "This is Australia-specific. NZ, US, EU winemakers can ignore this deck.",
    jumpTo: "/compliance", jumpLabel: "Compliance page",
  },
  {
    n: "08", deck: "lip",
    title: "Download the LIP Audit Pack for a vintage",
    outcome: "One PDF, sized right for a Wine Australia auditor to open and read.",
    steps: [
      "Go to /compliance.",
      "Find the Download LIP Audit Pack (vintage YYYY) button — it defaults to the current calendar year.",
      "Tap it. The PDF downloads.",
      "For a different vintage, use the URL trick: /api/compliance/lip-audit-pack.pdf?vintage=2024.",
    ],
    gotcha: "The pack only reflects data you've LOGGED. If your Batch Book and Vintage Log are behind on data entry, the pack will be thin. Log first, download second.",
  },
  {
    n: "09", deck: "lip",
    title: "The 85% rule — what the check does",
    outcome: "You know your labels are compliant BEFORE you print them.",
    steps: [
      "For any label claim (vintage / variety / GI), 85% of the wine in the bottle must actually match that claim.",
      "The LIP pack computes this ratio automatically from your batch data.",
      "Green tick = compliant. Red flag = failed — do NOT print the label until you rebalance the blend.",
      "The pack shows the exact percentages used so you can defend the calculation to an auditor.",
    ],
    gotcha: "The 85% rule is per-line-item. A wine with two claims (2024 vintage + 90% Shiraz) needs BOTH claims to pass 85%. One passing doesn't excuse the other.",
  },

  // ── ④ APCO Assistant ─────────────────────────────────────────────
  {
    n: "10", deck: "apco",
    title: "APCO — what and when",
    outcome: "You never miss the 31 March deadline.",
    steps: [
      "APCO = Australian Packaging Covenant Organisation.",
      "Every business handling packaged goods over a threshold must submit an Annual Report by 31 March.",
      "Report covers: total packaging placed on market, % recyclable, % sustainable, action plan for next year.",
      "Miss the deadline = penalties + audit risk.",
    ],
    gotcha: "Boutique winemakers often think APCO doesn't apply to them. Check the threshold: annual turnover ≥ AUD $5M OR consumer packaging on-market. Many small wineries qualify.",
    jumpTo: "/apco", jumpLabel: "APCO page",
  },
  {
    n: "11", deck: "apco",
    title: "Feed the APCO data vault",
    outcome: "The Assistant has everything it needs to draft your report in an afternoon.",
    steps: [
      "Log your packaging inputs during Batch Book entries (bottle weight, closure type, label material, carton spec).",
      "The system aggregates by financial year automatically.",
      "Around February each year, the APCO Assistant surfaces a Draft my Annual Report action.",
      "Tap it — Claude drafts the report from your logged data.",
    ],
    gotcha: "APCO Assistant is still in build (marketing wedge is live, feature build is P1). If you need to submit APCO 2026 report NOW, use the manual template from apco.org.au and log a request for the automated build.",
  },
  {
    n: "12", deck: "apco",
    title: "Review the draft — don't just submit",
    outcome: "You catch AI hallucinations before they hit the APCO portal.",
    steps: [
      "The Assistant produces a draft. Read every paragraph.",
      "Verify: bottle weights, closure counts, carton totals all match your Vintage Log records.",
      "Fix any \"we recycled 87% of\" numbers if they don't align with your actual practice.",
      "Only then, submit to APCO portal.",
    ],
    gotcha: "APCO reports are audited. A number in your submission that you can't defend on paper is worse than a lower, honest number.",
  },

  // ── ⑤ Regulations library ────────────────────────────────────────
  {
    n: "13", deck: "regs",
    title: "Browse the regulations library",
    outcome: "You find the exact regulation without searching Google.",
    steps: [
      "Go to /regulations.",
      "Filter by state (SA, VIC, NSW, WA, TAS, QLD, ACT, NT) or by federal.",
      "Each entry links to the primary source (legislation.gov.au, state government) — click through for the authoritative text.",
      "Save the deep-link for the ones you cite regularly.",
    ],
    gotcha: "State laws vary — SA winery license ≠ VIC winery license. Always confirm state before quoting a rule.",
    jumpTo: "/regulations", jumpLabel: "Regulations library",
  },
  {
    n: "14", deck: "regs",
    title: "Federal vs state — which one wins?",
    outcome: "You stop applying the wrong-jurisdiction rule.",
    steps: [
      "Federal (Wine Australia, FSANZ, WET, biosecurity) applies to ALL Australian wineries.",
      "State (liquor licensing, EPA environment, WHS) applies to wineries operating in that state.",
      "If both cover the same topic, federal usually sets the FLOOR; state may add stricter requirements.",
      "When in doubt: check the state rule first (it's usually stricter). If silent, defer to federal.",
    ],
    gotcha: "Wine Australia s.39F (LIP) is federal — applies everywhere. State liquor licensing is separate — you need BOTH.",
  },

  // ── ⑥ When to escalate ───────────────────────────────────────────
  {
    n: "15", deck: "when",
    title: "The AI is not a lawyer — when to escalate",
    outcome: "You know when to stop using the tool and call a professional.",
    steps: [
      "AI is fine for: understanding a rule, drafting internal SOPs, quick sanity checks, learning the landscape.",
      "AI is NOT fine for: signing off on a label change that might trigger a recall, negotiating a compliance-notice reply, defending an audit finding.",
      "For those, download the audit trail PDF (card #05), forward to your compliance consultant or lawyer, get their sign-off.",
      "Log the professional's decision as a Decision Logic note against the batch so future-you remembers the reasoning.",
    ],
    gotcha: "\"But the AI said it was fine\" is not a legal defence. Human review lands with regulators; AI answers do not.",
  },
  {
    n: "16", deck: "when",
    title: "Regulator emails you — the 3-step playbook",
    outcome: "You reply with confidence in under 24 hours.",
    steps: [
      "Step 1: read the email TWICE. Identify what they're actually asking (audit? clarification? follow-up?).",
      "Step 2: on /compliance, ask the AI the exact question the regulator raised. Read the citations.",
      "Step 3: download the audit trail PDF for the relevant window. Attach to your reply. Answer in plain language, cite the rule.",
      "If the ask is legally consequential (see card #15), CC your consultant before replying.",
    ],
    gotcha: "Regulators respect quick, precise, evidence-backed replies. Slow, vague, defensive replies invite deeper audits. Speed + citations = the winning combo.",
  },
];

export function ComplianceFlashCards({ excludeDecks }: { excludeDecks?: string[] } = {}) {
  const skip = new Set(excludeDecks ?? []);
  const filteredDecks = DECKS.filter((d) => !skip.has(d.id));
  const filteredCards = CARDS.filter((c) => !skip.has(c.deck));
  return (
    <FlashCardDeck
      anchorId="compliance-flash-cards"
      testIdPrefix="compliance-flash"
      eyebrow="Idiot's guide · Compliance workflow"
      title="Ask, cite, download, defend."
      intro="16 flash cards for the compliance surfaces — asking the AI, downloading the audit trail, producing the LIP Audit Pack, feeding the APCO Assistant, and knowing when to escalate to a real lawyer. Written for the moment a regulator emails and you have 24 hours."
      decks={filteredDecks}
      cards={filteredCards}
      footerNote={
        <>
          Deep-link:{" "}
          <code style={{ color: "var(--ow-amber)" }}>#compliance-flash-cards</code>. Compliance surface:{" "}
          <Link href="/compliance" style={{ color: "var(--ow-amber)" }}>
            /compliance
          </Link>{" "}
          · APCO wedge:{" "}
          <Link href="/apco" style={{ color: "var(--ow-amber)" }}>
            /apco
          </Link>
          .
        </>
      }
    />
  );
}
