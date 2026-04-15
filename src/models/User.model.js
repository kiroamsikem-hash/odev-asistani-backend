const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create user
  static async create({ name, email, password, educationLevel = 'lise' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (name, email, password, education_level)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, education_level, is_premium, created_at
    `;
    
    const result = await pool.query(query, [name, email, hashedPassword, educationLevel]);
    return result.rows[0];
  }

  // Find by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = 'SELECT id, name, email, education_level, is_premium, daily_question_count, last_question_date, avatar, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Find by Google ID
  static async findByGoogleId(googleId) {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await pool.query(query, [googleId]);
    return result.rows[0];
  }

  // Find by Apple ID
  static async findByAppleId(appleId) {
    const query = 'SELECT * FROM users WHERE apple_id = $1';
    const result = await pool.query(query, [appleId]);
    return result.rows[0];
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });

    values.push(id);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, email, education_level, is_premium, avatar
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Reset daily count
  static async resetDailyCount(id) {
    const query = `
      UPDATE users 
      SET daily_question_count = 0, last_question_date = CURRENT_TIMESTAMP
      WHERE id = $1 AND DATE(last_question_date) < CURRENT_DATE
      RETURNING daily_question_count
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Increment question count
  static async incrementQuestionCount(id) {
    const query = `
      UPDATE users 
      SET daily_question_count = daily_question_count + 1
      WHERE id = $1
      RETURNING daily_question_count
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;
