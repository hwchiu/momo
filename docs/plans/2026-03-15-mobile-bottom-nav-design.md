# Mobile Bottom Nav Design Doc

**Date:** 2026-03-15
**Approach:** Pure CSS + minimal App.tsx change

## Summary

Add a mobile bottom navigation bar for screens ≤640px. Desktop sidebar unchanged.

## Changes

### App.tsx
- Add `<nav className="mobile-bottom-nav">` before closing `</div>` of `.almuten-app`
- Renders the same `NAV_ITEMS` as the sidebar

### App.css
- `.almuten-app`: `height: 100vh` → `height: 100dvh`; mobile: `flex-direction: column`
- `.stellar-sidebar`: mobile `display: none`
- `.stellar-content`: mobile add `padding-bottom: 72px`
- `.mobile-bottom-nav`: dark cosmic style, fixed at bottom, 7 icons with labels
- Desktop: `.mobile-bottom-nav { display: none }`
