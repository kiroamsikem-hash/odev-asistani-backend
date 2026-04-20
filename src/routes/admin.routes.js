const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
  getAllUsers,
  getUserStats,
  grantPremium,
  revokePremium,
  getPremiumPackages,
  getTransactions,
  deleteUser,
  makeAdmin,
  removeAdmin,
  setAdminsByEmail
} = require('../controllers/admin.controller');

// All routes require authentication and admin privileges
router.use(protect);
router.use(isAdmin);

// User management
router.get('/users', getAllUsers);
router.get('/stats', getUserStats);
router.delete('/users/:userId', deleteUser);

// Admin management
router.post('/admin/make', makeAdmin);
router.delete('/admin/remove/:userId', removeAdmin);

// Premium management
router.post('/premium/grant', grantPremium);
router.delete('/premium/revoke/:userId', revokePremium);
router.get('/packages', getPremiumPackages);
router.get('/transactions', getTransactions);

module.exports = router;
