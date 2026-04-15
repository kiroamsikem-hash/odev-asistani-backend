const { pool } = require('../config/database');

class StudySession {
  // Create study session
  static async create({ userId, subject, targetDate, dailyGoal, notes }) {
    const query = `
      INSERT INTO study_sessions (user_id, subject, target_date, daily_goal, notes, completed_today)
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, subject, targetDate, dailyGoal, notes
    ]);
    
    return result.rows[0];
  }

  // Get active sessions
  static async getActiveSessions(userId) {
    const query = `
      SELECT * FROM study_sessions 
      WHERE user_id = $1 AND target_date >= CURRENT_DATE
      ORDER BY target_date ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Update daily progress
  static async updateProgress(id, userId, minutesStudied) {
    const query = `
      UPDATE study_sessions 
      SET completed_today = completed_today + $1,
          total_minutes = total_minutes + $1,
          last_study = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [minutesStudied, id, userId]);
    return result.rows[0];
  }

  // Get today's stats
  static async getTodayStats(userId) {
    const query = `
      SELECT 
        SUM(completed_today) as minutes_today,
        COUNT(*) as active_sessions,
        SUM(CASE WHEN completed_today >= daily_goal THEN 1 ELSE 0 END) as goals_met
      FROM study_sessions 
      WHERE user_id = $1 AND target_date >= CURRENT_DATE
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id, userId) {
    const query = 'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Delete by ID
  static async deleteById(id, userId) {
    const query = 'DELETE FROM study_sessions WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = StudySession;
