const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getPackages,
  purchasePackage,
  checkPremiumStatus,
  getMyTransactions
} = require('../controllers/premium.controller');

// Public route - no auth required
router.get('/packages', getPackages);

// Protected routes - require authentication
router.post('/purchase', protect, purchasePackage);
router.get('/status', protect, checkPremiumStatus);
router.get('/transactions', protect, getMyTransactions);

module.exports = router;
