import { useState, useCallback, useEffect, useRef } from 'react';

import type { BirthData, NatalChart as NatalChartData, OrbConfig } from './types/astro';
import { HouseSystem, DEFAULT_ORB_CONFIG } from './types/astro';
import { calculateNatalChart } from './lib/astro';

import type { BaziInput, BaziChart as BaziChartData } from './types/bazi';
import { calculateBazi } from './lib/bazi';

import type { VedicInput, VedicChart as VedicChartData } from './types/vedic';
import { calculateVedicChart } from './lib/vedic';

import type { SynastryInput, SynastryResult as SynastryResultData } from './types/synastry';
import { calculateSynastry } from './lib/synastry';

import { BirthDataForm } from './components/BirthDataForm';
import { NatalChart } from './components/NatalChart';
import { ChartDetails } from './components/ChartDetails';
import { TransitPanel } from './components/TransitPanel';
import { ArabicPartsPanel } from './components/ArabicPartsPanel';
import { ProfectionsPanel } from './components/ProfectionsPanel';
import { SolarReturnPanel } from './components/SolarReturnPanel';
import { BaziForm } from './components/BaziForm';
import { BaziResult } from './components/BaziResult';
import { KuaPanel } from './components/KuaPanel';
import { FlyingStarsPanel } from './components/FlyingStarsPanel';
import { DateSelectTool } from './components/DateSelectTool';
import { VedicForm } from './components/VedicForm';
import { VedicResult } from './components/VedicResult';
import { SynastryForm } from './components/SynastryForm';
import { SynastryResult } from './components/SynastryResult';
import { LoadingMessage } from './components/LoadingMessage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NumerologyPanel } from './components/NumerologyPanel';
import { FengshuiPanel } from './components/FengshuiPanel';
import { ClientDatabase } from './components/ClientDatabase';
import type { ClientRecord } from './types/client';
import './App.css';

// Default birth data: 2026-03-04, 04:26 local (GMT+8), Taipei
function getDefaultBirthData(): { birthData: BirthData; houseSystem: HouseSystem } {
  // 04:26 GMT+8 = 20:26 UTC previous day
  // 04:26 - 8h = -3:34 -> previous day 20:26 UTC
  const hour = 4;
  const minute = 26;
  const tzOffset = 8;
  const totalMinutesLocal = hour * 60 + minute;
  const totalMinutesUTC = (totalMinutesLocal - tzOffset * 60 + 24 * 60) % (24 * 60);
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
  const [activeTab, setActiveTab] = useState<
    'natal' | 'bazi' | 'vedic' | 'synastry' | 'numerology' | 'fengshui' | 'clients'
  >('natal');

  // Shared aspect orb config (natal chart + synastry)
  const [orbConfig, setOrbConfig] = useState<OrbConfig>(DEFAULT_ORB_CONFIG);
  // Store last birth data so orb changes can re-trigger calculation
  const lastNatalRef = useRef<{ birthData: BirthData; houseSystem: HouseSystem } | null>(null);

  // Prefill data for BirthDataForm (set when loading a client)
  const [prefillData, setPrefillData] = useState<{
    birthData: BirthData;
    houseSystem: HouseSystem;
    tzOffset: number;
    key: number;
  } | null>(null);
  const prefillKeyRef = useRef(0);

  // Natal chart state
  const [chart, setChart] = useState<NatalChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bazi state
  const [baziChart, setBaziChart] = useState<BaziChartData | null>(null);
  const [baziLoading, setBaziLoading] = useState(false);
  const [baziError, setBaziError] = useState<string | null>(null);

  // Vedic state
  const [vedicChart, setVedicChart] = useState<VedicChartData | null>(null);
  const [vedicLoading, setVedicLoading] = useState(false);
  const [vedicError, setVedicError] = useState<string | null>(null);

  // Synastry state
  const [synastryResult, setSynastryResult] = useState<SynastryResultData | null>(null);
  const [synastryLoading, setSynastryLoading] = useState(false);
  const [synastryError, setSynastryError] = useState<string | null>(null);

  const runCalculation = useCallback(
    (birthData: BirthData, houseSystem: HouseSystem, orbs: OrbConfig) => {
      lastNatalRef.current = { birthData, houseSystem };
      setIsLoading(true);
      setError(null);
      setTimeout(() => {
        try {
          const result = calculateNatalChart(birthData, houseSystem, orbs);
          setChart(result);
        } catch (err) {
          console.error('Chart calculation error:', err);
          setError(
            err instanceof Error ? `計算星盤時發生錯誤：${err.message}` : '計算星盤時發生未知錯誤',
          );
        } finally {
          setIsLoading(false);
        }
      }, 50);
    },
    [],
  );

  // Auto-calculate on page load with default data
  useEffect(() => {
    const { birthData, houseSystem } = getDefaultBirthData();
    runCalculation(birthData, houseSystem, orbConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runCalculation]);

  // Re-run calculation when orbs change (if a chart has been calculated)
  useEffect(() => {
    if (lastNatalRef.current) {
      const { birthData, houseSystem } = lastNatalRef.current;
      runCalculation(birthData, houseSystem, orbConfig);
    }
  }, [orbConfig, runCalculation]);

  const handleSubmit = useCallback(
    (birthData: BirthData, houseSystem: HouseSystem) => {
      runCalculation(birthData, houseSystem, orbConfig);
    },
    [runCalculation, orbConfig],
  );

  const handleLoadClient = useCallback(
    (client: ClientRecord) => {
      setActiveTab('natal');
      const hs = Object.values(HouseSystem).includes(client.houseSystem as HouseSystem)
        ? (client.houseSystem as HouseSystem)
        : HouseSystem.Alcabitius;
      const birthData: BirthData = {
        year: client.birthData.year,
        month: client.birthData.month,
        day: client.birthData.day,
        hour: client.birthData.hour,
        minute: client.birthData.minute,
        latitude: client.birthData.latitude,
        longitude: client.birthData.longitude,
        locationName: client.birthData.locationName,
      };
      // Pre-fill the form fields so the user sees the client's data
      prefillKeyRef.current += 1;
      setPrefillData({
        birthData,
        houseSystem: hs,
        tzOffset: client.birthData.tzOffset ?? 8,
        key: prefillKeyRef.current,
      });
      // Also trigger chart calculation immediately
      runCalculation(birthData, hs, orbConfig);
    },
    [runCalculation, orbConfig],
  );

  const handleBaziSubmit = useCallback((input: BaziInput) => {
    setBaziLoading(true);
    setBaziError(null);
    setTimeout(() => {
      try {
        const result = calculateBazi(input);
        setBaziChart(result);
      } catch (err) {
        console.error('Bazi calculation error:', err);
        setBaziError(
          err instanceof Error ? `計算八字時發生錯誤：${err.message}` : '計算八字時發生未知錯誤',
        );
      } finally {
        setBaziLoading(false);
      }
    }, 50);
  }, []);

  const handleSynastrySubmit = useCallback(
    (input: SynastryInput) => {
      setSynastryLoading(true);
      setSynastryError(null);
      setTimeout(() => {
        try {
          const chartA = calculateNatalChart(input.birthDataA, input.houseSystemA, orbConfig);
          const chartB = calculateNatalChart(input.birthDataB, input.houseSystemB, orbConfig);
          const result = calculateSynastry(input.nameA, chartA, input.nameB, chartB, orbConfig);
          setSynastryResult(result);
        } catch (err) {
          console.error('Synastry calculation error:', err);
          setSynastryError(
            err instanceof Error ? `計算合盤時發生錯誤：${err.message}` : '計算合盤時發生未知錯誤',
          );
        } finally {
          setSynastryLoading(false);
        }
      }, 50);
    },
    [orbConfig],
  );

  const handleVedicSubmit = useCallback((input: VedicInput) => {
    setVedicLoading(true);
    setVedicError(null);
    setTimeout(() => {
      try {
        const result = calculateVedicChart(input);
        setVedicChart(result);
      } catch (err) {
        console.error('Vedic calculation error:', err);
        setVedicError(
          err instanceof Error ? `計算命盤時發生錯誤：${err.message}` : '計算命盤時發生未知錯誤',
        );
      } finally {
        setVedicLoading(false);
      }
    }, 50);
  }, []);

  const NAV_ITEMS = [
    { id: 'natal',      icon: '✦', label: '星盤分析' },
    { id: 'bazi',       icon: '☯', label: '風水八字' },
    { id: 'vedic',      icon: '卍', label: '印度占星' },
    { id: 'synastry',   icon: '⚭', label: '雙人合盤' },
    { id: 'numerology', icon: '∞', label: '數字學' },
    { id: 'fengshui',   icon: '⬡', label: '格局風水' },
    { id: 'clients',    icon: '◎', label: '客戶管理' },
  ] as const;

  return (
    <div className="almuten-app">
      {/* ── Sidebar ── */}
      <aside className="stellar-sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">✦</span>
          <span className="sidebar-logo-text">星盤</span>
        </div>
        <nav className="sidebar-nav" role="tablist" aria-label="功能導覽">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeTab === item.id}
              className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-text">momo.hwchiu</span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="stellar-main">
        {/* Content header */}
        <header className="stellar-header">
          <div className="stellar-header-star">✦</div>
          <h1 className="stellar-title">星盤繪製器</h1>
          <p className="stellar-subtitle">線上古典占星・命理工具</p>
        </header>

        {/* Scrollable content area */}
        <ErrorBoundary>
          <main className="stellar-content">

            {activeTab === 'natal' && (
              <div role="tabpanel" id="panel-natal" className="natal-workspace">
                {/* Left column: form + chart */}
                <div className="natal-left">
                  <section className="glass-panel">
                    <h3 className="panel-heading">快速製圖</h3>
                    <BirthDataForm
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      orbConfig={orbConfig}
                      onOrbChange={setOrbConfig}
                      prefillData={prefillData}
                    />
                  </section>

                  {error && <div className="error-banner">{error}</div>}
                  {isLoading && <LoadingMessage text="推算星象中，請稍候⋯" />}

                  {chart && !isLoading && (
                    <section className="glass-panel chart-visual-panel">
                      <h3 className="panel-heading">
                        星盤 &mdash; {chart.birthData.locationName}
                      </h3>
                      <div className="chart-visual">
                        <NatalChart chart={chart} size={480} />
                      </div>
                    </section>
                  )}
                </div>

                {/* Right column: data panels */}
                {chart && !isLoading && (
                  <div className="natal-right">
                    <ChartDetails chart={chart} />
                    <TransitPanel natalChart={chart} />
                    <ArabicPartsPanel chart={chart} />
                    <ProfectionsPanel chart={chart} />
                    <SolarReturnPanel chart={chart} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bazi' && (
              <div role="tabpanel" id="panel-bazi" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">八字排盤</h3>
                  <BaziForm onSubmit={handleBaziSubmit} isLoading={baziLoading} />
                </section>

                {baziError && <div className="error-banner">{baziError}</div>}
                {baziLoading && <LoadingMessage text="推算八字命盤中，請稍候⋯" />}

                {baziChart && !baziLoading && (
                  <>
                    <section className="glass-panel chart-section">
                      <BaziResult chart={baziChart} />
                    </section>
                    <section className="glass-panel">
                      <h3 className="panel-heading">本命卦 · 八宅方位</h3>
                      <KuaPanel chart={baziChart} />
                    </section>
                  </>
                )}

                <section className="glass-panel">
                  <h3 className="panel-heading">流年紫白飛星</h3>
                  <FlyingStarsPanel />
                </section>

                <section className="glass-panel">
                  <h3 className="panel-heading">擇日工具</h3>
                  <DateSelectTool defaultYearBranch={baziChart?.yearPillar.branch} />
                </section>
              </div>
            )}

            {activeTab === 'vedic' && (
              <div role="tabpanel" id="panel-vedic" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">印度占星命盤</h3>
                  <VedicForm onSubmit={handleVedicSubmit} isLoading={vedicLoading} />
                </section>

                {vedicError && <div className="error-banner">{vedicError}</div>}
                {vedicLoading && <LoadingMessage text="推算吠陀命盤中，請稍候⋯" />}

                {vedicChart && !vedicLoading && (
                  <section className="glass-panel chart-section">
                    <VedicResult chart={vedicChart} />
                  </section>
                )}
              </div>
            )}

            {activeTab === 'synastry' && (
              <div role="tabpanel" id="panel-synastry" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">雙人合盤分析</h3>
                  <SynastryForm onSubmit={handleSynastrySubmit} isLoading={synastryLoading} />
                </section>

                {synastryError && <div className="error-banner">{synastryError}</div>}
                {synastryLoading && <LoadingMessage text="推算雙星交匯中，請稍候⋯" />}

                {synastryResult && !synastryLoading && (
                  <section className="glass-panel chart-section">
                    <SynastryResult result={synastryResult} />
                  </section>
                )}
              </div>
            )}

            {activeTab === 'numerology' && (
              <div role="tabpanel" id="panel-numerology" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">數字學分析</h3>
                  <NumerologyPanel initialBirthData={chart ? chart.birthData : undefined} />
                </section>
              </div>
            )}

            {activeTab === 'fengshui' && (
              <div role="tabpanel" id="panel-fengshui" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">格局風水・飛星分析</h3>
                  <FengshuiPanel />
                </section>
              </div>
            )}

            {activeTab === 'clients' && (
              <div role="tabpanel" id="panel-clients" className="full-panel">
                <section className="glass-panel">
                  <h3 className="panel-heading">客戶管理</h3>
                  <ClientDatabase onLoadClient={handleLoadClient} />
                </section>
              </div>
            )}

          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
