import { it, expect } from 'vitest';
import { calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem } from '../../src/types/astro';

// reference: 2026-03-04 23:41 GMT+8 → UTC 15:41
// Taipei: 25°03'N, 121°30'E, Alcabitius

const ALMUTEN_PLANETS: Record<string, {lon: number, house: number, rx?: boolean}> = {
  Sun:     { lon: 344.067, house: 4 },   // 14°04' Pisces
  Moon:    { lon: 178.25,  house: 10 },  // 28°15' Virgo
  Mercury: { lon: 349.55,  house: 4, rx: true },  // 19°33' Pisces Rx
  Venus:   { lon: 357.767, house: 4 },   // 27°46' Pisces
  Mars:    { lon: 331.617, house: 3 },   // 1°37' Pisces
  Jupiter: { lon: 105.15,  house: 8, rx: true }, // 15°09' Cancer Rx
  Saturn:  { lon: 2.167,   house: 4 },   // 2°10' Aries
  Uranus:  { lon: 57.817,  house: 6 },   // 27°49' Taurus
  Neptune: { lon: 1.183,   house: 4 },   // 1°11' Aries
  Pluto:   { lon: 304.633, house: 3 },   // 4°38' Aquarius
};

const ALMUTEN_HOUSES = [
  241.283, // H1 ASC: 1°17' Sagittarius
  272.283, // H2: 2°17' Capricorn
  303.517, // H3: 3°31' Aquarius
  337.483, // H4 IC: 7°29' Pisces
  6.35,    // H5: 6°21' Aries
  34.767,  // H6: 4°46' Taurus
  61.283,  // H7 DSC: 1°17' Gemini
  92.283,  // H8: 2°17' Cancer
  123.517, // H9: 3°31' Leo
  157.483, // H10 MC: 7°29' Virgo
  186.35,  // H11: 6°21' Libra
  214.767, // H12: 4°46' Scorpio
];

const SIGNS = ['♈牡羊','♉金牛','♊雙子','♋巨蟹','♌獅子','♍處女','♎天秤','♏天蠍','♐射手','♑摩羯','♒水瓶','♓雙魚'];

function lonToStr(lon: number): string {
  const s = Math.floor(lon / 30);
  const d = Math.floor(lon % 30);
  const m = Math.round((lon % 30 - d) * 60);
  return `${d}°${SIGNS[s]}${String(m).padStart(2,'0')}'`;
}

it('compares our engine with reference', () => {
  // UTC: 2026-03-04 15:41
  const chart = calculateNatalChart({
    year: 2026, month: 3, day: 4,
    hour: 15, minute: 41,
    latitude: 25.05, longitude: 121.5,
    locationName: '台北市',
  }, HouseSystem.Alcabitius);
  
  console.log('\n=== 行星位置對比 ===');
  console.log('行星       我們的結果          參考          差距(°) 落宮比較');
  
  for (const p of chart.planets) {
    const ref = ALMUTEN_PLANETS[p.planet];
    if (!ref) continue;
    const ourLon = p.longitude;
    let diff = Math.abs(ourLon - ref.lon);
    if (diff > 180) diff = 360 - diff;
    const rxMatch = ref.rx ? (p.retrograde ? '✓Rx' : '✗noRx') : (p.retrograde ? '✗Rx!' : '');
    const houseMatch = p.house === ref.house ? '✓' : `✗(應${ref.house})`;
    console.log(`${p.planet.padEnd(10)} ${lonToStr(ourLon).padEnd(16)} ref:${lonToStr(ref.lon).padEnd(16)} Δ${diff.toFixed(2)}° H${p.house}${houseMatch} ${rxMatch}`);
  }
  
  console.log('\n=== 宮位對比 ===');
  console.log('宮位  我們的結果        參考        差距(°)');
  for (let i = 0; i < 12; i++) {
    const ours = chart.houses[i].longitude;
    const ref = ALMUTEN_HOUSES[i];
    let diff = Math.abs(ours - ref);
    if (diff > 180) diff = 360 - diff;
    const label = [1,4,7,10].includes(i+1) ? `H${i+1}*` : `H${i+1} `;
    console.log(`${label}  ${lonToStr(ours).padEnd(16)} ref:${lonToStr(ref).padEnd(16)} Δ${diff.toFixed(2)}°`);
  }
  
  console.log(`\nASC: ${lonToStr(chart.ascendant)} | ref: ${lonToStr(241.283)}`);
  console.log(`MC:  ${lonToStr(chart.midheaven)} | ref: ${lonToStr(157.483)}`);
  
  expect(true).toBe(true);
});
