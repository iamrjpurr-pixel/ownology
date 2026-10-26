export type SurveyAnswer = "yes" | "unsure" | "no";
export type SurveyQuestion = {
  id: string;
  q: string;
  yes: string;
  notYet: string;
  help: string;
  cta: { label: string; href: string };
};

export const SURVEY: SurveyQuestion[] = [
  {
    id: "recipe", q: "Do you know exactly what went into your best vintage, and could you make it again?",
    yes: "Great. Now make sure it never depends on memory.", notYet: "You're not alone. Most of it lives in people's heads.",
    help: "Your Brand Vault keeps every spec, blend percentage, target and protocol, vintage after vintage, so it's always there to repeat or refine.",
    cta: { label: "See a wine spec in the demo", href: "/demo/tour#demo-vault" },
  },
  {
    id: "tanks", q: "Do you know what's happening in your tanks today, without picking up the phone?",
    yes: "Nice. Imagine it with no calls at all.", notYet: "That's the most common gap we hear about.",
    help: "Your winemaker logs readings and cellar work against each wine, and you both see the same record, from anywhere.",
    cta: { label: "See the cellar record", href: "/demo/tour#demo-vault" },
  },
  {
    id: "history", q: "Do you know your wine's history stays with your brand, whatever happens?",
    yes: "Good. Ownology keeps it that way, automatically.", notYet: "Worth fixing while everything's going well.",
    help: "Your specs and records sit under your winery's name. People retire, move or get busy, and your wine's story stays with you.",
    cta: { label: "Open your Brand Vault", href: "/login?next=/brand" },
  },
  {
    id: "access", q: "Do you know who has seen or changed your specs?",
    yes: "Perfect. Here's how to keep that effortless.", notYet: "Most teams don't, and most never need to, until they do.",
    help: "A simple shared history shows what was viewed, logged and changed. It's there in the background, with access settings if you ever want them.",
    cta: { label: "See the owner's controls", href: "/demo/tour#demo-owner-section" },
  },
  {
    id: "labels", q: "Do you know your label records would stand up if Wine Australia asked tomorrow?",
    yes: "Excellent. Let's make them build themselves.", notYet: "It's the paperwork nobody enjoys.",
    help: "The blend percentages and vineyard sources in your vault are most of what label records need. We're connecting them into ready-made records now.",
    cta: { label: "Add your first wine", href: "/login?next=/brand" },
  },
  {
    id: "sos", q: "Do you know what you'd do at 6am if free SO₂ dropped or a ferment stuck?",
    yes: "Of course. Owen's a handy second opinion anyway.", notYet: "That's what Owen is for.",
    help: "Ask Owen, our AI cellar-hand, gives a quick second opinion based on commercial winemaking procedures, at any hour.",
    cta: { label: "Ask Owen a real question", href: "/ask" },
  },
  {
    id: "team", q: "Do you know everyone on your team is working from the same playbook?",
    yes: "Great. The Curriculum helps keep it that way as people join.", notYet: "Shared language saves a lot of mistakes.",
    help: "The Curriculum gives cellar hands and staff a structured course, so everyone works the same way.",
    cta: { label: "Look at the Curriculum", href: "/curriculum/about" },
  },
  {
    id: "next", q: "Do you know what you'd change next vintage, and why?",
    yes: "Love it. Write it down where it can't get lost.", notYet: "That's where a living record really pays off.",
    help: "Each year's spec and cellar record builds your own library, so next vintage starts from what you learned in this one.",
    cta: { label: "Start your library", href: "/login?next=/brand" },
  },
];

export const ANSWER_LABEL: Record<SurveyAnswer, string> = { yes: "Yes", unsure: "Not sure", no: "No" };
