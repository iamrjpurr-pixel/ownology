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
    q: "Does Ownology replace my ERP or winery management system?",
    a: "No — and it is not trying to. Systems like InnoVint, vintrace, or WineDirect handle compliance records, inventory, and accounting. Ownology handles knowledge and intelligence. Think of it as the layer that sits on top of your existing tools: it answers questions, surfaces insights, and helps your team make better decisions — it does not replace the systems that track what happened.",
  },
  {
    q: "Is my winery's data private and secure?",
    a: "Completely. Every winery on Ownology operates in a fully isolated data environment — your SOPs, vintage reports, and cellar notes are never shared with or visible to any other winery. Your data is encrypted at rest and in transit, and you retain full ownership at all times. You can export or delete your data at any point.",
  },
  {
    q: "How long does setup take? We are flat out during vintage.",
    a: "Most wineries are up and running in under two hours. You upload your existing SOPs and protocols (even rough Word documents or PDFs work), and Ownology indexes them immediately. There is no lengthy onboarding, no IT project, and no hardware to install. The system is designed to be useful from day one — and to get smarter the more you use it.",
  },
  {
    q: "Do I need to be tech-savvy to use this?",
    a: "Not at all. Ownology is designed to be used on a phone, in a cellar, with wet hands. If you can send a text message, you can use Ownology. The interface is a simple conversation — you ask a question in plain language, you get a precise answer back. There is no dashboard to learn, no complex setup, and no training required for your team.",
  },
  {
    q: "What happens if the AI gives a wrong answer?",
    a: "Every answer Ownology provides is grounded in your documents and verified wine science literature — it cannot invent a protocol that does not exist in your vault. Every response includes a source citation so you can verify it instantly. The system is also designed to say 'I don't know' rather than guess. And critically, Ownology never makes a decision — it informs yours. The winemaker always has the final call.",
  },
  {
    q: "What does it cost, and is there a free trial?",
    a: "Ownology starts at $99/month for the Cellar tier (up to 3 users, full Knowledge Assistant and Smart Logbook). All plans include a 14-day free trial — no credit card required. If you are a consulting winemaker managing multiple clients, contact us about the Consultant tier, which is purpose-built for your workflow.",
  },
];

export default function FAQ() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="faq"
      className="relative py-24 overflow-hidden"
      style={{ background: "oklch(0.11 0.009 60)" }}
    >
      {/* Top border rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, oklch(0.72 0.12 75 / 0.3), transparent)" }}
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
                color: "oklch(0.72 0.12 75)",
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
                color: "oklch(0.92 0.012 75)",
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
                color: "oklch(0.58 0.012 75)",
              }}
            >
              Still have questions? Email us at{" "}
              <a
                href="mailto:hello@ownology.ai"
                style={{ color: "oklch(0.72 0.12 75)", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                hello@ownology.ai
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
                    borderBottom: "1px solid oklch(1 0 0 / 0.08)",
                  }}
                >
                  <AccordionTrigger
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 500,
                      fontSize: "1.0625rem",
                      lineHeight: 1.4,
                      color: "oklch(0.88 0.014 75)",
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
                      color: "oklch(0.62 0.012 75)",
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
