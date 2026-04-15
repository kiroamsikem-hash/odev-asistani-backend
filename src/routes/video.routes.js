const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkDailyLimit } = require('../middleware/rateLimit.middleware');

// All routes are protected and rate limited
router.use(protect);
router.use(checkDailyLimit);

// @route   POST /api/video/analyze
// @desc    Analyze YouTube video
// @access  Private
router.post('/analyze', videoController.analyzeVideo);

// @route   GET /api/video/notes
// @desc    Get user's video notes
// @access  Private
router.get('/notes', videoController.getVideoNotes);

// @route   GET /api/video/notes/:id
// @desc    Get single video note
// @access  Private
router.get('/notes/:id', videoController.getVideoNote);

// @route   DELETE /api/video/notes/:id
// @desc    Delete video note
// @access  Private
router.delete('/notes/:id', videoController.deleteVideoNote);

module.exports = router;
