# Mobile Bottom Nav Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a bottom navigation bar for mobile (≤640px) while keeping desktop sidebar completely unchanged.

**Architecture:** Pure CSS approach — bottom nav is always in the DOM but hidden on desktop via `display: none`. On mobile, sidebar hides and bottom nav appears. Two files only: `src/App.tsx` (add nav element) and `src/App.css` (media queries + styles).

**Tech Stack:** React 19, CSS media queries, `100dvh` for iOS viewport fix.

---

### Task 1: Add mobile bottom nav element to App.tsx

**Files:**
- Modify: `src/App.tsx` (lines 433–436, just before closing `</div>`)

**Step 1: Read the file to confirm exact closing lines**

Read `src/App.tsx` lines 430–441 to confirm the structure ends with:
```tsx
        </ErrorBoundary>
      </div>
    </div>
  );
}
```

**Step 2: Add the mobile bottom nav element**

Insert a `<nav className="mobile-bottom-nav">` block between the closing `</div>` of `.stellar-main` and the closing `</div>` of `.almuten-app`:

```tsx
        </ErrorBoundary>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="mobile-bottom-nav" role="tablist" aria-label="功能導覽">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id as typeof activeTab)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(mobile): add bottom nav element to App.tsx"
```

---

### Task 2: CSS — fix viewport height and hide sidebar on mobile

**Files:**
- Modify: `src/App.css`

**Step 1: Fix `height: 100vh` → `height: 100dvh` in `.almuten-app`**

Find:
```css
.almuten-app {
  display: flex;
  height: 100vh;
  overflow: hidden;
```

Replace `height: 100vh` with `height: 100dvh`:
```css
.almuten-app {
  display: flex;
  height: 100dvh;
  overflow: hidden;
```

`100dvh` (dynamic viewport height) accounts for iOS Safari's retractable address bar. On desktop browsers it behaves identically to `100vh`.

**Step 2: Add mobile layout overrides**

Find the existing `@media (max-width: 600px)` block near the bottom of the file (around line 3434):
```css
@media (max-width: 600px) {
  .stellar-content { padding: 12px; }
  .glass-panel { padding: 14px; }
}
```

Add new mobile rules in a new `@media (max-width: 640px)` block. Place it AFTER the existing `@media (max-width: 900px)` responsive block (around line 3432):

```css
/* ══ Mobile: bottom nav layout ══ */
@media (max-width: 640px) {
  /* Switch to vertical stack */
  .almuten-app {
    flex-direction: column;
  }

  /* Hide desktop sidebar */
  .stellar-sidebar {
    display: none;
  }

  /* Main content fills remaining height above bottom nav */
  .stellar-main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Content area: leave room for bottom nav (64px) */
  .stellar-content {
    padding-bottom: 72px;
  }

  /* Natal chart: single column */
  .natal-workspace {
    grid-template-columns: 1fr;
  }
}
```

**Step 3: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/App.css
git commit -m "fix(mobile): 100dvh viewport fix and sidebar hide on mobile"
```

---

### Task 3: CSS — style the mobile bottom nav bar

**Files:**
- Modify: `src/App.css`

**Step 1: Add `.mobile-bottom-nav` hidden on desktop**

After the closing brace of the `@media (max-width: 640px)` block added in Task 2, add the base (desktop) rule that hides the bottom nav:

```css
/* Mobile bottom nav — hidden on desktop */
.mobile-bottom-nav {
  display: none;
}
```

**Step 2: Add mobile styles inside a new `@media (max-width: 640px)` block**

```css
@media (max-width: 640px) {
  .mobile-bottom-nav {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 64px;
    flex-shrink: 0;
    background: rgba(6, 13, 26, 0.96);
    border-top: 1px solid rgba(79, 195, 247, 0.2);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 100;
    /* Safe area for iPhone home indicator */
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .mobile-nav-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px 2px;
    color: var(--accent-silver-muted, #7A8AAA);
    transition: color 0.15s;
    min-width: 0;
  }

  .mobile-nav-btn.active {
    color: var(--accent-blue, #4FC3F7);
  }

  .mobile-nav-btn:active {
    opacity: 0.7;
  }

  .mobile-nav-icon {
    font-size: 1.3rem;
    line-height: 1;
  }

  .mobile-nav-label {
    font-size: 0.6rem;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}
```

**Step 3: Run full test suite**

```bash
npm run test
```

Expected: 537 tests pass (CSS changes don't affect unit tests).

**Step 4: Run lint and prettier check**

```bash
npm run lint && npm run format:check
```

If prettier fails: `npx prettier --write src/App.css src/App.tsx`

**Step 5: Commit**

```bash
git add src/App.css
git commit -m "feat(mobile): dark cosmic bottom nav bar styles"
```

---

### Task 4: Final QA

**Step 1: Run typecheck**

```bash
npm run typecheck
```

**Step 2: Run full test suite**

```bash
npm run test
```

Expected: All 537 tests pass.

**Step 3: Visual QA checklist**

Start dev server: `npm run dev`

Open browser DevTools → Toggle device toolbar (mobile emulation):

**iPhone SE (375×667):**
- [ ] Sidebar not visible
- [ ] Bottom nav visible with 7 icons + labels
- [ ] Active tab highlighted in blue
- [ ] Switching tabs works
- [ ] Content scrollable above bottom nav (not hidden under it)
- [ ] Header ("星盤繪製器") visible at top

**Desktop (1280×800):**
- [ ] Sidebar visible, bottom nav not visible
- [ ] Layout unchanged from before

**Step 4: Commit if any fixes needed**

```bash
git add src/App.css src/App.tsx
git commit -m "fix(mobile): QA adjustments"
```
