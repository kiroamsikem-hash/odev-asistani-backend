const { pool } = require('../config/database');

class VideoNote {
  // Create video note
  static async create({ userId, videoUrl, title, summary, timestamps, questions }) {
    const query = `
      INSERT INTO video_notes (user_id, video_url, title, summary, timestamps, questions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const timestampsJson = timestamps ? JSON.stringify(timestamps) : null;
    const questionsJson = questions ? JSON.stringify(questions) : null;
    
    const result = await pool.query(query, [
      userId, videoUrl, title, summary, timestampsJson, questionsJson
    ]);
    
    return result.rows[0];
  }

  // Find by user ID
  static async findByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM video_notes 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  // Find by ID
  static async findById(id, userId) {
    const query = 'SELECT * FROM video_notes WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Delete by ID
  static async deleteById(id, userId) {
    const query = 'DELETE FROM video_notes WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Count by user ID
  static async countByUserId(userId) {
    const query = 'SELECT COUNT(*) FROM video_notes WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = VideoNote;
