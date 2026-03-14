import { it, expect } from 'vitest';
import { calculateNatalChart } from '../../src/lib/astro';
import { HouseSystem } from '../../src/types/astro';

it('Hsinchu 1990-03-17 reference', () => {
  const chart = calculateNatalChart(
    {
      year: 1990,
      month: 3,
      day: 17,
      hour: 2,
      minute: 51,
      latitude: 24.8,
      longitude: 120.967,
      locationName: '新竹市',
    },
    HouseSystem.Alcabitius,
  );

  const signs = [
    '牡羊',
    '金牛',
    '雙子',
    '巨蟹',
    '獅子',
    '處女',
    '天秤',
    '天蠍',
    '射手',
    '摩羯',
    '水瓶',
    '雙魚',
  ];

  console.log('=== Planets ===');
  for (const p of chart.planets) {
    const lon = p.longitude;
    const signIdx = Math.floor(lon / 30);
    const deg = Math.floor(lon % 30);
    const min = Math.round(((lon % 30) - Math.floor(lon % 30)) * 60);
    console.log(
      `${p.planet}: ${deg}°${signs[signIdx]}${String(min).padStart(2, '0')}' lon=${lon.toFixed(2)} H${p.house} ${p.retrograde ? 'Rx' : ''}`,
    );
  }

  console.log('\n=== Houses ===');
  for (const h of chart.houses) {
    const lon = h.longitude;
    const signIdx = Math.floor(lon / 30);
    const deg = Math.floor(lon % 30);
    const min = Math.round(((lon % 30) - Math.floor(lon % 30)) * 60);
    console.log(
      `H${h.house}: ${deg}°${signs[signIdx]}${String(min).padStart(2, '0')}' lon=${lon.toFixed(2)}`,
    );
  }

  console.log(`\nASC: ${chart.ascendant.toFixed(2)}`);
  console.log(`MC:  ${chart.midheaven.toFixed(2)}`);

  expect(true).toBe(true);
});
