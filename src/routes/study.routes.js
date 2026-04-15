const express = require('express');
const router = express.Router();
const studyController = require('../controllers/study.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// @route   POST /api/study/sessions
// @desc    Create study session
// @access  Private
router.post('/sessions', studyController.createSession);

// @route   GET /api/study/sessions
// @desc    Get active study sessions
// @access  Private
router.get('/sessions', studyController.getActiveSessions);

// @route   PUT /api/study/sessions/:id/progress
// @desc    Update study progress
// @access  Private
router.put('/sessions/:id/progress', studyController.updateProgress);

// @route   GET /api/study/today
// @desc    Get today's study statistics
// @access  Private
router.get('/today', studyController.getTodayStats);

// @route   DELETE /api/study/sessions/:id
// @desc    Delete study session
// @access  Private
router.delete('/sessions/:id', studyController.deleteSession);

module.exports = router;
