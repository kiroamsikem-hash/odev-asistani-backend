const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// @route   GET /api/questions
// @desc    Get user's question history
// @access  Private
router.get('/', questionController.getQuestions);

// @route   GET /api/questions/:id
// @desc    Get single question
// @access  Private
router.get('/:id', questionController.getQuestion);

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private
router.delete('/:id', questionController.deleteQuestion);

module.exports = router;
