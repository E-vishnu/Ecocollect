const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
  }
  return secret || 'ecocollect_development_jwt_secret_placeholder';
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing. Please sign in.'
      });
    }

    // Verify token with configured secret
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'The user belonging to this token no longer exists in database.'
        });
      }
    } else {
      // Offline/test mode: verify and populate user identity from cryptographically verified token claims
      user = {
        _id: decoded.id,
        id: decoded.id,
        role: decoded.role || 'resident',
        name: decoded.name || 'EcoCollect User',
        email: decoded.email || 'user@ecocollect.in'
      };
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please sign in again.'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user ? req.user.role : 'none'}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  authorize: restrictTo
};
