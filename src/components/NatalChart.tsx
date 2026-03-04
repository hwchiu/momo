import { useRef, useEffect } from 'react';
import type { NatalChart as NatalChartData } from '../types/astro';
import { renderNatalChart } from '../lib/chart';

interface NatalChartProps {
  chart: NatalChartData;
  size?: number;
}

export function NatalChart({ chart, size = 600 }: NatalChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      renderNatalChart(svgRef.current, chart, size);
    }
  }, [chart, size]);

  return (
    <div className="natal-chart-container">
      <svg ref={svgRef} className="natal-chart-svg" />
    </div>
  );
}
