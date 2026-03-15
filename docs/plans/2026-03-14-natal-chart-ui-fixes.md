# Natal Chart UI Fixes & Dark Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix five visual bugs in the natal chart SVG renderer and adapt its colour palette to match the dark cosmic UI theme.

**Architecture:** All changes are confined to `src/lib/chart.ts`. The file exports a single `renderNatalChart(svgElement, chart, size)` function that uses D3 to imperatively build an SVG. We fix drawing-order, coordinate math, and colour constants in-place. No React component changes needed.

**Tech Stack:** D3.js, SVG, TypeScript. Tests via Vitest (`npm run test`).

---

### Task 1: Unit-test `avoidOverlap` wrap-around bug, then fix it

The `avoidOverlap` function lives inside `chart.ts` and is not exported. We need to export it (temporarily or permanently) to write a unit test, fix the wrap bug, then verify.

**Files:**

- Modify: `src/lib/chart.ts` — export `avoidOverlap`, fix wrap-around logic
- Create: `tests/lib/chart.test.ts`

**Step 1: Export `avoidOverlap` from `chart.ts`**

Find the function declaration (around line 275) and add `export` keyword:

```ts
export function avoidOverlap(
  planets: PlanetPosition[],
  ascendant: number,
  minSeparation: number,
): Array<{ planet: PlanetPosition; adjustedAngle: number }> {
```

**Step 2: Write the failing test**

Create `tests/lib/chart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { avoidOverlap } from '../../src/lib/chart';
import type { PlanetPosition } from '../../src/types/astro';
import { Planet, ZodiacSign } from '../../src/types/astro';

function makePlanet(lon: number): PlanetPosition {
  return {
    planet: Planet.Sun,
    longitude: lon,
    latitude: 0,
    speed: 1,
    sign: ZodiacSign.Aries,
    degree: Math.floor(lon % 30),
    minute: 0,
    retrograde: false,
  };
}

describe('avoidOverlap', () => {
  it('spreads planets clustered near 0°/360° boundary', () => {
    // Two planets: one at 355°, one at 5° — actual separation is 10°
    // With ASC=0, lonToAngle(355,0)=535, lonToAngle(5,0)=185
    // The issue: after avoidOverlap, both should be at least minSep apart
    const planets = [makePlanet(355), makePlanet(5)];
    const result = avoidOverlap(planets, 0, 15);
    const angles = result.map((r) => r.adjustedAngle);
    // Shortest angular distance between the two adjusted angles must be >= 15
    const diff = Math.abs(angles[0] - angles[1]);
    const shortDiff = Math.min(diff, 360 - diff);
    expect(shortDiff).toBeGreaterThanOrEqual(14.9); // allow tiny float error
  });

  it('does not disturb planets that are already well separated', () => {
    const planets = [makePlanet(0), makePlanet(90), makePlanet(180), makePlanet(270)];
    const result = avoidOverlap(planets, 0, 8);
    // Angles should remain approximately at 180, 270, 360, 450 (lonToAngle offsets)
    for (const r of result) {
      const expected = 180 + (r.planet.longitude - 0);
      expect(Math.abs(r.adjustedAngle - expected)).toBeLessThan(2);
    }
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run tests/lib/chart.test.ts
```

Expected: FAIL — the wrap-around planet pair test fails because the current algorithm doesn't detect the 10° gap across the boundary.

**Step 4: Fix `avoidOverlap` in `chart.ts`**

Replace the push-apart loop with a version that uses shortest angular distance:

```ts
// Push apart overlapping planets
for (let pass = 0; pass < 10; pass++) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const raw = items[j].adjustedAngle - items[i].adjustedAngle;
      // Shortest signed angular distance (handles 360°/0° wrap)
      const diff = (((raw % 360) + 540) % 360) - 180;
      if (Math.abs(diff) < minSeparation) {
        const push = (minSeparation - Math.abs(diff)) / 2;
        items[i].adjustedAngle -= diff > 0 ? push : -push;
        items[j].adjustedAngle += diff > 0 ? push : -push;
      }
    }
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/lib/chart.test.ts
```

Expected: PASS both tests.

**Step 6: Commit**

```bash
git add src/lib/chart.ts tests/lib/chart.test.ts
git commit -m "fix(chart): avoidOverlap handles 360°/0° wrap-around boundary"
```

---

### Task 2: Fix aspect line draw order (hidden by inner circle)

Currently `drawAspects` is called before `drawHouses`, so the inner circle's opaque fill covers the centre of every aspect line.

**Files:**

- Modify: `src/lib/chart.ts` — reorder draw calls in `renderNatalChart`

**Step 1: Locate the render call order** in `renderNatalChart` (around line 440):

```ts
drawAspects(svg, chart, dim); // ← currently first
drawHouses(svg, chart, dim);
drawZodiacRing(svg, dim, chart.ascendant);
drawPlanets(svg, chart, dim);
```

**Step 2: Move `drawAspects` to after `drawHouses`**

```ts
drawHouses(svg, chart, dim); // inner circle drawn here
drawAspects(svg, chart, dim); // now renders above inner circle fill
drawZodiacRing(svg, dim, chart.ascendant);
drawPlanets(svg, chart, dim);
```

**Step 3: Verify visually**

Run dev server and check that aspect lines no longer disappear in the centre:

```bash
npm run dev
```

Open the app. Aspect lines should now be fully visible from planet to planet across the centre.

**Step 4: Commit**

```bash
git add src/lib/chart.ts
git commit -m "fix(chart): draw aspects above inner circle so lines are not occluded"
```

---

### Task 3: Fix ASC/MC label clipping (viewBox padding)

Labels placed outside the outer circle radius are clipped by the SVG viewport.

**Files:**

- Modify: `src/lib/chart.ts` — update `renderNatalChart` viewBox and `getDimensions`

**Step 1: Add `pad` constant and update viewBox** in `renderNatalChart`:

```ts
export function renderNatalChart(svgElement: SVGSVGElement, chart: NatalChart, size: number = 600) {
  const dim = getDimensions(size);
  const pad = size * 0.07; // extra space for ASC/MC/planet labels outside the ring

  const svg = d3
    .select(svgElement)
    .attr('width', size)
    .attr('height', size)
    .attr('viewBox', `${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}`);
```

Remove the old `.attr('viewBox', ...)` line that follows.

**Step 2: Update the background rect** to cover the padded viewBox:

```ts
svg
  .append('rect')
  .attr('x', -pad)
  .attr('y', -pad)
  .attr('width', size + 2 * pad)
  .attr('height', size + 2 * pad)
  .attr('fill', 'transparent'); // dark theme: transparent
```

**Step 3: Verify visually**

```bash
npm run dev
```

ASC label (left side) and MC label (top/bottom) should now be fully visible without clipping.

**Step 4: Commit**

```bash
git add src/lib/chart.ts
git commit -m "fix(chart): expand viewBox with padding so ASC/MC labels are not clipped"
```

---

### Task 4: Fix aspect dasharray convention + move degree labels outward

Two small fixes in one commit to keep things tidy.

**Files:**

- Modify: `src/lib/chart.ts`

**Step 1: Fix `stroke-dasharray` in `drawAspects`**

Find the `.attr('stroke-dasharray', ...)` line in `drawAspects` and replace:

```ts
// Old (wrong):
.attr('stroke-dasharray', aspect.type === 60 || aspect.type === 120 ? 'none' : '5,3')

// New (correct astrological convention):
.attr('stroke-dasharray', [0, 60, 120].includes(aspect.type) ? 'none' : '5,3')
// conjunction(0°), trine(120°), sextile(60°) → solid
// square(90°), opposition(180°), quincunx(150°) → dashed
```

Also update stroke-width to emphasise conjunction:

```ts
.attr('stroke-width', aspect.type === 0 ? 2.5 : aspect.orb < 3 ? 2 : 1.5)
```

**Step 2: Move degree labels outward in `drawPlanets`**

Find the `labelPos` calculation (around line 347) and change the radius from inward to outward:

```ts
// Old (inward — overlaps house numbers):
const labelPos = polarToXY(
  dim.center,
  dim.center,
  dim.planetRadius - dim.size * 0.04,
  item.adjustedAngle,
);

// New (outward — sits between glyph and zodiac ring):
const labelPos = polarToXY(
  dim.center,
  dim.center,
  dim.planetRadius + dim.size * 0.038,
  item.adjustedAngle,
);
```

**Step 3: Verify visually**

```bash
npm run dev
```

Check: conjunction lines now solid/thick, squares/oppositions dashed. Degree labels appear outside the glyph toward the zodiac ring, not overlapping house numbers.

**Step 4: Commit**

```bash
git add src/lib/chart.ts
git commit -m "fix(chart): correct aspect dasharray convention; move degree labels outward"
```

---

### Task 5: Dark theme — colours and background

Replace all hardcoded light colours in `chart.ts` with dark-theme constants.

**Files:**

- Modify: `src/lib/chart.ts`

**Step 1: Add dark theme colour constants** near the top of the file, after the existing `ELEMENT_COLORS` and `ELEMENT_BG_COLORS`:

```ts
/** Dark theme colour palette for the chart */
const DARK = {
  bg: 'transparent',
  innerFill: 'rgba(10, 15, 35, 0.65)',
  text: '#C8D0E8',
  textMuted: '#7A8AAA',
  outerStroke: 'rgba(160, 180, 230, 0.8)',
  innerStroke: 'rgba(140, 165, 220, 0.6)',
  houseMinor: 'rgba(140, 160, 210, 0.35)',
  houseMajor: 'rgba(200, 215, 255, 0.85)',
  zodiacDiv: 'rgba(160, 175, 220, 0.5)',
  retrograde: '#FF6B4A',
  haloFill: 'rgba(8, 12, 28, 0.72)',
} as const;

/** Dark element background fills (zodiac ring segments) */
const ELEMENT_BG_COLORS_DARK: Record<string, string> = {
  火: 'rgba(80, 20, 20, 0.55)',
  土: 'rgba(50, 42, 20, 0.55)',
  風: 'rgba(45, 50, 20, 0.55)',
  水: 'rgba(15, 35, 70, 0.55)',
};
```

**Step 2: Update `drawZodiacRing`**

- Change `.attr('fill', ELEMENT_BG_COLORS[...])` → `ELEMENT_BG_COLORS_DARK[...]`
- Change `.attr('stroke', ELEMENT_COLORS[...])` → keep (they stay vivid)
- Change zodiac division lines stroke: `'#888'` → `DARK.zodiacDiv`
- Change sign glyph fill: keep `ELEMENT_COLORS[info.element]` (stays vivid)

**Step 3: Update `drawHouses`**

- House cusp lines:
  - Cardinal (i=0,3,6,9): stroke `'#222'` → `DARK.houseMajor`
  - Non-cardinal: stroke `'#777'` → `DARK.houseMinor`
- House numbers: fill `'#666'` → `DARK.textMuted`
- ASC label: fill `'#E74C3C'` → keep (red stays visible on dark)
- MC label: fill `'#2980B9'` → `'#60AAEE'` (brighter blue for dark bg)
- Inner circle: `fill: '#FAFAFA'` → `DARK.innerFill`; stroke `'#555'` → `DARK.innerStroke`

**Step 4: Update `drawPlanets`**

- Planet glyph fill: `'#333'` → `DARK.text`; retrograde `'#E74C3C'` → `DARK.retrograde`
- Degree label fill: `'#666'` → `DARK.textMuted`
- Tick line (adjusted position indicator): stroke `'#aaa'` → `'rgba(160,170,210,0.5)'`
- Retrograde symbol fill: `'#E74C3C'` → `DARK.retrograde`

**Step 5: Add text halos** for planet glyphs and degree labels. Before each `g.append('text')` for planet glyph, insert a background rect:

```ts
// Halo rect for planet glyph
const glyphSize = dim.size * 0.035;
g.append('rect')
  .attr('x', pos.x - glyphSize * 0.6)
  .attr('y', pos.y - glyphSize * 0.6)
  .attr('width', glyphSize * 1.2)
  .attr('height', glyphSize * 1.2)
  .attr('rx', 3)
  .attr('fill', DARK.haloFill);
```

Do the same for degree label rects (smaller, narrower).

**Step 6: Update border circles** at the end of `renderNatalChart`:

```ts
// Outer border circle
svg
  .append('circle')
  .attr('cx', dim.center)
  .attr('cy', dim.center)
  .attr('r', dim.outerRadius)
  .attr('fill', 'none')
  .attr('stroke', DARK.outerStroke)
  .attr('stroke-width', 2);

// Inner zodiac circle
svg
  .append('circle')
  .attr('cx', dim.center)
  .attr('cy', dim.center)
  .attr('r', dim.zodiacInnerRadius)
  .attr('fill', 'none')
  .attr('stroke', DARK.innerStroke)
  .attr('stroke-width', 1.5);
```

**Step 7: Verify visually**

```bash
npm run dev
```

Chart should now display with deep blue/navy palette, vivid element colours, readable silver text — consistent with the glass-panel dark cosmic theme.

**Step 8: Run full test suite**

```bash
npm run test
```

Expected: All existing tests pass (chart.ts has no side effects on data calculations).

**Step 9: Commit**

```bash
git add src/lib/chart.ts
git commit -m "feat(chart): dark cosmic theme — navy bg, silver text, element ring colours"
```

---

### Task 6: TypeScript check + final review

**Step 1: Run TypeScript check**

```bash
npm run typecheck
```

Expected: No errors.

**Step 2: Run lint**

```bash
npm run lint
```

Fix any lint warnings before proceeding.

**Step 3: Final visual QA checklist**

Open `npm run dev` and verify:

- [ ] ASC label fully visible on left
- [ ] MC label fully visible (not cut off)
- [ ] All aspect lines visible end-to-end including centre section
- [ ] Planets near 0°/360° (Aries cusp) spread correctly — no stacking
- [ ] Conjunction aspect lines: solid + thicker than other aspects
- [ ] Square/opposition lines: dashed
- [ ] Degree labels appear between planet glyph and zodiac ring (not over house numbers)
- [ ] Chart background matches glass-panel dark theme (no white box)
- [ ] Zodiac ring segments show dark element colours
- [ ] Planet glyphs readable on dark background with halo

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(chart): final typecheck and lint clean"
```
