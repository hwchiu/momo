# AGENTS.md

Guidelines for AI agents operating in this repository.

## Project Overview

Natal chart (astrology birth chart) web application built with React + TypeScript.
Users input birth date, time, and location; the app calculates planetary positions
and renders an SVG natal chart. UI language is Traditional Chinese (繁體中文).

**Tech stack**: React 19, TypeScript 5.9, Vite 7, D3.js (SVG rendering),
`astronomia` (planetary calculations), Vitest (testing).

## Build / Dev / Lint / Test Commands

```bash
npm run dev          # Start dev server (Vite HMR)
npm run build        # TypeScript check + production build
npm run lint         # ESLint (flat config)
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm run typecheck    # TypeScript only (no build)
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

### Running a single test

```bash
# By file path
npx vitest run tests/lib/astro.test.ts

# By test name pattern (-t flag)
npx vitest run -t "should place the Sun in Capricorn"

# Single file in watch mode
npx vitest tests/lib/astro.test.ts

# Verbose output for a single file
npx vitest run --reporter=verbose tests/lib/astro.test.ts
```

### Test configuration

- Framework: Vitest 4 with jsdom environment
- Setup file: `tests/setup.ts` (imports `@testing-library/jest-dom`)
- Test location: `tests/**/*.test.{ts,tsx}`
- Config: `vite.config.ts` → `test` block
- `globals: true` — no need to import `describe/it/expect` in test files

## Project Structure

```
src/
├── types/astro.ts          # All TypeScript types, enums, and display constants
├── lib/
│   ├── astro.ts            # Astronomy engine (planetary positions, houses, aspects)
│   ├── chart.ts            # D3.js SVG natal chart rendering logic
│   └── geocode.ts          # OpenStreetMap Nominatim geocoding
├── components/
│   ├── BirthDataForm.tsx   # Birth data input form with location autocomplete
│   ├── NatalChart.tsx      # SVG chart React wrapper (uses lib/chart.ts)
│   └── ChartDetails.tsx    # Tabular display of planets, houses, aspects
├── App.tsx                 # Root component, state management
├── App.css                 # All component styles
├── index.css               # Global styles, fonts, reset
└── main.tsx                # Entry point
tests/
├── setup.ts                # Vitest setup (jest-dom matchers)
├── lib/astro.test.ts       # Astronomy calculation tests
└── components/BirthDataForm.test.tsx  # Form component tests
```

## Code Style Guidelines

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- `noUnusedLocals` and `noUnusedParameters` enforced — no unused variables
- `erasableSyntaxOnly: false` — standard enums are allowed
- Target: ES2022, module: ESNext, JSX: react-jsx
- Use `type` imports for type-only imports: `import type { Foo } from './bar'`

### Formatting (Prettier)

- Single quotes, semicolons, trailing commas (`all`)
- Print width: 100 characters
- 2-space indentation
- Arrow parens: always `(x) => ...`
- Config: `.prettierrc`

### Imports

Order imports as follows (separated by blank lines):
1. React / framework imports
2. Third-party library imports (`d3`, `astronomia/*`)
3. Internal type imports (`../types/astro`)
4. Internal module imports (`../lib/...`, `../components/...`)
5. CSS imports

For `astronomia` (no type declarations), use `@ts-expect-error`:
```typescript
// @ts-expect-error astronomia has no type declarations
import * as julian from 'astronomia/julian';
```

### Naming Conventions

- **Files**: camelCase for lib (`astro.ts`), PascalCase for components (`NatalChart.tsx`)
- **Types/Interfaces**: PascalCase (`BirthData`, `PlanetPosition`)
- **Enums**: PascalCase name + PascalCase members (`ZodiacSign.Aries`)
- **Functions**: camelCase (`calculateNatalChart`, `getSunLongitude`)
- **Constants**: UPPER_SNAKE_CASE for lookup tables (`ZODIAC_SIGNS`, `ASPECT_ORBS`)
- **CSS classes**: kebab-case (`birth-data-form`, `natal-chart-container`)
- **Private/internal functions**: no underscore prefix, just not exported

### Component Patterns

- Functional components only (no classes)
- Named exports for components: `export function NatalChart(...)`
- Default export only for `App.tsx`
- Props interfaces defined above the component in the same file
- Use `useRef` + `useEffect` for D3 DOM manipulation (not React virtual DOM)

### Error Handling

- Wrap calculations in try/catch in the UI layer (`App.tsx`)
- Display user-friendly error messages in Traditional Chinese
- Log original errors to console with `console.error`
- Geocoding errors are caught and shown inline in the form
- Use `err instanceof Error` type guard before accessing `.message`

### Astrology Engine (`src/lib/astro.ts`)

- All angles are internally in **degrees** (0-360), converted from radians at boundaries
- `normalizeDeg()` normalizes angles to [0, 360)
- `astronomia` functions return radians — always convert with `* (180 / Math.PI)`
- VSOP87 planet data is lazy-loaded via `getPlanets()` singleton
- Pluto uses a separate algorithm (`astronomia/pluto`) since it's not in VSOP87
- Retrograde detection: compare longitude at JDE-1 and JDE+1
- `calculateNatalChart(birthData, houseSystem)` — second arg defaults to Placidus
- ASC and MC are calculated independently of house system

### House Systems (`HouseSystem` enum)

8 house systems are supported, selectable at runtime via a dropdown.
The user can switch systems instantly without re-submitting the form.

| System | Key | Algorithm |
|--------|-----|-----------|
| Placidus | `Placidus` | Semi-arc trisection (default, most common) |
| Whole Sign | `WholeSign` | Each sign = one house, cusp at 0° of sign |
| Equal House | `EqualHouse` | ASC = House 1 cusp, each house +30° |
| Porphyry | `Porphyry` | MC→ASC and ASC→IC arcs trisected |
| Alcabitius | `Alcabitius` | Diurnal semi-arc trisection on RA |
| Regiomontanus | `Regiomontanus` | Equator divided into 30° segments, projected to ecliptic |
| Campanus | `Campanus` | Prime vertical divided into 30° arcs, projected to ecliptic |
| Koch | `Koch` | MC semi-arc trisected by time |

Architecture: `calculateHouses()` is a dispatch function that calls the
appropriate algorithm function based on the `HouseSystem` enum value.
All algorithms share `HouseCalcParams` (obliquity, RAMC, latitude, etc.)
and return `HouseCusp[]`.

### Chart Rendering (`src/lib/chart.ts`)

- All rendering via D3.js operating on a `<svg>` ref (imperative, not React)
- Ascendant placed at 9 o'clock (180° in SVG coordinates)
- Zodiac runs counter-clockwise
- `lonToAngle(lon, ascendant)` converts ecliptic longitude to chart angle
- Planet glyphs use Unicode astronomical symbols (☉☽☿♀♂♃♄♅♆♇)
- Zodiac signs use Unicode zodiac symbols (♈♉♊♋♌♍♎♏♐♑♒♓)

### UI Language

- All user-facing text is in **Traditional Chinese** (繁體中文)
- Font stack: `'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', system-ui`
- Planet/sign/aspect names defined in `src/types/astro.ts` lookup tables
- Code comments and variable names in English

## ESLint Configuration

- Flat config format (`eslint.config.js`)
- Extends: `@eslint/js` recommended, `typescript-eslint` recommended
- Plugins: `react-hooks`, `react-refresh`
- No Prettier ESLint plugin (Prettier runs separately)

## Key Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `astronomia` | Planetary position calculations (VSOP87) | Pure JS, no types — use `@ts-expect-error` |
| `d3` + `@types/d3` | SVG chart rendering | Imperative DOM via refs |
| `react` / `react-dom` | UI framework | v19 |
| `vitest` | Test runner | Configured in `vite.config.ts` |
| `@testing-library/react` | Component testing | With `jest-dom` matchers |

## External Services

- **OpenStreetMap Nominatim** for geocoding (no API key needed)
  - Rate limit: 1 request/second (enforced via 600ms debounce)
  - User-Agent header: `MomoAstrologyChart/1.0`
  - Endpoint: `https://nominatim.openstreetmap.org/search`
