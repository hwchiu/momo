# 線上占星圖 (Momo Astrology Chart)

多功能命盤計算網站，支援西洋占星、印度占星、八字風水與雙人合盤分析。使用者輸入出生資料（日期、時間、地點），系統自動計算行星位置並以互動式 SVG 星盤圖呈現。

**介面語言：繁體中文**  
**技術：React 19 + TypeScript 5.9 + Vite 7 + D3.js 7 + astronomia 4.2**

---

## 功能模組

### 西洋占星（Natal Chart）
- 📍 地點自動補全（OpenStreetMap Nominatim）
- 🔢 計算 10 大行星 + 冥王星 + 月交點的黃道座標
- 🏛️ 支援 **8 種宮位系統**：Placidus、Koch、Equal House、Whole Sign、Campanus、Regiomontanus、Alcabitius、Porphyry（即時切換，無需重新提交）
- 📊 互動式 SVG 星盤圖（D3.js 繪製）
- 📋 詳細表格：行星位置、宮位、相位、古典力量（Almuten）
- ✨ 相位篩選（容許度、相位類型可自訂）

### 古典占星（Classical Astrology）
- 🌡️ 力量計算（Essential Dignity、Planetary Strength）
- ⚔️ 戰爭行星（Combust）、隱沒（Cazimi）、Out of Bounds 檢測
- 🧭 東出/西沒（Oriental/Occidental）判斷

### 太陽回歸（Solar Return）
- 🔄 計算年度太陽回歸時刻（UTC）
- 📍 太陽回歸盤的行星位置、宮位、相位
- 🎯 牛頓迭代算法精確計算，收斂誤差 < 0.0001°

### 年運預測（Annual Profections）
- 📅 計算每年活躍宮位及宮主星
- 🔀 支援 Day、Night 時間系統

### 中點/阿拉伯點（Midpoints & Arabic Parts）
- 🎲 計算主要中點組合
- 📍 中點樹（Midpoint Trees）分析
- ✍️ 常見阿拉伯點：福點、死點、勝點等

### 印度占星（Vedic Astrology）
- 🌟 Lahiri Ayanamsa 恆星座計算
- 📐 南印度式星盤（South Indian Chart）
- ⏰ 大運系統（Dasha）：Vimshottari、Ashtottari、Yogini
- 🏠 拉西盤（Rashi Chart）+ 分宮圖（Navamsha、D10、D27 等）

### 八字風水
- ⚱️ 四柱八字排盤（年月日時）
- 🔥 天干地支、五行屬性、納音五行
- 🎋 簡易命主分析

### 雙人合盤（Synastry）
- 👥 輸入兩人出生資料，分別計算本命盤
- 💫 列出所有跨盤相位（A→B 及 B→A）
- 📊 相容性指標（基於相位統計）
- 🎭 合盤星盤圖（兩圈同心圓）

---

## 技術棧

| 項目 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.9 | 型別安全 |
| Vite | 7 | 開發伺服器 + 打包 |
| D3.js | 7 | SVG 星盤繪製 |
| astronomia | 4.2 | VSOP87 行星計算 |
| Vitest | 4 | 單元測試（268 個測試） |
| @testing-library/react | 16.3 | 元件測試 |
| ESLint + Prettier | 最新 | 程式碼品質 |

---

## 開發指令

```bash
npm install          # 安裝依賴
npm run dev          # 啟動開發伺服器（Vite HMR）
npm run build        # TypeScript 型別檢查 + 正式建置
npm run lint         # ESLint 檢查
npm run format       # Prettier 格式化
npm run format:check # Prettier 格式檢查（CI 用）
npm run typecheck    # TypeScript 型別檢查
npm run test         # 執行所有測試
npm run test:watch   # 監看模式執行測試
```

### 執行單一測試

```bash
npx vitest run tests/lib/astro.test.ts
npx vitest run -t "should place the Sun in Capricorn"
npx vitest run --reporter=verbose tests/lib/astro.test.ts
```

---

## 專案結構

```
src/
├── types/
│   ├── astro.ts           # 西洋占星型別、列舉、常數
│   ├── bazi.ts            # 八字型別
│   ├── vedic.ts           # 印度占星型別
│   ├── synastry.ts        # 合盤型別
│   └── returns.ts         # 太陽回歸、年運型別
├── lib/
│   ├── astro.ts           # 行星位置、宮位、相位計算引擎（2.6 KB）
│   ├── chart.ts           # D3.js SVG 星盤繪製（命令式）
│   ├── bazi.ts            # 八字排盤邏輯
│   ├── vedic.ts           # 印度占星計算
│   ├── synastry.ts        # 雙人合盤計算（2.5 KB）
│   ├── transits.ts        # 推運計算
│   ├── classical.ts       # 古典占星輔助（力量、戰爭行星等）
│   ├── solarReturn.ts     # 太陽回歸計算
│   ├── profections.ts     # 年運預測
│   ├── arabicParts.ts     # 中點與阿拉伯點計算
│   └── geocode.ts         # OpenStreetMap Nominatim 地名查詢
├── components/
│   ├── BirthDataForm.tsx          # 出生資料輸入表單（含地名自動補全）
│   ├── NatalChart.tsx             # SVG 星盤 React 包裝元件
│   ├── ChartDetails.tsx           # 行星、宮位、相位表格
│   ├── TransitPanel.tsx           # 推運相位面板
│   ├── ClassicalStrength.tsx      # 古典力量表格
│   ├── SolarReturnPanel.tsx       # 太陽回歸結果面板
│   ├── ProfectionsPanel.tsx       # 年運面板
│   ├── ArabicPartsPanel.tsx       # 中點/阿拉伯點面板
│   ├── BaziForm.tsx               # 八字輸入表單
│   ├── BaziResult.tsx             # 八字結果顯示
│   ├── VedicForm.tsx              # 印度占星輸入表單
│   ├── VedicResult.tsx            # 印度占星結果
│   ├── VedicDasha.tsx             # 大運系統選擇與計算
│   ├── VedicPlanetTable.tsx       # 印度行星表格
│   ├── VedicDivisionalChart.tsx   # 分宮圖選擇與顯示
│   ├── SouthIndianChart.tsx       # 南印度式星盤圖
│   ├── SynastryForm.tsx           # 合盤輸入表單
│   ├── SynastryResult.tsx         # 合盤結果（表格視圖）
│   ├── SynastryChart.tsx          # 合盤星盤圖（雙圓）
│   ├── SynastryAspectList.tsx     # 合盤相位列表
│   ├── CompatibilityPanel.tsx     # 相容性評分面板
│   └── ErrorBoundary.tsx          # 錯誤邊界元件
├── App.tsx                 # 根元件，Tab 切換與全域狀態管理
├── App.css                 # 所有元件樣式（CSS 變數、RWD）
├── index.css               # 全域樣式、字型、重設
└── main.tsx                # 進入點

tests/
├── setup.ts                        # Vitest 配置（jest-dom matchers）
├── lib/
│   ├── astro.test.ts              # 天文計算測試
│   ├── transits.test.ts           # 推運相位測試（50 個測試）
│   ├── compare_almuten.test.ts    # 古典力量對比測試
│   └── debug_calc.test.ts         # 調試用計算測試
└── components/
    └── BirthDataForm.test.tsx     # 表單元件測試

public/                    # 靜態資源
dist/                      # 生產打包輸出
node_modules/              # 依賴套件
```

---

## 資料流

```
用戶選擇 Tab（西洋占星 / 八字 / 印度占星 / 雙人合盤）
    ↓
選擇對應表單（BirthDataForm / BaziForm / VedicForm / SynastryForm）
    ↓
App.tsx 呼叫對應計算函數
    ├─ calculateNatalChart() → NatalChart、ChartDetails、TransitPanel
    ├─ calculateBazi() → BaziResult
    ├─ calculateVedic() → VedicResult + VedicDasha + SouthIndianChart
    └─ calculateSynastry() → SynastryResult + SynastryChart + SynastryAspectList

宮位系統即時切換 → 無需重新提交表單（使用快取）
古典力量、太陽回歸、年運、中點 → 透過右側面板切換顯示
```

---

## 天文計算說明

### 坐標系統
- **內部表示**：所有角度以**度（degrees）**表示（0–360）
- **轉換**：從弧度轉換時使用 `normalizeDeg()`；`astronomia` 套件回傳弧度，邊界處一律乘以 `180 / Math.PI`
- **精度**：VSOP87 行星資料透過 `getPlanets()` 單例（singleton）延遲載入；最大誤差 ~0.001°

### 特殊行星
- **冥王星**：使用 `astronomia/pluto` 單獨計算（不在 VSOP87 內）
- **月交點**：計算上升交點（True Node）與平均交點
- **逆行偵測**：比較 JDE−1 與 JDE+1 的黃道經度

### 宮位系統
8 種系統支援，使用者可即時切換（無需重新計算本命盤）：
- **Placidus** (預設)：半弧三分法，古典占星最常用
- **Koch**：MC 半弧三分法
- **Equal House**：每宮 30°，ASC = 1 宮頭
- **Whole Sign**：每星座一宮，宮頭在 0°
- **Campanus**、**Regiomontanus**、**Alcabitius**、**Porphyry**：特殊投影系統

### 古典占星力量計算
- **Essential Dignity**：王座（Rulership）、貴客（Exaltation）、黃昏之地（Detriment）、墮落（Fall）
- **Accidental Strength**：宮位加分、角宮優勢、上升/下降劣勢
- **Combust**（戰爭）：與太陽距離 < 8.5°
- **Cazimi**（心臟）：與太陽距離 < 17′，額外加分
- **Out of Bounds**：赤緯 > 23°27′

### 印度占星
- **Ayanamsa**：使用 Lahiri（最常用）；支援 Fagan-Bradley、DeLuce 等
- **Dasha 系統**：Vimshottari（最常用，120 年周期）、Ashtottari（108 年）、Yogini（36 年）
- **分宮圖**：Navamsha (D9, 精神婚姻)、D10 (職業)、D27 (微小事物) 等

### 太陽回歸計算
- **算法**：Newton 風格迭代，從目標年份生日附近開始
- **收斂條件**：太陽經度差 < 0.0001°（通常 3-5 次迭代）
- **UTC 輸出**：回歸時刻以 UTC 表示
- **位置**：計算該時刻在出生地的行星位置

---

## 外部服務

### OpenStreetMap Nominatim
- **用途**：地點名稱 → 座標（地理編碼）
- **特點**：無需 API 金鑰，免費開源
- **頻率限制**：1 請求/秒（透過 600ms debounce 控制）
- **User-Agent**：`MomoAstrologyChart/1.0`
- **端點**：`https://nominatim.openstreetmap.org/search`

---

## 程式碼風格指南

### TypeScript
- **嚴格模式**（Strict Mode）啟用
- **無未使用變數** (`noUnusedLocals`, `noUnusedParameters`)
- **型別 imports**：`import type { Foo } from './bar'`（型別檔無法在執行期使用）
- **Target**: ES2022

### 格式化 (Prettier)
- 單引號、分號、尾隨逗號（`all`）
- 列寬：100 字
- 縮排：2 空格
- 箭頭函數括號：總是 `(x) => ...`

### 檔案命名
- **lib**：camelCase（`astro.ts`, `classical.ts`）
- **components**：PascalCase（`NatalChart.tsx`, `BirthDataForm.tsx`）
- **CSS 類別**：kebab-case（`birth-data-form`, `natal-chart-container`）

### 元件模式
- **函數式元件**只（無 Class）
- **Props 介面**定義在元件上方
- **D3 操作**透過 `useRef` + `useEffect` 進行（命令式，不用 React vdom）

### 錯誤處理
- UI 層包裹 try/catch（在 `App.tsx` 中）
- 使用者訊息：繁體中文
- 原始錯誤：`console.error()` 記錄
- 型別守衛：`err instanceof Error` 才能存取 `.message`

### Astronomia 套件無型別
所有 `import * from 'astronomia/*'` 使用 `@ts-expect-error` 標記：
```typescript
// @ts-expect-error astronomia has no type declarations
import * as julian from 'astronomia/julian';
```

---

## 開發工作流

### 完整檢查清單
```bash
# 啟動開發伺服器
npm run dev

# 持續監看模式開發
npm run test:watch          # 同時測試
npm run lint                # 檢查 ESLint

# 提交前檢查
npm run format              # Prettier 格式化
npm run typecheck           # TypeScript 型別檢查
npm run lint                # ESLint
npm run test                # 執行所有測試

# 構建生產版本
npm run build               # 型別檢查 + Vite 打包
npm run preview             # 預覽打包結果
```

### 常見開發任務

**新增占星功能（如新的宮位系統）**：
1. 在 `src/types/astro.ts` 新增型別/列舉
2. 在 `src/lib/astro.ts` 實現計算邏輯
3. 在 `tests/lib/astro.test.ts` 新增單元測試
4. 在 `src/components/ChartDetails.tsx` 新增 UI 表現

**修復 linting 錯誤**：
```bash
npm run lint -- --fix       # 自動修復可修復的錯誤
```

**測試單一檔案**：
```bash
npx vitest run tests/lib/astro.test.ts
npx vitest tests/lib/astro.test.ts    # Watch 模式
```

---

## 測試覆蓋率

- **268 個測試**通過
- 包含 50 個推運相位測試、古典力量對比、地理編碼、元件整合測試
- 框架：Vitest 4 + jsdom + @testing-library/react

---

## 貢獻指南

1. Fork 本專案
2. 建立功能分支：`git checkout -b feature/my-feature`
3. 提交變更：`git commit -m 'Add my feature'`
4. 推送到遠端：`git push origin feature/my-feature`
5. 提交 Pull Request

**提交前必須通過**：
- `npm run lint` — ESLint 檢查
- `npm run typecheck` — TypeScript 型別檢查  
- `npm run test` — 所有測試通過
- `npm run format:check` — Prettier 格式檢查

---

## 授權

MIT License

