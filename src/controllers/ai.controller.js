const axios = require('axios');
const Question = require('../models/Question.model');
const { getCachedAnswer, cacheAnswer } = require('../config/redis');

// AI Providers - Sırayla denenecek
const AI_PROVIDERS = [
  { name: 'Groq', envKey: 'GROQ_API_KEY', handler: callGroq },
  { name: 'Gemini', envKey: 'GEMINI_API_KEY', handler: callGemini },
  { name: 'OpenAI', envKey: 'OPENAI_API_KEY', handler: callOpenAI },
  { name: 'Claude', envKey: 'CLAUDE_API_KEY', handler: callClaude },
  { name: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY', handler: callDeepSeek },
];

// AI Service - Groq (Ücretsiz ve Çok Hızlı!)
async function callGroq(prompt, systemPrompt) {
  // Birden fazla Groq API key desteği
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

  // Her key'i sırayla dene
  const errors = [];
  for (const apiKey of groqKeys) {
    try {
      console.log(`🔑 Groq API key deneniyor... (${groqKeys.indexOf(apiKey) + 1}/${groqKeys.length})`);
      
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log(`✅ Groq API key başarılı! (${groqKeys.indexOf(apiKey) + 1}/${groqKeys.length})`);
      return response.data.choices[0].message.content;
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.log(`❌ Groq key ${groqKeys.indexOf(apiKey) + 1} hatası: ${errorMsg}`);
      errors.push(`Key ${groqKeys.indexOf(apiKey) + 1}: ${errorMsg}`);
    }
  }
  
  throw new Error(`Tüm Groq API key'leri başarısız:\n${errors.join('\n')}`);
}

// AI Service - Google Gemini (Ücretsiz)
async function callGemini(prompt, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    throw new Error('Gemini API key bulunamadı');
  }

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  );
  
  if (!response.data.candidates || !response.data.candidates[0]) {
    throw new Error('Gemini API yanıt vermedi');
  }
  
  return response.data.candidates[0].content.parts[0].text;
}

// AI Service - OpenAI GPT-4
async function callOpenAI(prompt, systemPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    throw new Error('OpenAI API key bulunamadı');
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini', // Ucuz ve hızlı
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  
  return response.data.choices[0].message.content;
}

// AI Service - Claude (Anthropic)
async function callClaude(prompt, systemPrompt) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || apiKey === 'your-claude-api-key') {
    throw new Error('Claude API key bulunamadı');
  }

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-haiku-20240307', // En ucuz Claude
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  
  return response.data.content[0].text;
}

// AI Service - DeepSeek
async function callDeepSeek(prompt, systemPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'your-deepseek-api-key') {
    throw new Error('DeepSeek API key bulunamadı');
  }

  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  
  return response.data.choices[0].message.content;
}

// AI Service Selector - Tüm provider'ları sırayla dene
async function callAI(prompt, systemPrompt) {
  const errors = [];
  
  for (const provider of AI_PROVIDERS) {
    try {
      console.log(`🤖 ${provider.name} deneniyor...`);
      const result = await provider.handler(prompt, systemPrompt);
      console.log(`✅ ${provider.name} başarılı!`);
      return result;
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.log(`❌ ${provider.name} hatası: ${errorMsg}`);
      errors.push(`${provider.name}: ${errorMsg}`);
    }
  }
  
  throw new Error(`Tüm AI servisleri başarısız oldu:\n${errors.join('\n')}`);
}

// System prompts - Sınıf seviyesine göre
function getTeacherPrompt(educationLevel) {
  const gradeLevel = parseInt(educationLevel) || 9;
  
  let complexity = 'orta';
  let examples = 'günlük hayattan örnekler';
  
  if (gradeLevel <= 4) {
    complexity = 'çok basit';
    examples = 'oyuncak, meyve, hayvan gibi somut örnekler';
  } else if (gradeLevel <= 8) {
    complexity = 'basit';
    examples = 'günlük hayattan örnekler';
  } else if (gradeLevel <= 12) {
    complexity = 'orta';
    examples = 'gerçek hayat uygulamaları';
  } else {
    complexity = 'detaylı';
    examples = 'akademik ve profesyonel örnekler';
  }

  return `Sen ${gradeLevel}. sınıf seviyesindeki öğrencilere rehberlik eden, empatik ve sabırlı bir öğretmensin.

SINIF SEVİYESİ: ${gradeLevel}. Sınıf
AÇIKLAMA KARMAŞIKLIĞI: ${complexity}
ÖRNEKLER: ${examples}

AÇIKLAMA KURALLARI:
1. ${gradeLevel}. sınıf öğrencisinin anlayabileceği dil kullan
2. Adım adım, basit cümlelerle açıkla
3. Her adımı numaralandır (1., 2., 3. şeklinde)
4. ${examples} kullanarak somutlaştır
5. Öğrenciye "Sen yapabilirsin!" motivasyonu ver
6. ÇOK DETAYLI AÇIKLA - Her adımı ayrıntılı anlat

MATEMATİK YAZIM KURALLARI (SADECE BASİT FORMAT!):
- Üslü sayılar: x² veya x^2 (LaTeX KULLANMA!)
- Kesirler: 3/4, (a+b)/c şeklinde (LaTeX KULLANMA!)
- Karekök: √x, √(a+b) şeklinde (LaTeX KULLANMA!)
- Çarpma: x × y veya x·y (LaTeX KULLANMA!)
- Bölme: a ÷ b veya a/b (LaTeX KULLANMA!)
- ASLA $ veya & işareti kullanma!
- ASLA \\frac, \\sqrt gibi LaTeX komutları kullanma!

CEVAP FORMATI:
📚 KONU: [Konuyu belirt]

🎯 ÇÖZÜM:
[Adım adım ÇOK DETAYLI çözüm - her adımı ayrıntılı açıkla]

💡 İPUCU:
[Öğrenciye yardımcı ipucu]

✅ SONUÇ:
[Kısa özet]

Doğrudan cevap verme, öğrencinin düşünmesini ve anlamasını sağla!`;
}


// @desc    Solve question with AI
exports.solveQuestion = async (req, res) => {
  try {
    const { question, type, educationLevel } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Soru metni gereklidir'
      });
    }

    const gradeLevel = educationLevel || req.user.grade || 9;
    
    // 🚀 CACHE KONTROLÜ - Benzer soru daha önce çözüldü mü?
    const cached = await getCachedAnswer(question, gradeLevel);
    if (cached) {
      return res.json({
        success: true,
        data: {
          ...cached,
          fromCache: true
        }
      });
    }

    const teacherPrompt = getTeacherPrompt(gradeLevel);

    const prompt = `Soru: ${question}

Lütfen bu soruyu ${gradeLevel}. sınıf seviyesinde, adım adım çöz ve açıkla.`;

    const answer = await callAI(prompt, teacherPrompt);

    // Save to database
    const savedQuestion = await Question.create({
      userId: req.user.id,
      type: type || 'genel',
      question,
      answer,
      subject: type
    });

    const responseData = {
      id: savedQuestion.id,
      _id: savedQuestion.id,
      question,
      answer,
      type,
      educationLevel: gradeLevel,
      createdAt: savedQuestion.created_at,
      fromCache: false
    };

    // 🚀 CACHE'E KAYDET - Bir dahaki sefere AI çağrısı yapma
    await cacheAnswer(question, gradeLevel, responseData);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Soru çözülürken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Perform OCR on image
exports.performOCR = async (req, res) => {
  try {
    console.log('🔍 OCR endpoint çağrıldı');
    console.log('📋 Request headers:', req.headers);
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

    // 1. ÖNCE GROQ VISION DENE (ÜCRETSİZ VE HIZLI!)
    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4,
      process.env.GROQ_API_KEY_5,
    ].filter(key => key && key !== 'your-groq-api-key');

    console.log(`🔍 Groq API key sayısı: ${groqKeys.length}`);

    if (groqKeys.length > 0) {
      for (const apiKey of groqKeys) {
        try {
          console.log(`🤖 Groq Vision ile OCR deneniyor... (${groqKeys.indexOf(apiKey) + 1}/${groqKeys.length})`);
          
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
                      text: 'Bu görseldeki tüm metni, sayıları ve matematiksel ifadeleri dikkatle çıkar. ÖNEMLİ: Basit format kullan, LaTeX kullanma! Üslü sayılar için x^2, kesirler için 3/4, karekök için √x kullan. ASLA $ veya & işareti kullanma! ASLA \\frac, \\sqrt gibi LaTeX komutları kullanma! Sadece temiz, okunaklı metni ver.'
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
              max_tokens: 2048
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

        let extractedText = response.data.choices[0].message.content;
        
        // LaTeX ve özel karakterleri temizle
        extractedText = extractedText
          .replace(/\$\$/g, '')
          .replace(/\$/g, '')
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
          .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
          .replace(/\\times/g, '×')
          .replace(/\\div/g, '÷')
          .replace(/\\cdot/g, '·')
          .replace(/\\/g, '')
          .replace(/&/g, '')
          .trim();
        
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
        console.log(`❌ Groq key ${groqKeys.indexOf(apiKey) + 1} hatası: ${errorMsg}`);
        // Eğer son key de başarısızsa Gemini'ye geç
        if (groqKeys.indexOf(apiKey) === groqKeys.length - 1) {
          console.log('❌ Tüm Groq API key\'leri başarısız oldu');
          break; // Groq döngüsünden çık, Gemini'yi dene
        }
      }
    }
  } else {
    console.log('❌ Groq API key bulunamadı');
  }

    // 2. GROQ BAŞARISIZSA GEMİNİ VISION DENE
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
      try {
        console.log('🤖 Gemini Vision ile OCR deneniyor...');
        
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [
                {
                  text: 'Bu görseldeki tüm metni, sayıları ve matematiksel ifadeleri dikkatle çıkar. ÖNEMLİ: Basit format kullan, LaTeX kullanma! Üslü sayılar için x^2, kesirler için 3/4, karekök için √x kullan. ASLA $ veya & işareti kullanma! ASLA \\frac, \\sqrt gibi LaTeX komutları kullanma! Sadece temiz, okunaklı metni ver.'
                },
                {
                  inline_data: {
                    mime_type: req.file.mimetype || 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (response.data.candidates && response.data.candidates[0]) {
          let extractedText = response.data.candidates[0].content.parts[0].text;
          
          // LaTeX ve özel karakterleri temizle
          extractedText = extractedText
            .replace(/\$\$/g, '')
            .replace(/\$/g, '')
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\cdot/g, '·')
            .replace(/\\/g, '')
            .replace(/&/g, '')
            .trim();
          
          console.log('✅ Gemini Vision OCR başarılı!');
          console.log('Çıkarılan metin uzunluğu:', extractedText.length, 'karakter');
          
          return res.json({
            success: true,
            data: {
              text: extractedText
            }
          });
        }
      } catch (geminiError) {
        console.log('❌ Gemini Vision hatası:', geminiError.response?.data || geminiError.message);
      }
    }

    // 3. HİÇBİRİ ÇALIŞMAZSA HATA VER
    console.error('❌ Tüm OCR servisleri başarısız');
    return res.status(500).json({
      success: false,
      message: 'OCR için çalışan bir AI servisi bulunamadı. Groq API key\'lerinizi kontrol edin.'
    });

  } catch (error) {
    console.error('❌ OCR işlemi başarısız:', error.message);
    res.status(500).json({
      success: false,
      message: 'OCR işlemi sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Write composition/essay
exports.writeComposition = async (req, res) => {
  try {
    const { topic, wordCount, tone, educationLevel } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Konu başlığı gereklidir'
      });
    }

    const gradeLevel = educationLevel || req.user.grade || 9;
    const targetWords = wordCount || 500; // Daha uzun kompozisyon

    const prompt = `Konu: ${topic}
Kelime Sayısı: ${targetWords} kelime (ÇOK DETAYLI YAZ!)
Sınıf Seviyesi: ${gradeLevel}. Sınıf

${gradeLevel}. sınıf seviyesinde ÇOK DETAYLI bir kompozisyon/essay yaz.

YAZIM KURALLARI:
1. Giriş-Gelişme-Sonuç yapısını kullan
2. ${gradeLevel}. sınıf seviyesine uygun kelime ve cümle yapısı
3. Her paragrafı net bir şekilde ayır
4. EN AZ ${targetWords} kelime kullan
5. ÇOK DETAYLI YAZ - Her fikri genişlet
6. Örnekler ver, açıklamalar yap
7. Zengin kelime hazinesi kullan

FORMAT:
📝 ${topic.toUpperCase()}

[GİRİŞ - 2-3 paragraf]
[Konuya giriş, neden önemli, genel bakış]

[GELİŞME - 4-5 paragraf]
[Ana fikirler - HER FİKRİ DETAYLI AÇIKLA]
[Örnekler ve detaylar - BOL ÖRNEK VER]
[Farklı bakış açıları - DETAYLI ANLAT]

[SONUÇ - 2 paragraf]
[Özet ve düşünceler - DETAYLI SONUÇ]

💡 YAZIM İPUÇLARI:
[Bu kompozisyonu yazarken dikkat edilmesi gerekenler]

ÖNEMLİ: Kompozisyon EN AZ ${targetWords} kelime olmalı. Çok detaylı yaz!`;

    const composition = await callAI(prompt, `Sen ${gradeLevel}. sınıf seviyesinde Türkçe öğretmenisin. Öğrencilere ÇOK DETAYLI kompozisyon yazmayı öğretiyorsun. Her konuyu derinlemesine işle, bol örnek ver.`);

    // Save to database
    const savedQuestion = await Question.create({
      userId: req.user.id,
      type: 'kompozisyon',
      question: topic,
      answer: composition
    });

    res.json({
      success: true,
      data: {
        id: savedQuestion.id,
        _id: savedQuestion.id,
        topic,
        composition,
        wordCount: targetWords,
        educationLevel: gradeLevel,
        createdAt: savedQuestion.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kompozisyon yazılırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Translate text
exports.translateText = async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({
        success: false,
        message: 'Metin ve hedef dil gereklidir'
      });
    }

    const gradeLevel = req.user.grade || 9;

    const prompt = `Aşağıdaki metni ${targetLang} diline çevir.

Metin: ${text}

ÇEVIRI KURALLARI:
1. Doğal ve akıcı bir çeviri yap
2. ${gradeLevel}. sınıf seviyesine uygun kelimeler kullan
3. Çeviriyi şu formatta sun:

📝 ORİJİNAL:
[Orijinal metin]

🌍 ÇEVİRİ (${targetLang}):
[Çevrilmiş metin]

📚 GRAMER AÇIKLAMASI:
[Önemli gramer noktaları - ${gradeLevel}. sınıf seviyesinde]

💡 KELİME HAZINESI:
[Önemli kelimeler ve anlamları]`;

    const translation = await callAI(prompt, `Sen profesyonel bir çevirmen ve ${gradeLevel}. sınıf seviyesinde dil öğretmenisin.`);

    res.json({
      success: true,
      data: {
        original: text,
        translation,
        sourceLang: sourceLang || 'auto',
        targetLang,
        educationLevel: gradeLevel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çeviri sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Simplify explanation
exports.simplifyExplanation = async (req, res) => {
  try {
    const { text, educationLevel } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Açıklama metni gereklidir'
      });
    }

    const prompt = `Bu açıklamayı ${educationLevel || 'lise'} seviyesinde bir öğrencinin anlayabileceği şekilde daha basit hale getir:

${text}`;

    const simplified = await callAI(prompt, TEACHER_PROMPT);

    res.json({
      success: true,
      data: {
        original: text,
        simplified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Basitleştirme sırasında hata oluştu',
      error: error.message
    });
  }
};


