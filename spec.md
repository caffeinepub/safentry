# Safentry

## Current State
Safentry is a multi-tenant visitor tracking app. Sürüm 10A implemented: active visitor security screen (güvenlik tab), visitor type dropdown, NDA checkbox. Visitor invite links, badge printout, and personnel summary panel are planned for this release.

## Requested Changes (Diff)

### Add
- **Ziyaretçi Davet Linki**: Employee creates an invite with visiting person + purpose. System generates a unique invite code. Employee copies the link (e.g. `?invite=CODE`). Visitor opens link, fills in name/surname/TC/phone. Employee sees pending pre-registrations in a new "Davetler" tab. On arrival, employee finalizes (converts to full visitor record) by capturing signature.
- **Rozet Baskı Çıktısı**: In visitor list/detail, a print badge button generates a print-friendly badge: visitor name, company name, visit purpose, visiting person, entry time, document code as text. Uses `window.print()` with print CSS.
- **Personel Özet Paneli**: In EmployeeDashboard, a summary card showing: today's visitors registered by this employee, active (not checked out) visitors registered by this employee, this employee's total all-time visitors.
- Backend: `PreRegistration` type, `createInvite`, `getInvitePublic`, `submitInviteInfo`, `finalizeInvite`, `getCompanyInvites`, `cancelInvite` functions.
- New frontend page: `InviteForm.tsx` — public page for visitor to fill their data.

### Modify
- `App.tsx`: Add `inviteForm` screen.
- `EmployeeDashboard.tsx`: Add Davetler tab, personel özet kartı.
- `VisitorList.tsx` or `CompanyDashboard.tsx`: Add badge print button.
- Backend `main.mo`: Add PreRegistration storage and functions.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `main.mo` with PreRegistration type and invite functions.
2. Create `InviteForm.tsx` for visitor self-registration.
3. Update `EmployeeDashboard.tsx` with Davetler tab and summary card.
4. Add badge print utility in `VisitorList.tsx`.
5. Update `App.tsx` to route invite screen.
