const { pool } = require('../config/database');

// @desc    Get premium packages
exports.getPackages = async (req, res) => {
  try {
    const query = 'SELECT * FROM premium_packages WHERE is_active = TRUE ORDER BY price ASC';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Paketler yüklenemedi',
      error: error.message
    });
  }
};

// @desc    Purchase premium package
exports.purchasePackage = async (req, res) => {
  try {
    const { packageId, paymentMethod, transactionId } = req.body;
    const userId = req.user.id;
    
    // Get package details
    const packageQuery = 'SELECT * FROM premium_packages WHERE id = $1 AND is_active = TRUE';
    const packageResult = await pool.query(packageQuery, [packageId]);
    
    if (packageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paket bulunamadı'
      });
    }
    
    const pkg = packageResult.rows[0];
    
    // Create transaction
    const transactionQuery = `
      INSERT INTO premium_transactions 
      (user_id, package_id, amount, payment_method, transaction_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const transaction = await pool.query(transactionQuery, [
      userId,
      packageId,
      pkg.price,
      paymentMethod,
      transactionId,
      'completed' // In production, this would be 'pending' until payment confirmation
    ]);
    
    // Update user premium status
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    
    const updateQuery = `
      UPDATE users 
      SET 
        is_premium = TRUE,
        premium_tier = $1,
        premium_expires_at = $2,
        daily_limit = $3
      WHERE id = $4
      RETURNING id, name, email, premium_tier, premium_expires_at, daily_limit
    `;
    
    const result = await pool.query(updateQuery, [
      pkg.name.toLowerCase(),
      expiresAt,
      pkg.daily_limit,
      userId
    ]);
    
    res.json({
      success: true,
      message: 'Premium satın alındı',
      data: {
        user: result.rows[0],
        transaction: transaction.rows[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Satın alma işlemi başarısız',
      error: error.message
    });
  }
};

// @desc    Check user's premium status
exports.checkPremiumStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        id, name, email, is_premium, premium_tier, 
        premium_expires_at, daily_limit, daily_question_count,
        last_question_date
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    const user = result.rows[0];
    
    // Check if premium expired
    if (user.is_premium && user.premium_expires_at) {
      const now = new Date();
      const expiresAt = new Date(user.premium_expires_at);
      
      if (now > expiresAt) {
        // Premium expired, downgrade to free
        await pool.query(
          `UPDATE users 
           SET is_premium = FALSE, premium_tier = 'free', daily_limit = 5
           WHERE id = $1`,
          [userId]
        );
        
        user.is_premium = false;
        user.premium_tier = 'free';
        user.daily_limit = 5;
      }
    }
    
    // Reset daily count if new day
    const lastQuestionDate = user.last_question_date ? new Date(user.last_question_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!lastQuestionDate || lastQuestionDate < today) {
      await pool.query(
        'UPDATE users SET daily_question_count = 0, last_question_date = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
      user.daily_question_count = 0;
    }
    
    const remainingQuestions = user.daily_limit - user.daily_question_count;
    
    res.json({
      success: true,
      data: {
        isPremium: user.is_premium,
        premiumTier: user.premium_tier,
        expiresAt: user.premium_expires_at,
        dailyLimit: user.daily_limit,
        usedToday: user.daily_question_count,
        remainingToday: Math.max(0, remainingQuestions),
        canAsk: remainingQuestions > 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Premium durumu kontrol edilemedi',
      error: error.message
    });
  }
};

// @desc    Get user's transaction history
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        t.id, t.amount, t.payment_method, t.status, t.created_at,
        p.name as package_name, p.daily_limit
      FROM premium_transactions t
      JOIN premium_packages p ON t.package_id = p.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İşlem geçmişi yüklenemedi',
      error: error.message
    });
  }
};
