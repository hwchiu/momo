# Copilot Instructions

Natal chart (astrology birth chart) web app. Users input birth date, time, and location; the app calculates planetary positions and renders an interactive SVG chart. All user-facing text is in **Traditional Chinese** (繁體中文); code comments and variable names in English.

**Stack**: React 19, TypeScript 5.9, Vite 7, D3.js 7, `astronomia` 4.2, Vitest 4.

## Commands

```bash
npm run dev          # Dev server (Vite HMR)
npm run build        # TypeScript check + production build
npm run lint         # ESLint
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm run typecheck    # TypeScript only
npm run test         # Run all tests once (~268 tests)
npm run test:watch   # Watch mode
```

**Single test:**
```bash
npx vitest run tests/lib/astro.test.ts
npx vitest run -t "should place the Sun in Capricorn"
npx vitest run --reporter=verbose tests/lib/astro.test.ts
```

## Architecture

The app has four independent modules, each with its own form, calculation engine, and result display. `App.tsx` owns all state and tab routing.

```
BirthDataForm  →  calculateNatalChart()  →  NatalChart (D3 SVG) + ChartDetails + panels
BaziForm       →  calculateBazi()        →  BaziResult
VedicForm      →  calculateVedicChart()  →  VedicResult + VedicDasha + SouthIndianChart
SynastryForm   →  calculateSynastry()    →  SynastryResult + SynastryChart
```

**House system switching** recalculates instantly from a cached `lastNatalRef` without re-submitting the form. **Orb config** is shared between natal and synastry modules via `App.tsx` state.

### Source layout

```
src/
├── types/          # All TS types, enums, and display constants — single source of truth
│   ├── astro.ts    # Western astrology (planets, houses, aspects, orbs)
│   ├── bazi.ts     # Chinese four-pillars
│   ├── vedic.ts    # Vedic / Jyotish
│   ├── synastry.ts # Synastry (two-person chart)
│   └── returns.ts  # Solar return and annual profections
├── lib/            # Pure calculation engines (no React)
├── components/     # React UI components
├── hooks/          # Custom hooks (useGeoSearch.ts)
└── App.tsx         # Root: tab state, all chart state, calls lib functions
```

## Key Conventions

### TypeScript
- Strict mode with `noUnusedLocals` / `noUnusedParameters` — no dead code
- `import type { Foo }` for type-only imports
- Standard enums are **allowed** (`erasableSyntaxOnly: false`)
- `@` alias resolves to `src/` (e.g., `import { ... } from '@/types/astro'`)

### astronomia imports
`astronomia` has no type declarations. Use `@ts-expect-error` on **every** import line:
```ts
// @ts-expect-error astronomia has no type declarations
import * as julian from 'astronomia/julian';
```

### Astrology engine (`src/lib/astro.ts`)
- All angles are internally in **degrees** (0–360). Convert from radians at the boundary: `value * (180 / Math.PI)`
- `normalizeDeg()` clamps any angle to [0, 360)
- `RAD = Math.PI / 180`, `DEG = 180 / Math.PI` constants at the top of each lib file
- VSOP87 planet data is lazy-loaded once via `getPlanets()` singleton
- Pluto uses `astronomia/pluto` separately (not in VSOP87)
- Retrograde detection: compare longitude at JDE−1 and JDE+1
- `BirthData.hour` / `minute` are **UTC** — callers must convert from local time before passing in

### Chart rendering (`src/lib/chart.ts`)
- Pure D3 operating on an `<svg>` ref — never manipulate the DOM through React's virtual DOM
- ASC placed at 9 o'clock (180° in SVG coords); zodiac runs counter-clockwise
- `lonToAngle(lon, ascendant)` converts ecliptic longitude to SVG chart angle
- `NatalChart.tsx` calls into `lib/chart.ts` via `useRef` + `useEffect`

### Components
- Functional components only, named exports (`export function Foo`)
- Default export only for `App.tsx`
- Props interfaces defined in the same file, directly above the component
- Errors caught in `App.tsx` try/catch; displayed in Traditional Chinese

### Formatting
- Prettier: single quotes, semicolons, trailing commas (`all`), 100-char width, 2-space indent
- Import order: React → third-party → internal types (`@/types/`) → internal modules → CSS

## Deployment
- Vite `base` is `/momo/` — all asset references in `index.html` must use the `/momo/` prefix (e.g., `href="/momo/favicon.svg"`)
- Google Fonts (`Noto Sans TC`) is loaded via CDN link in `index.html` — required for Chinese character rendering

## External Services
- **OpenStreetMap Nominatim** for geocoding — no API key needed
- Rate-limited via 600 ms debounce in `useGeoSearch.ts`
- `User-Agent: MomoAstrologyChart/1.0`
