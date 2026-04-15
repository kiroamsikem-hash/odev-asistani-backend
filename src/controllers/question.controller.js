const Question = require('../models/Question.model');

// @desc    Get user's question history
exports.getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const questions = await Question.findByUserId(req.user.id, limit, offset);
    const total = await Question.countByUserId(req.user.id);

    // Format response
    const formattedQuestions = questions.map(q => ({
      _id: q.id,
      id: q.id,
      type: q.type,
      question: q.question,
      answer: q.answer,
      imageUrl: q.image_url,
      steps: q.steps,
      subject: q.subject,
      difficulty: q.difficulty,
      createdAt: q.created_at
    }));

    res.json({
      success: true,
      data: formattedQuestions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sorular getirilirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get single question
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id, req.user.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Soru bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        _id: question.id,
        id: question.id,
        type: question.type,
        question: question.question,
        answer: question.answer,
        imageUrl: question.image_url,
        steps: question.steps,
        createdAt: question.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Soru getirilirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.deleteById(req.params.id, req.user.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Soru bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Soru silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Soru silinirken hata oluştu',
      error: error.message
    });
  }
};
