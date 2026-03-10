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
import { QiMenPanel } from './components/QiMenPanel';
import { ZiWeiPanel } from './components/ZiWeiPanel';
import { NumerologyPanel } from './components/NumerologyPanel';
import { VedicForm } from './components/VedicForm';
import { VedicResult } from './components/VedicResult';
import { SynastryForm } from './components/SynastryForm';
import { SynastryResult } from './components/SynastryResult';
import { LoadingMessage } from './components/LoadingMessage';
import { ErrorBoundary } from './components/ErrorBoundary';
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
    'natal' | 'bazi' | 'ziwei' | 'vedic' | 'synastry' | 'numerology' | 'fengshui' | 'clients'
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

  return (
    <div className="almuten-app">
      {/* ---- Top nav ---- */}
      <div className="top-nav">
        <span className="nav-link active-lang">繁體中文</span>
      </div>

      {/* ---- Header ---- */}
      <header className="site-header">
        <h1 className="site-title">星盤繪製器</h1>
        <p className="site-subtitle">線上古典占星圖</p>
      </header>

      {/* ---- Tab navigation ---- */}
      <div className="tab-nav" role="tablist" aria-label="功能分頁">
        <button
          role="tab"
          aria-selected={activeTab === 'natal'}
          aria-controls="panel-natal"
          id="tab-natal"
          className={`tab-btn ${activeTab === 'natal' ? 'active' : ''}`}
          onClick={() => setActiveTab('natal')}
        >
          星盤分析
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'bazi'}
          aria-controls="panel-bazi"
          id="tab-bazi"
          className={`tab-btn ${activeTab === 'bazi' ? 'active' : ''}`}
          onClick={() => setActiveTab('bazi')}
        >
          風水八字
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'ziwei'}
          aria-controls="panel-ziwei"
          id="tab-ziwei"
          className={`tab-btn ${activeTab === 'ziwei' ? 'active' : ''}`}
          onClick={() => setActiveTab('ziwei')}
        >
          紫微斗數
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'numerology'}
          aria-controls="panel-numerology"
          id="tab-numerology"
          className={`tab-btn ${activeTab === 'numerology' ? 'active' : ''}`}
          onClick={() => setActiveTab('numerology')}
        >
          數字學
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'vedic'}
          aria-controls="panel-vedic"
          id="tab-vedic"
          className={`tab-btn ${activeTab === 'vedic' ? 'active' : ''}`}
          onClick={() => setActiveTab('vedic')}
        >
          印度占星
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'synastry'}
          aria-controls="panel-synastry"
          id="tab-synastry"
          className={`tab-btn ${activeTab === 'synastry' ? 'active' : ''}`}
          onClick={() => setActiveTab('synastry')}
        >
          雙人合盤
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'fengshui'}
          aria-controls="panel-fengshui"
          id="tab-fengshui"
          className={`tab-btn ${activeTab === 'fengshui' ? 'active' : ''}`}
          onClick={() => setActiveTab('fengshui')}
        >
          格局風水
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'clients'}
          aria-controls="panel-clients"
          id="tab-clients"
          className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          客戶管理
        </button>
      </div>

      {/* ---- Main content ---- */}
      <ErrorBoundary>
        <main className="site-main">
          {activeTab === 'natal' && (
            <div role="tabpanel" id="panel-natal" aria-labelledby="tab-natal">
              {/* Quick chart section */}
              <section className="quick-chart-section">
                <h3 className="section-heading">快速製圖</h3>
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
                <section className="chart-section">
                  <h3 className="section-heading">星盤 &mdash; {chart.birthData.locationName}</h3>
                  <div className="chart-visual">
                    <NatalChart chart={chart} size={540} />
                  </div>
                  <ChartDetails chart={chart} />
                  <TransitPanel natalChart={chart} />
                  <ArabicPartsPanel chart={chart} />
                  <ProfectionsPanel chart={chart} />
                  <SolarReturnPanel chart={chart} />
                </section>
              )}
            </div>
          )}

          {activeTab === 'bazi' && (
            <div role="tabpanel" id="panel-bazi" aria-labelledby="tab-bazi">
              <section className="quick-chart-section">
                <h3 className="section-heading">八字排盤</h3>
                <BaziForm onSubmit={handleBaziSubmit} isLoading={baziLoading} />
              </section>

              {baziError && <div className="error-banner">{baziError}</div>}
              {baziLoading && <LoadingMessage text="推算八字命盤中，請稍候⋯" />}

              {baziChart && !baziLoading && (
                <section className="chart-section">
                  <BaziResult chart={baziChart} />
                </section>
              )}

              {baziChart && !baziLoading && (
                <section className="quick-chart-section">
                  <h3 className="section-heading">本命卦 · 八宅方位</h3>
                  <KuaPanel chart={baziChart} />
                </section>
              )}

              <section className="quick-chart-section">
                <h3 className="section-heading">流年紫白飛星</h3>
                <FlyingStarsPanel />
              </section>

              <section className="quick-chart-section">
                <h3 className="section-heading">擇日工具</h3>
                <DateSelectTool defaultYearBranch={baziChart?.yearPillar.branch} />
              </section>

              <section className="quick-chart-section">
                <h3 className="section-heading">奇門遁甲</h3>
                <QiMenPanel />
              </section>
            </div>
          )}

          {activeTab === 'ziwei' && (
            <div role="tabpanel" id="panel-ziwei" aria-labelledby="tab-ziwei">
              <section className="quick-chart-section">
                <h3 className="section-heading">紫微斗數命盤</h3>
                <ZiWeiPanel />
              </section>
            </div>
          )}

          {activeTab === 'vedic' && (
            <div role="tabpanel" id="panel-vedic" aria-labelledby="tab-vedic">
              <section className="quick-chart-section">
                <h3 className="section-heading">印度占星命盤</h3>
                <VedicForm onSubmit={handleVedicSubmit} isLoading={vedicLoading} />
              </section>

              {vedicError && <div className="error-banner">{vedicError}</div>}
              {vedicLoading && <LoadingMessage text="推算吠陀命盤中，請稍候⋯" />}

              {vedicChart && !vedicLoading && (
                <section className="chart-section">
                  <VedicResult chart={vedicChart} />
                </section>
              )}
            </div>
          )}

          {activeTab === 'synastry' && (
            <div role="tabpanel" id="panel-synastry" aria-labelledby="tab-synastry">
              <section className="quick-chart-section">
                <h3 className="section-heading">雙人合盤分析</h3>
                <SynastryForm onSubmit={handleSynastrySubmit} isLoading={synastryLoading} />
              </section>

              {synastryError && <div className="error-banner">{synastryError}</div>}
              {synastryLoading && <LoadingMessage text="推算雙星交匯中，請稍候⋯" />}

              {synastryResult && !synastryLoading && (
                <section className="chart-section">
                  <SynastryResult result={synastryResult} />
                </section>
              )}
            </div>
          )}

          {activeTab === 'numerology' && (
            <div role="tabpanel" id="panel-numerology" aria-labelledby="tab-numerology">
              <section className="quick-chart-section">
                <h3 className="section-heading">數字學分析</h3>
                <NumerologyPanel initialBirthData={chart ? chart.birthData : undefined} />
              </section>
            </div>
          )}

          {activeTab === 'fengshui' && (
            <div role="tabpanel" id="panel-fengshui" aria-labelledby="tab-fengshui">
              <section className="quick-chart-section">
                <h3 className="section-heading">格局風水・飛星分析</h3>
                <FengshuiPanel />
              </section>
            </div>
          )}

          {activeTab === 'clients' && (
            <div role="tabpanel" id="panel-clients" aria-labelledby="tab-clients">
              <section className="quick-chart-section">
                <h3 className="section-heading">客戶管理</h3>
                <ClientDatabase onLoadClient={handleLoadClient} />
              </section>
            </div>
          )}
        </main>
      </ErrorBoundary>

      {/* ---- Footer ---- */}
      <footer className="site-footer">
        <span>&copy; 2012-2026 momo.hwchiu</span>
      </footer>
    </div>
  );
}

export default App;
