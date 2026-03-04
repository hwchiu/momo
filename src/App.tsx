import { useState, useCallback, useEffect, useRef } from 'react';

import type { BirthData, NatalChart as NatalChartData } from './types/astro';
import { HouseSystem } from './types/astro';
import { calculateNatalChart } from './lib/astro';

import { BirthDataForm } from './components/BirthDataForm';
import { NatalChart } from './components/NatalChart';
import { ChartDetails } from './components/ChartDetails';
import './App.css';

// Default birth data: 2026-03-04, 04:26 local (GMT+8), Taipei
function getDefaultBirthData(): { birthData: BirthData; houseSystem: HouseSystem } {
  // 04:26 GMT+8 = 20:26 UTC previous day
  // 04:26 - 8h = -3:34 -> previous day 20:26 UTC
  const hour = 4;
  const minute = 26;
  const tzOffset = 8;
  const totalMinutesLocal = hour * 60 + minute;
  const totalMinutesUTC = ((totalMinutesLocal - tzOffset * 60) + 24 * 60) % (24 * 60);
  const utcHour = Math.floor(totalMinutesUTC / 60);
  const utcMinute = totalMinutesUTC % 60;

  // Date: 2026-03-04 local; since 04:26 - 8h = prev day, we need 2026-03-03 UTC
  // But to keep it simple, we'll pass 2026-03-04 and let the hour indicate early morning
  // Actually: 2026-03-04 04:26 GMT+8 = 2026-03-03 20:26 UTC
  // We handle this by adjusting the day
  const birthData: BirthData = {
    year: 2026,
    month: 3,
    day: 3, // UTC date (one day back)
    hour: utcHour,
    minute: utcMinute,
    latitude: 25.05,
    longitude: 121.5,
    locationName: '台北市',
  };

  return { birthData, houseSystem: HouseSystem.Alcabitius };
}

function App() {
  const [chart, setChart] = useState<NatalChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const runCalculation = useCallback((birthData: BirthData, houseSystem: HouseSystem) => {
    setIsLoading(true);
    setError(null);
    startTimeRef.current = performance.now();

    setTimeout(() => {
      try {
        const result = calculateNatalChart(birthData, houseSystem);
        setChart(result);
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        setRenderTime(elapsed);
      } catch (err) {
        console.error('Chart calculation error:', err);
        setError(
          err instanceof Error
            ? `計算星盤時發生錯誤：${err.message}`
            : '計算星盤時發生未知錯誤',
        );
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, []);

  // Auto-calculate on page load with default data
  useEffect(() => {
    const { birthData, houseSystem } = getDefaultBirthData();
    runCalculation(birthData, houseSystem);
  }, [runCalculation]);

  const handleSubmit = useCallback(
    (birthData: BirthData, houseSystem: HouseSystem) => {
      runCalculation(birthData, houseSystem);
    },
    [runCalculation],
  );

  return (
    <div className="almuten-app">

      {/* ---- Top nav links ---- */}
      <div className="top-nav">
        <a href="#" className="nav-link active-lang">繁體中文</a>
        <span className="nav-sep">|</span>
        <a href="#" className="nav-link">切換至手機版</a>
        <span className="nav-sep">|</span>
        <a href="#" className="nav-link">星象日曆</a>
      </div>

      {/* ---- Header ---- */}
      <header className="site-header">
        <h1 className="site-title">宮神星網 Almuten.net</h1>
        <p className="site-subtitle">線上古典占星圖</p>
        <h2 className="site-title-2">宮神星網 Almuten.net - 線上古典占星圖</h2>
      </header>

      {/* ---- Main content ---- */}
      <main className="site-main">

        {/* Quick chart section */}
        <section className="quick-chart-section">
          <h3 className="section-heading">快速製圖</h3>
          <BirthDataForm onSubmit={handleSubmit} isLoading={isLoading} />
        </section>

        {/* Results section */}
        {error && (
          <div className="error-banner">{error}</div>
        )}

        {isLoading && (
          <div className="loading-msg">正在計算星盤，請稍候...</div>
        )}

        {chart && !isLoading && (
          <section className="chart-section">
            <h3 className="section-heading">
              星盤 &mdash; {chart.birthData.locationName}
            </h3>

            {/* SVG chart */}
            <div className="chart-visual">
              <NatalChart chart={chart} size={540} />
            </div>

            {/* Tabular details */}
            <ChartDetails chart={chart} />
          </section>
        )}
      </main>

      {/* ---- Footer ---- */}
      <footer className="site-footer">
        {renderTime !== null && (
          <span>Page rendered in {renderTime.toFixed(3)} seconds &nbsp;|&nbsp; </span>
        )}
        <span>&copy; 2012-2026 Almuten.net</span>
      </footer>
    </div>
  );
}

export default App;
