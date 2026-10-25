const authRoutes = require('./authRoutes');
const { protect, restrictTo, authorize } = require('../middleware/auth');

module.exports = authRoutes;
module.exports.router = authRoutes;
module.exports.protect = protect;
module.exports.restrictTo = restrictTo;
module.exports.authorize = authorize;
