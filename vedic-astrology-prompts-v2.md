# 印度占星網站 — Claude Code 開發 Prompt 指南（專案已有雛形版）

---

## 📌 使用原則

這套 Prompt 採用**目標導向**風格，讓 Claude Code 先理解你的專案結構，
再在既有基礎上擴充，不強制指定路徑或架構。

**每次開始新的 Prompt 前，建議先說：**
> 「請先瀏覽目前的專案結構，再開始實作。」

---

## PROMPT 1：環境確認與缺口分析

```
請先瀏覽整個專案的目錄結構和現有程式碼，然後告訴我：

1. 目前的技術棧是什麼（前端框架、後端語言、套件管理方式）
2. 已經實作了哪些功能
3. 還缺少哪些印度占星所需的核心計算功能

我最終的目標是完成一個印度占星（Vedic Astrology / Jyotish）網站，
需要支援以下功能：
- 輸入出生日期、時間、地點
- 計算行星位置（使用 Sidereal / Lahiri Ayanamsha）
- 計算 12 宮位與 Lagna（上升點）
- 計算 Nakshatra（月亮星宿）
- 計算 Vimshottari Dasha 大運時間表
- 顯示南印度或北印度格式的星盤圖
- 顯示行星詳細位置表格

請根據現有程式碼，列出哪些已完成、哪些需要新增或修正，
不需要重建已有的結構。
```

---

## PROMPT 2：天文計算核心

```
請先瀏覽現有的程式碼，了解目前天文計算的實作方式。

目標：確保專案具備完整的印度占星計算能力，使用 Swiss Ephemeris（pyswisseph）。

需要支援的計算（請在現有結構上補充，避免重複）：

【行星位置】計算以下 9 個天體的 Sidereal 黃道位置：
太陽、月亮、火星、水星、木星、金星、土星、羅睺（北交點）、計都（南交點）

每個行星需要：
- Sidereal 黃道經度（已套用 Ayanamsha 修正）
- 所在星座 Rashi（1-12）及星座內度數
- Nakshatra（1-27）及 Pada（1-4）
- 所在宮位（House 1-12）
- 是否逆行

【宮位計算】
- 支援 Whole Sign 宮位制（Vedic 最常用）
- 計算精確的 Lagna（上升點）度數

【Ayanamsha】
- 預設使用 Lahiri（swe.SIDM_LAHIRI = 1）
- 可選 Raman（3）、Krishnamurti（5）

時區處理很重要：出生時間必須正確轉為 UTC 再計算。
如有任何現有計算，請驗證 Rahu/Ketu 是否相差 180 度、Lagna 是否每約 2 小時換一個星座。
```

---

## PROMPT 3：Vimshottari Dasha 大運計算

```
請先看看現有程式碼中是否已有 Dasha 相關的計算邏輯。

目標：實作 Vimshottari Dasha（毗摩塔利大運）完整計算，包含 Mahadasha 和 Antardasha。

【核心規則】
總週期 120 年，根據月亮所在 Nakshatra 決定命主星與剩餘年數。

各星大運年數：
Ketu 7年 → Venus 20年 → Sun 6年 → Moon 10年 → Mars 7年
→ Rahu 18年 → Jupiter 16年 → Saturn 19年 → Mercury 17年

27 Nakshatra 對應命主星：
Ashwini/Magha/Mula → Ketu
Bharani/Purva Phalguni/Purva Ashadha → Venus
Krittika/Uttara Phalguni/Uttara Ashadha → Sun
Rohini/Hasta/Shravana → Moon
Mrigashira/Chitra/Dhanishta → Mars
Ardra/Swati/Shatabhisha → Rahu
Punarvasu/Vishakha/Purva Bhadrapada → Jupiter
Pushya/Anuradha/Uttara Bhadrapada → Saturn
Ashlesha/Jyeshtha/Revati → Mercury

【需要輸出的資料結構】
每筆 Dasha 記錄包含：主星、子星（Antardasha）、開始日期、結束日期、持續時長

請在不破壞現有功能的前提下整合進去。
```

---

## PROMPT 4：後端 API 整合

```
請先瀏覽現有的 API 架構和路由設計。

目標：確保有完整的 API 端點讓前端可以取得命盤資料。

需要的 API 功能（請依照現有架構的風格加入，不要重建）：

1. 地點查詢：輸入城市名稱，回傳經緯度與時區
2. 命盤計算：輸入出生資料，回傳完整命盤 JSON，包含：
   - 所有行星位置
   - 12 宮位資料
   - Lagna 資訊
   - Dasha 大運時間表
   - 使用的 Ayanamsha 修正值

輸入格式建議：出生年月日時分、城市名稱（或經緯度）、時區、Ayanamsha 選擇

請確認 CORS 設定允許前端開發環境連線，並加上基本的錯誤處理。
```

---

## PROMPT 5：南印度格式星盤元件

```
請先看看現有前端的元件結構和使用的 UI 框架。

目標：建立一個南印度格式（South Indian Style）的 Rashi Chart 星盤元件。

【南印度格式規則】
4×4 方格，12 個星座位置固定（不隨 Lagna 移動）：

  12 | 01 | 02 | 03
  11 |    中    | 04
  10 |    間    | 05
  09 | 08 | 07 | 06

Lagna 所在格用特殊標記或底色區分。

【每格顯示】
- 星座名稱縮寫
- 宮位編號
- 該宮位的行星（縮寫：Su Mo Ma Me Ju Ve Sa Ra Ke）
- 逆行行星加 ℞ 標示

【樣式】
- 深色主題，格線清晰
- 行星顏色區分吉凶（吉星金色、凶星紅色等）
- 適合在手機和桌機上都能閱讀

請配合現有的設計語言和元件風格實作。如果現有已有類似元件，請在上面擴充修改。
```

---

## PROMPT 6：大運時間軸元件

```
請先了解現有前端使用哪些圖表或視覺化套件。

目標：建立 Vimshottari Dasha 大運的視覺化元件，包含兩部分：

【1. 視覺化時間軸】
- 橫軸為年份，從出生到 120 年後
- 每個 Mahadasha 用不同顏色長條表示
- 標示當前時間位置
- Hover 顯示該 Dasha 詳情

【2. 詳細表格】
- Mahadasha 列表，可展開顯示 Antardasha
- 欄位：主星、子星、開始日期、結束日期、持續時長
- 當前進行中的 Dasha 高亮顯示

九大行星配色建議：
Sun #FF8C00、Moon #C0C0C0、Mars #DC143C、Mercury #228B22、
Jupiter #DAA520、Venus #FF69B4、Saturn #4169E1、Rahu #696969、Ketu #8B4513

請配合現有前端框架和樣式系統實作。
```

---

## PROMPT 7：行星詳細位置表格

```
目標：建立一個顯示所有行星詳細資料的表格元件。

欄位：行星名稱 | 星座(Rashi) | 度數 | Nakshatra | Pada | 宮位 | 逆行狀態 | 入廟/弱勢

入廟（Exaltation）/弱勢（Debilitation）對應：
- Sun：入廟 Aries ↑，弱 Libra ↓
- Moon：入廟 Taurus ↑，弱 Scorpio ↓
- Mars：入廟 Capricorn ↑，弱 Cancer ↓
- Mercury：入廟 Virgo ↑，弱 Pisces ↓
- Jupiter：入廟 Cancer ↑，弱 Capricorn ↓
- Venus：入廟 Pisces ↑，弱 Virgo ↓
- Saturn：入廟 Libra ↑，弱 Aries ↓

其他需求：
- 逆行行星顯示 ℞ 符號
- 底部顯示 Ayanamsha 名稱與修正值
- 提供匯出 CSV 功能

請配合現有表格元件風格，若已有類似元件請在上面修改。
```

---

## PROMPT 8：出生資料輸入介面

```
請先看看現有的表單元件和使用者輸入介面。

目標：確保出生資料輸入介面完整且易用。

需要的欄位：
- 姓名（選填）
- 出生日期（年 / 月 / 日）
- 出生時間（時 / 分，當地時間）
- 出生城市（輸入後自動查詢經緯度與時區）
  - 顯示查詢結果讓使用者確認
  - 提供手動輸入經緯度的選項（進階，預設隱藏）
- 進階設定（可收合）：
  - Ayanamsha 選擇：Lahiri（預設）/ Raman / Krishnamurti
  - 宮位制度：Whole Sign（預設）/ Placidus
  - 星盤格式：南印度 / 北印度

使用者體驗要求：
- 城市查詢要有 loading 狀態
- 表單驗證要有清楚的錯誤提示
- 送出後結果區域要有 loading 動畫

請在現有表單結構上補充缺少的功能，保持一致的設計風格。
```

---

## PROMPT 9：主頁面組合與導航

```
請瀏覽現有的頁面結構和路由設計。

目標：確保各個元件正確整合在主頁面，使用者可以流暢地從輸入到查看結果。

建議的頁面結構（若現有結構不同請告知，我們討論最佳方式）：
- 輸入區：出生資料表單
- 結果區（分頁 Tab）：
  * 星盤圖（可切換南印度/北印度格式）
  * 行星位置表
  * 大運時間軸

狀態流程：
1. 使用者填寫出生資料
2. 送出後呼叫 API
3. 顯示 loading 狀態
4. 結果出現後自動捲動到結果區
5. 錯誤時顯示友善的錯誤訊息

請確認前後端資料流是否完整，並修正任何 API 呼叫或資料轉換的問題。
```

---

## PROMPT 10：Navamsha D9 分割盤

```
目標：在現有基礎上加入 Navamsha（D9）分割盤支援。

【D9 計算規則】
將每個星座（30度）分成 9 等份（每份 3°20'），
行星落入哪一份，對應到哪個星座：
- 奇數星座（Aries, Gemini, Leo, Libra, Sagittarius, Aquarius）：從 Aries 起算
- 偶數星座（Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces）：從 Capricorn 起算

後端：在現有計算模組加入 D9 位置計算
前端：在星盤圖加入 D1/D9 切換按鈕，切換時更新顯示內容

請先評估現有架構最適合在哪裡加入這個功能。
```

---

## PROMPT 11：測試與驗證

```
目標：驗證整個命盤計算的準確性。

請用以下測試案例驗證計算結果（這是公開的歷史資料）：
- 出生日期：1869年10月2日 07:45 當地時間
- 出生地點：Porbandar, India（緯度 21.6417，經度 69.6293，時區 +5:30）
- 使用 Lahiri Ayanamsha

驗證重點：
1. 月亮所在 Nakshatra 是否正確
2. Lagna 星座是否正確
3. Rahu 和 Ketu 是否相差 180 度
4. Dasha 開始時間是否合理

另外測試邊界情況：
- 午夜出生（跨日時區轉換）
- 不同時區的城市（台北、紐約、倫敦）
- 時間很早期的出生年份（如 1920 年代）

發現任何計算錯誤請直接修正，並說明原因。
```

---

## 💡 給 Claude Code 的全局提示（建議放在對話開頭）

```
我正在開發一個印度占星（Vedic Astrology）網站，專案已有部分雛形。
在開始任何任務前，請先：
1. 瀏覽現有的專案結構
2. 理解既有的技術選型和架構
3. 在現有基礎上擴充，避免重複或破壞已有功能

技術背景：
- 印度占星使用 Sidereal 黃道（非 Tropical），需套用 Ayanamsha 修正
- 核心計算使用 Swiss Ephemeris（pyswisseph）
- 主要顯示格式：南印度方格星盤、行星位置表、Dasha 大運時間表

如果發現現有程式碼有問題，請先告知我再修改。
```
