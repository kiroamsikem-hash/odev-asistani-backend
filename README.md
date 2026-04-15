# 🚀 Ödev Asistanı Backend API

Node.js + Express + MongoDB tabanlı AI destekli eğitim asistanı backend API'si.

## 📋 Gereksinimler

- Node.js 16+ 
- MongoDB 5+
- OpenAI API Key veya Google Gemini API Key

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Değişkenlerini Ayarla

`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/odev-asistani
JWT_SECRET=your-super-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

### 3. MongoDB'yi Başlat

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### 4. Sunucuyu Başlat

```bash
# Development mode (nodemon ile)
npm run dev

# Production mode
npm start
```

Sunucu `http://localhost:5000` adresinde çalışacaktır.

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/apple` - Apple OAuth

### AI Operations

- `POST /api/ai/solve` - Soru çözme
- `POST /api/ai/ocr` - Görüntüden metin çıkarma
- `POST /api/ai/compose` - Kompozisyon yazma
- `POST /api/ai/translate` - Çeviri
- `POST /api/ai/simplify` - Açıklamayı basitleştirme

### Questions

- `GET /api/questions` - Soru geçmişi
- `GET /api/questions/:id` - Tek soru detayı
- `DELETE /api/questions/:id` - Soru silme

### User

- `GET /api/users/profile` - Profil bilgisi
- `PUT /api/users/profile` - Profil güncelleme
- `GET /api/users/stats` - Kullanıcı istatistikleri

## 🔑 API Key Alma

### OpenAI API Key

1. [OpenAI Platform](https://platform.openai.com/) adresine gidin
2. API Keys bölümünden yeni key oluşturun
3. `.env` dosyasına ekleyin

### Google Gemini API Key

1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. API key oluşturun
3. `.env` dosyasına ekleyin

## 📦 Proje Yapısı

```
backend/
├── src/
│   ├── config/          # Konfigürasyon dosyaları
│   ├── controllers/     # Route controller'ları
│   ├── middleware/      # Express middleware'leri
│   ├── models/          # MongoDB modelleri
│   ├── routes/          # API route tanımları
│   └── server.js        # Ana sunucu dosyası
├── .env.example         # Environment değişkenleri örneği
├── package.json
└── README.md
```

## 🧪 Test

```bash
npm test
```

## 📝 Notlar

- Günlük soru limiti: Ücretsiz 10, Premium 100
- Maksimum dosya boyutu: 10MB
- Desteklenen resim formatları: JPG, PNG, WEBP
- Rate limiting aktif

## 🔒 Güvenlik

- JWT token tabanlı authentication
- Helmet.js ile HTTP header güvenliği
- CORS koruması
- Rate limiting
- Input validation

## 📄 Lisans

MIT
