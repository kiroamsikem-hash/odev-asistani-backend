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
    
    // Run features migration
    const featuresSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_new_features_fixed.sql'),
      'utf8'
    );

    console.log('📝 Features migration çalıştırılıyor...');
    await pool.query(featuresSql);
    
    // Run premium migration
    const premiumSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_premium_system.sql'),
      'utf8'
    );

    console.log('📝 Premium system migration çalıştırılıyor...');
    await pool.query(premiumSql);
    
    console.log('✅ Migration başarıyla tamamlandı!');
    console.log('');
    console.log('Eklenen tablolar:');
    console.log('  - video_notes (Video Lab)');
    console.log('  - flashcards (Akıllı Kartlar)');
    console.log('  - study_sessions (Çalışma Planlayıcı)');
    console.log('  - premium_packages (Premium Paketler)');
    console.log('  - premium_transactions (Premium İşlemler)');
    console.log('');
    console.log('Admin kullanıcılar:');
    console.log('  - byazar1628@gmail.com');
    console.log('  - myazar483@gmail.com');
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
