const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Veritabanına bağlanılıyor...');
    
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_new_features_fixed.sql'),
      'utf8'
    );

    console.log('📝 Migration çalıştırılıyor...');
    await pool.query(sqlFile);
    
    console.log('✅ Migration başarıyla tamamlandı!');
    console.log('');
    console.log('Eklenen tablolar:');
    console.log('  - video_notes (Video Lab)');
    console.log('  - flashcards (Akıllı Kartlar)');
    console.log('  - study_sessions (Çalışma Planlayıcı)');
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
