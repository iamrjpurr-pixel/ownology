# Work Mode UI Rebuild — Design System & Implementation Plan

## Current Issues
1. **Dark theme not rendering** — light beige background instead of dark
2. **Typography unreadable** — font sizes too small, no hierarchy
3. **Spacing broken** — cramped layout, no breathing room
4. **Tab labels garbled** — Unicode emoji rendering instead of text
5. **Phone shell not centred** — content off-alignment
6. **Interactive elements non-functional** — buttons don't respond
7. **Colors inverted** — light mode showing instead of dark

## Design System (Mobile-First)

### Color Palette
- **Background**: `#0a0a0a` (true black, OLED-friendly)
- **Surface**: `#1a1a1a` (card/panel background)
- **Border**: `#333333` (subtle dividers)
- **Text Primary**: `#f5f5f5` (off-white, high contrast)
- **Text Secondary**: `#a0a0a0` (muted, secondary info)
- **Accent**: `#d4a574` (warm amber/gold from brand)
- **Success**: `#4ade80` (green for completed)
- **Warning**: `#facc15` (yellow for pending)
- **Error**: `#ef4444` (red for issues)

### Typography
- **Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Heading XL**: 28px / 1.2 / 600 weight (page titles)
- **Heading L**: 20px / 1.3 / 600 weight (section titles)
- **Heading M**: 16px / 1.4 / 600 weight (card titles)
- **Body**: 14px / 1.5 / 400 weight (default text)
- **Small**: 12px / 1.5 / 400 weight (labels, hints)
- **Code**: 13px / 1.4 / 500 weight (monospace for data)

### Spacing Scale (8px base)
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px
- `3xl`: 48px

### Component Sizes
- **Touch targets**: minimum 44px (mobile), 40px (desktop)
- **Card padding**: 16px (mobile), 20px (desktop)
- **Input height**: 44px (mobile), 40px (desktop)
- **Button height**: 44px (mobile), 40px (desktop)
- **Phone shell width**: 430px (fixed, centred on desktop)

### Responsive Breakpoints
- **Mobile**: 0–639px (single column, full-width)
- **Tablet**: 640–1023px (2 columns, safe area)
- **Desktop**: 1024px+ (3 columns, phone shell centred)

## Implementation Steps

### Phase 1: WorkModeLayout Rebuild
1. Fix dark theme CSS variables in index.css
2. Rebuild WorkModeLayout component with:
   - Proper dark background (#0a0a0a)
   - Clear top bar: logo + title + profile (44px height on mobile)
   - Bottom nav with proper tab labels (no emoji, clear icons)
   - Safe-area insets for notch/home-bar
   - Proper z-index stacking (top bar z-50, bottom nav z-40)
3. Add proper spacing and padding throughout
4. Test at 320px, 430px, 768px, 1024px viewports

### Phase 2: FreeRun Rebuild
1. Replace all inline styles with CSS classes
2. Simplify component structure (remove nested popovers)
3. Add working Ask interface:
   - Input field (44px height, proper padding)
   - Submit button (amber accent, proper size)
   - Question history list (clear spacing, readable text)
4. Add mock data so page is immediately interactive
5. Test typography at 100%, 125%, 150% zoom

### Phase 3: ThePress Rebuild
1. Fix tab bar rendering (no emoji, clear labels)
2. Rebuild Vintage Log tab:
   - Empty state with proper spacing
   - Add Entry button (prominent, 44px)
   - Entry list with clear card design
3. Add mock data for immediate interactivity
4. Test responsive layout at all breakpoints

### Phase 4: CellarTasks Rebuild
1. Fix equipment list rendering
2. Add Equipment button (prominent, 44px)
3. Equipment cards with clear spacing
4. Add mock data for immediate interactivity

### Phase 5: Testing & Audit
1. Screenshot at 320px, 430px, 768px, 1024px
2. Test at 100%, 125%, 150% browser zoom
3. Verify all text is readable
4. Verify all buttons are 44px+ touch targets
5. Verify spacing is consistent
6. Verify colors meet WCAG AA contrast

## CSS Architecture
- Use CSS custom properties (variables) for all colors, spacing, typography
- Use Tailwind utilities where possible (already configured)
- Avoid inline styles (use CSS classes instead)
- Use `clamp()` for responsive sizing (e.g., `font-size: clamp(14px, 2vw, 18px)`)
- Use CSS Grid for layout (not flexbox for main containers)

## Testing Checklist
- [ ] Dark theme renders correctly
- [ ] Typography is readable at all sizes
- [ ] Spacing is consistent and proportional
- [ ] All buttons are 44px+ on mobile
- [ ] All inputs are 44px+ on mobile
- [ ] Phone shell is centred on desktop
- [ ] Tab labels render as text (no emoji)
- [ ] Responsive layout works at 320px, 430px, 768px, 1024px
- [ ] Zoom at 100%, 125%, 150% is readable
- [ ] Color contrast meets WCAG AA
- [ ] Safe-area insets work on iOS
- [ ] All interactive elements respond to clicks
