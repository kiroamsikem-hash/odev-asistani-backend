const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const logger = require('../utils/logger');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
exports.register = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('📝 Yeni kullanıcı kaydı başlatıldı', { email: req.body.email });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Validasyon hatası', { errors: errors.array() });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, educationLevel } = req.body;

    // Check if user exists
    logger.info('🔍 Email kontrolü yapılıyor...');
    const userExists = await User.findByEmail(email);
    if (userExists) {
      logger.warn('❌ Email zaten kayıtlı', { email });
      return res.status(400).json({
        success: false,
        message: 'Bu email zaten kayıtlı'
      });
    }

    // Create user
    logger.info('💾 Kullanıcı oluşturuluyor...');
    const user = await User.create({
      name,
      email,
      password,
      educationLevel: educationLevel || 'lise'
    });
    logger.success('✅ Kullanıcı oluşturuldu', { userId: user.id, email: user.email });

    const token = generateToken(user.id);
    
    const duration = Date.now() - startTime;
    logger.success(`✅ Kayıt başarılı! Süre: ${duration}ms`, { userId: user.id });
    logger.response(req, res, 201, { userId: user.id });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Kayıt hatası (${duration}ms)`, error);
    logger.response(req, res, 500);
    
    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Login user
exports.login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔐 Giriş denemesi', { email: req.body.email });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Validasyon hatası', { errors: errors.array() });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check user exists
    logger.info('🔍 Kullanıcı aranıyor...');
    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn('❌ Kullanıcı bulunamadı', { email });
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
    }

    // Check password
    logger.info('🔑 Şifre kontrol ediliyor...');
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      logger.warn('❌ Şifre hatalı', { email });
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
    }

    const token = generateToken(user.id);
    
    const duration = Date.now() - startTime;
    logger.success(`✅ Giriş başarılı! Süre: ${duration}ms`, { userId: user.id, email: user.email });
    logger.response(req, res, 200, { userId: user.id });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Giriş hatası (${duration}ms)`, error);
    logger.response(req, res, 500);
    
    res.status(500).json({
      success: false,
      message: 'Giriş sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Google OAuth
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    let user = await User.findByGoogleId(googleId);
    
    if (!user) {
      user = await User.findByEmail(email);
    }

    if (!user) {
      // Create new user
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await User.create({
        name,
        email,
        password: randomPassword
      });
      
      // Update with Google ID
      await User.update(user.id, { google_id: googleId, avatar });
      user = await User.findById(user.id);
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Google girişi sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Apple OAuth
exports.appleAuth = async (req, res) => {
  try {
    const { appleId, email, name } = req.body;

    let user = await User.findByAppleId(appleId);
    
    if (!user) {
      user = await User.findByEmail(email);
    }

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await User.create({
        name: name || 'Apple User',
        email,
        password: randomPassword
      });
      
      await User.update(user.id, { apple_id: appleId });
      user = await User.findById(user.id);
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Apple girişi sırasında hata oluştu',
      error: error.message
    });
  }
};
