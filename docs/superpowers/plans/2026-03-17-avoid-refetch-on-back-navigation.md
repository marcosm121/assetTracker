# Avoid Re-fetch on Back Navigation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `WatchlistScreen` from calling `fetchAll()` when the adapter cache is already populated, so navigating back from a detail screen is instant and network-free.

**Architecture:** `InvestorDataAdapter` already exposes `isReady(): boolean` (backed by a private `ready` flag set to `true` after the first successful `fetchAll()`). The fix is a one-line guard in `WatchlistScreen`'s `useEffect`: if the adapter is already ready, skip straight to the `loaded` state without triggering any network requests.

**Tech Stack:** React 18, React Router, TypeScript, Vitest.

---

## Chunk 1: Guard fetchAll behind isReady()

### Task 1: Add adapter test for isReady() idempotence

**Why:** The adapter already has tests for `isReady()`, but there is no test that verifies data remains intact if you choose NOT to call `fetchAll()` a second time. This test documents the contract the screen will now rely on.

**Files:**
- Modify: `src/adapters/InvestorDataAdapter.test.ts`

- [ ] **Step 1: Write the failing-by-absence test**

Add this test inside the existing `describe('isReady', ...)` block in `src/adapters/InvestorDataAdapter.test.ts`:

```typescript
it('returns true and retains data after a single fetchAll — no second fetch needed', async () => {
  mockFetchAll()
  await adapter.fetchAll()

  // isReady is true — a consumer can safely skip a second fetchAll
  expect(adapter.isReady()).toBe(true)

  // Data is accessible without calling fetchAll again
  expect(adapter.getPrices()['GGAL']).toEqual({ ars: 1234.56, usd: 0.9567 })
  expect(adapter.getDollarRates().blue).toBe(1350.00)
  expect(adapter.getHistoryPrices('1d')['YPF']).toEqual({ ars: 8500.00, usd: 6.5903 })
})
```

- [ ] **Step 2: Run the test to verify it passes immediately**

```bash
npx vitest run src/adapters/InvestorDataAdapter.test.ts
```

Expected: all tests PASS (this test documents existing correct behavior — it should pass with zero code changes).

- [ ] **Step 3: Commit the new test**

```bash
git add src/adapters/InvestorDataAdapter.test.ts
git commit -m "test: document isReady() contract — data persists without a second fetchAll"
```

---

### Task 2: Guard WatchlistScreen useEffect behind isReady()

**Files:**
- Modify: `src/screens/WatchlistScreen.tsx:27-35`

- [ ] **Step 1: Apply the guard in WatchlistScreen**

Replace the `useEffect` block at lines 27–35 in `src/screens/WatchlistScreen.tsx`:

```typescript
// BEFORE
useEffect(() => {
  setStatus('loading')
  adapter.fetchAll()
    .then(() => {
      setItems(adapter.getWatchlist())
      setStatus('loaded')
    })
    .catch(() => setStatus('error'))
}, [])  // eslint-disable-line react-hooks/exhaustive-deps
```

```typescript
// AFTER
useEffect(() => {
  if (adapter.isReady()) {
    setItems(adapter.getWatchlist())
    setStatus('loaded')
    return
  }
  setStatus('loading')
  adapter.fetchAll()
    .then(() => {
      setItems(adapter.getWatchlist())
      setStatus('loaded')
    })
    .catch(() => setStatus('error'))
}, [])  // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests PASS. The adapter tests, storage tests, and variation tests should be unaffected.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

1. Start the dev server: `npm run dev`
2. Open the app in a browser. Observe the initial `Cargando...` state followed by the list loading (normal first-load behavior — `fetchAll()` fires).
3. Click on any asset to open `AssetDetailScreen`.
4. Press the browser back button to return to `WatchlistScreen`.
5. Verify: the list renders immediately with no `Cargando...` flash and no network requests visible in DevTools → Network tab.
6. Verify: dollar rates in the footer are still shown correctly.

- [ ] **Step 5: Commit**

```bash
git add src/screens/WatchlistScreen.tsx
git commit -m "fix: skip fetchAll on WatchlistScreen remount when cache is already populated

Closes #3"
```

---

## Acceptance criteria checklist

- [ ] Navigating to `/asset/:symbol` and pressing back does **not** trigger a new network request.
- [ ] Data is served from cache on re-mount of `WatchlistScreen` (no loading flash).
- [ ] A full browser page reload still triggers a fresh `fetchAll()`.
