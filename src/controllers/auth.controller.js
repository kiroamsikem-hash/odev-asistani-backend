const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, educationLevel } = req.body;

    // Check if user exists
    const userExists = await User.findByEmail(email);
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Bu email zaten kayıtlı'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      educationLevel: educationLevel || 'lise'
    });

    const token = generateToken(user.id);

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
    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında hata oluştu',
      error: error.message
    });
  }
};

// @desc    Login user
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Check user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
    }

    // Check password
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
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
