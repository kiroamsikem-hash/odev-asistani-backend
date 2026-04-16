# 🚀 Backend Deployment Notes - Premium System

## 📦 Yeni Dosyalar

### Controllers
- `src/controllers/admin.controller.js` - Admin panel işlemleri
- `src/controllers/premium.controller.js` - Premium satın alma ve yönetim

### Middleware
- `src/middleware/admin.middleware.js` - Admin yetki kontrolü

### Routes
- `src/routes/admin.routes.js` - Admin endpoint'leri
- `src/routes/premium.routes.js` - Premium endpoint'leri

### Migrations
- `migrations/add_premium_system.sql` - Premium sistem tabloları

## 🔄 Güncellenen Dosyalar

### Modified
- `src/server.js` - Admin ve premium route'ları eklendi, `/api/run-migration` endpoint eklendi
- `src/middleware/rateLimit.middleware.js` - Premium tier bazlı limit kontrolü
- `run-migration.js` - Premium migration eklendi

## 🗄️ Database Değişiklikleri

### Yeni Tablolar
1. **premium_packages** - Premium paket tanımları
2. **premium_transactions** - Premium satın alma işlemleri

### Users Tablosuna Eklenen Alanlar
- `premium_tier` VARCHAR(20) DEFAULT 'free'
- `premium_expires_at` TIMESTAMP
- `daily_limit` INTEGER DEFAULT 5
- `is_admin` BOOLEAN DEFAULT FALSE

## 🚀 Deployment Adımları

### 1. Backend'i Deploy Et
```bash
git add .
git commit -m "feat: Premium system and admin panel"
git push
```

### 2. Migration Çalıştır
Render Shell erişimi yoksa, deploy sonrası tarayıcıdan:
```
https://odev-asistani-backend.onrender.com/api/run-migration
```

### 3. Kontrol Et
```
https://odev-asistani-backend.onrender.com/api/migration-status
```

## ✅ Test Checklist

- [ ] Backend başarıyla deploy oldu
- [ ] `/api/run-migration` çalıştırıldı
- [ ] `/api/migration-status` success döndü
- [ ] `/api/premium/packages` paketleri listeler
- [ ] `/api/admin/users` (admin token ile) kullanıcıları listeler
- [ ] Admin kullanıcılar (byazar1628, myazar483) sınırsız erişime sahip
- [ ] Free kullanıcılar günlük 5 soru sorabilir
- [ ] Premium satın alma çalışıyor

## 🔑 Admin Kullanıcılar

Migration sonrası otomatik admin yetkisi verilir:
- byazar1628@gmail.com
- myazar483@gmail.com

## 📊 Premium Paketler

Migration sonrası otomatik oluşturulur:
1. Temel - 99₺ - 20 soru/gün
2. Standart - 199₺ - 60 soru/gün
3. Premium - 399₺ - 120 soru/gün

## 🐛 Troubleshooting

### Migration hatası alıyorsanız
- Database bağlantısını kontrol edin
- Migration dosyalarının varlığını kontrol edin
- Backend loglarını inceleyin

### Admin panel çalışmıyorsa
- Migration'ın başarılı olduğundan emin olun
- Admin kullanıcıların `is_admin=true` olduğunu kontrol edin
- JWT token'ın geçerli olduğundan emin olun

## 📝 Environment Variables

Mevcut .env dosyası yeterli, yeni değişken gerekmez.

## 🔄 Rollback

Eğer sorun çıkarsa:
```sql
-- Premium tablolarını sil
DROP TABLE IF EXISTS premium_transactions;
DROP TABLE IF EXISTS premium_packages;

-- Users tablosundan yeni alanları kaldır
ALTER TABLE users DROP COLUMN IF EXISTS premium_tier;
ALTER TABLE users DROP COLUMN IF EXISTS premium_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS daily_limit;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
```

## 📞 Next Steps

1. Backend'i deploy et
2. Migration çalıştır
3. Mobile APK'yı test et
4. Admin panel'i test et
5. Premium satın almayı test et
