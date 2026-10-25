const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Route Modules
const authRoutes = require('./routes/authRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const iotRoutes = require('./routes/iotRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/admin');
const { router: trackingRoutes } = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Disable Mongoose command buffering to prevent hanging queries when database is offline
mongoose.set('bufferCommands', false);

// Production configuration validation: Do not silently proceed with missing critical secrets
if (isProduction) {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI environment variable must be defined for production deployment.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable must be defined for production deployment.');
    process.exit(1);
  }
}

// Enable CORS & Request Body Parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint - Accurately reports application and database state without leaking secrets
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = stateNames[mongoose.connection.readyState] || 'unknown';

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'healthy' : 'degraded',
    database: {
      connected: isConnected,
      status: dbStatus
    },
    service: 'EcoCollect Backend REST API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount API Route Modules
app.use('/api/auth', authRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tracking', trackingRoutes);

// 404 Handler for undefined API paths
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Central Graceful Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const message = statusCode === 500 && isProduction
    ? 'An internal server error occurred.'
    : (err.message || 'Server error.');

  // Do not expose stack traces or credentials in response
  res.status(statusCode).json({
    success: false,
    message
  });
});

// Connect to MongoDB & Start Server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecocollect';
const sanitizedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log(` Connected to MongoDB successfully (${sanitizedUri}).`);
      app.listen(PORT, () => {
        console.log(` EcoCollect Backend running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.warn(`⚠️ MongoDB connection warning (${sanitizedUri}): ${err.message}`);
      app.listen(PORT, () => {
        console.log(` EcoCollect Backend running on http://localhost:${PORT} (Database offline)`);
      });
    });
}

module.exports = app;
