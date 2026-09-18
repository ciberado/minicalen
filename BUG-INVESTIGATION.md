# Bug Investigation: Calendar Events Not Persisting After Reload

## ✅ RESOLVED

**Fix Applied**: Modified the useEffect in CategoryContext.tsx to track previous foreground categories and only run the color sync when actual color changes occur, not on initial load or remote state application.

**Key Changes**:
1. Added `prevForegroundCategoriesRef = useRef<Category[] | null>(null)` to track previous state
2. Modified the useEffect to:
   - Skip on first render (when `prevForegroundCategoriesRef.current` is null)
   - Compare current vs previous category colors before syncing
   - Only sync dates when colors actually changed (user edited a category)

**Console log proof**: After reload, the log shows `"No color changes detected, skipping sync"` instead of overwriting the loaded data.

---

## Problem Statement (Historical)
After saving a session and reloading the page with the session hash, calendar events (background colors on dates) are not displayed, even though the data exists in the database.

## Test Scenario
1. Click a date on the calendar (e.g., 2026-01-15) to mark it with a color
2. Click "Save Session" button
3. Reload the page (URL has hash like `#acbb36c7-fa4c-4d0a-a845-24f153cb076f`)
4. **Expected**: The date should show the background color
5. **Actual**: No background events are displayed (bgEvents = 0)

## Test Session
- Session ID: `acbb36c7-fa4c-4d0a-a845-24f153cb076f`
- Database: `/workspaces/minicalen/packages/server/data/minicalen.db`
- Contains date `2026-01-15` with color `#F44336`

## Root Cause Analysis

### The Problem Flow
1. Page loads → SessionContext detects hash → calls `loadSession()`
2. `loadSession()` fetches session from API → calls `applyRemoteState()`
3. `applyRemoteState()` sets `dateInfoMap` and `selectedDates` with correct data
4. **BUT** a `useEffect` in CategoryContext runs and overwrites the data

### The useEffect in CategoryContext.tsx (lines 205-230)
```tsx
useEffect(() => {
  // This effect syncs selectedDates when foregroundCategories change
  // It runs on every render when foregroundCategories changes
  
  // The version counter check should skip this when data comes from remote
  if (dateInfoMapVersionRef.current === remoteStateVersionRef.current && remoteStateVersionRef.current > 0) {
    console.log('Skipping category color sync...');
    dateInfoMapVersionRef.current = 0;
    return;
  }
  
  // ... but this code still runs and clears the data
}, [dateInfoMap, foregroundCategories]);
```

### Console Log Evidence
The logs show:
1. `CategoryContext: Applying remote state atomically` ✅
2. `CategoryContext: Setting new dateInfoMap with 1 entries` ✅
3. `CategoryContext: dateInfoMap and selectedDates set` ✅
4. `CategoryContext useEffect triggered - dateInfoMapVersion: X, remoteStateVersion: X`
5. **Sometimes** "Skipping category color sync" appears
6. **Sometimes** "Categories changed, updating dates" runs instead - this is the bug!

### Why the Skip Isn't Working Reliably
The useEffect runs multiple times due to:
1. React StrictMode (double-mounting in development)
2. Multiple state changes triggering re-renders
3. The version refs get reset too early

After the first skip, `dateInfoMapVersionRef.current = 0` is set, so the NEXT time the effect runs (due to React re-rendering), the skip condition fails and the effect runs the sync logic.

## Files Involved

### packages/frontend/src/components/CategoryContext.tsx
- `applyRemoteState()` function (lines ~157-203): Sets remote state atomically
- `useEffect` (lines ~205-250): Syncs selectedDates when categories change - THIS IS THE PROBLEM

### packages/frontend/src/components/SessionContext.tsx
- `loadSession()` function: Fetches session and calls `applyRemoteState()`

### packages/frontend/src/components/Calendar.tsx
- `events` useMemo (lines ~118-155): Generates FullCalendar events from `selectedDates` Map

## Fixes Already Applied (Not Working)
1. ✅ Backend upsert pattern in sessions.ts
2. ✅ SessionContext JSON parsing fix
3. ✅ Removed setTimeout(0) race condition in applyRemoteState
4. ❌ Version counter approach - partially works but not reliable

## Proposed Solutions

### Option 1: Use a dedicated "remote loaded" flag
Instead of version counters, use a boolean ref that stays true until ALL effects have run once:
```tsx
const remoteLoadedRef = useRef(false);
const pendingRemoteUpdateRef = useRef(false);

const applyRemoteState = useCallback((state) => {
  pendingRemoteUpdateRef.current = true;
  // ... set state ...
  // Use requestAnimationFrame to reset after React's batch
  requestAnimationFrame(() => {
    pendingRemoteUpdateRef.current = false;
    remoteLoadedRef.current = true;
  });
}, []);

useEffect(() => {
  if (pendingRemoteUpdateRef.current) return; // Skip during remote update
  // ... rest of effect
}, [dateInfoMap, foregroundCategories]);
```

### Option 2: Remove the problematic useEffect entirely
The useEffect that syncs colors when categories change may not be necessary. The color sync could be done:
1. Only when user explicitly changes a category color
2. As part of the category update handler, not a useEffect

### Option 3: Use useLayoutEffect with proper guards
`useLayoutEffect` runs synchronously after DOM mutations but before paint, which might provide better timing control.

### Option 4: Separate "user changes" from "remote state"
Track whether changes come from user interaction vs remote state using a different state management pattern (e.g., reducer with action types).

## How to Reproduce
1. Start services: `npm run dev:all`
2. Open browser to `http://localhost:5173/`
3. Click any date to select it
4. Click "Save Session"
5. Reload the page
6. Observe: the date selection is gone

## Commands for Testing
```bash
# Check database has the session
sqlite3 /workspaces/minicalen/packages/server/data/minicalen.db \
  "SELECT id, substr(state, 1, 500) FROM sessions WHERE id = 'acbb36c7-fa4c-4d0a-a845-24f153cb076f'"

# Start services
npm run dev:all
```

## Key Files to Read
1. `packages/frontend/src/components/CategoryContext.tsx` - The useEffect around line 205
2. `packages/frontend/src/components/SessionContext.tsx` - loadSession function
3. `packages/frontend/src/components/Calendar.tsx` - events useMemo
