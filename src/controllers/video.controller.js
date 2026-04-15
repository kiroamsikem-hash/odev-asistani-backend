const axios = require('axios');
const VideoNote = require('../models/VideoNote.model');

// AI Provider (Groq kullanacağız)
async function callGroq(prompt, systemPrompt) {
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
          max_tokens: 3000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
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

// @desc    Analyze YouTube video
exports.analyzeVideo = async (req, res) => {
  try {
    const { videoUrl, analysisType } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video URL gereklidir'
      });
    }

    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir YouTube URL\'si giriniz'
      });
    }

    console.log(`📹 Video analizi başlatılıyor: ${videoId}`);

    // YouTube video bilgilerini al (başlık için)
    const title = `Video: ${videoId}`;

    // AI ile video analizi yap
    const systemPrompt = `Sen bir eğitim videosu analiz uzmanısın. YouTube videolarını analiz edip öğrencilere yardımcı oluyorsun.`;
    
    let prompt = '';
    let summary = '';
    let timestamps = [];
    let questions = [];

    if (analysisType === 'summary' || !analysisType) {
      // Özet çıkar
      prompt = `YouTube video ID: ${videoId}
      
Bu video için:
1. Ana konuları ve önemli noktaları özetle (3-5 madde)
2. Öğrencinin öğrenmesi gereken temel kavramları listele
3. Videonun hangi seviyedeki öğrenciler için uygun olduğunu belirt

Özet ve net bir şekilde yaz.`;

      summary = await callGroq(prompt, systemPrompt);
    }

    if (analysisType === 'questions' || analysisType === 'full') {
      // Soru üret
      prompt = `YouTube video ID: ${videoId}

Bu video içeriğine göre 5 adet çoktan seçmeli soru oluştur. Her soru için:
- Soru metni
- 4 şık (A, B, C, D)
- Doğru cevap
- Kısa açıklama

JSON formatında döndür:
[
  {
    "question": "Soru metni",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": "A",
    "explanation": "Açıklama"
  }
]`;

      const questionsText = await callGroq(prompt, systemPrompt);
      
      try {
        // JSON parse et
        const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('Sorular JSON parse edilemedi:', e.message);
        questions = [];
      }
    }

    if (analysisType === 'timestamps' || analysisType === 'full') {
      // Zaman damgaları oluştur
      prompt = `YouTube video ID: ${videoId}

Bu video için önemli anları belirle ve zaman damgaları oluştur:
- Her önemli konu için tahmini zaman (örn: 00:30, 02:15, 05:40)
- Konu başlığı
- Kısa açıklama

JSON formatında döndür:
[
  {
    "time": "00:30",
    "title": "Giriş",
    "description": "Konuya giriş"
  }
]`;

      const timestampsText = await callGroq(prompt, systemPrompt);
      
      try {
        const jsonMatch = timestampsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          timestamps = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('Timestamps JSON parse edilemedi:', e.message);
        timestamps = [];
      }
    }

    // Veritabanına kaydet
    const videoNote = await VideoNote.create({
      userId: req.user.id,
      videoUrl,
      title,
      summary,
      timestamps,
      questions
    });

    res.json({
      success: true,
      data: {
        id: videoNote.id,
        videoId,
        title,
        summary,
        timestamps,
        questions,
        createdAt: videoNote.created_at
      }
    });
  } catch (error) {
    console.error('Video analizi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Video analizi sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get user's video notes
exports.getVideoNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notes = await VideoNote.findByUserId(req.user.id, limit, offset);
    const total = await VideoNote.countByUserId(req.user.id);

    res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video notları alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get single video note
exports.getVideoNote = async (req, res) => {
  try {
    const note = await VideoNote.findById(req.params.id, req.user.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Video notu bulunamadı'
      });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video notu alınırken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Delete video note
exports.deleteVideoNote = async (req, res) => {
  try {
    const note = await VideoNote.deleteById(req.params.id, req.user.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Video notu bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Video notu silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video notu silinirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = exports;
