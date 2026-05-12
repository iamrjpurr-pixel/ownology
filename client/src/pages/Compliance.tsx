/**
 * OWNOLOGY — Compliance AI Search Agent
 * Local knowledge base: Australian federal + SA winery regulations
 * LLM: Manus Forge frontend API (VITE_FRONTEND_FORGE_API_KEY)
 */

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Knowledge base (embedded) ────────────────────────────────────────────────
const KNOWLEDGE_BASE = `
# Australian Winery Regulatory Knowledge Base

## FEDERAL REGULATIONS

### Wine Australia Registration (Wine Australia Act 2013)
- Any person producing, exporting, or making wholesale sales of grape wine must register with Wine Australia before commencing commercial activity.
- No minimum production volume — even single-case boutique producers selling wholesale must register.
- Annual grape grower and winemaker levy applies, calculated on volume of grapes crushed or purchased.

### Label Integrity Program (LIP)
- Mandatory record-keeping and audit system for all label claims.
- Vintage year: ≥85% of wine must be from that vintage.
- Single variety: ≥85% must be from that variety.
- Blend varieties: listed in descending order; each ≥5%.
- Geographical Indication (GI): ≥85% must be sourced from that GI.
- LIP records must be retained for 5 years and include: grape receival records (variety, GI, vintage, weight), tank/barrel movement records, blending records, bottling records.
- Failure to maintain LIP records can result in deregistration and prosecution.

### Export Licensing
- Separate Wine Australia export licence required for any winery exporting wine.
- Each export shipment requires a Wine Australia export permit and Certificate of Origin or Health Certificate.
- Labels for export must be pre-registered in the Wine Australia Label Directory before shipment.
- EU, UK, USA, and China each have specific documentation and compositional rules.

### Food Standards Code — Standard 4.5.1 (Wine Production Requirements)
Administered by FSANZ. Governs composition, additives, and processing aids.

Permitted additives:
- Sulphur dioxide (wine <35 g/L sugars): maximum 250 mg/L
- Sulphur dioxide (wine >35 g/L sugars): maximum 300 mg/L
- Sorbic acid / Potassium sorbate: maximum 200 mg/L
- Potassium polyaspartate: maximum 100 mg/L
- Tartaric acid, Malic acid, Lactic acid, Citric acid, Tannins, Gum Arabic, Metatartaric acid, Yeast mannoproteins, Carbon dioxide: GMP (Good Manufacturing Practice — lowest level necessary)

Permitted processing aids: bentonite, gelatin, isinglass, egg white, casein, activated carbon, PVPP, diatomaceous earth, perlite, enzymes, oak, nitrogen, argon, oxygen, copper sulphate (GMP), dimethyl dicarbonate (max 200 mg/L), potassium ferrocyanide (GMP), yeast and bacterial cultures.

Water additions: may only be added to incorporate an additive, facilitate fermentation by diluting high-sugar must (not below 13.5° Brix), or incidentally. Total added water must not exceed 70 mL/L (7%) of final wine volume.

### Food Business Registration (Standards 3.2.2 and 3.2.3)
- Wineries are food businesses and must register with the relevant local council as a food premises.
- Must maintain food safety practices, adequate water supply, drainage, pest control, cleaning and sanitising procedures.
- Standard 3.2.2A (mandatory from December 2023) may require a food safety management system depending on winery classification.

### Wine Equalisation Tax (WET)
- WET is a 29% tax on the wholesale value of wine, applied at the last wholesale sale.
- Administered by the ATO.
- Wine producers, wholesalers, and retailers may be liable depending on their role in the supply chain.
- Wine Producer Rebate: eligible producers can claim a rebate of WET paid, up to a cap of $350,000 per financial year (rising to $400,000 from 1 July 2026).
- Eligibility: must be an Australian resident, produce wine from grapes, honey, fruit, or vegetables, and sell under their own brand or in bulk.
- Ineligible if: associated with another wine producer that has already claimed the full rebate, or if the wine is sold in bulk to another producer who will rebrand it.
- WET registration required if annual WET liability exceeds $1,000.

### Biosecurity and Imports (DAFF)
- Phylloxera: all plant material (grapevines, cuttings, rootlings) must comply with state and federal biosecurity requirements. Interstate movement of grapevine material is regulated.
- Imported winemaking inputs (oak barrels, corks, additives) must comply with Australian biosecurity import conditions.
- Winery waste (marc, lees, grape skins) must be managed to prevent pest and disease spread.

### Work Health and Safety (WHS)
- Model WHS Act and Regulations apply federally; SA has adopted these as the Work Health and Safety Act 2012 (SA).
- Key winery-specific obligations: confined space management (fermentation tanks, underground cellars), CO₂ monitoring (fermentation produces dangerous CO₂ levels), manual handling (barrels, cases), chemical handling (SO₂, cleaning chemicals), and working at heights (barrel stacks, mezzanines).
- Duty of care extends to workers, contractors, visitors, and cellar door customers.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to SafeWork SA immediately.

---

## SOUTH AUSTRALIA REGULATIONS

### Liquor Licensing (Liquor Licensing Act 1997 SA)
Administered by Consumer and Business Services (CBS).

Producer's Licence classes:
- Class 1: Production and wholesale/direct sales only; no on-site consumption.
- Class 2: Cellar door — tastings and sales; on-site consumption permitted. Most common for boutique wineries.
- Class 3: Full retail and on-site consumption including restaurant/dining.

Application requirements for Class 2:
- Completed application via Liquor and Gaming Online (LGO) portal
- Proof of production premises (lease or title)
- Floor plan of premises
- Council development consent for the use
- Evidence of production capacity and intent
- RSA certification for all staff serving alcohol
- Application fee approximately $1,000–$2,500 for Class 2

Ongoing obligations:
- Annual licence renewal with fee payment
- Compliance with trading hours (cellar doors typically 9am–5pm)
- Responsible Service of Alcohol for all staff
- Record-keeping of sales volumes
- Compliance with Liquor Licensing General Code of Practice
- Notify CBS of any change in premises, ownership, or trading conditions

### Environmental Protection (Environment Protection Act 1993 SA)
Administered by EPA SA.

Scheduled premises thresholds (require EPA licence):
- Crush capacity ≥500 tonnes per year: requires EPA licence (Scheduled Premises)
- Crush capacity <500 tonnes: not a scheduled premises; general duty of care applies
- Wastewater discharge to land: must comply with EPA Guidelines for Wineries and Distilleries regardless of size

Key environmental obligations for all wineries:
- Wastewater (winery effluent) must be managed to prevent groundwater and surface water contamination
- Bunded storage for all chemicals (SO₂, cleaning agents, acids)
- Solid waste (marc, lees, diatomaceous earth) must be disposed of appropriately — composting or licensed waste facility
- Noise from processing equipment must not cause unreasonable interference with neighbours
- Odour management during fermentation and effluent application

Wastewater management:
- Winery effluent (high BOD, low pH) must not be discharged to stormwater or watercourses
- Land application is the most common disposal method; must comply with EPA guidelines on application rates, setbacks from watercourses, and soil type
- Evaporation ponds require EPA approval in most cases
- Discharge to sewer requires trade waste agreement with SA Water

### Planning and Development (Planning, Development and Infrastructure Act 2016 SA)
- Winery buildings and cellar doors require Development Approval from the relevant council.
- Zoning: wineries are typically permitted in Primary Production zones; cellar doors may require specific consent in some zones.
- Development Approval required for: new winery buildings, extensions, cellar door additions, car parks, signage, and effluent disposal systems.
- Heritage areas: additional constraints apply in heritage zones (e.g., parts of the Barossa).

### Work Health and Safety (Work Health and Safety Act 2012 SA)
Administered by SafeWork SA.

Key obligations:
- Confined space register: all confined spaces (fermentation tanks, underground cellars, pits) must be identified, risk-assessed, and managed under a confined space procedure.
- CO₂ monitoring: mandatory during active fermentation; CO₂ can reach lethal concentrations within minutes in enclosed spaces.
- Chemical register and SDS: all hazardous chemicals must be listed in a register with current Safety Data Sheets accessible to workers.
- SO₂ handling: SO₂ is a hazardous gas; must be handled with appropriate PPE and ventilation; exposure standard is 0.5 ppm TWA.
- Manual handling: barrel handling is a significant manual handling risk; mechanical aids (barrel washers, trolleys, stackers) are recommended.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to SafeWork SA immediately.

### Water Licensing (Landscape South Australia Act 2019)
- Wineries using groundwater or surface water for production or irrigation require a water licence from the relevant Landscape Board.
- Water allocation trading is permitted in most SA water allocation plans.
- Metering and reporting of water use is required for licensed users.
- Unlicensed water use (e.g., rainwater tanks, small domestic bores) has specific exemptions and limits.

### Food Safety (Food Act 2001 SA)
- Wineries must register as food businesses with their local council.
- Inspections by council environmental health officers apply.
- Requirements align with federal Food Standards Code (Standard 3.2.2 and 3.2.3).

---

## KEY CONTACTS

| Agency | Role | Website |
|---|---|---|
| Wine Australia | Registration, LIP, export | wineaustralia.com |
| ATO | WET, WPR | ato.gov.au |
| FSANZ | Food standards | foodstandards.gov.au |
| DAFF | Biosecurity, imports | agriculture.gov.au |
| CBS SA | Liquor licensing | cbs.sa.gov.au |
| EPA SA | Environmental protection | epa.sa.gov.au |
| SafeWork SA | WHS | safework.sa.gov.au |
| Local council | Food business registration, development approval | (varies by council) |
| Landscape Boards SA | Water licensing | landscape.sa.gov.au |
`;

// ─── Sample questions ─────────────────────────────────────────────────────────
const SAMPLE_QUESTIONS = [
  "Do I need an EPA licence for my 200-tonne crush winery in SA?",
  "What are the LIP record-keeping requirements for vintage labelling?",
  "What is the maximum SO₂ level permitted in dry red wine?",
  "What licences do I need to open a cellar door in South Australia?",
  "How does the Wine Producer Rebate work and what is the cap?",
  "What are my WHS obligations for confined spaces in the winery?",
  "Can I add water to my must during fermentation?",
  "What environmental obligations apply to winery wastewater?",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string };

// ─── Main component ───────────────────────────────────────────────────────────
export default function Compliance() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const FORGE_BASE_URL =
    import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  const FORGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setError(null);

    const userMsg: Message = { role: "user", content: question.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = `You are a regulatory compliance assistant specialising in Australian winery regulations. You have access to a comprehensive knowledge base covering federal regulations (Wine Australia, FSANZ, ATO/WET, biosecurity, WHS) and South Australia state regulations (liquor licensing, EPA, planning, SafeWork SA, water licensing).

Answer questions accurately and concisely based ONLY on the knowledge base provided. If a question falls outside the knowledge base, say so clearly and suggest the relevant agency to contact. Always cite the relevant legislation or regulation name when giving an answer. End every response with a brief disclaimer that the user should verify current requirements with the relevant agency or a qualified compliance professional.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`;

      const response = await fetch(`${FORGE_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "No response received.";
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setError("Unable to get a response. Please try again.");
      console.error("Compliance agent error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-border)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <OwnologyLogo size={30} />
          </Link>
          <div className="flex items-center gap-4">
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.12em" }}
            >
              Compliance Assistant
            </span>
            <ThemeToggle compact />
          </div>
        </div>
      </nav>

      <div className="container pt-24 pb-8" style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-8">
          <p
            className="section-label mb-3"
            style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
          >
            Australian Winery Regulatory Intelligence
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem,4vw,2.75rem)",
              lineHeight: 1.1,
              color: "var(--ow-text-hi)",
            }}
          >
            Compliance <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Search</em>
          </h1>
          <p
            className="mt-3"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              lineHeight: 1.7,
              color: "var(--ow-text-lo)",
              maxWidth: "560px",
            }}
          >
            Ask any question about Australian winery regulations — federal (Wine Australia, FSANZ, WET, WHS, biosecurity) or South Australia state (liquor licensing, EPA, planning, SafeWork SA, water). Answers are grounded in our local regulatory knowledge base.
          </p>
          <div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs"
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              color: "var(--ow-text-lo)",
              fontFamily: "'Lato',sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--ow-amber)" strokeWidth="1.2" />
              <path d="M6 4v3M6 8.5v.5" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Knowledge base: Federal + South Australia | Updated May 2026
          </div>
        </div>

        {/* Sample questions */}
        {messages.length === 0 && (
          <div className="mb-8">
            <p
              className="mb-3 text-xs tracking-wider uppercase"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}
            >
              Example questions
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left px-4 py-3 rounded-sm transition-all text-sm"
                  style={{
                    background: "var(--ow-bg-card)",
                    border: "1px solid var(--ow-border)",
                    color: "var(--ow-text-mid)",
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 300,
                    lineHeight: 1.5,
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-amber)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-text-hi)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-text-mid)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="mb-6 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mr-3 mt-1"
                    style={{ background: "var(--ow-amber-dim, oklch(0.72 0.12 75 / 15%))", border: "1px solid var(--ow-amber)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="3.5" stroke="var(--ow-amber)" strokeWidth="1.2" />
                      <path d="M5 3v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div
                  className="rounded-sm px-4 py-3 text-sm"
                  style={{
                    maxWidth: "80%",
                    background: msg.role === "user" ? "var(--ow-bg-card)" : "transparent",
                    border: msg.role === "user" ? "1px solid var(--ow-border)" : "none",
                    color: "var(--ow-text-hi)",
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 300,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mr-3 mt-1"
                  style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid var(--ow-amber)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="var(--ow-amber)" strokeWidth="1.2" />
                    <path d="M5 3v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div
                  className="px-4 py-3 text-sm rounded-sm"
                  style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}
                >
                  Searching regulatory knowledge base…
                </div>
              </div>
            )}

            {error && (
              <div
                className="px-4 py-3 rounded-sm text-sm"
                style={{
                  background: "oklch(0.3 0.08 25 / 20%)",
                  border: "1px solid oklch(0.5 0.12 25 / 40%)",
                  color: "oklch(0.75 0.08 25)",
                  fontFamily: "'Lato',sans-serif",
                }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-4"
        >
          <div
            className="flex gap-3 items-end rounded-sm p-3"
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              boxShadow: "0 8px 32px var(--ow-shadow)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a compliance question… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 resize-none bg-transparent outline-none text-sm"
              style={{
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontWeight: 300,
                lineHeight: 1.6,
                border: "none",
                padding: "4px 0",
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-shrink-0 px-4 py-2 rounded-sm text-xs font-medium transition-all"
              style={{
                background: loading || !input.trim() ? "var(--ow-border)" : "var(--ow-amber)",
                color: loading || !input.trim() ? "var(--ow-text-lo)" : "oklch(0.12 0.01 60)",
                fontFamily: "'Lato',sans-serif",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {loading ? "…" : "Ask"}
            </button>
          </div>
          <p
            className="mt-2 text-center text-xs"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
          >
            Answers are based on our local regulatory knowledge base. Always verify with the relevant agency or a qualified compliance professional.
          </p>
        </form>

        {/* Clear conversation */}
        {messages.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMessages([]); setError(null); }}
              className="text-xs transition-colors"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-lo)")}
            >
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
