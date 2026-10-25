const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo, authorize } = require('../middleware/auth');

// @route   POST /api/auth/signup
// @desc    Register a new resident user (public registration)
// @access  Public
router.post('/signup', authController.signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & retrieve JWT token
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @desc    Get currently authenticated user's profile
// @access  Private
router.get('/me', protect, authController.getMe);

module.exports = router;
module.exports.router = router;
module.exports.protect = protect;
module.exports.restrictTo = restrictTo;
module.exports.authorize = authorize;
