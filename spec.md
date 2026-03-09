# Safentry

## Current State

Tam çalışır bir ziyaretçi giriş takip sistemi:
- Landing sayfası (3 giriş noktası)
- Şirket kayıt/giriş, Şirket paneli (ziyaretçiler, personel, istatistikler)
- Personel kayıt/giriş, Personel paneli (ziyaretçi kayıt, liste, istatistikler)
- Ziyaretçi belgesi sorgulama
- Backend: registerCompany, loginCompany, registerEmployee, loginEmployee, addEmployeeToCompany, getCompanyEmployees, setEmployeeRole, removeEmployeeFromCompany, registerVisitor, checkoutVisitor, getVisitors, getVisitorById, verifyDocument, getCompanyStats

## Requested Changes (Diff)

### Add
- **Ziyaretçi Detay Modal**: Ziyaretçi listesinde her satıra tıklayınca modal açılır; ad/soyad, TC, telefon, ziyaret edilen kişi, amaç, giriş/çıkış zamanları, imza görseli (canvas), belge kodu
- **PDF / Yazdır Butonu**: Detay modalında "Belge Yazdır" butonu -- tarayıcının print diyaloğunu açar, print-only CSS ile temiz bir ziyaretçi belgesi formatı (şirket adı, ziyaretçi bilgileri, QR placeholder, belge kodu, imza)
- **Şirket paneli personel ekleme**: EmployeeManager içinde "Personel Ekle" butonu ile personel kodu girilerek şirkete personel atanabilsin (addEmployeeToCompany API'si kullanılarak), rol seçimi ile birlikte

### Modify
- **Tasarım iyileştirme**: Landing, auth ekranları ve dashboard'lar için daha güçlü, profesyonel görsel dil; daha iyi tipografi, renkler, kart tasarımları, mikro-animasyonlar
- **VisitorList**: Tıklanabilir satırlar, detay modalını açar
- **EmployeeManager**: Mevcut personel listeleme + yeni personel ekleme formu

### Remove
- Hiçbir şey kaldırılmayacak

## Implementation Plan

1. VisitorDetail modal bileşeni oluştur (tüm alanlar + imza canvas + belge kodu)
2. Print CSS ekle (index.css veya inline) -- yazdırma görünümü için temiz format
3. VisitorList bileşenini tıklanabilir yap, detay modalını bağla
4. EmployeeManager'a personel ekleme formu ekle (personel kodu input + rol seçimi + addEmployeeToCompany çağrısı)
5. Tüm sayfalarda tasarım iyileştirmesi (Landing, auth, dashboard'lar)
