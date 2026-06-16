/**
 * FAQ — Objection-handling accordion section for Ownology landing page
 * Design: Dark artisan — warm black bg, amber gold accents, Fraunces serif headings.
 * Placed just above the footer to catch final objections before a winemaker bounces.
 * Uses Radix Accordion via shadcn/ui.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const FAQS = [
  {
    q: "Is Ownology like WineryCopilot or other AI wine tools I've seen?",
    a: "Those tools are built for marketing teams, not winemakers. WineryCopilot and similar platforms generate tasting room copy, social media posts, and event flyers — they are content generators powered by general-purpose AI with wine-flavoured prompts. Ownology is a cellar intelligence tool. It answers technical production questions (SO₂ additions, YAN targets, fermentation anomalies, protocol lookups) grounded in your own documents and verified wine science. If you are asking \"what DAP addition does Tank 7 need right now?\", Ownology answers it. A marketing AI cannot.",
  },
  {
    q: "How is Ownology different from just using ChatGPT?",
    a: "ChatGPT gives you generic wine knowledge — the same answer it would give anyone. Ownology gives you answers grounded in your specific documents: your SOPs, your vintage reports, your protocols, your house style notes. When Ownology answers a question, it cites the exact document and passage it drew from. It also understands the context of your winery — your varieties, your tank names, your team's workflow. ChatGPT has none of that. It is the difference between asking a stranger and asking someone who has read every document in your cellar office.",
  },
  {
    q: "We already use InnoVint (or Vintrace / WineDirect). Do we need Ownology as well?",
    a: "Yes — and they work together, not against each other. Your production management system is your record-keeper: it logs what happened, tracks compliance, and manages inventory. Ownology is your knowledge layer: it answers questions, surfaces protocols, and helps your team make better decisions in the moment. InnoVint tells you what Brix Tank 7 was at 6am. Ownology tells you what to do about it, based on your own Shiraz protocol and the latest fermentation science. Most of our customers use both.",
  },
  {
    q: "Does Ownology replace my ERP or winery management system?",
    a: "No — and it is not trying to. Systems like InnoVint, Vintrace, or WineDirect handle compliance records, inventory, and accounting. Ownology handles knowledge and intelligence. Think of it as the layer that sits on top of your existing tools: it answers questions, surfaces insights, and helps your team make better decisions — it does not replace the systems that track what happened.",
  },
  {
    q: "Is my winery's data private and secure?",
    a: "Completely. Every winery on Ownology operates in a fully isolated data environment — your SOPs, vintage reports, and cellar notes are never shared with or visible to any other winery. Your data is encrypted at rest and in transit, and you retain full ownership at all times. You can export or delete your data at any point.",
  },
  {
    q: "How long does setup take? We are flat out during vintage.",
    a: "Most wineries are up and running in under two hours. Ownology ships with 45 industry-standard SOPs already loaded — so the Knowledge Platform is useful from the moment you log in, before you've added a single document of your own. Add your own protocols and vintage records at any pace. There is no lengthy onboarding, no IT project, and no hardware to install.",
  },
  {
    q: "Do I need to be tech-savvy to use this?",
    a: "Not at all. Ownology is designed to be used on a phone, in a cellar, with wet hands. If you can send a text message, you can use Ownology. The interface is a simple conversation — you ask a question in plain language, you get a precise answer back. There is no dashboard to learn, no complex setup, and no training required for your team.",
  },
  {
    q: "What happens if the AI gives a wrong answer?",
    a: "Every answer Free Run provides is grounded in your winery's own SOPs and verified wine science literature — it cannot invent a protocol that does not exist in your Knowledge Platform. Every response includes a source citation so you can verify it instantly. The system is also designed to say 'I don't know' rather than guess. And critically, Ownology never makes a decision — it informs yours. The winemaker always has the final call.",
  },
  {
    q: "Will Ownology replace me as the winemaker?",
    a: "No — and this is worth being direct about. The creative judgment, the sensory evaluation, the stylistic vision that defines your wine: none of that is what Ownology does. What it does is reduce the cognitive load of harvest — the pressure of retrieving procedural knowledge at 2am when you are already managing three other problems. The question 'what is the correct DAP addition for this tank right now?' is a lookup problem. Ownology solves lookup problems so that your working memory is free for the decisions that genuinely require a winemaker. You remain the winemaker. Ownology is the knowledgeable apprentice who can find the answer in the binder while you are already moving to the next problem.",
  },
  {
    q: "Will AI make all wines taste the same?",
    a: "This is a legitimate concern — and it is the right question to ask. The homogenisation risk is real for AI systems that draw on shared, generic knowledge bases. It is not a risk for Ownology, because Ownology is grounded in your documents, not a shared corpus. When it answers a question, it draws on your SOPs, your vintage records, your house style protocols — not a generic winemaking database. In fact, the opposite of homogenisation is more likely: by preserving and making accessible the accumulated decisions of your winery's history, Ownology actively protects your stylistic identity against the most common cause of homogenisation, which is staff turnover and knowledge loss. Your terroir stays yours.",
  },
  {
    q: "What does it cost, and is there a free trial?",
    a: "Ownology starts at $99/month for the Harvest tier — full access to The Press, the Knowledge Platform (45 SOPs), Free Run AI assistant, and Compliance AI, for up to 2 users. The Cellar tier ($249/month) adds Vineyard, Cellar Tasks, and Decision Logic capture for up to 5 users. All plans include a 14-day free trial — no credit card required. Consulting winemakers managing multiple clients should contact us about the Consultant tier.",
  },
];

export default function FAQ() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="faq"
      className="relative py-24 overflow-hidden"
      style={{ background: "var(--ow-bg-base)" }}
    >
      {/* Top border rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, color-mix(in oklch, var(--ow-amber) 30%, transparent), transparent)" }}
      />

      <div className="container relative z-10" ref={ref}>
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">

          {/* Left — section heading (4 cols) */}
          <div className={`lg:col-span-4 ${inView ? "fade-up" : "opacity-0"}`}>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ow-amber)",
                marginBottom: "1.25rem",
              }}
            >
              Common Questions
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                lineHeight: 1.15,
                color: "var(--ow-text-hi)",
                letterSpacing: "-0.02em",
                marginBottom: "1.5rem",
              }}
            >
              Everything you need to know
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                lineHeight: 1.75,
                color: "var(--ow-text-mid)",
              }}
            >
              Still have questions? Email us at{" "}
              <a
                href="mailto:support@ownology.ai"
                style={{ color: "var(--ow-amber)", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                support@ownology.ai
              </a>{" "}
              — we respond within one business day.
            </p>
          </div>

          {/* Right — accordion (8 cols) */}
          <div className={`lg:col-span-8 ${inView ? "fade-up fade-up-delay-2" : "opacity-0"}`}>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  style={{
                    borderBottom: "1px solid var(--ow-border)",
                  }}
                >
                  <AccordionTrigger
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 500,
                      fontSize: "1.0625rem",
                      lineHeight: 1.4,
                      color: "var(--ow-text-hi)",
                      textAlign: "left",
                      paddingTop: "1.5rem",
                      paddingBottom: "1.5rem",
                      textDecoration: "none",
                    }}
                    className="hover:no-underline [&[data-state=open]]:text-amber-400 transition-colors duration-200"
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      lineHeight: 1.8,
                      color: "var(--ow-text-mid)",
                      paddingBottom: "1.5rem",
                    }}
                  >
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

        </div>
      </div>
    </section>
  );
}
