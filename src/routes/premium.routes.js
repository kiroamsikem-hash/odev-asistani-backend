const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getPackages,
  purchasePackage,
  checkPremiumStatus,
  getMyTransactions
} = require('../controllers/premium.controller');

// All routes require authentication
router.use(protect);

router.get('/packages', getPackages);
router.post('/purchase', purchasePackage);
router.get('/status', checkPremiumStatus);
router.get('/transactions', getMyTransactions);

module.exports = router;
