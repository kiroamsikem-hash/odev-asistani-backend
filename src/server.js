const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/database');

// Connect to database
connectDB().catch(err => {
  console.error('Database connection failed:', err);
});


const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/questions', require('./routes/question.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/video', require('./routes/video.routes'));
app.use('/api/flashcards', require('./routes/flashcard.routes'));
app.use('/api/study', require('./routes/study.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Database check
app.get('/api/db-check', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    res.json({
      success: true,
      tables: tables.rows.map(r => r.table_name),
      message: 'Database connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

// Test new features endpoints
app.get('/api/test-features', (req, res) => {
  res.json({
    success: true,
    message: 'New features endpoints are available',
    endpoints: {
      video: '/api/video/analyze',
      flashcards: '/api/flashcards/generate',
      study: '/api/study/sessions'
    },
    note: 'These endpoints require authentication'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Self-ping to prevent Render sleep (every 14 minutes)
if (process.env.NODE_ENV === 'production') {
  const RENDER_URL = 'https://odev-asistani-backend.onrender.com/health';
  setInterval(async () => {
    try {
      const response = await fetch(RENDER_URL);
      console.log('🔄 Self-ping:', response.status);
    } catch (error) {
      console.error('❌ Self-ping failed:', error.message);
    }
  }, 14 * 60 * 1000); // 14 minutes
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
