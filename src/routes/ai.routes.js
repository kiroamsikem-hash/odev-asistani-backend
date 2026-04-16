const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/ai.controller');
const socraticController = require('../controllers/socratic.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkDailyLimit } = require('../middleware/rateLimit.middleware');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});

// All routes are protected and rate limited
router.use(protect);
router.use(checkDailyLimit);

// @route   POST /api/ai/solve
// @desc    Solve question with AI
// @access  Private
router.post('/solve', aiController.solveQuestion);

// @route   POST /api/ai/ocr
// @desc    Extract text from image (OCR)
// @access  Private
router.post('/ocr', upload.single('image'), aiController.performOCR);

// @route   POST /api/ai/solve-image
// @desc    Solve question from image (direct AI analysis)
// @access  Private
router.post('/solve-image', upload.single('image'), aiController.solveImageQuestion);

// @route   POST /api/ai/compose
// @desc    Write composition/essay
// @access  Private
router.post('/compose', aiController.writeComposition);

// @route   POST /api/ai/translate
// @desc    Translate text
// @access  Private
router.post('/translate', aiController.translateText);

// @route   POST /api/ai/simplify
// @desc    Simplify explanation
// @access  Private
router.post('/simplify', aiController.simplifyExplanation);

// @route   POST /api/ai/socratic/hint
// @desc    Get Socratic hint (doesn't give direct answer)
// @access  Private
router.post('/socratic/hint', socraticController.getSocraticHint);

// @route   POST /api/ai/socratic/check
// @desc    Check student's answer
// @access  Private
router.post('/socratic/check', socraticController.checkStudentAnswer);

module.exports = router;
