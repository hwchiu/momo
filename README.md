# 線上古典占星圖

多功能命盤計算網站，支援西洋占星、印度占星、八字風水與雙人合盤分析。使用者輸入出生資料（日期、時間、地點），系統自動計算行星位置並以 SVG 星盤圖呈現。

介面語言：**繁體中文**

---

## 功能模組

### 星盤分析（西洋占星）
- 輸入出生日期、時間、地點（支援地名自動補全）
- 計算太陽、月亮、水星、金星、火星、木星、土星、天王星、海王星、冥王星的黃道座標
- 支援 8 種宮位系統：Placidus、Koch、Equal、Whole Sign、Campanus、Regiomontanus、Alcabitius、Porphyry
- 繪製互動式 SVG 星盤圖（D3.js）
- 顯示行星、宮頭、相位表格
- 推運面板（Transit）：顯示當日行星與本命盤的相位

### 八字風水
- 輸入出生年月日時，排列四柱八字
- 顯示天干地支、五行屬性

### 印度占星
- 依據 Lahiri 回歸差（Ayanamsa）計算恆星座位置
- 南印度式星盤（South Indian Chart）
- 大運（Dasha）系統計算

### 雙人合盤（Synastry）
- 輸入兩人出生資料，分別計算本命盤
- 列出跨盤相位，分析兩人星象互動

---

## 技術棧

| 項目 | 版本 |
|------|------|
| React | 19 |
| TypeScript | 5.9 |
| Vite | 7 |
| D3.js | 7 |
| astronomia | 4.2 |
| Vitest | 4 |

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
│   ├── astro.ts        # 西洋占星型別、列舉、常數
│   ├── bazi.ts         # 八字型別
│   ├── vedic.ts        # 印度占星型別
│   └── synastry.ts     # 合盤型別
├── lib/
│   ├── astro.ts        # 行星位置、宮位、相位計算引擎
│   ├── chart.ts        # D3.js SVG 星盤繪製（命令式）
│   ├── bazi.ts         # 八字排盤邏輯
│   ├── vedic.ts        # 印度占星計算
│   ├── synastry.ts     # 雙人合盤計算
│   ├── transits.ts     # 推運計算
│   ├── classical.ts    # 古典占星輔助
│   └── geocode.ts      # OpenStreetMap Nominatim 地名查詢
├── components/
│   ├── BirthDataForm.tsx      # 出生資料輸入表單（含地名自動補全）
│   ├── NatalChart.tsx         # SVG 星盤 React 包裝元件
│   ├── ChartDetails.tsx       # 行星、宮位、相位表格
│   ├── TransitPanel.tsx       # 推運面板
│   ├── BaziForm.tsx           # 八字輸入表單
│   ├── BaziResult.tsx         # 八字結果顯示
│   ├── VedicForm.tsx          # 印度占星輸入表單
│   ├── VedicResult.tsx        # 印度占星結果
│   ├── VedicDasha.tsx         # 大運顯示
│   ├── VedicPlanetTable.tsx   # 印度行星表格
│   ├── SouthIndianChart.tsx   # 南印度式星盤圖
│   ├── SynastryForm.tsx       # 合盤輸入表單
│   ├── SynastryResult.tsx     # 合盤結果
│   ├── SynastryChart.tsx      # 合盤星盤圖
│   ├── SynastryAspectList.tsx # 合盤相位列表
│   └── CompatibilityPanel.tsx # 相容性面板
├── App.tsx             # 根元件，Tab 切換與全域狀態管理
└── main.tsx            # 進入點
tests/
├── lib/astro.test.ts
└── components/BirthDataForm.test.tsx
```

---

## 資料流

```
BirthDataForm
    ↓ 出生資料
App.tsx → calculateNatalChart(birthData, houseSystem)
    ↓ NatalChart 物件
    ├── NatalChart 元件（D3 繪製 SVG）
    ├── ChartDetails（行星／宮位／相位表格）
    └── TransitPanel（推運相位）
```

宮位系統可即時切換，無需重新送出表單（使用 `lastBirthDataRef` 快取出生資料）。

---

## 天文計算說明

- 所有角度內部以**度（degrees）**表示（0–360）；從弧度轉換時使用 `normalizeDeg()`
- `astronomia` 套件回傳弧度，邊界處一律乘以 `180 / Math.PI`
- VSOP87 行星資料透過 `getPlanets()` 單例（singleton）延遲載入
- 冥王星使用 `astronomia/pluto` 單獨計算（不在 VSOP87 內）
- 逆行偵測：比較 JDE−1 與 JDE+1 的黃道經度
- 印度占星使用 Lahiri Ayanamsa 修正恆星座位置

## 外部服務

- **OpenStreetMap Nominatim**：地名地理編碼，無需 API 金鑰；透過 600ms debounce 控制請求頻率，`User-Agent: MomoAstrologyChart/1.0`

---

