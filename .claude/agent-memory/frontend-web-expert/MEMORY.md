# Project: 宮神星網 Almuten.net Clone (Classical Astrology Natal Chart)

## Stack
- React 18 + TypeScript (strict) + Vite
- No CSS framework — custom CSS in App.css / index.css
- `astronomia` library for all astronomical calculations (no type declarations, uses @ts-expect-error)

## Architecture
- `src/types/astro.ts` — all shared TypeScript types/enums (ZodiacSign, Planet, HouseSystem, BirthData, NatalChart, etc.)
- `src/lib/astro.ts` — full astronomy engine: calculateNatalChart() is main entry point; BirthData uses UTC time
- `src/lib/geocode.ts` — OpenStreetMap Nominatim geocoding
- `src/lib/classical.ts` — classical astrology data (domicile, exaltation, detriment, fall, terms, decans, dignity scores)
- `src/lib/chart.ts` — SVG natal chart renderer (renderNatalChart function)
- `src/components/BirthDataForm.tsx` — form; handles TZ conversion before submitting UTC BirthData
- `src/components/NatalChart.tsx` — SVG chart wrapper using renderNatalChart
- `src/components/ChartDetails.tsx` — full classical tables display
- `src/App.tsx` — root; auto-calculates on load with default Taipei data

## Key Patterns
- BirthData expects UTC time; form must subtract timezone offset before submitting
- Default chart: 2026-03-04 04:26 GMT+8 Taipei (= 2026-03-03 20:26 UTC)
- Default house system: HouseSystem.Alcabitius
- Auto-calculates on mount via useEffect calling runCalculation

## Style
- Almuten.net aesthetic: white background on #f0f0f0, dense tables, mid-2000s Chinese site feel
- Font: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', Arial, sans-serif
- Table classes: .data-table, .row-even, .row-odd, .table-header
- Planet/sign glyphs: .planet-glyph, .sign-glyph (font-size 1.15em)
- Dignity colors: 廟=green, 旺=blue, 落=orange, 陷=red

## Classical Astrology Data (in src/lib/classical.ts)
- Egyptian Terms stored as {planet, endDegree} arrays per sign
- computeTermsForSign() in ChartDetails uses EGYPTIAN_TERMS directly (NOT fixed boundaries)
- isDayChart: Sun in houses 7-12 = day chart
- Combust: within 8.5° of Sun; Under sunbeams: within 17°
- Oriental/occidental: inferior planets (Mercury/Venus) orient if diff < 180; outer planets orient if 0 < diff < 180
