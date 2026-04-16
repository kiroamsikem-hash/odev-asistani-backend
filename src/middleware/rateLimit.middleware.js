const User = require('../models/User.model');

// Whitelist - Bu emailler limitsiz
const UNLIMITED_EMAILS = ['byazar1628@gmail.com', 'myazar483@gmail.com'];

exports.checkDailyLimit = async (req, res, next) => {
  try {
    // Get user
    const user = await User.findById(req.user.id);
    
    // Whitelist kontrolü - bu emailler limitsiz
    if (UNLIMITED_EMAILS.includes(user.email)) {
      console.log(`✅ Whitelist user: ${user.email} - Limitsiz erişim`);
      next();
      return;
    }
    
    // Reset daily count if needed
    await User.resetDailyCount(req.user.id);
    
    // Get updated user
    const updatedUser = await User.findById(req.user.id);
    
    // Use daily_limit from database (set based on premium tier)
    const limit = updatedUser.daily_limit || 5;
    
    if (updatedUser.daily_question_count >= limit) {
      return res.status(429).json({
        success: false,
        message: 'Günlük soru limitiniz doldu',
        limit,
        used: updatedUser.daily_question_count,
        premiumTier: updatedUser.premium_tier || 'free'
      });
    }
    
    // Increment count
    await User.incrementQuestionCount(req.user.id);
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Limit kontrolü sırasında hata oluştu'
    });
  }
};
