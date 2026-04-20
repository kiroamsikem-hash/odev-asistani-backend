const axios = require('axios');
const Question = require('../models/Question.model');
const logger = require('../utils/logger');

// Sokratik Öğretmen Promptu
function getSocraticPrompt(gradeLevel) {
  return `Sen ${gradeLevel}. sınıf seviyesinde bir Sokratik öğretmensin.

SOKRATIK YÖNTEM KURALLARI:
1. ASLA direkt cevap verme
2. Öğrenciyi düşündürecek ipuçları ver
3. Küçük adımlarla yönlendir
4. "Ne olur eğer..." soruları sor
5. Öğrencinin kendi keşfetmesini sağla

CEVAP FORMATI:
🤔 DÜŞÜN:
[Öğrenciyi düşündürecek bir soru]

💡 İPUCU 1:
[İlk küçük ipucu]

💡 İPUCU 2:
[Biraz daha açık ipucu]

🎯 KONTROL:
[Öğrencinin doğru yolda olup olmadığını kontrol edebileceği bir yöntem]

❓ SORU:
[Öğrenciye soracağın yönlendirici soru]

Öğrenci "ipucu ver" derse, daha açık ipucu ver ama yine de cevabı söyleme!`;
}

// Groq AI çağrısı
async function callGroq(prompt, systemPrompt) {
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(key => key && key !== 'your-groq-api-key');

  for (const apiKey of groqKeys) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 1500
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
    } catch (error) {
      console.log(`Groq key ${groqKeys.indexOf(apiKey) + 1} failed`);
      if (groqKeys.indexOf(apiKey) === groqKeys.length - 1) throw error;
    }
  }
}

// @desc    Sokratik mod - İpucu ver
exports.getSocraticHint = async (req, res) => {
  try {
    const { question, previousHints } = req.body;
    const gradeLevel = req.user.grade || 9;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Soru gereklidir'
      });
    }

    const hintLevel = (previousHints?.length || 0) + 1;
    
    const prompt = `Soru: ${question}

${previousHints?.length > 0 ? `Önceki ipuçları:\n${previousHints.join('\n')}` : ''}

Bu ${hintLevel}. ipucu. ${hintLevel === 1 ? 'Çok az bilgi ver.' : hintLevel === 2 ? 'Biraz daha açık ol.' : 'Daha net yönlendir ama cevabı söyleme!'}`;

    const hint = await callGroq(prompt, getSocraticPrompt(gradeLevel));

    res.json({
      success: true,
      data: {
        hint,
        hintLevel,
        question
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İpucu oluşturulamadı',
      error: error.message
    });
  }
};

// @desc    Öğrenci cevabını kontrol et
exports.checkStudentAnswer = async (req, res) => {
  try {
    const { question, studentAnswer } = req.body;
    const gradeLevel = req.user.grade || 9;

    const prompt = `Soru: ${question}
Öğrenci Cevabı: ${studentAnswer}

Öğrencinin cevabını kontrol et ve geri bildirim ver:
1. Doğru mu yanlış mı?
2. Hangi kısmı doğru?
3. Nerede hata var? (varsa)
4. Nasıl düzeltebilir?

Cesaretlendirici ve yapıcı ol!`;

    const feedback = await callGroq(prompt, getSocraticPrompt(gradeLevel));

    res.json({
      success: true,
      data: {
        feedback,
        question,
        studentAnswer
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cevap kontrol edilemedi',
      error: error.message
    });
  }
};

module.exports = exports;
