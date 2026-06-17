# Ownology Work Mode — Workflow Diagram
## Inputs, Outputs, and Data Flow Architecture

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OWNOLOGY WORK MODE SYSTEM                          │
│                                                                             │
│  INPUT LAYER          PROCESSING LAYER         OUTPUT LAYER                │
│  ─────────────        ──────────────────       ────────────                │
│                                                                             │
│  Winemaker            AI Context Engine        Guidance + Logging UI       │
│  Questions     ──→    + SOP Library      ──→   + Cross-Pillar Bridges     │
│                       + Batch History                                       │
│                       + Vintage History                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Workflow: "What Do I Do Now?"

### Phase 1: ENTRY POINT

**User Action:** Winemaker opens app, clicks Tank 1 (or selects from dashboard)

**Inputs:**
- Tank ID (e.g., "Tank 1")
- Current batch metadata (Variety: Shiraz, Vintage: 2026, Current SOP: Red Wine Fermentation)
- Current batch state (Day 5, Brix: 18.4, pH: 3.2, Temp: 26°C)

**Data Retrieved:**
```
FROM database:
  - batch_id, tank_id, variety, vintage_year, crush_date
  - current_sop_step (e.g., "Red Wine Fermentation — Day 5")
  - latest_measurements (Brix, pH, TA, Temp, timestamp)
  - all_log_entries (chronological history)

FROM vintage_history:
  - Previous year's same batch (e.g., 2025 Shiraz Tank 1)
  - Key milestones on Day 5 (what was done, measurements, observations)
  - Timeline: when inoculation happened, when peak fermentation occurred, etc.

FROM sop_library:
  - Red Wine Fermentation SOP (full text + quick_steps)
  - Yeast Rehydration & Inoculation SOP
  - Pump-Over Protocol SOP
  - All other SOPs relevant to current stage
```

**Output to UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  TANK 1 — 2026 Shiraz                                       │
│  Status: RED WINE FERMENTATION — Day 5                      │
│                                                             │
│  Current Measurements (Today):                              │
│  • Brix: 18.4°B (started at 24.3°B)                        │
│  • pH: 3.2                                                  │
│  • Temp: 26°C                                               │
│  • Last measured: 2 hours ago                               │
│                                                             │
│  Historical Context (2025 Shiraz — Day 5):                 │
│  • Brix was 19.2°B (yours is 18.4°B — ahead of schedule)   │
│  • Action taken: Pump-over 2x, no nutrient addition        │
│  • Temperature peaked at 27°C                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ What do you want to do now?                         │   │
│  │ [Text input: "measure", "pump-over", "inoculate"]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions:                                             │
│  [Measure] [Pump-Over] [Add Nutrients] [Log Observation]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 2: WINEMAKER INTENT

**User Action:** Winemaker types "measure" or clicks [Measure] button

**Input:**
```
User intent: "measure"
Current batch state: Tank 1, Day 5, Shiraz, Fermentation active
```

**Processing:**
```
AI Context Engine:
  1. Classify intent: "measure" → measurement action
  2. Retrieve current SOP step: Red Wine Fermentation, Step 4 (Daily Monitoring)
  3. Retrieve SOP guidance: "Measure and record twice daily (morning and afternoon)
     during active fermentation: Temperature, Brix, Sensory observations"
  4. Retrieve historical context: Last year on Day 5, measurements were taken at
     08:00 and 14:00. Brix drop rate was 1.2°B per day.
  5. Identify relevant SOP: Red Wine Fermentation (current) + Yeast Rehydration
     (if first measurement)
```

**Output to UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  MEASURE — Tank 1, Day 5                                    │
│                                                             │
│  Current SOP Step: Red Wine Fermentation — Daily Monitoring │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "Measure and record twice daily (morning and        │   │
│  │  afternoon) during active fermentation:             │   │
│  │  • Temperature (target: 22–28°C)                    │   │
│  │  • Brix (track sugar depletion rate)                │   │
│  │  • Sensory observations (aroma, cap condition)"     │   │
│  │                                                     │   │
│  │ [View Full SOP] [Learn More in Free Run]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Historical Context (2025 Shiraz):                          │
│  • Day 5 measurements: 08:00 (Brix 19.2, Temp 25°C)        │
│  •                     14:00 (Brix 18.8, Temp 27°C)        │
│  • Brix drop rate: ~1.2°B/day                              │
│  • Your current rate: 1.18°B/day (on track)                │
│                                                             │
│  ┌─ MEASUREMENT FORM ──────────────────────────────────┐   │
│  │ Time: [09:30]                                       │   │
│  │ Temperature: [26.5]°C                               │   │
│  │ Brix: [18.2]°B                                      │   │
│  │ pH: [3.2]                                           │   │
│  │ Observations: [Cap condition? Aroma?]               │   │
│  │                                                     │   │
│  │ [Cancel] [Save Measurement]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: ACTION LOGGING

**User Action:** Winemaker fills form and clicks [Save Measurement]

**Inputs:**
```
Form data:
  - tank_id: "Tank 1"
  - timestamp: 2026-06-17 09:30:00
  - measurement_type: "fermentation_monitoring"
  - brix: 18.2
  - ph: 3.2
  - temperature: 26.5
  - observations: "Cap is thick, color extraction good, fruity aroma"
```

**Processing:**
```
1. Validate inputs (Brix in expected range? Temp within alert thresholds?)
2. Calculate derived metrics:
   - Brix drop rate since last measurement
   - Temperature trend (rising/stable/falling)
   - Days until estimated fermentation completion
3. Check for alert conditions:
   - Temp > 30°C? → ALERT: "Risk of yeast death"
   - Brix drop stalled (< 0.5°B in 48h)? → ALERT: "Potential stuck fermentation"
   - Off aromas detected? → ALERT: "Microbial issue"
4. Store in database (logs table)
5. Update batch state (current_brix, last_measurement_time)
6. Generate AI response with context-aware guidance
```

**Output to UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ MEASUREMENT SAVED                                        │
│                                                             │
│  Tank 1 — 2026 Shiraz                                       │
│  Status: FERMENTATION ON TRACK                              │
│                                                             │
│  Your Measurement:                                          │
│  • Brix: 18.2°B (dropped 0.2°B since last measurement)     │
│  • Temperature: 26.5°C (stable)                             │
│  • pH: 3.2 (stable)                                         │
│  • Observations: Cap is thick, color extraction good       │
│                                                             │
│  AI Guidance:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Your fermentation is progressing normally. Brix     │   │
│  │ drop rate of 1.2°B/day is consistent with your      │   │
│  │ 2025 Shiraz at this stage. Temperature is ideal.    │   │
│  │                                                     │   │
│  │ Next step (based on 2025 history): Pump-over       │   │
│  │ 2–3 times today. Last year you did this at 08:00,  │   │
│  │ 12:00, and 16:00 with good results.                │   │
│  │                                                     │   │
│  │ Estimated fermentation completion: Day 8–9         │   │
│  │ (based on current Brix drop rate)                   │   │
│  │                                                     │   │
│  │ [View Pump-Over Protocol] [Ask a Question]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Cross-Pillar Bridges:                                      │
│  📖 SOP: Red Wine Fermentation — Step 4 (Daily Monitoring) │
│  📚 Learn: Fermentation Chemistry & Temperature Management  │
│  📋 Log: View all measurements for Tank 1                   │
│                                                             │
│  [Back to Tank 1] [What do you want to do now?]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 4: CROSS-PILLAR NAVIGATION

**User Action:** Winemaker clicks [View Pump-Over Protocol] or [Learn More]

**Inputs:**
```
User clicked: "View Pump-Over Protocol"
Current context: Tank 1, Day 5, Fermentation active, Brix 18.2
```

**Processing:**
```
1. Retrieve Pump-Over Protocol SOP from knowledge_sops table
2. Add contextual quick_steps for current stage:
   - "Days 3–7 (peak fermentation): 2–3× daily"
   - "Standard pump-over volume: 30–50% of tank volume"
   - "Distribute evenly across entire cap surface"
3. Retrieve Free Run lesson: "Cap Management During Red Wine Fermentation"
4. Generate "Try It Now" CTA back to The Press
```

**Output to UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  SOP: PUMP-OVER PROTOCOL                                    │
│  Grounded in: Red Wine Fermentation SOP, Step 5             │
│                                                             │
│  Quick Steps for Your Stage (Day 5, Peak Fermentation):     │
│  ✓ Conduct 2–3 pump-overs daily                             │
│  ✓ Distribute evenly across entire cap surface              │
│  ✓ Record time, duration, and observations                  │
│  ✓ Watch for cap condition changes                          │
│                                                             │
│  [Full SOP] [Troubleshooting] [Video Guide]                 │
│                                                             │
│  Learn More:                                                │
│  📚 Free Run Lesson: "Cap Management During Fermentation"   │
│                                                             │
│  Try It Now:                                                │
│  [Log Pump-Over for Tank 1]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model: Inputs & Outputs

### INPUT DATA SOURCES

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT DATA SOURCES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. WINERY ASSETS (Static, set once)                         │
│    • Tanks: ID, capacity, type, location                    │
│    • Equipment: Pumps, presses, barrels, etc.               │
│    • Fruit inventory: Variety, kg, sugar level              │
│                                                             │
│ 2. CURRENT BATCH STATE (Dynamic, updated per action)        │
│    • Tank ID, variety, vintage year, crush date             │
│    • Current SOP step (e.g., "Fermentation — Day 5")        │
│    • Latest measurements (Brix, pH, TA, Temp)               │
│    • Log entries (chronological actions taken)              │
│                                                             │
│ 3. VINTAGE HISTORY (Static, from previous years)            │
│    • Previous batches of same variety (e.g., 2025 Shiraz)   │
│    • Timeline of actions (when inoculated, pumped, etc.)    │
│    • Measurements at each stage (Brix progression, etc.)    │
│    • Decisions made and outcomes                            │
│                                                             │
│ 4. SOP LIBRARY (Static, reference content)                  │
│    • 7 core SOPs: Tank Cleaning, Fermentation, Yeast,       │
│      Pump-Over, Pressing, MLF, Bottling                     │
│    • Each SOP: full text, quick_steps, decision_logic       │
│    • Cross-references to bible chapters                     │
│                                                             │
│ 5. WINEMAKER INTENT (Dynamic, per question)                 │
│    • Natural language question: "measure", "pump-over",     │
│      "add nutrients", "what should I do?", etc.             │
│    • Context: current tank, current SOP step                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OUTPUT DATA FLOWS

```
┌─────────────────────────────────────────────────────────────┐
│                    OUTPUT DATA FLOWS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. TO DATABASE (Persistent logging)                         │
│    • New log entry: timestamp, action, measurements         │
│    • Updated batch state: current_brix, last_measurement    │
│    • Alert flags (if any): stuck_fermentation, temp_high    │
│                                                             │
│ 2. TO UI (Immediate feedback)                               │
│    • Confirmation: "✓ Measurement saved"                    │
│    • Current batch status: "Fermentation on track"          │
│    • AI guidance: context-aware next steps                  │
│    • Cross-pillar bridges: SOP, Learn, Log links            │
│                                                             │
│ 3. TO AI CONTEXT ENGINE (For next query)                    │
│    • Updated batch state feeds into next AI response        │
│    • Historical pattern recognition improves               │
│    • Alerts trigger proactive guidance                      │
│                                                             │
│ 4. TO REPORTS & EXPORTS                                     │
│    • Vintage card PDF: all measurements + timeline          │
│    • Batch history: all actions + outcomes                  │
│    • Compliance report: regulatory checkpoints              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Principles

### 1. **No Pre-Baked Workflows**
- The system does not enforce a linear path (Crush → Ferment → Press → Bottle)
- Instead, it responds to winemaker intent: "What do you want to do now?"
- The AI provides context-aware guidance based on current state + history

### 2. **Data-First Architecture**
- Current batch state + vintage history is the source of truth
- AI reasoning is transparent: "Last year on Day 5, you did X, and it worked"
- Winemaker can deviate from historical patterns if they choose

### 3. **Cross-Pillar Bridges**
- Every action (measurement logged) surfaces the relevant SOP
- Every SOP surfaces the relevant Free Run lesson
- Every Free Run lesson surfaces the "Try It Now" CTA back to The Press

### 4. **Minimal UI, Maximum Context**
- Show current state + historical context + AI guidance
- Provide quick actions (buttons) for common intents
- Support natural language input for edge cases

### 5. **Alert-Driven Proactivity**
- System detects alert conditions (temp too high, stuck fermentation, etc.)
- AI proactively suggests next steps based on alerts
- Winemaker can accept or override suggestions

---

## Example Workflow Sequence

```
Day 1:
  Winemaker: "I want to set up my winery"
  AI: [Setup questionnaire] → Creates Tank 1, Tank 2, Fruit inventory
  
Day 2:
  Winemaker: Clicks Tank 1 → "What do I do now?"
  AI: "You have crushed must ready. Next: Yeast Rehydration & Inoculation"
  Winemaker: "Inoculate"
  AI: [Guides through Yeast Rehydration SOP] → Logs inoculation
  
Day 3:
  Winemaker: Clicks Tank 1 → "What do I do now?"
  AI: "Fermentation started 24h ago. Current Brix: 23.8. 
       Last year on Day 2, you measured Brix 23.4. On track."
  Winemaker: "Measure"
  AI: [Logs measurement] → "Fermentation progressing normally"
  
Day 5:
  Winemaker: Clicks Tank 1 → "What do I do now?"
  AI: "Day 5 of fermentation. Brix: 18.2. Temperature: 26.5°C.
       Last year on Day 5: Brix 19.2, you did 2–3 pump-overs.
       Suggested next step: Pump-over"
  Winemaker: "Pump-over"
  AI: [Logs pump-over] → "Cap condition improved"
  
Day 8:
  Winemaker: Clicks Tank 1 → "What do I do now?"
  AI: "ALERT: Fermentation may be complete. Brix: 1.8°B.
       Last year: fermentation completed Day 8 at Brix 1.2°B.
       Suggested next step: Confirm with enzymatic test, then press"
  Winemaker: "Test"
  AI: [Logs enzymatic test] → "Fermentation confirmed complete"
  Winemaker: "Press"
  AI: [Guides through Pressing SOP] → Logs pressing event
```

---

## Summary: Inputs → Processing → Outputs

```
INPUTS:
  • Winemaker intent ("measure", "pump-over", "what should I do?")
  • Current batch state (Tank 1, Day 5, Brix 18.2, Temp 26.5°C)
  • Vintage history (2025 Shiraz: Day 5 was Brix 19.2, Temp 27°C)
  • SOP library (Red Wine Fermentation, Pump-Over Protocol, etc.)

PROCESSING:
  • AI Context Engine classifies intent
  • Retrieves relevant SOP step
  • Compares current state to historical patterns
  • Detects alert conditions
  • Generates context-aware guidance

OUTPUTS:
  • Logged action (measurement, pump-over, etc.) saved to database
  • AI guidance: "Fermentation on track, next step: pump-over"
  • Cross-pillar bridges: SOP link, Learn link, Log link
  • Updated batch state for next query
  • Alerts (if any): "Temperature too high", "Stuck fermentation", etc.
```

---

*This workflow diagram is the foundation for rebuilding Work Mode around the four-pillar architecture (Do, Know, Learn, Guide) with AI-driven context awareness and historical pattern recognition.*
