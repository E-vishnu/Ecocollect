const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

// @route   POST /api/pickups (and /api/pickups/request)
// @desc    Resident schedules a pickup
// @access  Resident, Admin
router.post('/', protect, pickupController.createPickup);
router.post('/request', protect, pickupController.createPickup);

// @route   GET /api/pickups
// @desc    Get pickups list (filtered by user role)
// @access  Protected
router.get('/', protect, pickupController.getPickups);

// @route   GET /api/pickups/:id
// @desc    Get single pickup details
// @access  Protected
router.get('/:id', protect, pickupController.getPickupById);

// @route   PUT /api/pickups/:id/status
// @desc    Update pickup status (en_route, collected, cancelled, etc.)
// @access  Protected (Agent/Admin or Resident self-cancel)
router.put('/:id/status', protect, pickupController.updatePickupStatus);

// @route   PUT /api/pickups/:id/assign
// @desc    Assign collection agent
// @access  Agent or Admin
router.put('/:id/assign', protect, restrictTo('agent', 'admin'), pickupController.assignAgent);

// @route   PUT /api/pickups/:id/verify (also POST /:id/weigh-and-classify)
// @desc    Agent verifies weight, photo, and pricing
// @access  Agent or Admin
router.put('/:id/verify', protect, restrictTo('agent', 'admin'), pickupController.verifyAndWeighPickup);
router.put('/:pickupId/verify', protect, restrictTo('agent', 'admin'), pickupController.verifyAndWeighPickup);
router.post('/:id/weigh-and-classify', protect, restrictTo('agent', 'admin'), pickupController.verifyAndWeighPickup);

// @route   PUT /api/pickups/:id/confirm-collection
// @desc    Mark collection completed
// @access  Agent or Admin
router.put('/:id/confirm-collection', protect, restrictTo('agent', 'admin'), pickupController.confirmCollection);

// @route   POST /api/pickups/:pickupId/settle
// @desc    Payment or payout settlement
// @access  Protected
router.post('/:pickupId/settle', protect, pickupController.settlePayment);

// @route   PUT /api/pickups/:id/resolve-flag
// @desc    Admin reviews and resolves flagged category mismatch
// @access  Admin
router.put('/:id/resolve-flag', protect, restrictTo('admin'), adminController.resolveMismatch);

module.exports = router;
