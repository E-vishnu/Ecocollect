const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

// @route   POST /api/payments/create-order
// @desc    Initiate Razorpay / UPI payment order with amount validation
// @access  Protected (Resident/Admin)
router.post('/create-order', protect, paymentController.createOrder);

// @route   POST /api/payments/verify
// @desc    Verify payment cryptographic HMAC signature and settle pickup
// @access  Protected (Resident/Admin)
router.post('/verify', protect, paymentController.verifyPayment);

// @route   POST /api/payments/settle-payout
// @desc    Disburse recyclable cash buyback payout to resident UPI ID
// @access  Protected (Agent/Admin only with duplicate-payout protection)
router.post('/settle-payout', protect, restrictTo('agent', 'admin'), paymentController.settlePayout);

module.exports = router;
