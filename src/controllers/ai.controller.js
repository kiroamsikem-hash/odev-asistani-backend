const axios = require('axios');
const Question = require('../models/Question.model');

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

// System prompts
const TEACHER_PROMPT = `Sen ilkokuldan üniversite seviyesine kadar öğrencilere rehberlik eden, empatik ve sabırlı bir öğretmensin. 
Soruları adım adım çöz, her adımı açıkla.

ÖNEMLI: Matematik sorularında LaTeX kullanma! Basit ve anlaşılır şekilde yaz:
- Üslü sayılar: x^2, a^3 (LaTeX değil!)
- Kesirler: 3/4, (a+b)/c şeklinde
- Karekök: √x, √(a+b) şeklinde
- Çarpma: x*y veya x·y
- Bölme: a/b veya a÷b

Doğrudan cevap verme, öğrencinin anlamasını sağla.`;


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

    const prompt = `Eğitim Seviyesi: ${educationLevel || 'lise'}
Soru Tipi: ${type || 'genel'}
Soru: ${question}

Lütfen bu soruyu adım adım çöz ve açıkla.`;

    const answer = await callAI(prompt, TEACHER_PROMPT);

    // Save to database
    const savedQuestion = await Question.create({
      userId: req.user.id,
      type: type || 'genel',
      question,
      answer,
      subject: type
    });

    res.json({
      success: true,
      data: {
        id: savedQuestion.id,
        _id: savedQuestion.id,
        question,
        answer,
        type,
        createdAt: savedQuestion.created_at
      }
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
                  text: 'Bu görseldeki tüm metni, sayıları ve matematiksel ifadeleri dikkatle çıkar. Matematik formülleri için basit format kullan (x^2, √x, 3/4 gibi). Sadece metni ver, açıklama yapma.'
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
          const extractedText = response.data.candidates[0].content.parts[0].text;
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

    const prompt = `Eğitim Seviyesi: ${educationLevel || 'lise'}
Konu: ${topic}
Kelime Sayısı: ${wordCount || 300}
Ton: ${tone || 'akademik'}

Bu konuda bir kompozisyon/essay yaz. Giriş, gelişme ve sonuç bölümlerini net bir şekilde ayır.`;

    const composition = await callAI(prompt, TEACHER_PROMPT);

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

    const prompt = `Aşağıdaki metni ${targetLang} diline çevir ve gramer açıklaması ekle:

${text}`;

    const translation = await callAI(prompt, 'Sen profesyonel bir çevirmen ve dil öğretmenisin.');

    res.json({
      success: true,
      data: {
        original: text,
        translation,
        sourceLang,
        targetLang
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


