# Stellar Workbench UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the app with a dark cosmic immersion theme — full dark space background, lapis blue + silver accent palette, fixed left sidebar navigation, and a split-panel natal chart workspace.

**Architecture:** Replace the current centered 960px layout with a full-viewport sidebar + main-content layout. The sidebar holds navigation icons; the natal tab gets a left (chart) / right (data) split. All existing component class names remain intact — only design tokens and layout wrappers change in App.tsx and App.css.

**Tech Stack:** React 19, TypeScript, vanilla CSS (no new dependencies)

---

### Task 1: Update CSS Design Tokens

**Files:**

- Modify: `src/App.css` (lines 1–65, the `:root` block)

**Step 1: Replace the `:root` design token block**

Find the current `:root { }` block (lines 7–65) and replace entirely with:

```css
:root {
  /* ── Cosmic dark palette ── */
  --cosmos-void: #030810;
  --cosmos-deep: #060d1a;
  --cosmos-mid: #0d1c38;
  --cosmos-surface: #122040;
  --cosmos-glass: rgba(13, 28, 56, 0.75);
  --cosmos-glass-2: rgba(18, 32, 64, 0.85);

  /* ── Lapis blue accent ── */
  --accent-lapis: #4fc3f7;
  --accent-lapis-2: #81d4fa;
  --accent-lapis-dim: rgba(79, 195, 247, 0.12);
  --accent-lapis-glow: rgba(79, 195, 247, 0.25);

  /* ── Silver text palette ── */
  --accent-silver: #e8f4ff;
  --accent-silver-2: rgba(232, 244, 255, 0.75);
  --accent-silver-dim: rgba(232, 244, 255, 0.45);
  --accent-silver-muted: rgba(232, 244, 255, 0.28);

  /* ── Star point white ── */
  --accent-star: rgba(255, 255, 255, 0.9);
  --accent-star-dim: rgba(255, 255, 255, 0.35);

  /* ── Semantic (dark-theme adapted) ── */
  --clr-success: #34d399;
  --clr-success-bg: rgba(52, 211, 153, 0.12);
  --clr-danger: #f87171;
  --clr-danger-bg: rgba(248, 113, 113, 0.12);
  --clr-danger-dark: #fca5a5;
  --clr-warning: #fbbf24;
  --clr-warning-bg: rgba(251, 191, 36, 0.12);
  --clr-warning-border: rgba(251, 191, 36, 0.4);

  /* ── Legacy aliases (keep for component compatibility) ── */
  --clr-primary: var(--accent-lapis);
  --clr-primary-dark: #0288d1;
  --clr-primary-btn: #0277bd;
  --clr-primary-light: var(--accent-lapis-dim);
  --clr-text-1: var(--accent-silver);
  --clr-text-2: var(--accent-silver-2);
  --clr-text-3: var(--accent-silver-dim);
  --clr-text-muted: var(--accent-silver-muted);
  --clr-surface: var(--cosmos-mid);
  --clr-surface-1: var(--cosmos-surface);
  --clr-surface-2: rgba(255, 255, 255, 0.06);
  --clr-surface-3: rgba(255, 255, 255, 0.1);
  --clr-border-strong: rgba(79, 195, 247, 0.45);
  --clr-border: rgba(79, 195, 247, 0.2);
  --clr-border-light: rgba(255, 255, 255, 0.1);
  --clr-border-subtle: rgba(255, 255, 255, 0.06);
  --clr-cosmos: var(--cosmos-deep);
  --clr-cosmos-2: var(--cosmos-mid);
  --clr-star: var(--accent-lapis);
  --clr-star-dim: var(--accent-lapis-glow);
  --clr-star-text: var(--accent-lapis-2);
  --clr-cosmos-text: var(--accent-silver);

  /* ── Spacing ── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;

  /* ── Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* ── Focus ring ── */
  --focus-ring: 0 0 0 3px rgba(79, 195, 247, 0.35);

  /* ── Sidebar ── */
  --sidebar-w: 200px;
  --sidebar-w-collapsed: 64px;
}
```

**Step 2: Replace the keyframes block** (lines 67–116) with:

```css
/* ── Keyframes ── */
@keyframes pulse-star {
  0%,
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.25;
    transform: scale(0.65) rotate(180deg);
  }
}

@keyframes celestial-appear {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes panel-slide-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes star-drift {
  0% {
    background-position:
      0 0,
      30px 30px,
      15px 45px;
  }
  100% {
    background-position:
      200px 100px,
      230px 130px,
      215px 145px;
  }
}

@keyframes star-twinkle {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes sidebar-glow {
  0%,
  100% {
    box-shadow: inset -1px 0 0 rgba(79, 195, 247, 0.15);
  }
  50% {
    box-shadow: inset -1px 0 0 rgba(79, 195, 247, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-star {
    animation: none !important;
  }
  .chart-section,
  .bazi-result-section {
    animation: none !important;
  }
  .submit-btn {
    transition: background 0.15s !important;
  }
  .sidebar {
    animation: none !important;
  }
}
```

**Step 3: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/App.css
git commit -m "style: new dark cosmic design tokens (lapis blue + silver)"
```

---

### Task 2: Global Base & Body Background

**Files:**

- Modify: `src/index.css`
- Modify: `src/App.css` (the `.almuten-app` base block, ~lines 119-128)

**Step 1: Update `src/index.css`**

Replace the entire file content with:

```css
/* Global base — dark cosmic theme */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  background: #030810;
}

body {
  font-family: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(232, 244, 255, 0.75);

  /* Star-field background: 3 layers of radial dot patterns at different sizes */
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.55) 1px, transparent 1px),
    radial-gradient(circle, rgba(79, 195, 247, 0.3) 1px, transparent 1px),
    radial-gradient(circle, rgba(255, 255, 255, 0.2) 1.5px, transparent 1.5px);
  background-size:
    120px 120px,
    80px 80px,
    200px 200px;
  background-position:
    0 0,
    40px 40px,
    60px 100px;
  animation: star-drift 120s linear infinite;
}

#root {
  height: 100%;
}

a {
  color: #4fc3f7;
  text-decoration: none;
}
a:hover {
  color: #81d4fa;
  text-decoration: underline;
}

:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.35);
}

/* Thin scrollbars for dark theme */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}
::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 195, 247, 0.5);
}
```

**Step 2: Update `.almuten-app` in `src/App.css`**

Find and replace the `.almuten-app` block:

```css
/* ---- App shell: full viewport sidebar layout ---- */
.almuten-app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  color: var(--accent-silver-2);
  font-family: 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
}
```

**Step 3: Verify dev server loads**

Run: `npm run dev`
Check browser: page should show dark background with star-field dots

**Step 4: Commit**

```bash
git add src/index.css src/App.css
git commit -m "style: full-viewport dark body with star-field background"
```

---

### Task 3: App.tsx — Sidebar Layout Structure

**Files:**

- Modify: `src/App.tsx`

**Step 1: Replace the JSX `return` block in App.tsx**

The new layout uses `.stellar-sidebar` + `.stellar-main` flex layout. Replace the `return (...)` block (lines 242–471) with:

```tsx
const NAV_ITEMS = [
  { id: 'natal', icon: '✦', label: '星盤分析' },
  { id: 'bazi', icon: '☯', label: '風水八字' },
  { id: 'vedic', icon: '卍', label: '印度占星' },
  { id: 'synastry', icon: '⚭', label: '雙人合盤' },
  { id: 'numerology', icon: '∞', label: '數字學' },
  { id: 'fengshui', icon: '⬡', label: '格局風水' },
  { id: 'clients', icon: '◎', label: '客戶管理' },
] as const;

return (
  <div className="almuten-app">
    {/* ── Sidebar ── */}
    <aside className="stellar-sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">✦</span>
        <span className="sidebar-logo-text">星盤</span>
      </div>
      <nav className="sidebar-nav" aria-label="功能導覽">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id as typeof activeTab)}
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
                    <h3 className="panel-heading">星盤 &mdash; {chart.birthData.locationName}</h3>
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: sidebar layout structure in App.tsx"
```

---

### Task 4: CSS — Sidebar & Main Layout

**Files:**

- Modify: `src/App.css` — replace `.top-nav`, `.site-header`, `.tab-nav`, `.site-main`, `.site-footer` blocks; add new sidebar + stellar layout blocks

**Step 1: After the `.almuten-app` block, add the full layout CSS**

Find the old `.top-nav` block and replace everything from `.top-nav` down to and including `.site-footer` with the following new layout styles. (Keep all component-specific styles below intact.)

```css
/* ══════════════════════════════════════════
   STELLAR SIDEBAR LAYOUT
   ══════════════════════════════════════════ */

/* Sidebar */
.stellar-sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(6, 13, 26, 0.92);
  border-right: 1px solid rgba(79, 195, 247, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 10;
  animation: sidebar-glow 6s ease-in-out infinite;
  position: relative;
  flex-shrink: 0;
}

.stellar-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
    radial-gradient(circle, rgba(79, 195, 247, 0.2) 1px, transparent 1px);
  background-size:
    50px 50px,
    30px 30px;
  background-position:
    5px 5px,
    20px 20px;
  opacity: 0.4;
  pointer-events: none;
}

/* Sidebar logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 16px 20px;
  border-bottom: 1px solid rgba(79, 195, 247, 0.12);
}

.sidebar-logo-icon {
  font-size: 22px;
  color: var(--accent-lapis);
  text-shadow: 0 0 12px var(--accent-lapis-glow);
  animation: star-twinkle 3s ease-in-out infinite;
}

.sidebar-logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-silver);
  letter-spacing: 0.1em;
  text-shadow: 0 0 16px rgba(79, 195, 247, 0.4);
}

/* Sidebar nav */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 4px;
  overflow-y: auto;
}

.sidebar-nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--accent-silver-dim);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
  text-align: left;
  position: relative;
  z-index: 1;
}

.sidebar-nav-btn:hover {
  background: var(--accent-lapis-dim);
  color: var(--accent-silver);
  border-color: rgba(79, 195, 247, 0.2);
}

.sidebar-nav-btn.active {
  background: rgba(79, 195, 247, 0.18);
  color: var(--accent-lapis);
  border-color: rgba(79, 195, 247, 0.4);
  box-shadow:
    0 0 16px rgba(79, 195, 247, 0.15),
    inset 0 0 12px rgba(79, 195, 247, 0.06);
  font-weight: 700;
}

.sidebar-nav-btn.active .nav-icon {
  text-shadow: 0 0 10px var(--accent-lapis);
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  font-size: 13px;
  white-space: nowrap;
}

/* Sidebar footer */
.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid rgba(79, 195, 247, 0.08);
}

.sidebar-footer-text {
  font-size: 11px;
  color: var(--accent-silver-muted);
  letter-spacing: 0.04em;
}

/* Main content wrapper */
.stellar-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  min-width: 0;
}

/* Content header bar */
.stellar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(6, 13, 26, 0.7);
  border-bottom: 1px solid rgba(79, 195, 247, 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.stellar-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(79, 195, 247, 0.05) 0%, transparent 60%);
  pointer-events: none;
}

.stellar-header-star {
  font-size: 20px;
  color: var(--accent-lapis);
  text-shadow: 0 0 16px var(--accent-lapis-glow);
  animation: star-twinkle 4s ease-in-out infinite;
  flex-shrink: 0;
}

.stellar-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent-silver);
  letter-spacing: 0.08em;
  text-shadow: 0 0 20px rgba(79, 195, 247, 0.3);
}

.stellar-subtitle {
  font-size: 12px;
  color: var(--accent-silver-muted);
  letter-spacing: 0.06em;
  margin-left: auto;
}

/* Scrollable content */
.stellar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* ── Natal workspace: 2-column split ── */
.natal-workspace {
  display: grid;
  grid-template-columns: 520px 1fr;
  gap: 20px;
  align-items: start;
  min-height: 0;
}

.natal-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.natal-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  animation: panel-slide-in 0.4s ease-out;
}

/* ── Full-width panel (non-natal tabs) ── */
.full-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 960px;
}

/* ── Glass panel card ── */
.glass-panel {
  background: var(--cosmos-glass);
  border: 1px solid rgba(79, 195, 247, 0.15);
  border-radius: var(--radius-lg);
  padding: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  animation: celestial-appear 0.35s ease-out;
}

.glass-panel.chart-visual-panel {
  text-align: center;
}

/* ── Panel heading ── */
.panel-heading {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-lapis);
  letter-spacing: 0.08em;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(79, 195, 247, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-heading::before {
  content: '✦';
  font-size: 10px;
  opacity: 0.7;
}

/* ── Section heading (legacy alias) ── */
.section-heading {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-lapis);
  letter-spacing: 0.08em;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(79, 195, 247, 0.15);
}

/* Keep old layout classes as no-ops (prevent FOUC) */
.top-nav,
.tab-nav,
.site-header,
.site-footer,
.quick-chart-section,
.chart-section {
  all: unset;
  display: contents;
}
```

**Step 2: Verify layout in browser**

Run: `npm run dev`
Check: sidebar visible on left, main content on right, star-field background visible

**Step 3: Commit**

```bash
git add src/App.css
git commit -m "style: stellar sidebar + glass panel layout CSS"
```

---

### Task 5: CSS — Forms & Input Controls

**Files:**

- Modify: `src/App.css` — update form control styles to dark theme

**Step 1: Find and update form control styles**

Search for `.form-input`, `.form-select`, `.submit-btn` and update to dark theme. Add/replace these blocks:

```css
/* ══ Form controls — dark theme ══ */
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-silver-dim);
  margin-bottom: 5px;
  letter-spacing: 0.04em;
}

.form-input,
.form-select {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: var(--radius-md);
  color: var(--accent-silver);
  font-family: inherit;
  font-size: 14px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
  appearance: none;
  -webkit-appearance: none;
}

.form-input:hover,
.form-select:hover {
  border-color: rgba(79, 195, 247, 0.4);
  background: rgba(255, 255, 255, 0.08);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-lapis);
  background: rgba(79, 195, 247, 0.08);
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
}

.form-input::placeholder {
  color: var(--accent-silver-muted);
}

/* Select arrow */
.form-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234fc3f7' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
  cursor: pointer;
}

/* Submit / CTA button */
.submit-btn,
.geo-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #0277bd 0%, #01579b 100%);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: var(--radius-md);
  color: var(--accent-silver);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 12px rgba(2, 119, 189, 0.3);
}

.submit-btn:hover:not(:disabled),
.geo-search-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0288d1 0%, #0277bd 100%);
  border-color: rgba(79, 195, 247, 0.7);
  box-shadow: 0 4px 20px rgba(79, 195, 247, 0.35);
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled),
.geo-search-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(2, 119, 189, 0.3);
}

.submit-btn:disabled,
.geo-search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Radio group */
.radio-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-silver-2);
  cursor: pointer;
  font-size: 13px;
}

.radio-label input[type='radio'] {
  accent-color: var(--accent-lapis);
}
```

**Step 2: Commit**

```bash
git add src/App.css
git commit -m "style: dark theme form controls and buttons"
```

---

### Task 6: CSS — Data Tables

**Files:**

- Modify: `src/App.css` — update table styles for dark theme

**Step 1: Find `.data-table` and related styles, update to:**

```css
/* ══ Data tables — dark theme ══ */
.table-scroll {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid rgba(79, 195, 247, 0.12);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--accent-silver-2);
}

.data-table th {
  background: rgba(79, 195, 247, 0.12);
  color: var(--accent-lapis);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  white-space: nowrap;
}

.data-table td {
  padding: 7px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}

.data-table .row-even {
  background: rgba(255, 255, 255, 0.02);
}

.data-table .row-odd {
  background: transparent;
}

.data-table tr:hover td {
  background: rgba(79, 195, 247, 0.06);
}

/* Dignity colors — bright enough for dark bg */
.dignity-廟 {
  color: #34d399;
  font-weight: 700;
}
.dignity-旺 {
  color: #6ee7b7;
}
.dignity-落 {
  color: #f87171;
}
.dignity-陷 {
  color: #fca5a5;
}

.retrograde-symbol {
  color: var(--accent-lapis);
  font-size: 11px;
  margin-left: 3px;
}

/* Table sub-header row */
.table-sub-header th {
  background: rgba(255, 255, 255, 0.04);
  color: var(--accent-silver-dim);
  font-size: 10px;
}
```

**Step 2: Commit**

```bash
git add src/App.css
git commit -m "style: dark theme data tables"
```

---

### Task 7: CSS — Error Banner, Loading, Miscellaneous

**Files:**

- Modify: `src/App.css`

**Step 1: Update error banner, loading, and misc styles:**

```css
/* ══ Error banner ══ */
.error-banner {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md);
  color: #fca5a5;
  padding: 12px 16px;
  font-size: 13px;
  animation: celestial-appear 0.3s ease-out;
}

/* ══ Loading ══ */
.loading-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: var(--accent-lapis);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.loading-star {
  font-size: 18px;
  color: var(--accent-lapis);
  text-shadow: 0 0 12px var(--accent-lapis-glow);
  animation: pulse-star 1.2s ease-in-out infinite;
}

.loading-star--delayed {
  animation-delay: 0.4s;
}

/* ══ Chart visual container ══ */
.chart-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ══ No data ══ */
.no-data {
  color: var(--accent-silver-muted);
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

/* ══ Autocomplete suggestions ══ */
.autocomplete-list {
  background: var(--cosmos-mid);
  border: 1px solid rgba(79, 195, 247, 0.25);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.autocomplete-item {
  color: var(--accent-silver-2);
  padding: 8px 12px;
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background: rgba(79, 195, 247, 0.12);
  color: var(--accent-silver);
}

/* ══ Responsive: narrow screens ══ */
@media (max-width: 900px) {
  :root {
    --sidebar-w: 56px;
  }
  .nav-label {
    display: none;
  }
  .sidebar-logo-text {
    display: none;
  }
  .sidebar-footer-text {
    display: none;
  }
  .natal-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stellar-content {
    padding: 12px;
  }
  .glass-panel {
    padding: 14px;
  }
}
```

**Step 2: Commit**

```bash
git add src/App.css
git commit -m "style: error, loading, responsive dark theme styles"
```

---

### Task 8: Final QA Check

**Step 1: Run TypeScript + build**

```bash
npm run typecheck && npm run build
```

Expected: Zero errors, build succeeds.

**Step 2: Visual QA checklist in browser (`npm run dev`)**

- [ ] Dark star-field background visible on all tabs
- [ ] Sidebar shows 7 nav items with icons, active item glows lapis blue
- [ ] Natal tab: form on left, chart below form, data panels on right
- [ ] Other tabs: full-width glass panels
- [ ] Form inputs have dark background, blue focus ring
- [ ] Tables have dark rows, lapis headers
- [ ] Error banner uses red-tinted glass style
- [ ] Loading stars pulse in lapis blue
- [ ] On narrow screen (<900px): sidebar collapses to icons only

**Step 3: Run tests**

```bash
npm run test
```

Expected: All existing tests pass (UI-only changes, no logic touched)

**Step 4: Final commit**

```bash
git add -A
git commit -m "style: complete Stellar Workbench dark cosmic UI redesign"
```
