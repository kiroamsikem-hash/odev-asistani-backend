const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// @route   POST /api/flashcards/generate
// @desc    Generate flashcards from text
// @access  Private
router.post('/generate', flashcardController.generateFlashcards);

// @route   POST /api/flashcards
// @desc    Create single flashcard
// @access  Private
router.post('/', flashcardController.createFlashcard);

// @route   GET /api/flashcards/due
// @desc    Get due flashcards for review
// @access  Private
router.get('/due', flashcardController.getDueCards);

// @route   GET /api/flashcards/decks
// @desc    Get all decks
// @access  Private
router.get('/decks', flashcardController.getDecks);

// @route   GET /api/flashcards/stats
// @desc    Get flashcard statistics
// @access  Private
router.get('/stats', flashcardController.getStats);

// @route   PUT /api/flashcards/:id/review
// @desc    Review flashcard (update with spaced repetition)
// @access  Private
router.put('/:id/review', flashcardController.reviewCard);

// @route   DELETE /api/flashcards/:id
// @desc    Delete flashcard
// @access  Private
router.delete('/:id', flashcardController.deleteCard);

module.exports = router;
