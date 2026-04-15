# API Test Script
# Bu script backend API'nizin çalışıp çalışmadığını test eder

Write-Host "🧪 Backend API Test Başlıyor..." -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1️⃣ Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
    Write-Host "✅ Server çalışıyor!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server çalışmıyor!" -ForegroundColor Red
    Write-Host "   Hata: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Çözüm: 'npm run dev' komutuyla backend'i başlatın" -ForegroundColor Yellow
    exit
}

Write-Host ""

# 2. Register Test
Write-Host "2️⃣ Kullanıcı Kaydı Testi..." -ForegroundColor Yellow
$registerData = @{
    name = "Test Kullanıcı"
    email = "test@odevAsistani.com"
    password = "test123"
    educationLevel = "lise"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method Post `
        -Body $registerData `
        -ContentType "application/json"
    
    Write-Host "✅ Kayıt başarılı!" -ForegroundColor Green
    Write-Host "   Kullanıcı: $($response.user.name)" -ForegroundColor Gray
    Write-Host "   Email: $($response.user.email)" -ForegroundColor Gray
    $token = $response.token
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  Kullanıcı zaten kayıtlı (bu normal)" -ForegroundColor Yellow
        
        # Login dene
        Write-Host "   Login deneniyor..." -ForegroundColor Gray
        $loginData = @{
            email = "test@odevAsistani.com"
            password = "test123"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
            -Method Post `
            -Body $loginData `
            -ContentType "application/json"
        
        Write-Host "✅ Login başarılı!" -ForegroundColor Green
        $token = $response.token
    } else {
        Write-Host "❌ Kayıt başarısız!" -ForegroundColor Red
        Write-Host "   Hata: $_" -ForegroundColor Red
        exit
    }
}

Write-Host ""

# 3. AI Test
Write-Host "3️⃣ AI Soru Çözme Testi..." -ForegroundColor Yellow
$questionData = @{
    question = "2 + 2 kaç eder?"
    type = "matematik"
    educationLevel = "ilkokul"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/solve" `
        -Method Post `
        -Body $questionData `
        -Headers $headers
    
    Write-Host "✅ AI çalışıyor!" -ForegroundColor Green
    Write-Host "   Soru: $($response.data.question)" -ForegroundColor Gray
    Write-Host "   Cevap: $($response.data.answer.Substring(0, [Math]::Min(100, $response.data.answer.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ AI testi başarısız!" -ForegroundColor Red
    Write-Host "   Hata: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Olası Nedenler:" -ForegroundColor Yellow
    Write-Host "   - OpenAI API key eksik veya hatalı" -ForegroundColor Gray
    Write-Host "   - API key'de kredi yok" -ForegroundColor Gray
    Write-Host "   - Günlük limit doldu" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 Test tamamlandı!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://localhost:5000" -ForegroundColor Gray
Write-Host "Health Check: http://localhost:5000/health" -ForegroundColor Gray
