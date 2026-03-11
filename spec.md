# Safentry - Sürüm 22

## Current State

Safentry is a multi-tenant visitor entry tracking system with company dashboard, personnel dashboard, blacklist management, visitor tracking, statistics, and multi-language support (10 languages).

- CompanyDashboard.tsx: tabs for visitors, employees, stats, info. Has blacklist add/remove (no confirmation dialog on add or remove). Stats section shows basic counts.
- EmployeeManager.tsx: personnel list with removal confirmation modal already in place.
- EmployeeDashboard.tsx: visitor registration, active visitors, pre-registration, kiosk mode. No queue management feature.

## Requested Changes (Diff)

### Add
- **Blacklist confirmation dialogs**: Add confirmation modal before `handleBlacklistAdd` executes ("Bu TC'yi kara listeye eklemek istediğinizden emin misiniz?") and before `handleBlacklistRemove` executes. Use AlertDialog pattern.
- **Queue management panel**: New tab or section in EmployeeDashboard for queue management. Features: add visitor to queue (name + purpose), display numbered queue list, "Çağır" (call next) button marks queue entry as called, remove from queue. Queue is in-memory/local state per session. Show queue number badge on each entry.
- **Enhanced company dashboard**: In CompanyDashboard stats/summary section, add a prominent summary card row at the top: today's visitor count, currently active visitors, total personnel count, last 7 days total. Style as metric cards with icons.

### Modify
- CompanyDashboard.tsx: add confirmation states for blacklist add/remove; add enhanced metric cards to stats tab top section.
- EmployeeDashboard.tsx: add a "Sıra" (Queue) tab with queue management UI.

### Remove
- Nothing removed.

## Implementation Plan

1. In CompanyDashboard.tsx:
   - Add `confirmBlacklistAdd` state (boolean) and `confirmBlacklistRemoveId` state (string|null).
   - Intercept blacklist form submit to show confirmation modal first, then proceed.
   - Intercept blacklist remove button to show confirmation modal, then call `handleBlacklistRemove`.
   - Add enhanced metric card row in the stats tab: Today's Visitors, Active Now, Total Personnel, 7-Day Total.

2. In EmployeeDashboard.tsx:
   - Add a "Sıra" tab to the existing tab bar.
   - Add queue state: array of `{ id, name, purpose, number, status: 'waiting'|'called' }`.
   - Queue panel: input for name + purpose, add to queue button, numbered list display, "Çağır" button per entry, remove button per entry.
   - Queue numbers auto-increment, reset per session.
