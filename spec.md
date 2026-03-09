# Safentry

## Current State

Full-stack visitor entry tracking app. VisitorList has date range filter, status filter, and text search. CompanyDashboard and EmployeeDashboard have stats tabs with top-visited-persons rankings. All core visitor flows (register, checkout, document, QR verification) are working.

## Requested Changes (Diff)

### Add
- CSV export button in VisitorList that downloads the currently filtered visitor data as a .csv file (columns: Ad Soyad, TC No, Telefon, Ziyaret Edilen, Amaç, Giriş Zamanı, Çıkış Zamanı, Durum, Belge Kodu)
- Weekly visitor count chart in stats tab (last 7 days bar chart using recharts which is already available via shadcn chart)
- Phone number field included in visitor search (currently searches name and TC, add phone)

### Modify
- VisitorList: add export button (Download icon) next to date filter toggle; clicking it exports the filtered list as CSV
- VisitorList: extend search to match phone numbers
- CompanyDashboard stats tab: add weekly visitors bar chart below stat cards
- EmployeeDashboard stats tab: add weekly visitors bar chart below stat cards (only visible for owner/authorized roles)

### Remove
- Nothing removed

## Implementation Plan

1. Add `exportToCsv` helper in VisitorList: map filtered visitors to CSV rows, generate blob, trigger download
2. Add Download icon button next to CalendarRange toggle in VisitorList toolbar
3. Extend search filter to also match `v.phone`
4. Add `WeeklyChart` component that takes array of `{day: string, count: number}` and renders a bar chart using shadcn `ChartContainer`
5. In CompanyDashboard and EmployeeDashboard stats sections, call backend `getWeeklyVisitorStats` (or compute from existing visitors data on frontend using the full visitor list) and render WeeklyChart
   - Since no new backend API exists for weekly stats, compute from visitor list in the frontend stats tab by fetching all visitors and grouping by day
6. Apply deterministic data-ocid markers to all new interactive elements
