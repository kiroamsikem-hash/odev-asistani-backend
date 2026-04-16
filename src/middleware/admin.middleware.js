const { pool } = require('../config/database');

// Check if user is admin
exports.isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const query = 'SELECT is_admin FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
    
    if (!result.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yetki kontrolü başarısız',
      error: error.message
    });
  }
};
