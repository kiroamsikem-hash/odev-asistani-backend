const { pool } = require('../config/database');
const logger = require('../utils/logger');

// @desc    Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, email, education_level, 
        is_premium, premium_tier, premium_expires_at,
        daily_limit, daily_question_count, last_question_date,
        created_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar yüklenemedi',
      error: error.message
    });
  }
};

// @desc    Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_premium = TRUE THEN 1 END) as premium_users,
        COUNT(CASE WHEN premium_tier = 'temel' THEN 1 END) as temel_users,
        COUNT(CASE WHEN premium_tier = 'standart' THEN 1 END) as standart_users,
        COUNT(CASE WHEN premium_tier = 'premium' THEN 1 END) as premium_tier_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_signups
      FROM users
    `;
    
    const revenueQuery = `
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END) as today_revenue
      FROM premium_transactions
      WHERE status = 'completed'
    `;
    
    const stats = await pool.query(statsQuery);
    const revenue = await pool.query(revenueQuery);
    
    res.json({
      success: true,
      data: {
        users: stats.rows[0],
        revenue: revenue.rows[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenemedi',
      error: error.message
    });
  }
};

// @desc    Grant premium to user
exports.grantPremium = async (req, res) => {
  try {
    const { userId, packageId, duration = 30 } = req.body;
    
    logger.info('🎁 Premium veriliyor', { userId, packageId, duration });
    
    // Get package details
    const packageQuery = 'SELECT * FROM premium_packages WHERE id = $1';
    const packageResult = await pool.query(packageQuery, [packageId]);
    
    if (packageResult.rows.length === 0) {
      logger.error('❌ Paket bulunamadı', { packageId });
      return res.status(404).json({
        success: false,
        message: 'Paket bulunamadı'
      });
    }
    
    const pkg = packageResult.rows[0];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);
    
    logger.info('📦 Paket bilgileri', { 
      packageName: pkg.name, 
      dailyLimit: pkg.daily_limit,
      expiresAt 
    });
    
    // Update user
    const updateQuery = `
      UPDATE users 
      SET 
        is_premium = TRUE,
        premium_tier = $1,
        premium_expires_at = $2,
        daily_limit = $3
      WHERE id = $4
      RETURNING id, name, email, premium_tier, premium_expires_at, daily_limit, is_premium
    `;
    
    const result = await pool.query(updateQuery, [
      pkg.name.toLowerCase(),
      expiresAt,
      pkg.daily_limit,
      userId
    ]);
    
    if (result.rows.length === 0) {
      logger.error('❌ Kullanıcı bulunamadı', { userId });
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    logger.success('✅ Kullanıcı güncellendi', result.rows[0]);
    
    // Create transaction record
    await pool.query(
      `INSERT INTO premium_transactions (user_id, package_id, amount, payment_method, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, packageId, 0, 'admin_grant', 'completed']
    );
    
    logger.success('✅ Transaction kaydedildi');
    
    res.json({
      success: true,
      message: 'Premium başarıyla verildi',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('❌ Premium verilemedi', error);
    res.status(500).json({
      success: false,
      message: 'Premium verilemedi',
      error: error.message
    });
  }
};

// @desc    Revoke premium from user
exports.revokePremium = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      UPDATE users 
      SET 
        is_premium = FALSE,
        premium_tier = 'free',
        premium_expires_at = NULL,
        daily_limit = 5
      WHERE id = $1
      RETURNING id, name, email, premium_tier, daily_limit
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Premium iptal edildi',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Premium iptal edilemedi',
      error: error.message
    });
  }
};

// @desc    Get all premium packages
exports.getPremiumPackages = async (req, res) => {
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

// @desc    Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id, t.amount, t.payment_method, t.status, t.created_at,
        u.name as user_name, u.email as user_email,
        p.name as package_name
      FROM premium_transactions t
      JOIN users u ON t.user_id = u.id
      JOIN premium_packages p ON t.package_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İşlemler yüklenemedi',
      error: error.message
    });
  }
};

// @desc    Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id, name, email';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Kullanıcı silindi',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi',
      error: error.message
    });
  }
};
