# Agent Operating Rules — Ownology

These are PERMANENT rules for any AI agent working on this codebase. Future
forks must read this first.

## Rule 1 — Repair by exception, don't ask permission

- Pick reasonable defaults and ship. Do NOT ask the user multiple questions
  before starting.
- The user's time and credit budget matter more than perfect upfront
  scoping. A small wrong default is cheaper than 5 questions.
- Only ask the user when:
  1. You need a secret/API key only they can give you (Stripe live key,
     Resend API key, custom domain).
  2. The decision is irreversible (deploying to prod, deleting data,
     publishing).
  3. Two paths have meaningfully different business outcomes and the
     codebase/conversation does not signal a preferred direction.
- Never ask "yes/no, want me to do this?" if the answer is obviously yes
  given the conversation so far. Just do it and report.

## Rule 2 — Default tech choices (no asking)

- **Auth flavour**: Emergent-managed Google login. Already implemented.
- **Themes**: keep brand amber primary, Fraunces + Lato typography.
- **DB**: MySQL on Railway. Drizzle ORM. NEVER suggest Mongo.
- **Frontend**: React 19 + Vite + tRPC + wouter (NOT Next.js, NOT React
  Router).
- **Backend**: Express + tRPC (NOT FastAPI).
- **Deployment**: Railway primary, GitHub auto-deploy. Emergent deploy
  doesn't work cleanly with this stack — don't propose it.
- **LLM**: Emergent LLM Key (gpt-5.4-mini default, Claude Sonnet 4.6 for
  complex SOP reasoning).
- **Emails**: Resend.
- **Payments**: Stripe.

## Rule 3 — Testing protocol

- Self-test minor changes with `mcp_screenshot_tool` or `curl`. Don't call
  `testing_agent_v3_fork` for single-feature work.
- Call `testing_agent_v3_fork` ONLY when shipping ≥3 related endpoints or
  a full CRUD surface in one push.
- Don't take more than ONE smoke-test screenshot per phase. Trust the code.

## Rule 4 — Communication style

- Concise. 1-3 sentences when possible.
- When something fails, propose the fix in the SAME message you report the
  failure — don't ping-pong.
- Show options as `a / b / c` lettered only when an irreversible decision
  is needed (see Rule 1).
- Always state defaults you're using so the user can correct course if
  needed: "Going with X — say switch if you want Y."

## Rule 5 — Things to NEVER ask about

- Whether to add data-testid attributes (always yes).
- Whether to add unit_system handling, JWT, env vars (just do it).
- Whether to push to GitHub (the user does that).
- Whether to use parallel tool calls (always when possible).
- Whether to write a PRD update on finish (always yes).

## Rule 6 — Things to ALWAYS do without asking

- Read /app/memory/PRD.md and /app/memory/test_credentials.md at session
  start.
- Run lint after touching code.
- Update /app/memory/PRD.md on finish.
- Update /app/memory/test_credentials.md if creds change.

---
Established: Feb 2026. By user request, in writing, to lock in the
"stop asking" mode.
