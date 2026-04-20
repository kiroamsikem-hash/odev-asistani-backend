const axios = require('axios');
const Flashcard = require('../models/Flashcard.model');
const logger = require('../utils/logger');

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

// @desc    Generate flashcards from YouTube video
exports.generateFromVideo = async (req, res) => {
  try {
    const { videoUrl, count = 10, deckName } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video URL gereklidir'
      });
    }

    console.log('🎴 Video\'dan flashcard oluşturuluyor...');

    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir YouTube URL\'si giriniz'
      });
    }

    const gradeLevel = req.user.grade || 9;
    const systemPrompt = `Sen ${gradeLevel}. sınıf seviyesinde bir eğitim uzmanısın. YouTube videolarından öğrencilerin öğrenmesi gereken en önemli bilgileri çıkarıp flashcard oluşturuyorsun.`;
    
    // Önce video özetini al
    const summaryPrompt = `YouTube Video ID: ${videoId}

Bu eğitim videosundan ${count} adet flashcard oluştur.

Her kart için:
- Ön yüz: Videodaki önemli soru veya kavram
- Arka yüz: Net cevap veya açıklama
- Zorluk: kolay, orta veya zor

SADECE JSON array döndür:
[
  {
    "front": "Soru veya kavram",
    "back": "Cevap veya açıklama",
    "difficulty": "orta"
  }
]`;

    const response = await callGroq(summaryPrompt, systemPrompt);
    
    let cards = [];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cards = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON bulunamadı');
      }
    } catch (e) {
      console.log('Video flashcards JSON parse edilemedi:', e.message);
      return res.status(500).json({
        success: false,
        message: 'Video analiz edilemedi. Lütfen tekrar deneyin.'
      });
    }

    // Veritabanına kaydet
    const savedCards = [];
    for (const card of cards) {
      if (card.front && card.back) {
        const saved = await Flashcard.create({
          userId: req.user.id,
          front: card.front,
          back: card.back,
          subject: 'Video',
          difficulty: card.difficulty || 'orta',
          deckName: deckName || `Video: ${videoId}`
        });
        savedCards.push(saved);
      }
    }

    res.json({
      success: true,
      data: savedCards,
      count: savedCards.length,
      videoId
    });
  } catch (error) {
    console.error('Video flashcard oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Video flashcard oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// Extract YouTube video ID
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
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

    const gradeLevel = req.user.grade || 9;
    const systemPrompt = `Sen ${gradeLevel}. sınıf seviyesinde bir eğitim uzmanısın. Verilen metinden öğrencilerin öğrenmesi gereken en önemli bilgileri çıkarıp flashcard (bilgi kartı) oluşturuyorsun.`;
    
    const prompt = `Aşağıdaki metinden ${count} adet flashcard oluştur.

Metin:
${text}

Her kart için:
- Ön yüz: Kısa soru veya kavram (maksimum 10 kelime)
- Arka yüz: Net cevap veya açıklama (maksimum 30 kelime)
- Zorluk: kolay, orta veya zor

SADECE JSON array döndür, başka metin ekleme:
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
      // JSON'u bul ve parse et
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cards = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON bulunamadı');
      }
    } catch (e) {
      console.log('Flashcards JSON parse edilemedi:', e.message);
      console.log('Response:', response);
      return res.status(500).json({
        success: false,
        message: 'Flashcard oluşturulamadı. Lütfen tekrar deneyin.'
      });
    }

    // Veritabanına kaydet
    const savedCards = [];
    for (const card of cards) {
      if (card.front && card.back) {
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
