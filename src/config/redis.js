const redis = require('redis');

let redisClient = null;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.log('⚠️ Redis URL yok, caching devre dışı');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error('Redis bağlantısı başarısız');
          return retries * 1000;
        }
      }
    });

    redisClient.on('error', (err) => console.log('Redis Error:', err));
    redisClient.on('connect', () => console.log('✅ Redis bağlandı'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.log('❌ Redis bağlanamadı:', error.message);
    return null;
  }
}

// Benzer soruları cache'den getir
async function getCachedAnswer(question, gradeLevel) {
  if (!redisClient) return null;

  try {
    const key = `q:${gradeLevel}:${question.toLowerCase().trim().substring(0, 100)}`;
    const cached = await redisClient.get(key);
    
    if (cached) {
      console.log('✅ Cache HIT - AI çağrısı yapılmadı!');
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    console.log('Redis get error:', error.message);
    return null;
  }
}

// Cevabı cache'e kaydet (24 saat)
async function cacheAnswer(question, gradeLevel, answer) {
  if (!redisClient) return;

  try {
    const key = `q:${gradeLevel}:${question.toLowerCase().trim().substring(0, 100)}`;
    await redisClient.setEx(key, 86400, JSON.stringify(answer)); // 24 saat
    console.log('✅ Cevap cache\'e kaydedildi');
  } catch (error) {
    console.log('Redis set error:', error.message);
  }
}

module.exports = {
  connectRedis,
  getCachedAnswer,
  cacheAnswer,
  getClient: () => redisClient
};
