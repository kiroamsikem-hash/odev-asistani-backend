const { Pool } = require('pg');

// Debug: Check DATABASE_URL
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'NOT FOUND');
console.log('First 50 chars:', process.env.DATABASE_URL?.substring(0, 50));

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ PostgreSQL Connected: ${client.host}`);
    client.release();
    
    // Create tables if not exist
    await createTables();
  } catch (error) {
    console.error(`❌ Database Error: ${error.message}`);
    console.error('Full error:', error);
    // Don't exit, let server run without DB for now
  }
};

// Create tables
const createTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      education_level VARCHAR(50) DEFAULT 'lise',
      is_premium BOOLEAN DEFAULT false,
      daily_question_count INTEGER DEFAULT 0,
      last_question_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      google_id VARCHAR(255),
      apple_id VARCHAR(255),
      avatar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createQuestionsTable = `
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      image_url TEXT,
      steps JSONB,
      subject VARCHAR(100),
      difficulty VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createQuestionsTable);
    await pool.query(createIndexes);
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

module.exports = { pool, connectDB };
