# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Natal chart (astrology birth chart) web app. Users input birth date, time, and location; the app calculates planetary positions and renders an SVG natal chart. All user-facing text is in **Traditional Chinese** (繁體中文); code comments and variable names in English.

**Stack**: React 19, TypeScript 5.9, Vite 7, D3.js (SVG rendering), `astronomia` (planetary calculations), Vitest (testing).

## Commands

```bash
npm run dev          # Start dev server (Vite HMR)
npm run build        # TypeScript check + production build
npm run lint         # ESLint
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm run typecheck    # TypeScript check only
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
```

### Running a single test

```bash
npx vitest run tests/lib/astro.test.ts
npx vitest run -t "should place the Sun in Capricorn"
npx vitest run --reporter=verbose tests/lib/astro.test.ts
```

## Architecture

```
src/
├── types/astro.ts          # All TS types, enums, and display constants (single source of truth)
├── lib/
│   ├── astro.ts            # Astronomy engine: planetary positions, house cusps, aspects
│   ├── chart.ts            # D3.js SVG natal chart rendering (imperative, not React)
│   └── geocode.ts          # OpenStreetMap Nominatim geocoding
├── components/
│   ├── BirthDataForm.tsx   # Birth data input with location autocomplete
│   ├── NatalChart.tsx      # SVG chart React wrapper (calls lib/chart.ts via useRef+useEffect)
│   └── ChartDetails.tsx    # Tabular display of planets, houses, aspects
├── App.tsx                 # Root component, state management
└── main.tsx                # Entry point
tests/
├── lib/astro.test.ts
└── components/BirthDataForm.test.tsx
```

### Data flow

`BirthDataForm` → `App.tsx` calls `calculateNatalChart(birthData, houseSystem)` → returns `NatalChart` → passed to `NatalChart` component (renders SVG via D3) and `ChartDetails` (renders table). House system can be changed instantly without re-submitting (recalculates from cached `lastBirthDataRef`).

### Astrology engine (`src/lib/astro.ts`)

- All angles internally in **degrees** (0–360); convert from radians at boundaries using `normalizeDeg()`
- `astronomia` returns radians — always multiply by `180 / Math.PI`
- VSOP87 planet data lazy-loaded via `getPlanets()` singleton
- Pluto uses `astronomia/pluto` separately (not in VSOP87)
- Retrograde detection: compare longitude at JDE−1 and JDE+1
- `calculateHouses()` dispatches to 8 house system implementations; all share `HouseCalcParams`

### Chart rendering (`src/lib/chart.ts`)

- Pure D3 operating on an `<svg>` ref — no React virtual DOM
- ASC placed at 9 o'clock (180° in SVG coords); zodiac runs counter-clockwise
- `lonToAngle(lon, ascendant)` converts ecliptic longitude to SVG chart angle

## Code Conventions

### TypeScript

- Strict mode, `noUnusedLocals`, `noUnusedParameters`
- `import type { Foo }` for type-only imports
- Standard enums allowed (`erasableSyntaxOnly: false`)
- `astronomia` has no types — use `@ts-expect-error` on each import

### Formatting

- Prettier: single quotes, semicolons, trailing commas (`all`), 100-char width, 2-space indent
- Import order: React → third-party → internal types → internal modules → CSS

### Naming

- Files: camelCase for lib, PascalCase for components
- Constants/lookup tables: `UPPER_SNAKE_CASE` (`ZODIAC_SIGNS`, `ASPECT_ORBS`)
- CSS classes: kebab-case

### Components

- Functional only, named exports (except `App.tsx` uses default export)
- Props interfaces defined above the component in the same file
- Calculations wrapped in try/catch in `App.tsx`; errors displayed in Traditional Chinese

## External Services

- **OpenStreetMap Nominatim** for geocoding — no API key, rate-limited via 600ms debounce, `User-Agent: MomoAstrologyChart/1.0`
