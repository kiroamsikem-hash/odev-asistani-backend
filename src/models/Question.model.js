const { pool } = require('../config/database');

class Question {
  // Create question
  static async create({ userId, type, question, answer, imageUrl, steps, subject, difficulty }) {
    const query = `
      INSERT INTO questions (user_id, type, question, answer, image_url, steps, subject, difficulty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const stepsJson = steps ? JSON.stringify(steps) : null;
    const result = await pool.query(query, [
      userId, type, question, answer, imageUrl, stepsJson, subject, difficulty
    ]);
    
    return result.rows[0];
  }

  // Find by user ID
  static async findByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM questions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  // Count by user ID
  static async countByUserId(userId) {
    const query = 'SELECT COUNT(*) FROM questions WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  // Find by ID
  static async findById(id, userId) {
    const query = 'SELECT * FROM questions WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Delete by ID
  static async deleteById(id, userId) {
    const query = 'DELETE FROM questions WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Get statistics by type
  static async getStatsByUserId(userId) {
    const query = `
      SELECT type, COUNT(*) as count 
      FROM questions 
      WHERE user_id = $1 
      GROUP BY type
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = Question;
