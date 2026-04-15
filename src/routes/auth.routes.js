const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('name').notEmpty().withMessage('İsim gereklidir'),
  body('email').isEmail().withMessage('Geçerli bir email giriniz'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
], authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Geçerli bir email giriniz'),
  body('password').notEmpty().withMessage('Şifre gereklidir')
], authController.login);

// @route   POST /api/auth/google
// @desc    Google OAuth login
// @access  Public
router.post('/google', authController.googleAuth);

// @route   POST /api/auth/apple
// @desc    Apple OAuth login
// @access  Public
router.post('/apple', authController.appleAuth);

module.exports = router;
