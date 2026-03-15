/**
 * D3.js-based natal chart SVG rendering logic.
 *
 * Draws a traditional circular natal chart with:
 * - Outer ring: 12 zodiac signs with glyphs
 * - Inner ring: 12 house divisions
 * - Planet glyphs at their zodiac positions
 * - Aspect lines between planets
 * - Ascendant (ASC) and Midheaven (MC) markers
 */

import * as d3 from 'd3';
import type { NatalChart, PlanetPosition } from '../types/astro';
import { ZODIAC_SIGNS, PLANET_INFO, ASPECT_INFO, ZodiacSign } from '../types/astro';

/** Colors for each zodiac element */
const ELEMENT_COLORS: Record<string, string> = {
  火: '#C0392B',
  土: '#7D6B4F',
  風: '#B7950B',
  水: '#1A6FA8',
};

/** Light colors for zodiac sign backgrounds */
const ELEMENT_BG_COLORS: Record<string, string> = {
  火: '#FDECEA',
  土: '#F4EFE9',
  風: '#FDF9E3',
  水: '#E8F4FB',
};

interface ChartDimensions {
  size: number;
  center: number;
  outerRadius: number;
  zodiacInnerRadius: number;
  houseOuterRadius: number;
  houseInnerRadius: number;
  planetRadius: number;
  aspectRadius: number;
}

function getDimensions(size: number): ChartDimensions {
  const center = size / 2;
  const outerRadius = size * 0.46;
  const zodiacInnerRadius = outerRadius * 0.83; // slightly wider zodiac ring gap for planets
  const houseOuterRadius = zodiacInnerRadius;
  const houseInnerRadius = zodiacInnerRadius * 0.33; // smaller centre circle → more house room
  const planetRadius = zodiacInnerRadius * 0.78;
  const aspectRadius = zodiacInnerRadius * 0.52;

  return {
    size,
    center,
    outerRadius,
    zodiacInnerRadius,
    houseOuterRadius,
    houseInnerRadius,
    planetRadius,
    aspectRadius,
  };
}

/**
 * Convert ecliptic longitude to chart angle.
 * In a natal chart, the Ascendant is placed at the left (9 o'clock position = 180°).
 * Zodiac runs counter-clockwise: as longitude increases, angle increases (CCW on screen).
 * Houses 1-6 appear in the lower half (below horizon), 7-12 in the upper half (above horizon).
 */
function lonToAngle(lon: number, ascendant: number): number {
  // Ascendant at 180° (left side), counter-clockwise
  return 180 + (lon - ascendant);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToXY(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

/**
 * Generate an SVG arc path string.
 */
function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const start1 = polarToXY(cx, cy, outerR, startAngle);
  const end1 = polarToXY(cx, cy, outerR, endAngle);
  const start2 = polarToXY(cx, cy, innerR, endAngle);
  const end2 = polarToXY(cx, cy, innerR, startAngle);

  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return [
    `M ${start1.x} ${start1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${end1.x} ${end1.y}`,
    `L ${start2.x} ${start2.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${end2.x} ${end2.y}`,
    'Z',
  ].join(' ');
}

/**
 * Draw the zodiac ring (outer ring with 12 signs) with degree tick marks.
 */
function drawZodiacRing(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  dim: ChartDimensions,
  ascendant: number,
) {
  const g = svg.append('g').attr('class', 'zodiac-ring');

  for (let i = 0; i < 12; i++) {
    const sign = i as ZodiacSign;
    const info = ZODIAC_SIGNS[sign];
    const startLon = i * 30;
    const endLon = (i + 1) * 30;

    const startAngle = lonToAngle(startLon, ascendant);
    const endAngle = lonToAngle(endLon, ascendant);

    // Draw sign segment
    const path = arcPath(
      dim.center,
      dim.center,
      dim.zodiacInnerRadius,
      dim.outerRadius,
      startAngle,
      endAngle,
    );

    g.append('path')
      .attr('d', path)
      .attr('fill', ELEMENT_BG_COLORS[info.element])
      .attr('stroke', 'none');

    // Draw sign glyph
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = (dim.zodiacInnerRadius + dim.outerRadius) / 2;
    const pos = polarToXY(dim.center, dim.center, labelR, midAngle);

    g.append('text')
      .attr('x', pos.x)
      .attr('y', pos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.034)
      .attr('fill', ELEMENT_COLORS[info.element])
      .text(info.glyph);
  }

  // Degree tick marks on outer edge: every 10° minor, every 30° major
  for (let deg = 0; deg < 360; deg += 10) {
    const isMajor = deg % 30 === 0;
    const angle = lonToAngle(deg, ascendant);
    const tickLen = isMajor ? dim.size * 0.013 : dim.size * 0.007;
    const outer = polarToXY(dim.center, dim.center, dim.outerRadius, angle);
    const inner = polarToXY(dim.center, dim.center, dim.outerRadius - tickLen, angle);

    g.append('line')
      .attr('x1', outer.x)
      .attr('y1', outer.y)
      .attr('x2', inner.x)
      .attr('y2', inner.y)
      .attr('stroke', isMajor ? '#999' : '#ccc')
      .attr('stroke-width', isMajor ? 1 : 0.5);
  }

  // Zodiac division lines (30° boundaries, on top of tick marks)
  for (let i = 0; i < 12; i++) {
    const lon = i * 30;
    const angle = lonToAngle(lon, ascendant);
    const inner = polarToXY(dim.center, dim.center, dim.zodiacInnerRadius, angle);
    const outer = polarToXY(dim.center, dim.center, dim.outerRadius, angle);

    g.append('line')
      .attr('x1', inner.x)
      .attr('y1', inner.y)
      .attr('x2', outer.x)
      .attr('y2', outer.y)
      .attr('stroke', '#999')
      .attr('stroke-width', 1);
  }
}

/**
 * Draw house divisions with sector shading, number badges, and styled ASC/MC labels.
 */
function drawHouses(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chart: NatalChart,
  dim: ChartDimensions,
) {
  const g = svg.append('g').attr('class', 'houses');
  const asc = chart.ascendant;

  // House sector background shading (angular > succedent > cadent)
  const HOUSE_SHADE: Record<number, string> = {
    0: 'rgba(70,70,70,0.07)', // 1st — angular
    3: 'rgba(70,70,70,0.07)', // 4th
    6: 'rgba(70,70,70,0.07)', // 7th
    9: 'rgba(70,70,70,0.07)', // 10th
    1: 'rgba(70,70,70,0.03)', // 2nd — succedent
    4: 'rgba(70,70,70,0.03)', // 5th
    7: 'rgba(70,70,70,0.03)', // 8th
    10: 'rgba(70,70,70,0.03)', // 11th
  };

  for (let i = 0; i < 12; i++) {
    const shade = HOUSE_SHADE[i];
    if (!shade) continue;

    const cusp = chart.houses[i];
    const nextCusp = chart.houses[(i + 1) % 12];
    const startAngle = lonToAngle(cusp.longitude, asc);
    const endAngle = lonToAngle(nextCusp.longitude, asc);

    const path = arcPath(
      dim.center,
      dim.center,
      dim.houseInnerRadius,
      dim.houseOuterRadius,
      startAngle,
      endAngle,
    );
    g.append('path').attr('d', path).attr('fill', shade).attr('stroke', 'none');
  }

  // House cusp lines and number badges
  for (let i = 0; i < 12; i++) {
    const cusp = chart.houses[i];
    const angle = lonToAngle(cusp.longitude, asc);

    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    const innerR = isCardinal ? dim.houseInnerRadius : dim.houseInnerRadius * 1.55;

    const inner = polarToXY(dim.center, dim.center, innerR, angle);
    const outer = polarToXY(dim.center, dim.center, dim.houseOuterRadius, angle);

    g.append('line')
      .attr('x1', inner.x)
      .attr('y1', inner.y)
      .attr('x2', outer.x)
      .attr('y2', outer.y)
      .attr('stroke', isCardinal ? '#333' : '#aaa')
      .attr('stroke-width', isCardinal ? 2 : 1)
      .attr('stroke-dasharray', isCardinal ? 'none' : '4,3');

    // House number badge
    const nextCusp = chart.houses[(i + 1) % 12];
    let midLon = (cusp.longitude + nextCusp.longitude) / 2;
    if (Math.abs(cusp.longitude - nextCusp.longitude) > 180) {
      midLon = (cusp.longitude + nextCusp.longitude + 360) / 2;
    }
    const midAngle = lonToAngle(midLon, asc);
    const numPos = polarToXY(dim.center, dim.center, dim.houseInnerRadius * 1.35, midAngle);

    // Badge background circle
    g.append('circle')
      .attr('cx', numPos.x)
      .attr('cy', numPos.y)
      .attr('r', dim.size * 0.015)
      .attr('fill', 'rgba(255,255,255,0.78)')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.8);

    g.append('text')
      .attr('x', numPos.x)
      .attr('y', numPos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.024)
      .attr('fill', '#555')
      .text(String(i + 1));
  }

  // ASC pill label
  const ascAngle = lonToAngle(asc, asc); // = 180°
  const ascPos = polarToXY(dim.center, dim.center, dim.outerRadius + dim.size * 0.042, ascAngle);
  const pillW = dim.size * 0.09;
  const pillH = dim.size * 0.028;
  g.append('rect')
    .attr('x', ascPos.x - pillW / 2)
    .attr('y', ascPos.y - pillH / 2)
    .attr('width', pillW)
    .attr('height', pillH)
    .attr('rx', dim.size * 0.005)
    .attr('fill', '#C0392B')
    .attr('opacity', 0.88);
  g.append('text')
    .attr('x', ascPos.x)
    .attr('y', ascPos.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', dim.size * 0.022)
    .attr('font-weight', 'bold')
    .attr('fill', '#fff')
    .text('ASC');

  // MC pill label
  const mcAngle = lonToAngle(chart.midheaven, asc);
  const mcPos = polarToXY(dim.center, dim.center, dim.outerRadius + dim.size * 0.042, mcAngle);
  g.append('rect')
    .attr('x', mcPos.x - pillW / 2)
    .attr('y', mcPos.y - pillH / 2)
    .attr('width', pillW)
    .attr('height', pillH)
    .attr('rx', dim.size * 0.005)
    .attr('fill', '#1A5CA8')
    .attr('opacity', 0.88);
  g.append('text')
    .attr('x', mcPos.x)
    .attr('y', mcPos.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', dim.size * 0.022)
    .attr('font-weight', 'bold')
    .attr('fill', '#fff')
    .text('MC');

  // Inner circle with subtle double ring
  g.append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.houseInnerRadius * 0.9)
    .attr('fill', 'none')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 0.5);

  g.append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.houseInnerRadius)
    .attr('fill', '#FAFAFA')
    .attr('stroke', '#888')
    .attr('stroke-width', 1.5);
}

/**
 * Adjust planet positions to avoid overlapping glyphs.
 * Handles the circular 360°→0° wraparound and runs more passes for tighter groups.
 */
function avoidOverlap(
  planets: PlanetPosition[],
  ascendant: number,
  minSeparation: number,
): Array<{ planet: PlanetPosition; adjustedAngle: number }> {
  const items = planets.map((p) => ({
    planet: p,
    adjustedAngle: lonToAngle(p.longitude, ascendant),
  }));

  // Sort by angle
  items.sort((a, b) => a.adjustedAngle - b.adjustedAngle);

  // Push apart overlapping planets, including circular wraparound
  for (let pass = 0; pass < 8; pass++) {
    // Adjacent pairs (linear)
    for (let i = 0; i < items.length - 1; i++) {
      const diff = items[i + 1].adjustedAngle - items[i].adjustedAngle;
      if (diff < minSeparation) {
        const push = (minSeparation - diff) / 2;
        items[i].adjustedAngle -= push;
        items[i + 1].adjustedAngle += push;
      }
    }
    // Wraparound: last item and first item across the 360° boundary
    const last = items.length - 1;
    if (last > 0) {
      const circularDiff = items[0].adjustedAngle + 360 - items[last].adjustedAngle;
      if (circularDiff < minSeparation) {
        const push = (minSeparation - circularDiff) / 2;
        items[last].adjustedAngle -= push;
        items[0].adjustedAngle += push;
      }
    }
  }

  return items;
}

/**
 * Draw planet glyphs on the chart.
 * - Degree labels placed outward (between glyph and zodiac ring) to prevent overlap.
 * - Tick marks on zodiac inner boundary replace ugly connector lines.
 * - Semi-transparent background circles improve legibility over house lines.
 */
function drawPlanets(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chart: NatalChart,
  dim: ChartDimensions,
) {
  const g = svg.append('g').attr('class', 'planets');
  const minSep = 360 / (dim.size * 0.05); // dynamic min separation based on size
  const adjusted = avoidOverlap(chart.planets, chart.ascendant, Math.max(minSep, 14));

  for (const item of adjusted) {
    const info = PLANET_INFO[item.planet.planet];
    const pos = polarToXY(dim.center, dim.center, dim.planetRadius, item.adjustedAngle);
    const actualAngle = lonToAngle(item.planet.longitude, chart.ascendant);

    // Tick mark on zodiac inner boundary at actual planet position (replaces connector line)
    if (Math.abs(actualAngle - item.adjustedAngle) > 2) {
      const signInfo = ZODIAC_SIGNS[item.planet.sign];
      const tickOuter = polarToXY(dim.center, dim.center, dim.zodiacInnerRadius - 2, actualAngle);
      const tickInner = polarToXY(dim.center, dim.center, dim.zodiacInnerRadius - 9, actualAngle);
      g.append('line')
        .attr('x1', tickOuter.x)
        .attr('y1', tickOuter.y)
        .attr('x2', tickInner.x)
        .attr('y2', tickInner.y)
        .attr('stroke', ELEMENT_COLORS[signInfo.element])
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6);
    }

    // Background circle for legibility
    g.append('circle')
      .attr('cx', pos.x)
      .attr('cy', pos.y)
      .attr('r', dim.size * 0.02)
      .attr('fill', 'rgba(255,255,255,0.88)')
      .attr('stroke', 'none');

    // Planet glyph
    g.append('text')
      .attr('x', pos.x)
      .attr('y', pos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.035)
      .attr('fill', item.planet.retrograde ? '#C0392B' : '#222')
      .attr('class', `planet-glyph planet-${item.planet.planet.toLowerCase()}`)
      .text(info.glyph);

    // Degree label — placed OUTWARD between glyph and zodiac ring (avoids overlap)
    const sign = ZODIAC_SIGNS[item.planet.sign];
    const labelPos = polarToXY(
      dim.center,
      dim.center,
      dim.planetRadius + dim.size * 0.032,
      item.adjustedAngle,
    );
    g.append('text')
      .attr('x', labelPos.x)
      .attr('y', labelPos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.018)
      .attr('fill', '#777')
      .text(`${item.planet.degree}°${sign.glyph}`);

    // Retrograde marker — placed inward from glyph toward centre
    if (item.planet.retrograde) {
      const retPos = polarToXY(
        dim.center,
        dim.center,
        dim.planetRadius - dim.size * 0.028,
        item.adjustedAngle,
      );
      g.append('text')
        .attr('x', retPos.x)
        .attr('y', retPos.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', dim.size * 0.016)
        .attr('fill', '#C0392B')
        .text('℞');
    }
  }
}

/**
 * Draw aspect lines between planets.
 */
function drawAspects(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chart: NatalChart,
  dim: ChartDimensions,
) {
  const g = svg.append('g').attr('class', 'aspects');

  // Build a map of planet -> angle
  const planetAngles = new Map<string, number>();
  for (const p of chart.planets) {
    planetAngles.set(p.planet, lonToAngle(p.longitude, chart.ascendant));
  }

  for (const aspect of chart.aspects) {
    const angle1 = planetAngles.get(aspect.planet1);
    const angle2 = planetAngles.get(aspect.planet2);
    if (angle1 === undefined || angle2 === undefined) continue;

    const pos1 = polarToXY(dim.center, dim.center, dim.aspectRadius, angle1);
    const pos2 = polarToXY(dim.center, dim.center, dim.aspectRadius, angle2);

    const info = ASPECT_INFO[aspect.type];
    const opacity = Math.max(0.5, 1 - aspect.orb / 10);

    g.append('line')
      .attr('x1', pos1.x)
      .attr('y1', pos1.y)
      .attr('x2', pos2.x)
      .attr('y2', pos2.y)
      .attr('stroke', info.color)
      .attr('stroke-width', aspect.orb < 3 ? 2 : 1.5)
      .attr('stroke-opacity', opacity)
      .attr('stroke-dasharray', aspect.type === 60 || aspect.type === 120 ? 'none' : '5,3');
  }
}

/**
 * Main render function: draws the complete natal chart into an SVG element.
 */
export function renderNatalChart(svgElement: SVGSVGElement, chart: NatalChart, size: number = 600) {
  const dim = getDimensions(size);

  // Clear existing content
  const svg = d3
    .select(svgElement)
    .attr('width', size)
    .attr('height', size)
    .attr('viewBox', `0 0 ${size} ${size}`);

  svg.selectAll('*').remove();

  // Radial gradient background definition
  const defs = svg.append('defs');
  const grad = defs
    .append('radialGradient')
    .attr('id', 'chart-bg-grad')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#FEFEFE');
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#EEEDE8');

  // Background rect with gradient
  svg
    .append('rect')
    .attr('width', size)
    .attr('height', size)
    .attr('fill', 'url(#chart-bg-grad)')
    .attr('rx', 10);

  // Draw layers in order (back to front)
  drawAspects(svg, chart, dim);
  drawHouses(svg, chart, dim);
  drawZodiacRing(svg, dim, chart.ascendant);
  drawPlanets(svg, chart, dim);

  // Inner zodiac boundary circle
  svg
    .append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.zodiacInnerRadius)
    .attr('fill', 'none')
    .attr('stroke', '#888')
    .attr('stroke-width', 1.5);

  // Outer border circle (main)
  svg
    .append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.outerRadius)
    .attr('fill', 'none')
    .attr('stroke', '#555')
    .attr('stroke-width', 2);

  // Thin decorative outer ring
  svg
    .append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.outerRadius + dim.size * 0.008)
    .attr('fill', 'none')
    .attr('stroke', '#aaa')
    .attr('stroke-width', 0.8);
}
