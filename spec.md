# Safentry

## Current State

Safentry is a multi-tenant visitor entry tracking application with:
- Company registration/login, personnel registration/login, visitor document inquiry
- Role-based access (owner, authorized/manager, registrar)
- Visitor registration with digital signature, PDF with QR code
- Visitor exit tracking, document verification
- Statistics (daily counts, top visited persons, 7-day graph, visit reason distribution, frequent visitors)
- CSV export, date filtering, personnel filter, search (name, phone, TC)
- Company logo upload, repeat visitor detection
- Session timeout (30 min inactivity)
- Personel şirketten çıkarma (`removeEmployeeFromCompany`) already exists in backend

## Requested Changes (Diff)

### Add
- **Personel şifre değiştirme**: Personnel can change their own password (PIN code stored on backend, verified at login)
- **Başarısız giriş kilidi**: After 5 failed login attempts, lock the account for 15 minutes (frontend-side tracking with localStorage)
- **Şirket profil düzenleme**: Company owner can update company name, sector, address, and contact person name
- **Panel içi bildirim**: When a visitor is registered for a person, show an in-panel notification badge/alert for that person if they are logged in (frontend-only simulated notification using localStorage events)

### Modify
- Personnel panel: add "Şifre Değiştir" option in settings
- Company panel personnel tab: show "Çıkar" button next to each personnel (already in backend, just needs UI wiring)
- Company panel: add "Profil Düzenle" option in Bilgiler tab

### Remove
- Nothing removed

## Implementation Plan

1. **Backend**: Add `updateCompanyProfile(loginCode, name, sector, address, contactPersonName)` function. Add `setEmployeePin(employeeId, pin)` and `verifyEmployeePin(employeeId, pin)` functions. Add `getFailedLoginAttempts` / login attempt tracking. Add `getVisitorsByPerson` helper for notification feature.
2. **Frontend - Şifre Değiştir**: In personnel panel settings/profile section, add a form to set/change a numeric PIN. Store PIN hash in backend.
3. **Frontend - Giriş kilidi**: Track failed login attempts in localStorage per employeeId. After 5 failures within 15 min, show lockout message.
4. **Frontend - Şirket profil düzenleme**: In company Bilgiler tab, add an edit form for company info fields.
5. **Frontend - Personel çıkarma UI**: Wire existing `removeEmployeeFromCompany` to a "Çıkar" button in the personnel list (already available for owners).
6. **Frontend - Panel içi bildirim**: When personnel logs in and views their panel, check if they are listed as "visitingPerson" in any active (no exit) visitors today, show a notification banner.
