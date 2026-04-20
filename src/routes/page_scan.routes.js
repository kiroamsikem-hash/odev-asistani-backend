const express = require('express');
const router = express.Router();
const multer = require('multer');
const pageScanController = require('../controllers/page_scan.controller');
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

// All routes are protected
router.use(protect);

// @route   POST /api/page-scan/scan
// @desc    Scan page and detect all questions
// @access  Private
router.post('/scan', upload.single('image'), pageScanController.scanPage);

// @route   POST /api/page-scan/solve
// @desc    Solve specific question from scanned page
// @access  Private
router.post('/solve', checkDailyLimit, pageScanController.solveScannedQuestion);

module.exports = router;
