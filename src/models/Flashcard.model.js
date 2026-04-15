const { pool } = require('../config/database');

class Flashcard {
  // Create flashcard
  static async create({ userId, front, back, subject, difficulty, deckName }) {
    const query = `
      INSERT INTO flashcards (user_id, front, back, subject, difficulty, deck_name, next_review, ease_factor, interval_days)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), 2.5, 1)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, front, back, subject, difficulty, deckName || 'Genel'
    ]);
    
    return result.rows[0];
  }

  // Get cards due for review
  static async getDueCards(userId, limit = 20) {
    const query = `
      SELECT * FROM flashcards 
      WHERE user_id = $1 AND next_review <= NOW()
      ORDER BY next_review ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  // Update card after review (Spaced Repetition Algorithm)
  static async updateAfterReview(id, userId, quality) {
    // quality: 0-5 (0=total blackout, 5=perfect response)
    const card = await this.findById(id, userId);
    if (!card) return null;

    let { ease_factor, interval_days, repetitions } = card;
    
    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions += 1;
    } else {
      // Incorrect response - reset
      repetitions = 0;
      interval_days = 1;
    }

    // Update ease factor
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval_days);

    const query = `
      UPDATE flashcards 
      SET ease_factor = $1, interval_days = $2, repetitions = $3, 
          next_review = $4, last_reviewed = NOW(), review_count = review_count + 1
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      ease_factor, interval_days, repetitions, nextReview, id, userId
    ]);
    
    return result.rows[0];
  }

  // Get all decks
  static async getDecks(userId) {
    const query = `
      SELECT deck_name, COUNT(*) as card_count,
             COUNT(CASE WHEN next_review <= NOW() THEN 1 END) as due_count
      FROM flashcards 
      WHERE user_id = $1 
      GROUP BY deck_name
      ORDER BY deck_name
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Find by ID
  static async findById(id, userId) {
    const query = 'SELECT * FROM flashcards WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Delete by ID
  static async deleteById(id, userId) {
    const query = 'DELETE FROM flashcards WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  // Get statistics
  static async getStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN next_review <= NOW() THEN 1 END) as due_cards,
        AVG(ease_factor) as avg_ease,
        SUM(review_count) as total_reviews
      FROM flashcards 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = Flashcard;
