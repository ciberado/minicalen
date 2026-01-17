# Multi-User Sync Infinite Loop Issue

**Issue Date**: January 17, 2026  
**Status**: Critical Bug - Multi-user collaboration non-functional  
**Priority**: High - Blocks core collaborative functionality

## Problem Summary

The MiniCalen application experiences a critical infinite sync loop when multiple users are connected to the same session. This makes real-time collaboration impossible as the clients become stuck in a continuous state synchronization cycle that consumes resources and prevents normal operation.

## Issue Description

### Symptoms
- Continuous console logging of sync-related messages
- Rapidly updating "Last saved" timestamps
- Browser performance degradation due to excessive state updates
- Multi-user collaboration becomes unusable
- Single-user mode works normally

### Affected Components
- `packages/frontend/src/components/SessionContext.tsx` - Primary sync logic
- `packages/frontend/src/components/WebSocketContext.tsx` - WebSocket communication
- `packages/frontend/src/components/CategoryContext.tsx` - State management triggers

## Root Cause Analysis

### The Feedback Loop

The infinite loop occurs due to a circular dependency in the state synchronization mechanism:

1. **Client A** makes a local change (e.g., adds/modifies a calendar date or category)
2. **SessionContext** detects the change via React useEffect dependencies
3. **Client A** broadcasts the state change via WebSocket to the session room
4. **Client B** receives the `state-update` WebSocket event
5. **Client B** applies the remote state via `handleRemoteStateUpdate()`
6. Applying the remote state triggers React state setters (`setForegroundCategories`, `setTextCategories`, `setSelectedDate`)
7. These state changes trigger the same useEffect that detects local changes
8. **Client B** now broadcasts a state change back to the room
9. **Client A** receives this broadcast and the cycle repeats infinitely

### Technical Details

#### Primary Issue Location
File: `packages/frontend/src/components/SessionContext.tsx`  
Lines: ~340-380 (broadcast useEffect)

```tsx
// This useEffect triggers on ANY state change, including remote updates
useEffect(() => {
  if (sessionId && !isApplyingRemoteState && lastSavedStateRef.current) {
    // State comparison logic...
    if (hasChanged) {
      // This timeout/broadcast still triggers even for remote changes
      const timeoutId = setTimeout(() => {
        broadcastCurrentState(); // ← Problematic broadcast
      }, 500);
    }
  }
}, [foregroundCategories, textCategories, dateInfoMap, sessionId, isApplyingRemoteState]);
```

#### Why Current Safeguards Fail

1. **Race Condition with `isApplyingRemoteState`**: The flag is set asynchronously and reset with a timeout, creating windows where state changes can leak through

2. **React Batching**: React may batch multiple state updates, causing the useEffect to fire after the `isApplyingRemoteState` flag is reset

3. **Deep State Changes**: The remote state application involves multiple nested state updates (categories, dates, text categories) that can trigger the effect multiple times

4. **Reference Comparison Issues**: Even updating `lastSavedStateRef.current` first, the comparison logic may still detect differences due to object reference changes

## Failed Fix Attempts

### Attempt 1: Timeout Increase
**Change**: Increased timeouts from 100ms to 1000ms  
**Result**: Failed - Only reduced frequency, didn't eliminate the loop

### Attempt 2: Early Reference Update
**Change**: Updated `lastSavedStateRef.current` before applying remote changes  
**Result**: Failed - State comparison still triggered broadcasts

### Attempt 3: Enhanced Safety Checks
**Change**: Added additional validation in `broadcastCurrentState()`  
**Result**: Failed - Root cause in useEffect dependency triggering remained

### Attempt 4: Debounce Optimization
**Change**: Reduced debounce time to 500ms for better responsiveness  
**Result**: Failed - Made the loop faster but didn't eliminate it

## Impact Assessment

### User Experience
- **Severe**: Multi-user collaboration completely broken
- **Resource Usage**: Excessive CPU and network consumption
- **Browser Performance**: Degraded due to continuous state updates

### Development Impact
- Blocks testing of collaborative features
- Prevents deployment of multi-user functionality
- Affects confidence in real-time architecture

## Architecture Analysis

### Current Sync Model Issues

The current approach has fundamental architectural problems:

1. **Single Trigger Point**: All state changes (local and remote) flow through the same detection mechanism
2. **Flag-Based Protection**: Relies on timing-sensitive flags that are unreliable in async React environments
3. **Deep Integration**: Sync logic is tightly coupled with normal state management

### Text Category Impact

The recent addition of text categories exacerbated the issue by:
- Adding more state variables to the dependency array
- Increasing the complexity of state comparisons
- Creating additional triggers for the sync loop

## Recommended Solutions

### Short-Term Fix (Immediate)
**Approach**: Implement a more robust flag system with state tracking

```tsx
// Use a ref-based approach that's not subject to React timing
const broadcastLockRef = useRef(false);
const stateSourceRef = useRef<'local' | 'remote'>('local');

// Separate effects for local vs remote state changes
useEffect(() => {
  if (stateSourceRef.current === 'local') {
    // Only broadcast for local changes
    broadcastCurrentState();
  }
  stateSourceRef.current = 'local'; // Reset for next change
}, [foregroundCategories, textCategories, dateInfoMap]);
```

### Medium-Term Solution (Architectural)
**Approach**: Separate local and remote state management

1. **Dual State Pattern**: Maintain separate local and remote state objects
2. **Event-Driven Updates**: Use custom events instead of React state for sync
3. **State Reconciliation**: Implement proper conflict resolution

### Long-Term Solution (Complete Redesign)
**Approach**: Implement proper CRDT (Conflict-free Replicated Data Type) or operational transformation

1. **Deterministic Updates**: Use vector clocks or logical timestamps
2. **Operation-Based Sync**: Broadcast operations instead of full state
3. **Proper Concurrency**: Handle simultaneous edits correctly

## Testing Requirements

### Verification Steps
1. Open two browser tabs to the same session
2. Make changes in one tab
3. Verify changes appear in the other tab WITHOUT infinite console logging
4. Ensure no performance degradation
5. Test with multiple simultaneous users

### Success Criteria
- Zero infinite loops in multi-user scenarios
- Changes sync within 1-2 seconds between clients
- No excessive logging or resource consumption
- Stable performance with 3+ concurrent users

## Development Priority

**Immediate Action Required**: This issue blocks the core collaborative value proposition of MiniCalen. The short-term fix should be implemented immediately, followed by architectural improvements.

### Stakeholder Communication
- **Product**: Multi-user features cannot be released until resolved
- **QA**: All multi-user test scenarios currently fail
- **DevOps**: Monitor for resource usage spikes in production

## Related Files

- `packages/frontend/src/components/SessionContext.tsx` - Primary fix location
- `packages/frontend/src/components/WebSocketContext.tsx` - May need state source tracking
- `packages/frontend/src/components/CategoryContext.tsx` - State change triggers
- `packages/server/src/index.ts` - WebSocket server logic (minimal changes needed)

---

**Next Steps**: Implement the short-term fix immediately to restore basic multi-user functionality, then plan the architectural improvements for a more robust long-term solution.