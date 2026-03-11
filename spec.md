# Safentry

## Current State
Safentry v11A is fully operational with: multi-tenant company management, personnel roles, visitor registration with signature/NDA/visitor-type, exit tracking, QR document verification, blacklist, notifications, statistics (hourly, purpose distribution, top persons), pre-registration/invite links, badge printout, personnel summary, emergency evacuation list, date-range PDF report, and top-visited-person ranking.

## Requested Changes (Diff)

### Add
- **Audit Log**: Track critical actions (blacklist add/remove, employee removal, visitor checkout) per company. Owner-only tab in employee dashboard.
- **Visitor Profile Page**: Modal showing all past visits for a specific visitor (by TC ID), accessible from the visitor list.
- **Quick Registration for Repeat Visitors**: During visitor registration, when TC ID is entered, auto-fill name/surname/phone from previous visit. Show repeat-visitor banner.
- **Self-Service Kiosk Mode**: Fullscreen visitor self-registration mode launched from employee dashboard. Visitor fills in their own info + signature. After submit, resets for next visitor.

### Modify
- Backend: Add `AuditLog` type, `auditLogs` storage, `getAuditLogs` query. Add audit calls in `addVisitorBlacklist`, `removeVisitorBlacklist`, `removeEmployeeFromCompany`, `checkoutVisitor`.
- Backend: Add `getVisitorsByTcId` query for visitor profile.
- `EmployeeDashboard`: Add "Kayıtlar" tab (owner only) for audit log. Add kiosk mode launch button. Add visitor profile modal.
- `VisitorRegisterForm`: Add TC ID auto-fill logic for repeat visitors.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `main.mo`: AuditLog type + storage + getAuditLogs + getVisitorsByTcId + audit calls in mutations.
2. Regenerate frontend bindings via generate_motoko_code.
3. Frontend: Add KioskMode component (fullscreen self-registration).
4. Frontend: Add VisitorProfileModal component (all visits by TC ID).
5. Frontend: Update VisitorRegisterForm for repeat-visitor quick fill.
6. Frontend: Update EmployeeDashboard with audit log tab, kiosk button, visitor profile access.
