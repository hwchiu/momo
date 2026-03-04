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
  '火': '#E74C3C',
  '土': '#8B7355',
  '風': '#F0C040',
  '水': '#3498DB',
};

/** Light colors for zodiac sign backgrounds */
const ELEMENT_BG_COLORS: Record<string, string> = {
  '火': '#FDEDEC',
  '土': '#F5F0EB',
  '風': '#FFF9E6',
  '水': '#EBF5FB',
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
  const zodiacInnerRadius = outerRadius * 0.82;
  const houseOuterRadius = zodiacInnerRadius;
  const houseInnerRadius = zodiacInnerRadius * 0.35;
  const planetRadius = zodiacInnerRadius * 0.78;
  const aspectRadius = zodiacInnerRadius * 0.55;

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
 * Zodiac runs counter-clockwise.
 */
function lonToAngle(lon: number, ascendant: number): number {
  // Ascendant at 180° (left side), counter-clockwise
  return 180 - (lon - ascendant);
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
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${end1.x} ${end1.y}`,
    `L ${start2.x} ${start2.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${end2.x} ${end2.y}`,
    'Z',
  ].join(' ');
}

/**
 * Draw the zodiac ring (outer ring with 12 signs).
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
      .attr('stroke', ELEMENT_COLORS[info.element])
      .attr('stroke-width', 1);

    // Draw sign glyph
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = (dim.zodiacInnerRadius + dim.outerRadius) / 2;
    const pos = polarToXY(dim.center, dim.center, labelR, midAngle);

    g.append('text')
      .attr('x', pos.x)
      .attr('y', pos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.032)
      .attr('fill', ELEMENT_COLORS[info.element])
      .text(info.glyph);
  }

  // Zodiac division lines
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
      .attr('stroke-width', 0.5);
  }
}

/**
 * Draw house divisions.
 */
function drawHouses(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chart: NatalChart,
  dim: ChartDimensions,
) {
  const g = svg.append('g').attr('class', 'houses');
  const asc = chart.ascendant;

  // House cusp lines
  for (let i = 0; i < 12; i++) {
    const cusp = chart.houses[i];
    const angle = lonToAngle(cusp.longitude, asc);

    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    const innerR = isCardinal ? dim.houseInnerRadius : dim.houseInnerRadius * 1.5;

    const inner = polarToXY(dim.center, dim.center, innerR, angle);
    const outer = polarToXY(dim.center, dim.center, dim.houseOuterRadius, angle);

    g.append('line')
      .attr('x1', inner.x)
      .attr('y1', inner.y)
      .attr('x2', outer.x)
      .attr('y2', outer.y)
      .attr('stroke', isCardinal ? '#333' : '#aaa')
      .attr('stroke-width', isCardinal ? 2 : 1)
      .attr('stroke-dasharray', isCardinal ? 'none' : '4,2');

    // House number
    const nextCusp = chart.houses[(i + 1) % 12];
    let midLon = (cusp.longitude + nextCusp.longitude) / 2;
    if (Math.abs(cusp.longitude - nextCusp.longitude) > 180) {
      midLon = (cusp.longitude + nextCusp.longitude + 360) / 2;
    }
    const midAngle = lonToAngle(midLon, asc);
    const numPos = polarToXY(dim.center, dim.center, dim.houseInnerRadius * 1.2, midAngle);

    g.append('text')
      .attr('x', numPos.x)
      .attr('y', numPos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.022)
      .attr('fill', '#666')
      .text(String(i + 1));
  }

  // ASC label
  const ascAngle = lonToAngle(asc, asc); // = 180°
  const ascPos = polarToXY(dim.center, dim.center, dim.outerRadius + dim.size * 0.04, ascAngle);
  g.append('text')
    .attr('x', ascPos.x)
    .attr('y', ascPos.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', dim.size * 0.028)
    .attr('font-weight', 'bold')
    .attr('fill', '#E74C3C')
    .text('ASC');

  // MC label
  const mcAngle = lonToAngle(chart.midheaven, asc);
  const mcPos = polarToXY(dim.center, dim.center, dim.outerRadius + dim.size * 0.04, mcAngle);
  g.append('text')
    .attr('x', mcPos.x)
    .attr('y', mcPos.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', dim.size * 0.028)
    .attr('font-weight', 'bold')
    .attr('fill', '#2980B9')
    .text('MC');

  // Inner circle
  g.append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.houseInnerRadius)
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1);
}

/**
 * Adjust planet positions to avoid overlapping glyphs.
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

  // Push apart overlapping planets
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const diff = items[j].adjustedAngle - items[i].adjustedAngle;
        if (Math.abs(diff) < minSeparation) {
          const push = (minSeparation - Math.abs(diff)) / 2;
          items[i].adjustedAngle -= push;
          items[j].adjustedAngle += push;
        }
      }
    }
  }

  return items;
}

/**
 * Draw planet glyphs on the chart.
 */
function drawPlanets(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chart: NatalChart,
  dim: ChartDimensions,
) {
  const g = svg.append('g').attr('class', 'planets');
  const minSep = 360 / (dim.size * 0.05); // dynamic min separation based on size
  const adjusted = avoidOverlap(chart.planets, chart.ascendant, Math.max(minSep, 8));

  for (const item of adjusted) {
    const info = PLANET_INFO[item.planet.planet];
    const pos = polarToXY(dim.center, dim.center, dim.planetRadius, item.adjustedAngle);

    // Small line from actual position to glyph (if adjusted)
    const actualAngle = lonToAngle(item.planet.longitude, chart.ascendant);
    if (Math.abs(actualAngle - item.adjustedAngle) > 1) {
      const tickInner = polarToXY(
        dim.center,
        dim.center,
        dim.zodiacInnerRadius - 2,
        actualAngle,
      );
      g.append('line')
        .attr('x1', tickInner.x)
        .attr('y1', tickInner.y)
        .attr('x2', pos.x)
        .attr('y2', pos.y)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5);
    }

    // Planet glyph
    g.append('text')
      .attr('x', pos.x)
      .attr('y', pos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.035)
      .attr('fill', item.planet.retrograde ? '#E74C3C' : '#333')
      .attr('class', `planet-glyph planet-${item.planet.planet.toLowerCase()}`)
      .text(info.glyph);

    // Degree label under glyph
    const sign = ZODIAC_SIGNS[item.planet.sign];
    const labelPos = polarToXY(dim.center, dim.center, dim.planetRadius - dim.size * 0.04, item.adjustedAngle);
    g.append('text')
      .attr('x', labelPos.x)
      .attr('y', labelPos.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', dim.size * 0.018)
      .attr('fill', '#666')
      .text(`${item.planet.degree}°${sign.glyph}`);

    // Retrograde marker
    if (item.planet.retrograde) {
      const retPos = polarToXY(
        dim.center,
        dim.center,
        dim.planetRadius + dim.size * 0.025,
        item.adjustedAngle,
      );
      g.append('text')
        .attr('x', retPos.x)
        .attr('y', retPos.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', dim.size * 0.016)
        .attr('fill', '#E74C3C')
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
    const opacity = Math.max(0.2, 1 - aspect.orb / 8);

    g.append('line')
      .attr('x1', pos1.x)
      .attr('y1', pos1.y)
      .attr('x2', pos2.x)
      .attr('y2', pos2.y)
      .attr('stroke', info.color)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', opacity)
      .attr('stroke-dasharray', aspect.type === 60 || aspect.type === 120 ? 'none' : '4,3');
  }
}

/**
 * Main render function: draws the complete natal chart into an SVG element.
 */
export function renderNatalChart(
  svgElement: SVGSVGElement,
  chart: NatalChart,
  size: number = 600,
) {
  const dim = getDimensions(size);

  // Clear existing content
  const svg = d3
    .select(svgElement)
    .attr('width', size)
    .attr('height', size)
    .attr('viewBox', `0 0 ${size} ${size}`);

  svg.selectAll('*').remove();

  // Background
  svg
    .append('rect')
    .attr('width', size)
    .attr('height', size)
    .attr('fill', '#FAFAFA')
    .attr('rx', 8);

  // Draw layers in order (back to front)
  drawAspects(svg, chart, dim);
  drawHouses(svg, chart, dim);
  drawZodiacRing(svg, dim, chart.ascendant);
  drawPlanets(svg, chart, dim);

  // Outer border circle
  svg
    .append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.outerRadius)
    .attr('fill', 'none')
    .attr('stroke', '#333')
    .attr('stroke-width', 2);

  // Inner zodiac circle
  svg
    .append('circle')
    .attr('cx', dim.center)
    .attr('cy', dim.center)
    .attr('r', dim.zodiacInnerRadius)
    .attr('fill', 'none')
    .attr('stroke', '#333')
    .attr('stroke-width', 1.5);
}
