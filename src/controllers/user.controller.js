const User = require('../models/User.model');
const Question = require('../models/Question.model');

// @desc    Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium,
        avatar: user.avatar,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil getirilirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, educationLevel, avatar } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (educationLevel) updateData.education_level = educationLevel;
    if (avatar) updateData.avatar = avatar;

    const user = await User.update(req.user.id, updateData);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// @desc    Get user statistics
exports.getStats = async (req, res) => {
  try {
    // Reset daily count if needed
    await User.resetDailyCount(req.user.id);
    const user = await User.findById(req.user.id);

    const totalQuestions = await Question.countByUserId(req.user.id);
    const questionsByType = await Question.getStatsByUserId(req.user.id);

    const limit = user.is_premium 
      ? parseInt(process.env.DAILY_QUESTION_LIMIT_PREMIUM) 
      : parseInt(process.env.DAILY_QUESTION_LIMIT_FREE);

    res.json({
      success: true,
      data: {
        totalQuestions,
        questionsByType: questionsByType.map(item => ({
          _id: item.type,
          count: parseInt(item.count)
        })),
        dailyLimit: {
          limit,
          used: user.daily_question_count,
          remaining: limit - user.daily_question_count
        },
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilirken hata oluştu',
      error: error.message
    });
  }
};
