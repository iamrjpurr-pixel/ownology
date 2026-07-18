#!/usr/bin/env node
/**
 * Path B pilot — WSET-equivalent depth for L2.7 (Fermentation Management).
 *
 * Same lesson, ~2-hour experience: expanded body + worked cellar example +
 * decision tree + 10 assessment MCQs. Everything else (aim, application,
 * citations) unchanged.
 *
 * Output: overwrites /app/references/education/synthesis-pilot/L2.7.json with
 * the deeper version, preserving the source and copyright audit shape.
 */

import fs from "node:fs";

const CHAT_URL = "https://integrations.emergentagent.com/llm/chat/completions";
const MODEL = "claude-sonnet-4-6";
const OUT_FILE = "/app/references/education/synthesis-pilot/L2.7.json";

const existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
const spineSource = existing.source;
const currentBody = existing.generated?.body_md ?? "";

const SYSTEM_PROMPT = `You are the voice of Ownology, expanding an existing Lesson Card to WSET-Level-3-equivalent depth. The lesson is already synthesised at exec-summary depth. Your job is to preserve everything that works and add three new sections that turn a 6-minute read into a ~2-hour experience.

VOICE — same Ownology voice: direct, tight, no filler. Baumé for sugar, mg/L for SO₂. Australian/NZ English. Practical over theoretical.

COPYRIGHT — non-negotiable:
- The existing body is Ownology-original. Preserve it verbatim.
- The three new sections (worked example, decision tree, MCQs) must also be Ownology-original.
- Never reproduce textbook or AOC text verbatim. Never quote AWRI text. Cite by title/chapter/URL only.

STRUCTURE — return STRICT JSON with these fields:
{
  "body_md_extended": "The existing body preserved verbatim, then three new markdown sections in this exact order:\\n\\n### Worked example — a real vintage decision\\n[A ~350-word case study: a specific boutique-scale ferment scenario. Give it a name (e.g. 'Tank 4, Merlot 2026, Day 3'). Present starting conditions (Baumé, temp, N status, chapter fresh crush weight). Walk through 3-4 decision points chronologically. At each point: state the observation, the choice on the table, the reasoning, the action taken, the outcome. End with what a different choice would have cost. Make it concrete and specific — real numbers, real timing.]\\n\\n### Decision tree — when a ferment misbehaves\\n[A markdown table or nested bullet list, ~200-300 words. Present the diagnostic tree for a slowing or stalled ferment. Branch by symptom (slow but not stopped / stopped / off aromas / temperature swing). At each branch, give: primary check, secondary check, first intervention. Concrete thresholds (Baumé drops <1/day, VA >0.8 g/L, temp variance >4°C over 12h). Not exhaustive — the 6 most common branches.]\\n\\n### Check your understanding\\n[10 MCQs. Each formatted as:\\n\\n**Q1.** [Question text — 1-2 sentences, scenario-based where possible, not just recall.]\\n- A) [option A]\\n- B) [option B]\\n- C) [option C]\\n- D) [option D]\\n\\n_Answer: [letter] — [1-sentence explanation of why the right answer is right and what the wrong ones miss.]_\\n\\nAim distribution: 3 recall (definitions/thresholds), 4 application (scenario-based), 3 diagnostic (what would you do). Make wrong answers plausible — not silly.]",
  "reading_min_extended": [number — realistic minutes for the full experience, including MCQs. Should be 90-120],
  "assessment_count": 10
}

Return ONLY the JSON. No prose. No fences.`;

const userMsg = `Lesson: ${spineSource.id} · ${spineSource.title}
Level: ${spineSource.level}
Aim: ${spineSource.aim}
Application: ${spineSource.application}

The existing exec-summary body (preserve verbatim as the opening of body_md_extended):

---
${currentBody}
---

Now extend to Path B (WSET-equivalent depth) per the schema. The worked example should be boutique-scale (500-5000 L tank), Australian/NZ context, believable but not real.`;

(async () => {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error("EMERGENT_LLM_KEY missing");

  console.log("▶ Expanding L2.7 to Path B (WSET-equivalent depth)…");
  const t0 = Date.now();

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-ow-source": "curriculum.pathB" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      max_tokens: 5000,
      temperature: 0.4,
      stream: false,
    }),
  });

  if (!resp.ok) throw new Error(`Claude ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  // Merge back into the existing lesson
  existing.generated.body_md = parsed.body_md_extended;
  existing.generated.body_md_original = currentBody;
  existing.generated.reading_min_extended = parsed.reading_min_extended ?? 90;
  existing.generated.assessment_count = parsed.assessment_count ?? 10;
  existing.pathB_generated_at = new Date().toISOString();
  existing.pathB_usage = data?.usage ?? {};

  fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2));
  const dt = Date.now() - t0;
  console.log(`✔ ${dt}ms · body ${currentBody.split(/\s+/).length}w → ${parsed.body_md_extended.split(/\s+/).length}w`);
  console.log(`  Reading time: ${parsed.reading_min_extended} min`);
  console.log(`  Tokens · in=${data.usage.prompt_tokens} out=${data.usage.completion_tokens}`);
  const cost = (data.usage.prompt_tokens * 3 + data.usage.completion_tokens * 15) / 1_000_000;
  console.log(`  Cost: $${cost.toFixed(4)}`);
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
