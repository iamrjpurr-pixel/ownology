# Ownology — Sprint 9 Scope

**Version:** 1.0
**Date:** June 2026
**Status:** Active — ready to build
**Theme:** Cellar Floor Readiness
**Session budget:** 2 focused sessions, then stop building and start selling

---

## Executive Summary

Sprint 9 contains exactly two items. Nothing else.

The product is complete enough to sell. The two items in this sprint close the two most defensible objections a winemaker would raise when first using the product on a harvest day:

1. **"I can't type on my phone with gloves on."** → Quick Entry redesign as a large-target, tap-only interface.
2. **"I want to ask the AI a question hands-free."** → Voice input on Free Run and Compliance AI, scoped to the quiet moments where voice actually works.

Both items extend existing surfaces. Neither requires new database tables, new routes, or new backend procedures. Both can be built in a single session each.

---

## Human Factors Rationale

### The Cellar Floor Input Problem

A winemaker during harvest operates under five simultaneous constraints that make standard mobile UI patterns fail:

| Constraint | Effect on standard UI |
|---|---|
| **Noise** (pumps, crushers, CO₂, refrigeration) | Voice recognition accuracy drops to 60–70% in winery ambient noise |
| **Wet or gloved hands** | Fine motor control is compromised; 40px touch targets cause misfires |
| **Time pressure** (30 seconds to log before moving) | Multi-step forms with keyboard input are too slow |
| **Variable light** (bright sunlight / dim cellar) | Low-contrast UI is unreadable; small text is invisible |
| **Divided attention** (watching a tank, carrying something) | Cognitive load must be minimised — one decision per screen |

The current Quick Entry page uses a standard form with text fields and a keyboard. It fails under all five constraints. It was built for a seated user at a desk, not a winemaker on the harvest floor.

### The Voice Paradox

Voice input is desirable but context-dependent. The same winery environment that makes keyboard input difficult also makes voice input unreliable. The resolution is not to choose one over the other — it is to use each where it succeeds:

| Context | Best input method |
|---|---|
| Harvest floor, active pumping, gloves on | Large-target tap (Quick Entry redesign) |
| Walking between tanks, quiet moment | Voice (Free Run, Compliance AI) |
| End of day, seated, office | Full keyboard entry (VintageEntrySheet, unchanged) |

Voice is not removed from the product — it is scoped to the two surfaces where the user is most likely to be in a quiet, hands-free context: the AI tutor (Free Run) and the compliance assistant.

---

## Item S9-A: Quick Entry — Harvest Floor Redesign

### Problem Statement

The current Quick Entry page (`/quick-entry`) is a simplified form with six event type buttons, a tank name text field, a value field, and a note textarea. It is faster than the full VintageEntrySheet but still requires keyboard input for the tank name and value fields. On a harvest day, this is a failure point.

### Design Specification: The Blind Calculator Model

The redesign replaces all text input with tap-only interaction. The mental model is a calculator designed for low vision: every target is large enough to hit with a knuckle, every screen presents exactly one decision, and the user never needs to look at a keyboard.

**Screen 1 — Event Type (full screen)**

Six large tiles, one per row, filling the screen. Each tile is a minimum of 80px tall with a large icon and a single word label:

- ADDITION (plus icon)
- MEASUREMENT (gauge icon)
- RACKING (arrows icon)
- INOCULATION (flask icon)
- OBSERVATION (eye icon)
- OTHER (dots icon)

Amber on dark background. No other UI elements on this screen except a small "Full Entry" link in the top corner for users who want the detailed form.

**Screen 2 — Tank Selector**

Large tiles showing every registered tank name. Each tile shows the tank name, current variety (if set), and a small status indicator (active ferment / resting / empty). Tiles are large enough to tap with a thumb. If more than 6 tanks exist, the list scrolls — no dropdown, no search field. A "New Tank" tile appears at the bottom.

**Screen 3 — What / Value (context-dependent)**

This screen adapts based on the event type selected:

- **MEASUREMENT:** A large number pad (like a phone dialler) with a unit selector above it (Brix / SG / pH / TA / Free SO₂ / Temp / VA / YAN). The selected unit is shown large above the number pad. No text field.
- **ADDITION:** Large tiles for common addition types (DAP / SO₂ / Tartaric / Bentonite / Oak / Peracetic / Other). After selecting the type, a number pad appears for quantity with a unit selector (g / kg / mL / L / g/hL).
- **RACKING:** Two tank selectors — "From" and "To" — using the same large tile format as Screen 2.
- **INOCULATION:** Large tiles for inoculation type (Yeast / MLF Bacteria / Other), then a number pad for rate.
- **OBSERVATION:** A large textarea with a "Dictate" microphone button as the primary input affordance. This is the one screen where text input is appropriate — observations are free-form by nature.
- **OTHER:** A large textarea with dictate button.

**Screen 4 — Confirm**

A single full-screen summary card showing what will be logged:

```
ADDITION
Tank 7 — Shiraz 2026
DAP  2.6 kg
```

One large amber "LOG IT" button at the bottom. A small "Edit" link at the top. No other UI elements.

On success: a full-screen green confirmation for 1.5 seconds, then return to Screen 1.

### HF Constraints

- All touch targets minimum 64px height
- High contrast: amber text on near-black background throughout
- No keyboard appears on any screen except the Observation and Other note fields
- The number pad is custom-built (not the system keyboard) so it does not trigger autocorrect or autocomplete
- The "Full Entry" escape link is always present but visually de-emphasised — it is for the 10% of cases that need it, not the 90% that do not
- localStorage draft save: if the user is interrupted between screens, the partial entry is preserved for 30 minutes

### Authentication

The current Quick Entry page has an authentication bypass (`isLoggedIn = true`) that must be removed. This is a Critical finding from the HF audit. The redesign removes this bypass — Quick Entry requires authentication like every other protected surface.

---

## Item S9-B: Voice Input — Free Run and Compliance AI

### Problem Statement

Neither Free Run (`/free-run`) nor the Compliance AI (`/compliance`) has voice input. Both surfaces are used in contexts where voice is appropriate — a winemaker walking between tanks, asking a question during a quiet moment, or consulting the compliance assistant from a car. The absence of voice input is a missed opportunity on the two surfaces where it would actually work.

### Design Specification

**Implementation:** Web Speech API (`SpeechRecognition`). No server-side transcription required — the browser handles recognition locally. This is the same API already used in the VintageEntrySheet note field dictate button.

**Free Run — Voice Input**

A microphone button appears to the left of the "Ask" submit button in the question input area. The button has three states:

- **Idle:** Microphone icon, amber outline
- **Listening:** Microphone icon, solid amber, pulsing ring animation, "Listening..." label
- **Processing:** Spinner, "Got it..." label — transitions to auto-submit

On tap: the browser requests microphone permission (first use only). Recognition starts immediately. When the user stops speaking (2-second silence threshold), the transcript populates the question input field and auto-submits. The winemaker does not need to tap "Ask" — the question is asked the moment they finish speaking.

If recognition fails (noise, no microphone permission, unsupported browser): the button shows a brief error state ("Couldn't hear that — try typing") and the text input remains active. Voice failure is silent and graceful — it never blocks the text path.

**Compliance AI — Voice Input**

Identical implementation to Free Run. Same microphone button, same three states, same auto-submit on silence. The Compliance AI question input already has a similar layout to Free Run, so the visual integration is straightforward.

**Browser Support Note**

Web Speech API is supported in Chrome, Edge, and Safari (iOS 14.5+). It is not supported in Firefox. A graceful fallback (hide the microphone button, show nothing) handles unsupported browsers without error. A tooltip on the microphone button reads: "Voice input — works best in a quiet environment."

### HF Constraints

- Voice is never the only input method — the text field is always present and always primary
- The microphone button is visually secondary to the text input — it is an enhancement, not a replacement
- Auto-submit on silence (2 seconds) is the correct behaviour for a hands-free context — the user should not need to tap anything after speaking
- The "Listening..." state must be visually obvious — a winemaker who cannot hear the UI needs to see that the app is listening
- No voice input on Quick Entry harvest screens — the environment does not support it

---

## What Sprint 9 Does Not Include

The following items are explicitly deferred. They are not in scope regardless of how quickly S9-A and S9-B are completed:

- Full mobile redesign of Knowledge Platform or Compliance AI pages
- Voice-to-structured-entry parsing in VintageEntrySheet (NLP parsing of "Tank 7, Shiraz, added 2.6kg DAP" into form fields — this requires LLM integration and is a Sprint 10+ item)
- Lesson content creation for Free Run (content work, not engineering)
- Stripe subscription flow activation
- Any new database tables or backend procedures
- Any new pages or routes

---

## Value Scoring

| Item | Impact | Effort | Value Score | HF Finding Closed |
|---|---|---|---|---|
| S9-A: Quick Entry redesign | 5 | 2 | **2.50** | HF audit: Quick Entry keyboard failure, auth bypass, touch target size |
| S9-B: Voice on Free Run + Compliance | 4 | 1 | **4.00** | HF audit: Free Run accessibility, Compliance AI efficiency |

---

## After Sprint 9: Stop Building, Start Selling

The product after Sprint 9 is ready for its first paying customer. The next action is not Sprint 10 — it is putting the product in front of three winemakers and watching them use it. The findings from that observation will determine whether Sprint 10 exists, and if so, what it contains.

The pitch after Sprint 9:

> "You have a head winemaker who has been making your wine for eight years. When they leave, everything they know leaves with them. Ownology captures it while they are still there — every decision, every deviation, every question answered. After three vintages, that knowledge belongs to your winery, not to them. Log a measurement in ten seconds on a harvest floor. Ask the AI a question hands-free between tanks. Know your compliance obligations without calling a consultant. $99/month."

---

*Sprint 9 scope maintained in `references/sprint-9-scope.md`*
