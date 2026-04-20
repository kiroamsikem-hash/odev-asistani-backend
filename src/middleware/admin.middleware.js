const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Check if user is admin
exports.isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    logger.info('🔐 Admin yetki kontrolü', { userId, userEmail });
    
    const query = 'SELECT is_admin, email FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      logger.error('❌ Kullanıcı bulunamadı', { userId });
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    const user = result.rows[0];
    logger.info('👤 Kullanıcı bilgisi', { 
      email: user.email, 
      isAdmin: user.is_admin,
      hasAdminColumn: 'is_admin' in user
    });
    
    if (!user.is_admin) {
      logger.error('❌ Admin yetkisi yok', { email: user.email, isAdmin: user.is_admin });
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli',
        debug: {
          email: user.email,
          isAdmin: user.is_admin
        }
      });
    }
    
    logger.success('✅ Admin yetkisi onaylandı', { email: user.email });
    next();
  } catch (error) {
    logger.error('❌ Admin middleware hatası', error);
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü başarısız',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
