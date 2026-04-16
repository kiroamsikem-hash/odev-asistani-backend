const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

// Connect to database
connectDB().catch(err => {
  console.error('Database connection failed:', err);
});

// Connect to Redis (optional - for caching)
connectRedis().catch(err => {
  console.log('Redis connection skipped:', err.message);
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
app.use('/api/premium', require('./routes/premium.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

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

// Check if migration is needed
app.get('/api/migration-status', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    const requiredTables = ['video_notes', 'flashcards', 'study_sessions', 'premium_packages', 'premium_transactions'];
    const missingTables = [];
    
    for (const tableName of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (!result.rows[0].exists) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      res.json({
        success: false,
        migrationNeeded: true,
        message: '⚠️ Migration gerekli! /api/run-migration endpoint\'ini çağır.',
        missingTables,
        instructions: 'GET /api/run-migration'
      });
    } else {
      res.json({
        success: true,
        migrationNeeded: false,
        message: '✅ Tüm tablolar mevcut! Yeni özellikler kullanıma hazır.',
        tables: requiredTables
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database kontrol hatası',
      error: error.message
    });
  }
});

// Run migration endpoint (for when you don't have shell access)
app.get('/api/run-migration', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const fs = require('fs');
    const path = require('path');
    
    const results = [];
    
    // Run features migration
    try {
      const featuresSql = fs.readFileSync(
        path.join(__dirname, '../migrations/add_new_features_fixed.sql'),
        'utf8'
      );
      await pool.query(featuresSql);
      results.push('✅ Features migration completed');
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.push('ℹ️ Features tables already exist');
      } else {
        throw error;
      }
    }
    
    // Run premium migration
    try {
      const premiumSql = fs.readFileSync(
        path.join(__dirname, '../migrations/add_premium_system.sql'),
        'utf8'
      );
      await pool.query(premiumSql);
      results.push('✅ Premium system migration completed');
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.push('ℹ️ Premium tables already exist');
      } else {
        throw error;
      }
    }
    
    res.json({
      success: true,
      message: '✅ Migration başarıyla tamamlandı!',
      results,
      tables: {
        features: ['video_notes', 'flashcards', 'study_sessions'],
        premium: ['premium_packages', 'premium_transactions']
      },
      admins: ['byazar1628@gmail.com', 'myazar483@gmail.com']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Migration hatası',
      error: error.message
    });
  }
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
