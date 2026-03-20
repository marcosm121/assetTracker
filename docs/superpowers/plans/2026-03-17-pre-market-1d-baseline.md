# Pre-Market 1d Baseline Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the current time is before 10:00 AM GMT-3 (market not yet open), use 2 days ago instead of 1 day ago as the `1d` history baseline, so the displayed variation is meaningful rather than 0%.

**Architecture:** The fix lives entirely in `InvestorDataAdapter.ts`. A new exported pure function `getOneDayHistoryDaysAgo(now?: Date): number` encapsulates the time-window logic and returns `2` before 10:00 AM GMT-3, `1` otherwise. `fetchAll()` calls this function to determine the `daysAgo` offset for the `1d` period. The function is exported so it can be tested directly without mocking `Date`.

**Tech Stack:** TypeScript, Vitest

---

## Background

The Argentine market runs 10:00 AM – 17:00 PM GMT-3.

| Time (GMT-3) | `/manyall` content | Desired `1d` baseline date | `daysAgo` |
|---|---|---|---|
| < 10:00 AM | Yesterday's close (market not open yet) | Day before yesterday | **2** |
| 10:00 AM – 17:00 PM | Live intraday prices | Yesterday's close | 1 |
| > 17:00 PM | Today's close | Yesterday's close | 1 |

Before the fix, `DAYS_AGO['1d'] = 1` was always used. Before 10:00 AM, this makes both the current price (yesterday's close) and the baseline (yesterday's close) the same date → 0% variation everywhere, which is wrong.

---

## File Structure

### Files to modify

- `src/adapters/InvestorDataAdapter.ts` — add exported `getOneDayHistoryDaysAgo(now?)`, update `fetchAll()` to use it for the `1d` period
- `src/adapters/InvestorDataAdapter.test.ts` — add tests for `getOneDayHistoryDaysAgo` (all three windows) and verify `fetchAll()` uses the correct date

---

## Task 1: Add and test `getOneDayHistoryDaysAgo`

**Files:**
- Modify: `src/adapters/InvestorDataAdapter.ts`
- Modify: `src/adapters/InvestorDataAdapter.test.ts`

### Step 1.1: Write the failing tests first

Add an import at the top of `src/adapters/InvestorDataAdapter.test.ts` (after the existing import line):

```typescript
import { InvestorDataAdapter, getOneDayHistoryDaysAgo } from './InvestorDataAdapter'
```

Then add a new `describe` block at the bottom of the file (before the closing `}` of the outermost `describe`):

```typescript
describe('getOneDayHistoryDaysAgo', () => {
  function makeDate(utcHour: number, utcMinute = 0): Date {
    const d = new Date(0)
    d.setUTCHours(utcHour, utcMinute, 0, 0)
    return d
  }

  it('returns 2 at 09:59 AM GMT-3 (12:59 UTC) — pre-market', () => {
    // 12:59 UTC = 09:59 GMT-3
    expect(getOneDayHistoryDaysAgo(makeDate(12, 59))).toBe(2)
  })

  it('returns 2 at 00:00 AM GMT-3 (03:00 UTC) — midnight, pre-market', () => {
    // 03:00 UTC = 00:00 GMT-3
    expect(getOneDayHistoryDaysAgo(makeDate(3, 0))).toBe(2)
  })

  it('returns 1 at exactly 10:00 AM GMT-3 (13:00 UTC) — market open boundary', () => {
    // 13:00 UTC = 10:00 GMT-3
    expect(getOneDayHistoryDaysAgo(makeDate(13, 0))).toBe(1)
  })

  it('returns 1 at 12:00 PM GMT-3 (15:00 UTC) — during trading hours', () => {
    expect(getOneDayHistoryDaysAgo(makeDate(15, 0))).toBe(1)
  })

  it('returns 1 at 18:00 PM GMT-3 (21:00 UTC) — after market close', () => {
    expect(getOneDayHistoryDaysAgo(makeDate(21, 0))).toBe(1)
  })
})
```

- [ ] **Step 1.1: Write the failing tests** (add import + describe block above to test file)

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
npx vitest run src/adapters/InvestorDataAdapter.test.ts
```

Expected: `getOneDayHistoryDaysAgo` tests fail with "is not a function" or similar import error.

- [ ] **Step 1.3: Implement `getOneDayHistoryDaysAgo` in `InvestorDataAdapter.ts`**

Add this function **after** the existing `utcDateString` function (after line 19):

```typescript
/**
 * Returns how many days ago to use as the `1d` history baseline.
 * Before 10:00 AM GMT-3 the market hasn't opened, so /manyall returns
 * yesterday's close — comparing to yesterday's historical snapshot would
 * give 0% variation. Use 2 days ago instead so the variation is meaningful.
 */
export function getOneDayHistoryDaysAgo(now: Date = new Date()): number {
  // GMT-3 local hour = UTC hour - 3, normalized to [0, 24)
  const localHour = ((now.getUTCHours() - 3) + 24) % 24
  return localHour < 10 ? 2 : 1
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
npx vitest run src/adapters/InvestorDataAdapter.test.ts
```

Expected: all tests PASS, including the 5 new `getOneDayHistoryDaysAgo` tests.

- [ ] **Step 1.5: Commit**

```bash
git add src/adapters/InvestorDataAdapter.ts src/adapters/InvestorDataAdapter.test.ts
git commit -m "feat: add getOneDayHistoryDaysAgo — returns 2 before 10 AM GMT-3, 1 otherwise"
```

---

## Task 2: Wire `getOneDayHistoryDaysAgo` into `fetchAll()`

**Files:**
- Modify: `src/adapters/InvestorDataAdapter.ts`
- Modify: `src/adapters/InvestorDataAdapter.test.ts`

### Step 2.1: Write a failing test for the pre-market URL

Add the following test **inside** the existing `describe('fetchAll', ...)` block in `src/adapters/InvestorDataAdapter.test.ts`, after the existing `'calls /manyhistory with 4 different dates'` test:

```typescript
it('uses 2-days-ago date for 1d period before 10:00 AM GMT-3', async () => {
  // Simulate 09:00 AM GMT-3 = 12:00 UTC
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-17T12:00:00Z')) // 09:00 AM GMT-3

  mockFetchAll()
  await adapter.fetchAll()

  const calls = vi.mocked(fetch).mock.calls.map(c => c[0] as string)
  const historyCalls = calls.filter(url => url.includes('/manyhistory/'))

  // 1d should be 2 days ago = 2026-03-15
  expect(historyCalls).toContainEqual(expect.stringContaining('/manyhistory/2026-03-15'))
  // Other periods still use their normal offsets (7, 30, 90 days ago)
  expect(historyCalls).not.toContainEqual(expect.stringContaining('/manyhistory/2026-03-16'))

  vi.useRealTimers()
})

it('uses 1-day-ago date for 1d period after 10:00 AM GMT-3', async () => {
  // Simulate 11:00 AM GMT-3 = 14:00 UTC
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-17T14:00:00Z')) // 11:00 AM GMT-3

  mockFetchAll()
  await adapter.fetchAll()

  const calls = vi.mocked(fetch).mock.calls.map(c => c[0] as string)
  const historyCalls = calls.filter(url => url.includes('/manyhistory/'))

  // 1d should be 1 day ago = 2026-03-16
  expect(historyCalls).toContainEqual(expect.stringContaining('/manyhistory/2026-03-16'))

  vi.useRealTimers()
})
```

- [ ] **Step 2.1: Write the failing tests** (add the two new tests inside `describe('fetchAll', ...)`)

- [ ] **Step 2.2: Run to confirm they fail**

```bash
npx vitest run src/adapters/InvestorDataAdapter.test.ts
```

Expected: the two new `fetchAll` tests fail because `fetchAll()` still always uses `DAYS_AGO['1d'] = 1`.

- [ ] **Step 2.3: Update `fetchAll()` to use `getOneDayHistoryDaysAgo`**

Replace the `fetchAll()` method body in `src/adapters/InvestorDataAdapter.ts`:

```typescript
// BEFORE
async fetchAll(): Promise<void> {
  const [current, ...histRaws] = await Promise.all([
    this.get<RawManyAll>('/manyall'),
    ...PERIODS.map(p => this.get<RawHistory>(`/manyhistory/${utcDateString(DAYS_AGO[p])}`)),
  ])
```

```typescript
// AFTER
async fetchAll(): Promise<void> {
  const oneDayAgo = getOneDayHistoryDaysAgo()
  const [current, ...histRaws] = await Promise.all([
    this.get<RawManyAll>('/manyall'),
    ...PERIODS.map(p => {
      const daysAgo = p === '1d' ? oneDayAgo : DAYS_AGO[p]
      return this.get<RawHistory>(`/manyhistory/${utcDateString(daysAgo)}`)
    }),
  ])
```

- [ ] **Step 2.4: Run all tests to confirm they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2.5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.6: Commit**

```bash
git add src/adapters/InvestorDataAdapter.ts src/adapters/InvestorDataAdapter.test.ts
git commit -m "feat: use 2-days-ago as 1d baseline before 10:00 AM GMT-3

Closes #4"
```

---

## Acceptance criteria checklist

- [ ] `getOneDayHistoryDaysAgo` returns `2` at any time before 10:00 AM GMT-3 (including midnight)
- [ ] `getOneDayHistoryDaysAgo` returns `1` at exactly 10:00 AM GMT-3 and any later time
- [ ] `fetchAll()` requests `utcDateString(2)` for the `1d` period before 10:00 AM GMT-3
- [ ] `fetchAll()` requests `utcDateString(1)` for the `1d` period during and after market hours
- [ ] All other periods (`1w`, `1m`, `3m`) are unaffected regardless of time
- [ ] All existing tests continue to pass
