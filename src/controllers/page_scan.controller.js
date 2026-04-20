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

// Groq Vision API
async function analyzeImageWithGroqVision(imageBase64) {
  logger.info('🖼️ Groq Vision API ile görsel analizi başlatılıyor');
  
  try {
    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4,
      process.env.GROQ_API_KEY_5,
    ].filter(key => key && key !== 'your-groq-api-key');

    if (groqKeys.length === 0) {
      throw new Error('Groq API key bulunamadı');
    }

    logger.debug('Groq Vision API key sayısı', { 
      count: groqKeys.length,
      imageSize: imageBase64.length 
    });

    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

    for (let i = 0; i < groqKeys.length; i++) {
      const apiKey = groqKeys[i];
      try {
        logger.info(`🤖 Groq Vision API key ${i + 1}/${groqKeys.length} deneniyor`);

        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.2-11b-vision-preview',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
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
                    type: 'image_url',
                    image_url: {
                      url: imageUrl
                    }
                  }
                ]
              }
            ],
            temperature: 0.3,
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

        logger.success(`✅ Groq Vision API key ${i + 1} başarılı`);
        
        const text = response.data.choices[0].message.content;
        logger.info('📝 Groq Vision text yanıtı alındı', { textLength: text.length });
        logger.debug('Groq Vision text içeriği', { text: text.substring(0, 500) });
        
        // JSON'u bul ve parse et
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          logger.error('❌ JSON bulunamadı', { text });
          throw new Error('Yanıtta JSON bulunamadı');
        }

        logger.info('✅ JSON bulundu, parse ediliyor');
        const questions = JSON.parse(jsonMatch[0]);
        
        logger.success(`✅ ${questions.length} soru tespit edildi`, { 
          questionCount: questions.length,
          questions: questions.map(q => ({ 
            number: q.questionNumber, 
            type: q.questionType,
            textPreview: q.questionText?.substring(0, 50) 
          }))
        });
        
        return questions;
      } catch (error) {
        logger.error(`❌ Groq Vision API key ${i + 1} başarısız`, error);
        if (i === groqKeys.length - 1) throw error;
      }
    }
  } catch (error) {
    logger.error('❌ Groq Vision hatası', error);
    
    if (error.response) {
      logger.error('Groq API response error', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    throw error;
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

    logger.info('📸 Resim dosyası alındı', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      bufferLength: req.file.buffer.length
    });

    // Base64'e çevir
    logger.info('🔄 Base64 dönüşümü yapılıyor');
    const imageBase64 = req.file.buffer.toString('base64');
    logger.success('✅ Base64 dönüşümü tamamlandı', {
      base64Length: imageBase64.length
    });

    // Groq Vision ile soruları tespit et
    logger.info('🔍 Groq Vision ile soru tespiti başlatılıyor');
    const questions = await analyzeImageWithGroqVision(imageBase64);

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
      message: 'Sayfa taranamadı',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        response: error.response?.data
      } : undefined
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
