const axios = require('axios');
const Flashcard = require('../models/Flashcard.model');

// AI Provider (Groq)
async function callGroq(prompt, systemPrompt) {
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(key => key && key !== 'your-groq-api-key');

  if (groqKeys.length === 0) {
    throw new Error('Groq API key bulunamadı');
  }

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
    } catch (error) {
      if (groqKeys.indexOf(apiKey) === groqKeys.length - 1) {
        throw error;
      }
    }
  }
}

// @desc    Generate flashcards from text
exports.generateFlashcards = async (req, res) => {
  try {
    const { text, subject, count = 10, deckName } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Metin gereklidir'
      });
    }

    console.log('🎴 Flashcard oluşturuluyor...');

    const systemPrompt = `Sen bir eğitim uzmanısın. Verilen metinden öğrencilerin öğrenmesi gereken en önemli bilgileri çıkarıp flashcard (bilgi kartı) oluşturuyorsun.`;
    
    const prompt = `Aşağıdaki metinden ${count} adet flashcard oluştur. Her kart için:
- Ön yüz (soru veya kavram)
- Arka yüz (cevap veya açıklama)
- Zorluk seviyesi (kolay/orta/zor)

Metin:
${text}

JSON formatında döndür:
[
  {
    "front": "Soru veya kavram",
    "back": "Cevap veya açıklama",
    "difficulty": "orta"
  }
]`;

    const response = await callGroq(prompt, systemPrompt);
    
    let cards = [];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cards = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Flashcards JSON parse edilemedi:', e.message);
      return res.status(500).json({
        success: false,
        message: 'Flashcard oluşturulamadı'
      });
    }

    // Veritabanına kaydet
    const savedCards = [];
    for (const card of cards) {
      const saved = await Flashcard.create({
        userId: req.user.id,
        front: card.front,
        back: card.back,
        subject: subject || 'Genel',
        difficulty: card.difficulty || 'orta',
        deckName: deckName || 'Genel'
      });
      savedCards.push(saved);
    }

    res.json({
      success: true,
      data: savedCards,
      count: savedCards.length
    });
  } catch (error) {
    console.error('Flashcard oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Flashcard oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Create single flashcard
exports.createFlashcard = async (req, res) => {
  try {
    const { front, back, subject, difficulty, deckName } = req.body;

    if (!front || !back) {
      return res.status(400).json({
        success: false,
        message: 'Ön yüz ve arka yüz gereklidir'
      });
    }

    const card = await Flashcard.create({
      userId: req.user.id,
      front,
      back,
      subject: subject || 'Genel',
      difficulty: difficulty || 'orta',
      deckName: deckName || 'Genel'
    });

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Flashcard oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get due flashcards for review
exports.getDueCards = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const cards = await Flashcard.getDueCards(req.user.id, limit);

    res.json({
      success: true,
      data: cards,
      count: cards.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kartlar alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Review flashcard (update with spaced repetition)
exports.reviewCard = async (req, res) => {
  try {
    const { quality } = req.body; // 0-5

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({
        success: false,
        message: 'Kalite değeri 0-5 arasında olmalıdır'
      });
    }

    const card = await Flashcard.updateAfterReview(
      req.params.id,
      req.user.id,
      quality
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Kart bulunamadı'
      });
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kart güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get all decks
exports.getDecks = async (req, res) => {
  try {
    const decks = await Flashcard.getDecks(req.user.id);

    res.json({
      success: true,
      data: decks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Desteler alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get flashcard statistics
exports.getStats = async (req, res) => {
  try {
    const stats = await Flashcard.getStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Delete flashcard
exports.deleteCard = async (req, res) => {
  try {
    const card = await Flashcard.deleteById(req.params.id, req.user.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Kart bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kart silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kart silinirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = exports;
