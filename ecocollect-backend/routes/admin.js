const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

// Apply admin protection to all routes in this router
router.use(protect);
router.use(restrictTo('admin'));

// @route   GET /api/admin/metrics
// @desc    Overview statistics (total weight, recovery rate, revenue, contamination)
router.get('/metrics', adminController.getAdminMetrics);

// @route   GET /api/admin/mismatches (also /pickups/flagged)
// @desc    List all pickups with CNN vs Declared category mismatches
router.get('/mismatches', adminController.getFlaggedMismatches);
router.get('/pickups/flagged', adminController.getFlaggedMismatches);

// @route   POST /api/admin/mismatches/:pickupId/resolve
// @desc    Admin reviews and resolves flagged category mismatch
router.post('/mismatches/:pickupId/resolve', adminController.resolveMismatch);
router.post('/mismatches/:id/resolve', adminController.resolveMismatch);

// @route   GET /api/admin/users
// @desc    List all registered users (residents, agents, admins)
router.get('/users', adminController.getAllUsers);

module.exports = router;
