"""
Apply cream light-mode palette to EmailGate in Preview.tsx.
Only changes colour values inside EmailGate — does NOT touch JSX structure.
"""

path = "client/src/pages/Preview.tsx"
with open(path) as f:
    src = f.read()

# ── Locate EmailGate function boundaries ─────────────────────────────────────
start = src.index("function EmailGate(")
end = src.index("// ─── Content component")

gate = src[start:end]
rest = src[end:]
header = src[:start]

print(f"EmailGate: lines {src[:start].count(chr(10))+1} to {src[:end].count(chr(10))+1}")

# ── Colour substitutions inside EmailGate only ───────────────────────────────
# Outer wrapper background: dark → cream
gate = gate.replace('background: "oklch(0.11 0.008 60)"', 'background: "oklch(0.97 0.010 75)"')

# Section label: amber on dark → darker amber for cream bg
gate = gate.replace('color: "oklch(0.62 0.14 68)"', 'color: "oklch(0.40 0.13 68)"')

# h1 headline: near-white → near-black
gate = gate.replace('color: "oklch(0.95 0.018 75)"', 'color: "oklch(0.12 0.010 60)"')

# italic em in headline: amber → darker amber
gate = gate.replace('color: "oklch(0.72 0.12 75)"', 'color: "oklch(0.40 0.13 68)"')

# body paragraph: light grey → dark grey
gate = gate.replace('color: "oklch(0.70 0.015 75)"', 'color: "oklch(0.38 0.010 60)"')

# urgency badge background
gate = gate.replace('background: "oklch(0.72 0.12 75 / 10%)"', 'background: "oklch(0.40 0.13 68 / 10%)"')
gate = gate.replace('border: "1px solid oklch(0.72 0.12 75 / 30%)"', 'border: "1px solid oklch(0.40 0.13 68 / 30%)"')

# success box background
gate = gate.replace('background: "oklch(0.72 0.12 75 / 15%)"', 'background: "oklch(0.40 0.13 68 / 12%)"')

# success text
gate = gate.replace('color: "oklch(0.60 0.015 75)", marginTop: "0.5rem"', 'color: "oklch(0.38 0.010 60)", marginTop: "0.5rem"')

# input fields: dark bg → light bg
gate = gate.replace('background: "oklch(0.16 0.010 60)"', 'background: "oklch(0.94 0.008 75)"')
gate = gate.replace('border: "1px solid oklch(1 0 0 / 12%)"', 'border: "1px solid oklch(0.72 0.015 75)"')

# input text: near-white → near-black
gate = gate.replace('color: "oklch(0.90 0.018 75)"', 'color: "oklch(0.12 0.010 60)"')

# input focus/blur border colours
gate = gate.replace(
    'e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)"',
    'e.currentTarget.style.borderColor = "oklch(0.40 0.13 68)"'
)
gate = gate.replace(
    'e.currentTarget.style.borderColor = "oklch(1 0 0 / 12%)"',
    'e.currentTarget.style.borderColor = "oklch(0.72 0.015 75)"'
)

# submit button text: dark → keep light (cream on amber)
gate = gate.replace('color: "oklch(0.10 0.008 60)"', 'color: "oklch(0.97 0.010 75)"')

# error link
gate = gate.replace(
    'color: "oklch(0.72 0.12 75)" }}>support@ownology.ai',
    'color: "oklch(0.40 0.13 68)" }}>support@ownology.ai'
)

# footer note
gate = gate.replace('color: "oklch(0.45 0.012 75)"', 'color: "oklch(0.42 0.010 60)"')

# ── Add useEffect import ──────────────────────────────────────────────────────
if "useEffect" not in header:
    header = header.replace("import { useState }", "import { useState, useEffect }")

# ── Reassemble ───────────────────────────────────────────────────────────────
result = header + gate + rest

# ── Add body background useEffect to main Preview export ─────────────────────
body_effect = (
    "\n  // Force cream background regardless of global theme\n"
    "  useEffect(() => {\n"
    "    const body = document.body;\n"
    "    const prev = body.style.background;\n"
    '    body.style.background = "oklch(0.97 0.010 75)";\n'
    "    return () => { body.style.background = prev; };\n"
    "  }, []);\n\n"
)

result = result.replace(
    "export default function Preview() {\n  const [unlocked",
    "export default function Preview() {" + body_effect + "  const [unlocked"
)

with open(path, "w") as f:
    f.write(result)

print(f"Written. Total lines: {result.count(chr(10))}")
