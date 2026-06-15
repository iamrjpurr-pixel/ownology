# Ownology Onboarding Flow — Stakeholder Presentation Script

**Audience:** Investors, advisors, potential partners, or team members being briefed on the product direction  
**Duration:** 8–12 minutes  
**Format:** Walk through the wireframe screen by screen, or present as a standalone narrative  
**Tone:** Confident, honest about the problem, specific about the solution

---

## Opening — The Problem We're Solving (2 minutes)

*Start here before showing any screens.*

---

"Before I show you the onboarding flow, I want to be honest about the problem we're solving — because it's a problem we created ourselves.

Ownology has grown into a platform with four distinct pillars: a vintage log, a knowledge platform, an AI tutor, and a compliance tool. Across those four pillars, there are more than thirty features. That's a lot of capability. But capability without clarity is just complexity.

We discovered — through our own product review — that a new user landing on Ownology cold has no idea where to start. The vintage log alone has twelve event types, five tabs, a barrel sub-module, a packaging tracker, and a milestone calendar. A winemaker who signs up during harvest, with fruit in the press and juice in the tank, does not have time to explore a thirty-feature platform. They need to log a reading in thirty seconds and get back to work.

The frustration pattern is predictable: user signs up, lands on an empty screen, doesn't know what a 'batch' is or why they need to create one before they can log anything, tries to add an entry, gets confused, closes the app, never comes back.

The onboarding flow we're about to walk through solves this. It doesn't add a tutorial. It doesn't build a wall. It asks four questions in sixty seconds and uses the answers to show each user exactly the three things they need right now — and nothing else."

---

## The Design Principle — Configuration, Not Instruction (1 minute)

---

"The key design principle here is that these four questions are not a quiz. They're not testing whether the user has read the manual. They're collecting configuration data that makes Ownology more useful immediately.

The difference matters. A question like 'what does YAN stand for?' is a barrier. A question like 'what varieties are you working with this vintage?' is a service. It unlocks personalised SOP recommendations, pre-populates the variety dropdown in the log, and sets the Milestone Calendar timeline to the right defaults for red versus white fermentation.

Every question earns its place by doing something useful with the answer. If we can't articulate what changes in the platform based on a given answer, the question doesn't belong in the flow."

---

## Screen 1 — Role (2 minutes)

*Show Screen 1 of the wireframe.*

---

"The first question is the most important: what type of winemaker are you?

Four options: Home Winemaker, Boutique Winery, Commercial Winery, Student or Learner.

This single answer sets the complexity level of the entire platform. A home winemaker making one carboy of Shiraz in their garage does not need the AWBC movement advice generator, the export documentation tool, or the state-by-state liquor licensing compliance module. Showing them those features isn't helpful — it's noise. So we hide them. The home winemaker sees the Kit Tracker, the simplified event types, and the home winemaker SOPs. Everything else is accessible but not foregrounded.

A commercial winery operator, on the other hand, needs the full feature set — compliance tools, export docs, the complete event type library, the packaging inventory tracker. They get it.

The student path is different again — it routes to Free Run first, surfaces the AWRI resource links, and treats the platform as a learning environment rather than an operational tool.

One question. Three completely different platform experiences. No feature gating — everything is still accessible — but the default view is personalised to the person in front of it."

---

## Screen 2 — Season Timing (1.5 minutes)

*Show Screen 2 of the wireframe.*

---

"The second question is about timing: where are you in the vintage right now?

Mid-fermentation. Harvest and just pressed. Post-fermentation and racking. Planning ahead.

This routes the user to the most immediately useful tool. A winemaker who answers 'mid-fermentation' needs Quick Entry — the rapid log entry screen — open and ready the moment onboarding completes. They don't need the Milestone Calendar or the Vineyard block register. Those are planning tools. Right now, they need to log a Brix reading.

A winemaker who answers 'planning ahead' is in a completely different headspace. They need the Milestone Calendar to project their timeline, the Vineyard block register to set up their blocks, and the Season Planner to map the vintage ahead. We open those tools first.

The point is that the platform knows when you are in the season, and it adjusts accordingly. That's not something any other winemaking tool does."

---

## Screen 3 — Varieties (1.5 minutes)

*Show Screen 3 of the wireframe.*

---

"The third question is about varieties: what are you making?

Multi-select, with the most common varieties pre-listed and a free-text field for anything not on the list.

This does three things. First, it pre-populates the variety dropdown in every log entry form — the winemaker never has to type 'Shiraz' again. Second, it personalises the SOP recommendations. Red and white fermentation protocols differ significantly — pump-over frequency, temperature targets, MLF timing, fining agent selection. When a winemaker asks the AI tutor a fermentation question, the system already knows they're making red wine and can answer accordingly. Third, it sets the Milestone Calendar timeline defaults — red wine has a longer fermentation window and a different racking schedule than white.

The Kit Wine option is worth noting specifically. Home winemakers using commercial wine kits have a completely different production timeline — four to six weeks for primary fermentation, six to eight weeks for secondary, a simplified additions schedule. Selecting Kit Wine unlocks the Kit Tracker tab and the kit-specific SOPs. It's a meaningfully different product experience for a meaningfully different user."

---

## Screen 4 — Priority Challenge (1.5 minutes)

*Show Screen 4 of the wireframe.*

---

"The fourth and final question is about priority: what's your biggest challenge right now?

Four options: keeping records organised, making better winemaking decisions, staying compliant, and learning more about winemaking.

This is the final routing signal. It determines which of the four pillars is shown prominently on the user's first landing view.

Records maps to The Press — the vintage log, Quick Entry, the Batch Book.

Decisions maps to the Knowledge Platform — the SOP library, the AI tutor, the decision logic layers.

Compliance maps to the Compliance AI — the regulatory Q&A tool, scoped to the user's state.

Learning maps to Free Run — the AI tutor with example prompts and AWRI resource links.

The user taps 'Take me to Ownology' and lands on a view that shows them three tiles: the tool that solves their stated challenge, the most relevant SOP for their current stage, and a prompt to ask the AI tutor a question. Three things. Not thirty."

---

## Post-Onboarding — The Progress Indicator (1 minute)

*Show the progress bar section of the wireframe.*

---

"After onboarding completes, a four-item progress bar appears at the top of The Press and Dashboard. It tracks four milestones: profile set up, first tank or batch registered, first vintage entry logged, first Free Run question asked.

This is not a gate. Every feature on the platform is fully accessible from the moment onboarding completes. The progress bar is a gentle prompt — it acknowledges that the user hasn't done these things yet and makes it easy to do them. It disappears when all four are complete and never comes back.

The distinction between a progress indicator and a gate is important. A gate says 'you can't proceed until you do this.' A progress indicator says 'here's what you haven't done yet — it'll take thirty seconds.' One creates friction. The other creates momentum."

---

## The Personalised Landing — Putting It Together (1 minute)

*Show the example personalised landing at the bottom of the wireframe.*

---

"Let me show you what this looks like in practice.

A home winemaker. Mid-fermentation. Making Shiraz. Biggest challenge: keeping records organised.

Their first view of Ownology shows three tiles. Quick Entry — log your Shiraz fermentation reading now. Free Run — ask about your fermentation, YAN, stuck ferment, temperature. Red Wine Fermentation SOP — your complete fermentation protocol.

That's it. Everything else is accessible in the nav, but it's not in their face. The platform has made a judgment about what this specific person needs right now, and it's shown them exactly that.

Compare that to landing on a blank screen with a sidebar full of thirty features and no idea where to start. The difference in first-session experience is significant — and first-session experience is the single biggest predictor of whether a user comes back."

---

## Closing — What This Unlocks (1 minute)

---

"The onboarding flow is not a feature. It's the foundation that makes every other feature accessible.

Without it, Ownology is a powerful but overwhelming platform that requires a significant time investment to understand. With it, Ownology is a platform that meets each user exactly where they are and shows them the one thing they need right now.

The build is straightforward — four screens, a configuration object stored in the user's profile, and routing logic that reads that configuration on every page load. The answers persist, so the personalisation is permanent. And because we're collecting this data at onboarding, we also have it for product analytics — we'll know exactly what proportion of our users are home winemakers versus boutique versus commercial, what stage of the vintage they're in when they sign up, and what their primary challenge is. That data shapes every product decision we make from here.

The wireframe is ready. The build is scoped. The question is whether this is the right design before we start writing code."

---

## Anticipated Questions

**"Why not just let users explore on their own?"**  
Because the data is clear that users who don't complete a meaningful first session don't come back. 'Explore on your own' works for simple tools. Ownology has thirty features across four pillars. The cognitive load of self-directed exploration is too high for a user who is also managing a harvest.

**"What if users answer the questions wrong?"**  
Every answer is changeable in Settings. The onboarding configuration is not permanent — it's a starting point. We surface a 'Update your profile' prompt after the first session so users can adjust if the personalisation doesn't feel right.

**"What about returning users?"**  
Onboarding runs once, on first login. Returning users land directly on their personalised view. The progress bar disappears after the four milestones are complete.

**"Is this tested?"**  
The wireframe is complete. The build has not started. We are presenting this for stakeholder input before committing to the build.

---

*Document saved: references/onboarding-presentation-script.md*  
*Last updated: June 2026*
