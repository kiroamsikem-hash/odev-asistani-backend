const axios = require('axios');
const Question = require('../models/Question.model');
const logger = require('../utils/logger');

// AI Provider (Groq)
async function callGroq(prompt, systemPrompt) {
  logger.info('🤖 Groq API çağrısı başlatılıyor');
  
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(key => key && key !== 'your-groq-api-key');

  logger.debug('Groq API key sayısı', { count: groqKeys.length });

  for (let i = 0; i < groqKeys.length; i++) {
    const apiKey = groqKeys[i];
    try {
      logger.info(`Groq API key ${i + 1}/${groqKeys.length} deneniyor`);
      
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );
      
      logger.success(`✅ Groq API key ${i + 1} başarılı`);
      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error(`❌ Groq API key ${i + 1} başarısız`, error);
      if (i === groqKeys.length - 1) throw error;
    }
  }
}

// Gemini Vision API
async function analyzeImageWithGeminiVision(imageBase64) {
  logger.info('🖼️ Gemini Vision API ile görsel analizi başlatılıyor');
  
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key') {
      throw new Error('GEMINI_API_KEY bulunamadı');
    }

    logger.debug('Gemini API key mevcut', { 
      keyLength: process.env.GEMINI_API_KEY.length,
      imageSize: imageBase64.length 
    });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu sayfadaki TÜM soruları tespit et ve numaralandır. Her soru için:
1. Soru numarası
2. Soru metni (tam olarak)
3. Soru tipi (çoktan seçmeli, açık uçlu, matematik, fizik, kimya, biyoloji, tarih, coğrafya, vb.)
4. Şıklar (varsa)

ÖNEMLİ: Sadece JSON array döndür, başka açıklama ekleme!

JSON formatı:
[
  {
    "questionNumber": "1",
    "questionText": "Soru metni tam olarak...",
    "questionType": "matematik",
    "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4"]
  }
]

Eğer sayfada soru yoksa boş array döndür: []`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000
        }
      },
      { 
        timeout: 45000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.success('✅ Gemini Vision API yanıt aldı');
    
    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error('❌ Gemini yanıtında text bulunamadı', response.data);
      return []; // Boş array döndür, hata fırlatma
    }

    const text = response.data.candidates[0].content.parts[0].text;
    logger.info('📝 Gemini text yanıtı alındı', { textLength: text.length });
    
    // JSON'u bul ve parse et
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.error('❌ JSON bulunamadı', { text });
      return []; // Boş array döndür, hata fırlatma
    }

    logger.info('✅ JSON bulundu, parse ediliyor');
    const questions = JSON.parse(jsonMatch[0]);
    
    logger.success(`✅ ${questions.length} soru tespit edildi`, { 
      questionCount: questions.length
    });
    
    return questions;
  } catch (error) {
    logger.error('❌ Gemini Vision hatası', error);
    
    if (error.response) {
      logger.error('Gemini API response error', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Hata fırlatma, boş array döndür
    return [];
  }
}

// @desc    Scan page and detect all questions
exports.scanPage = async (req, res) => {
  const startTime = Date.now();
  logger.info('📄 ========== SAYFA TARAMA BAŞLADI ==========');
  logger.request(req);

  try {
    if (!req.file) {
      logger.error('❌ Resim dosyası yok');
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası gereklidir'
      });
    }

    // Dosya boyutu kontrolü
    if (req.file.size < 1000) {
      logger.error('❌ Resim dosyası çok küçük (boş olabilir)', {
        size: req.file.size
      });
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası çok küçük veya boş. Lütfen geçerli bir fotoğraf yükleyin.'
      });
    }

    logger.info('📸 Resim dosyası alındı', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      bufferLength: req.file.buffer.length
    });

    // Base64'e çevir
    logger.info('🔄 Base64 dönüşümü yapılıyor');
    const imageBase64 = req.file.buffer.toString('base64');
    
    // Base64 içerik kontrolü
    if (imageBase64.length < 100) {
      logger.error('❌ Base64 içerik çok küçük', {
        base64Length: imageBase64.length
      });
      return res.status(400).json({
        success: false,
        message: 'Resim içeriği geçersiz. Lütfen başka bir fotoğraf deneyin.'
      });
    }
    
    logger.success('✅ Base64 dönüşümü tamamlandı', {
      base64Length: imageBase64.length
    });

    // Gemini Vision ile soruları tespit et
    logger.info('🔍 Gemini Vision ile soru tespiti başlatılıyor');
    const questions = await analyzeImageWithGeminiVision(imageBase64);

    // Soru bulunamadı kontrolü
    if (!questions || questions.length === 0) {
      logger.warn('⚠️ Sayfada soru bulunamadı');
      return res.status(400).json({
        success: false,
        message: 'Sayfada soru bulunamadı. Lütfen soruların net ve okunaklı olduğundan emin olun.'
      });
    }

    const duration = Date.now() - startTime;
    logger.success(`✅ Sayfa tarama tamamlandı (${duration}ms)`, {
      totalQuestions: questions.length,
      duration: `${duration}ms`
    });

    const responseData = {
      success: true,
      data: {
        totalQuestions: questions.length,
        questions: questions.map((q, index) => ({
          id: index + 1,
          number: q.questionNumber || (index + 1).toString(),
          text: q.questionText,
          type: q.questionType || 'genel',
          options: q.options || []
        }))
      }
    };

    logger.response(req, res, 200, responseData);
    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Sayfa tarama hatası (${duration}ms)`, error);
    
    res.status(500).json({
      success: false,
      message: 'Sayfa taranamadı. Lütfen tekrar deneyin.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    logger.info('📄 ========== SAYFA TARAMA BİTTİ ==========\n');
  }
};

// @desc    Solve specific question from scanned page
exports.solveScannedQuestion = async (req, res) => {
  const startTime = Date.now();
  logger.info('🎯 ========== SORU ÇÖZME BAŞLADI ==========');
  logger.request(req);

  try {
    const { questionText, questionType, options } = req.body;

    if (!questionText) {
      logger.error('❌ Soru metni yok');
      return res.status(400).json({
        success: false,
        message: 'Soru metni gereklidir'
      });
    }

    logger.info('📝 Soru bilgileri', {
      questionType,
      questionLength: questionText.length,
      hasOptions: !!options,
      optionsCount: options?.length || 0
    });

    const gradeLevel = req.user.grade || 9;
    logger.info('👤 Kullanıcı bilgileri', {
      userId: req.user.id,
      gradeLevel
    });
    
    const systemPrompt = `Sen ${gradeLevel}. sınıf seviyesinde bir öğretmensin. Öğrencilere adım adım, anlaşılır şekilde yardımcı oluyorsun.`;
    
    let prompt = `Soru: ${questionText}\n\n`;
    
    if (options && options.length > 0) {
      prompt += `Şıklar:\n${options.join('\n')}\n\n`;
      logger.info('📋 Şıklar eklendi', { optionsCount: options.length });
    }
    
    prompt += `Bu soruyu ${gradeLevel}. sınıf seviyesinde, adım adım çöz ve açıkla.

CEVAP FORMATI:
📚 KONU: [Konuyu belirt]

🎯 ÇÖZÜM:
[Adım adım detaylı çözüm]

💡 İPUCU:
[Öğrenciye yardımcı ipucu]

✅ SONUÇ:
[Kısa özet ve cevap]`;

    logger.info('🤖 AI çözüm üretiliyor');
    const answer = await callGroq(prompt, systemPrompt);
    logger.success('✅ AI çözüm üretildi', { answerLength: answer.length });

    // Veritabanına kaydet
    logger.info('💾 Veritabanına kaydediliyor');
    const question = await Question.create({
      userId: req.user.id,
      type: questionType || 'genel',
      question: questionText,
      answer: answer,
      subject: questionType || 'Genel'
    });
    logger.success('✅ Veritabanına kaydedildi', { questionId: question.id });

    const duration = Date.now() - startTime;
    logger.success(`✅ Soru çözme tamamlandı (${duration}ms)`);

    const responseData = {
      success: true,
      data: {
        questionId: question.id,
        question: questionText,
        answer: answer,
        type: questionType
      }
    };

    logger.response(req, res, 200, responseData);
    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Soru çözme hatası (${duration}ms)`, error);
    
    res.status(500).json({
      success: false,
      message: 'Soru çözülemedi',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        response: error.response?.data
      } : undefined
    });
  } finally {
    logger.info('🎯 ========== SORU ÇÖZME BİTTİ ==========\n');
  }
};

module.exports = exports;
