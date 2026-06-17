# Ownology Work Mode — Mockup Architecture (DailyMe-Inspired)

## Design Philosophy
Clean, minimal, light-themed interface inspired by DailyMe Nutrition App. Focus on:
- **Light backgrounds** (off-white, cream)
- **Clear visual hierarchy** (large headings, supporting text)
- **Minimal color** (2-3 accent colors, placeholder for brand)
- **Pill-shaped buttons and cards** (dashed borders for secondary actions)
- **Circular progress indicators** (for fermentation, tasks, etc.)
- **Bottom navigation** (5 tabs: ASK, PRESS, LOG, TASKS, MORE)
- **Lots of white space** (breathing room between elements)

---

## Page 1: Free Run (Ask) — Wine Knowledge Assistant

### Screen 1A: Goal Selection (First Visit)
```
┌─────────────────────────────────┐
│ Ask Ownology                    │
│                                 │
│ What do you want to explore?    │
│ Select the topic that interests │
│ you most.                       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ◉ Fermentation Science      │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ◉ Tasting & Flavours       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ◉ Vineyard & Harvest       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ◉ Cellar Techniques        │ │
│ └─────────────────────────────┘ │
│                                 │
│         [Cancel]                │
└─────────────────────────────────┘
```

**Elements:**
- Large heading: "What do you want to explore?"
- Supportive subheading
- 4 pill-shaped goal buttons (dashed borders)
- Cancel button (circular, bottom center)

### Screen 1B: Knowledge Dashboard
```
┌─────────────────────────────────┐
│ Hello, Winemaker                │
│ You're learning about...        │
│                                 │
│        ╭─────────────╮          │
│       │  Fermentation  │         │
│       │     Science    │         │
│       │      87%       │         │
│        ╰─────────────╯          │
│                                 │
│ [F] [T] [V] [C] [H]            │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Today, 26 Jan 2026          │ │
│ │ 2 questions · 15 min read   │ │
│ │                             │ │
│ │ Q: What are tannins?        │ │
│ │ A: Polyphenolic compounds... │ │
│ │                      09:15   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Q: How to prevent oxidation?│ │
│ │ A: Use SO₂ management...    │ │
│ │                      10:42   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [?] [📚] [📊] [⚙️] [👤]         │
└─────────────────────────────────┘
```

**Elements:**
- Greeting: "Hello, Winemaker"
- Large circular progress ring (87%)
- Topic icons (F, T, V, C, H)
- Question/answer cards (white, minimal)
- Bottom nav (5 icons)

---

## Page 2: The Press (Log) — Cellar Logbook

### Screen 2A: Vintage Dashboard
```
┌─────────────────────────────────┐
│ The Press                       │
│ Your vintage is progressing     │
│                                 │
│   VINTAGE 2026 — IN PROGRESS   │
│   ┌─────────────────────────┐   │
│   │  Fermentation Progress  │   │
│   │                         │   │
│   │      ╭──────────╮       │   │
│   │     │   Day 12   │       │   │
│   │     │   of 14    │       │   │
│   │      ╰──────────╯       │   │
│   │                         │   │
│   │ [Brix] [pH] [SO₂] [Temp]│   │
│   └─────────────────────────┘   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Tank 7 — Measurement        │ │
│ │ 6/17/2026 · 09:15           │ │
│ │ Brix 24.3, pH 3.2, SO₂ 30  │ │
│ │                             │ │
│ │ Tank 5 — Inoculation       │ │
│ │ 6/16/2026 · 14:30           │ │
│ │ Yeast: EC1118, 20g/100L    │ │
│ └─────────────────────────────┘ │
│                                 │
│      [+ Log Entry]              │
│                                 │
│ [?] [📋] [📊] [⚙️] [👤]         │
└─────────────────────────────────┘
```

**Elements:**
- Heading: "Your vintage is progressing"
- Vintage status card (in progress)
- Large circular progress ring (Day 12 of 14)
- Metric icons (Brix, pH, SO₂, Temp)
- Entry cards (white, minimal)
- Add button (pill-shaped, prominent)
- Bottom nav

### Screen 2B: Add Entry Sheet
```
┌─────────────────────────────────┐
│ Log Entry                       │
│                                 │
│ Tank Name                       │
│ ┌─────────────────────────────┐ │
│ │ e.g. Tank 7, Barrel A1     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Event Type                      │
│ ┌─────────────────────────────┐ │
│ │ Measurement (Brix, pH, SO₂)│ │
│ └─────────────────────────────┘ │
│                                 │
│ Notes (Optional)                │
│ ┌─────────────────────────────┐ │
│ │ Add any details...          │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]  [Save Entry]          │
└─────────────────────────────────┘
```

**Elements:**
- Sheet title: "Log Entry"
- Input fields (clean, minimal)
- Placeholder text
- Two buttons (Cancel, Save Entry)

---

## Page 3: Cellar Tasks (Manage) — Equipment & Maintenance

### Screen 3A: Equipment Dashboard
```
┌─────────────────────────────────┐
│ Cellar Tasks                    │
│ Your equipment is ready         │
│                                 │
│   EQUIPMENT REGISTER            │
│   ┌─────────────────────────┐   │
│   │  2 items registered     │   │
│   │  0 maintenance tasks    │   │
│   │  0 issues               │   │
│   └─────────────────────────┘   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Tank 7                      │ │
│ │ Fermentation Tank · 500L    │ │
│ │ Stainless Steel · Qty: 1    │ │
│ │ Last cleaned: 6/15/2026     │ │
│ │                        [✕]  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ French Oak Barrels          │ │
│ │ Barrel · 225L               │ │
│ │ French Oak · Qty: 12        │ │
│ │ Last inspected: 6/10/2026   │ │
│ │                        [✕]  │ │
│ └─────────────────────────────┘ │
│                                 │
│    [+ Add Equipment]            │
│                                 │
│ [?] [📋] [📊] [⚙️] [👤]         │
└─────────────────────────────────┘
```

**Elements:**
- Heading: "Your equipment is ready"
- Equipment summary card (2 items, 0 tasks, 0 issues)
- Equipment cards (white, minimal, with delete button)
- Add button (pill-shaped, prominent)
- Bottom nav

### Screen 3B: Add Equipment Sheet
```
┌─────────────────────────────────┐
│ Add Equipment                   │
│                                 │
│ Equipment Name                  │
│ ┌─────────────────────────────┐ │
│ │ e.g. Tank 7, Barrel A1     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Equipment Type                  │
│ ┌─────────────────────────────┐ │
│ │ Fermentation Tank           │ │
│ └─────────────────────────────┘ │
│                                 │
│ Capacity                        │
│ ┌─────────────────────────────┐ │
│ │ e.g. 500L, 225L            │ │
│ └─────────────────────────────┘ │
│                                 │
│ Quantity                        │
│ ┌─────────────────────────────┐ │
│ │ 1                           │ │
│ └─────────────────────────────┘ │
│                                 │
│ Material (Optional)             │
│ ┌─────────────────────────────┐ │
│ │ e.g. Stainless Steel       │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Cancel]  [Add Equipment]       │
└─────────────────────────────────┘
```

**Elements:**
- Sheet title: "Add Equipment"
- Input fields (clean, minimal)
- Placeholder text
- Two buttons (Cancel, Add Equipment)

---

## Bottom Navigation (All Pages)
```
┌─────────────────────────────────┐
│ [?]  [📋]  [📊]  [⚙️]  [👤]    │
│ ASK  PRESS  LOG  TASKS  MORE    │
└─────────────────────────────────┘
```

**Tabs:**
1. ASK (Free Run) — ❓ icon
2. PRESS (The Press) — 📋 icon
3. LOG (Log history) — 📊 icon
4. TASKS (Cellar Tasks) — ⚙️ icon
5. MORE (Settings, Help) — 👤 icon

---

## Color Palette (Placeholder)
- **Background**: Off-white (#F8F9FA)
- **Cards**: White (#FFFFFF)
- **Text (Primary)**: Dark gray (#1F2937)
- **Text (Secondary)**: Medium gray (#6B7280)
- **Accent 1**: Blue (#3B82F6) — for primary CTAs
- **Accent 2**: Green (#10B981) — for positive states
- **Accent 3**: Amber (#F59E0B) — for warnings
- **Border**: Light gray (#E5E7EB)

---

## Typography (Placeholder)
- **Headings**: 24px, bold
- **Subheadings**: 16px, medium
- **Body**: 14px, regular
- **Labels**: 12px, medium (uppercase)
- **Timestamps**: 12px, light

---

## Spacing System (Placeholder)
- **Padding**: 16px (standard), 24px (large sections)
- **Gap**: 12px (between cards), 16px (between sections)
- **Border Radius**: 8px (cards), 24px (buttons/pills)
- **Line Height**: 1.5 (body), 1.2 (headings)

---

## Next Steps
1. Implement mockups in React with placeholder styling
2. Test interactions (goal selection, entry creation, equipment management)
3. Integrate brand colors and typography
4. Add animations and micro-interactions
5. Test at multiple viewport sizes
