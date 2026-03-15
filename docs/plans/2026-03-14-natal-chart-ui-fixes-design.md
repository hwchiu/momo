# Natal Chart UI Fixes & Dark Theme — Design Doc

**Date:** 2026-03-14
**Scope:** `src/lib/chart.ts` (primary), `src/App.css` (minor)
**Approach:** C — Bug fixes + moderate dark theme integration

---

## Problem Summary

The natal chart SVG has five confirmed bugs causing visual defects on normal screen sizes, plus a light-colour palette that clashes with the dark cosmic UI theme.

---

## Bug Fixes

### Bug 1 — ASC/MC labels clipped by SVG viewBox

**Root cause:** Labels are placed at `outerRadius + size * 0.04` from centre. With `size=480`, `outerRadius=220.8`, the label sits at radius 240 — exactly the SVG edge — and is clipped.

**Fix:** Expand viewBox with symmetric padding (e.g. `pad = size * 0.06`). Set `viewBox="-pad -pad (size+2*pad) (size+2*pad)"` while keeping `width/height=size`. Labels now have room outside the circle.

### Bug 2 — Aspect lines hidden by inner circle fill

**Root cause:** `drawAspects` is called first (lowest z-order). Later, `drawHouses` paints an opaque filled inner circle (`fill: #FAFAFA`) on top, covering the central portion of every aspect line that crosses the centre area.

**Fix:** Move `drawAspects` call to after `drawHouses` (inner circle drawn), so aspect lines render above the inner circle fill.

### Bug 3 — Planet overlap algorithm ignores 360°/0° wrap

**Root cause:** `avoidOverlap` computes `diff = items[j].adjustedAngle - items[i].adjustedAngle`. Planets at 355° and 5° produce diff=350°, which is not `< minSeparation`, so they are never pushed apart.

**Fix:** Replace raw diff with shortest angular distance: `shortDiff = ((diff + 180) % 360) - 180`. Apply push using this signed shortest path.

### Bug 4 — Conjunction aspect lines incorrectly dashed

**Root cause:** `stroke-dasharray` is `'none'` only for `type === 60` (sextile) or `type === 120` (trine). Conjunction (0°) gets dashed — opposite of astrological convention.

**Fix:** New dasharray logic:

- Solid + thick: conjunction (0°), opposition (180°)
- Solid: trine (120°), sextile (60°)
- Dashed: square (90°), quincunx (150°), semi-square (45°), sesquiquadrate (135°)

### Bug 5 — Degree labels overlap house numbers

**Root cause:** Degree labels drawn at `planetRadius - size * 0.04` (inward), overlapping the house number ring at `houseInnerRadius * 1.2`.

**Fix:** Move degree labels outward to `planetRadius + size * 0.035` (between planet glyph and zodiac ring inner edge), keeping them in the house ring band but closer to the zodiac.

---

## Dark Theme Integration

### Background

- SVG background: transparent (was `#FAFAFA`) — container's glass-panel shows through
- Inner circle fill: `rgba(10, 15, 35, 0.6)` semi-transparent deep navy (was opaque `#FAFAFA`)

### Colour Constants (defined at top of `chart.ts`)

```ts
const DARK = {
  text: '#C8D0E8', // primary label text
  textMuted: '#7A8AAA', // degree labels, house numbers
  stroke: 'rgba(160, 180, 230, 0.6)', // ring borders
  houseMinor: 'rgba(140, 160, 210, 0.35)', // non-cardinal house lines
  houseMajor: 'rgba(200, 215, 255, 0.85)', // cardinal (ASC/DSC/MC/IC) lines
  innerFill: 'rgba(10, 15, 35, 0.6)',
  retro: '#FF6B4A', // retrograde marker
};
```

### Zodiac Ring

- Element background colours: dark versions
  - 火 (Fire): `#2D1010`
  - 土 (Earth): `#1E1A10`
  - 風 (Air): `#1A1D10`
  - 水 (Water): `#0E1A2D`
- Element foreground (glyph): keep vivid colours but slightly brightened

### Planet Glyphs

- Normal: `#C8D0E8`
- Retrograde: `#FF6B4A`
- Add `rect` halo (4px padding, `fill: rgba(8,12,28,0.7)`, `rx:3`) behind each glyph and its degree label to ensure readability regardless of background

### Aspect Lines

- Maintain existing per-aspect colours; no change to hue
- Opacity formula unchanged (`Math.max(0.5, 1 - orb/10)`)
- Stroke width: tight orb (<3°) → 2px; otherwise → 1.5px (unchanged)

### Border Circles

- Outer circle stroke: `rgba(160, 180, 230, 0.8)`
- Inner zodiac circle stroke: `rgba(140, 165, 220, 0.6)`

---

## Files Changed

| File               | Change                                 |
| ------------------ | -------------------------------------- |
| `src/lib/chart.ts` | All bug fixes + dark colour constants  |
| `src/App.css`      | No change needed (SVG now transparent) |

---

## Out of Scope

- Responsive / mobile sizing (separate concern)
- Interactive tooltips on planets
- Animation / transition effects
