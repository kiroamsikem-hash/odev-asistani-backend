const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', userController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', userController.updateProfile);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', userController.getStats);

module.exports = router;
