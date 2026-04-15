// @desc    Perform OCR on image - SADECE GROQ VISION
exports.performOCR = async (req, res) => {
  try {
    console.log('🔍 OCR endpoint çağrıldı');
    console.log('👤 User:', req.user?.email);
    
    if (!req.file) {
      console.log('❌ Dosya bulunamadı');
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası gereklidir'
      });
    }

    console.log('📸 OCR işlemi başlatılıyor...');
    console.log('Dosya boyutu:', req.file.size, 'bytes');
    console.log('Dosya tipi:', req.file.mimetype);

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // SADECE GROQ VISION KULLAN
    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4,
      process.env.GROQ_API_KEY_5,
    ].filter(key => key && key !== 'your-groq-api-key');

    console.log(`🔍 Groq API key sayısı: ${groqKeys.length}`);

    if (groqKeys.length === 0) {
      console.log('❌ Groq API key bulunamadı');
      return res.status(500).json({
        success: false,
        message: 'OCR için Groq API key gerekli'
      });
    }

    // Tüm Groq key'leri dene
    for (let i = 0; i < groqKeys.length; i++) {
      const apiKey = groqKeys[i];
      try {
        console.log(`🤖 Groq Vision ile OCR deneniyor... (${i + 1}/${groqKeys.length})`);
        
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Bu görseldeki tüm metni, sayıları ve matematiksel ifadeleri dikkatle çıkar. Matematik formülleri için basit format kullan (x^2, √x, 3/4 gibi). Sadece metni ver, açıklama yapma.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageUrl
                    }
                  }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 2048,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const extractedText = response.data.choices[0].message.content;
        console.log('✅ Groq Vision OCR başarılı!');
        console.log('Çıkarılan metin uzunluğu:', extractedText.length, 'karakter');
        
        return res.json({
          success: true,
          data: {
            text: extractedText
          }
        });
      } catch (groqError) {
        const errorMsg = groqError.response?.data?.error?.message || groqError.message;
        console.log(`❌ Groq key ${i + 1} hatası: ${errorMsg}`);
        
        // Son key de başarısızsa hata döndür
        if (i === groqKeys.length - 1) {
          console.error('❌ Tüm Groq API key\'leri başarısız oldu');
          return res.status(500).json({
            success: false,
            message: 'OCR işlemi başarısız: Tüm Groq API key\'leri başarısız oldu',
            error: errorMsg
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ OCR işlemi başarısız:', error.message);
    res.status(500).json({
      success: false,
      message: 'OCR işlemi sırasında hata oluştu',
      error: error.message
    });
  }
};
