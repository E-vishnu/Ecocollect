const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { protect } = require('../middleware/auth');

// @route   POST /api/iot/weight-reading
// @desc    ESP32 + HX711 Wi-Fi Telemetry Ingestion (matches hardware-firmware endpoint)
// @access  IoT Gateway (Validates device authentication & telemetry parameters)
router.post('/weight-reading', iotController.recordWeightReading);

// @route   POST /api/iot/weight
// @desc    Alias for backward compatibility with simulators & legacy endpoints
router.post('/weight', iotController.recordWeightReading);

// @route   GET /api/iot/latest/:scaleId
// @desc    Poll latest weight reading with freshness, stale detection, and verified hardware status
// @access  Public / Polling
router.get('/latest/:scaleId', iotController.getLatestScaleReading);

// @route   POST /api/iot/tare
// @desc    Hardware Tare calibration / re-zero scale
// @access  Public / Agent
router.post('/tare', iotController.tareScale);

// @route   GET /api/iot/logs
// @desc    Query historical load cell telemetry logs
// @access  Protected
router.get('/logs', protect, iotController.getRecentLogs);

module.exports = router;
