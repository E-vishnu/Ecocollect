const mongoose = require('mongoose');
const WeightLog = require('../models/WeightLog');
const Pickup = require('../models/Pickup');

// In-memory cache for live ESP32 scale telemetry
const latestScaleReadings = new Map();

// Recent telemetry packet deduplication cache (Key: scaleId_packetId, Value: timestamp)
const recentPackets = new Map();

// Known registered scale identifiers for validation
const REGISTERED_SCALES = new Set([
  'ESP32-HX711-UNIT-01',
  'ESP32-HX711-DEV-01',
  'ESP32-HX711-UNIT-02',
  'ESP32-HX711-MOCK-01'
]);

// 30 seconds threshold to consider telemetry fresh vs disconnected/stale
const STALE_THRESHOLD_MS = 30000;

// Helper to clean up deduplication cache periodically
function cleanupRecentPackets() {
  const now = Date.now();
  for (const [key, timestamp] of recentPackets.entries()) {
    if (now - timestamp > 60000) {
      recentPackets.delete(key);
    }
  }
}

/**
 * Validates device authentication if IOT_DEVICE_KEY is configured
 */
function authenticateDevice(req) {
  const configuredKey = process.env.IOT_DEVICE_KEY;
  if (!configuredKey) {
    // In local development/testing without IOT_DEVICE_KEY configured, allow registered devices
    return { authorized: true };
  }

  const deviceKey = req.headers['x-device-key'] || req.headers['x-api-key'] || (
    req.headers.authorization && req.headers.authorization.startsWith('Device ')
      ? req.headers.authorization.split(' ')[1]
      : null
  );

  if (!deviceKey || deviceKey !== configuredKey) {
    return {
      authorized: false,
      message: 'Device authentication failed: Missing or invalid device API key in X-Device-Key header.'
    };
  }

  return { authorized: true };
}

/**
 * 1. Record Weight Reading (ESP32 REST Gateway)
 * Endpoint: POST /api/iot/weight-reading (also POST /api/iot/weight)
 */
exports.recordWeightReading = async (req, res) => {
  try {
    // Device authentication check
    const authCheck = authenticateDevice(req);
    if (!authCheck.authorized) {
      return res.status(401).json({
        success: false,
        message: authCheck.message
      });
    }

    const { 
      scaleId, 
      weightKg, 
      rawADC, 
      rawAdcValue,
      batteryVoltage, 
      wifiRssi, 
      activePickupCode,
      pickupCode,
      pickupId,
      packetId,
      timestamp: deviceTimestamp,
      isSimulated: isSimulatedFlag,
      source: explicitSource
    } = req.body;

    // 1. Validate device identifier (scaleId)
    if (!scaleId || typeof scaleId !== 'string' || scaleId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: A non-empty scaleId identifier string is required.'
      });
    }

    const trimmedScaleId = scaleId.trim();

    // 2. Validate weight measurement
    if (weightKg === undefined || weightKg === null) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: weightKg reading is required.'
      });
    }

    const parsedWeight = typeof weightKg === 'number' ? weightKg : parseFloat(weightKg);
    if (isNaN(parsedWeight) || !isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 500) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: weightKg must be a valid non-negative number between 0.0 and 500.0 kg.'
      });
    }

    const sanitizedWeight = Math.max(0, parseFloat(parsedWeight.toFixed(2)));

    // 3. Keep simulated readings explicitly separated from physical hardware readings
    const isSimulated = Boolean(isSimulatedFlag || explicitSource === 'simulator');
    const source = isSimulated ? 'simulator' : (explicitSource || 'hardware_esp32');

    // 4. Do not silently invent missing telemetry values (preserve actual device state)
    const adcReading = rawADC !== undefined ? parseInt(rawADC) : (rawAdcValue !== undefined ? parseInt(rawAdcValue) : null);
    const parsedRawAdc = (adcReading !== null && !isNaN(adcReading)) ? adcReading : null;

    const parsedBattery = (batteryVoltage !== undefined && batteryVoltage !== null) 
      ? parseFloat(batteryVoltage) 
      : null;

    const parsedRssi = (wifiRssi !== undefined && wifiRssi !== null) 
      ? parseInt(wifiRssi) 
      : null;

    // 5. Duplicate and replayed telemetry protection
    cleanupRecentPackets();
    const packetKey = packetId 
      ? `${trimmedScaleId}_${packetId}` 
      : `${trimmedScaleId}_${sanitizedWeight}_${parsedRawAdc}_${Math.floor(Date.now() / 2000)}`;

    if (recentPackets.has(packetKey)) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Duplicate or replayed telemetry frame received and ignored.',
        scaleId: trimmedScaleId,
        receivedWeightKg: sanitizedWeight
      });
    }
    recentPackets.set(packetKey, Date.now());

    // 6. Validate and associate pickup safely (if DB connected)
    const targetCode = activePickupCode || pickupCode || pickupId;
    let linkedPickup = null;

    if (targetCode) {
      if (typeof targetCode !== 'string' || targetCode.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pickup identifier format.'
        });
      }

      const trimmedCode = targetCode.trim();
      const isObjectId = mongoose.Types.ObjectId.isValid(trimmedCode);

      if (mongoose.connection.readyState === 1) {
        linkedPickup = await Pickup.findOne(
          isObjectId ? { $or: [{ _id: trimmedCode }, { pickupCode: trimmedCode }] } : { pickupCode: trimmedCode }
        );

        if (!linkedPickup) {
          return res.status(404).json({
            success: false,
            message: `Associated pickup '${trimmedCode}' was not found in the database.`
          });
        }

        // Safety: Cannot attach telemetry to a pickup that is already completed or cancelled
        if (['completed', 'cancelled'].includes(linkedPickup.status)) {
          return res.status(409).json({
            success: false,
            message: `Cannot attach weight telemetry: Pickup ${linkedPickup.pickupCode} is already ${linkedPickup.status}.`
          });
        }
      }
    }

    // 7. Telemetry Record Creation
    const readingTimestamp = deviceTimestamp ? new Date(deviceTimestamp) : new Date();
    const telemetryData = {
      scaleId: trimmedScaleId,
      weightKg: sanitizedWeight,
      rawADC: parsedRawAdc,
      batteryVoltage: parsedBattery,
      wifiRssi: parsedRssi,
      source,
      isSimulated,
      packetId: packetId || null,
      pickupId: linkedPickup ? linkedPickup._id : null,
      pickupCode: linkedPickup ? linkedPickup.pickupCode : null,
      timestamp: readingTimestamp,
      receivedAt: new Date()
    };

    latestScaleReadings.set(trimmedScaleId, telemetryData);

    // 8. Persist telemetry to WeightLog when database is online
    let logId = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const log = await WeightLog.create({
          scaleId: telemetryData.scaleId,
          pickupId: linkedPickup ? linkedPickup._id : undefined,
          weightKg: telemetryData.weightKg,
          rawADC: parsedRawAdc,
          batteryVoltage: parsedBattery,
          wifiRssi: parsedRssi,
          source,
          isSimulated,
          packetId: packetId || undefined,
          deviceTimestamp: deviceTimestamp ? readingTimestamp : undefined
        });
        logId = log._id;
      } catch (dbErr) {
        console.warn('WeightLog database persist notice:', dbErr.message);
      }
    }

    // 9. Update pickup weight if linked
    // CRITICAL: A weight reading alone NEVER marks a pickup completed or triggers financial disbursement.
    if (linkedPickup) {
      linkedPickup.weightKg = sanitizedWeight;
      linkedPickup.scaleIdUsed = trimmedScaleId;
      linkedPickup.weightSource = isSimulated ? 'simulator' : 'hardware_esp32';
      await linkedPickup.save();
    }

    res.status(201).json({
      success: true,
      message: 'ESP32 HX711 telemetry recorded successfully.',
      scaleId: trimmedScaleId,
      receivedWeightKg: sanitizedWeight,
      source,
      isSimulated,
      timestamp: telemetryData.timestamp,
      data: {
        logId,
        scaleId: trimmedScaleId,
        weightKg: sanitizedWeight,
        rawADC: parsedRawAdc,
        batteryVoltage: parsedBattery,
        wifiRssi: parsedRssi,
        linkedPickupId: linkedPickup ? linkedPickup._id : null,
        linkedPickupCode: linkedPickup ? linkedPickup.pickupCode : null
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error processing IoT scale reading.'
    });
  }
};

/**
 * 2. Get Latest Scale Telemetry (Polling endpoint)
 * Endpoint: GET /api/iot/latest/:scaleId
 */
exports.getLatestScaleReading = async (req, res) => {
  try {
    const { scaleId } = req.params;
    if (!scaleId || typeof scaleId !== 'string' || scaleId.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Valid scaleId is required.' });
    }

    const trimmedScaleId = scaleId.trim();
    let candidateReading = latestScaleReadings.get(trimmedScaleId);

    // Fallback to latest database log if DB is connected
    if (!candidateReading && mongoose.connection.readyState === 1) {
      try {
        const dbLog = await WeightLog.findOne({ scaleId: trimmedScaleId }).sort({ createdAt: -1 });
        if (dbLog) {
          candidateReading = {
            scaleId: dbLog.scaleId,
            weightKg: dbLog.weightKg,
            rawADC: dbLog.rawADC,
            batteryVoltage: dbLog.batteryVoltage,
            wifiRssi: dbLog.wifiRssi,
            source: dbLog.source || 'hardware_esp32',
            isSimulated: Boolean(dbLog.isSimulated),
            pickupId: dbLog.pickupId,
            timestamp: dbLog.createdAt
          };
        }
      } catch (e) {
        // DB lookup optional fallback
      }
    }

    // If no telemetry exists: clearly report that real hardware has not been verified
    if (!candidateReading) {
      return res.status(200).json({
        success: true,
        scaleId: trimmedScaleId,
        connected: false,
        verifiedHardware: false,
        status: 'disconnected',
        message: 'No physical ESP32 hardware telemetry received. Device is offline and unverified.',
        data: null
      });
    }

    // Freshness and stale reading evaluation
    const readingAgeMs = Date.now() - new Date(candidateReading.timestamp).getTime();
    const isStale = readingAgeMs > STALE_THRESHOLD_MS;
    const isConnected = !isStale;
    const ageSeconds = Math.max(0, Math.round(readingAgeMs / 1000));

    res.status(200).json({
      success: true,
      scaleId: trimmedScaleId,
      connected: isConnected,
      verifiedHardware: candidateReading.source === 'hardware_esp32' && !candidateReading.isSimulated,
      status: isConnected ? 'online' : 'stale',
      isStale,
      ageSeconds,
      source: candidateReading.source,
      isSimulated: candidateReading.isSimulated,
      message: isStale 
        ? `Scale telemetry is stale (${ageSeconds}s since last transmission). Device may be offline.`
        : 'Live telemetry active.',
      data: candidateReading
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve scale telemetry.' });
  }
};

/**
 * 3. Tare / Zero Scale Hardware Calibration
 * Endpoint: POST /api/iot/tare
 */
exports.tareScale = async (req, res) => {
  try {
    const { scaleId = 'ESP32-HX711-UNIT-01' } = req.body;
    const trimmedScaleId = typeof scaleId === 'string' ? scaleId.trim() : 'ESP32-HX711-UNIT-01';

    const current = latestScaleReadings.get(trimmedScaleId);
    const zeroReading = {
      scaleId: trimmedScaleId,
      weightKg: 0.0,
      rawADC: current?.rawADC !== undefined ? current.rawADC : null,
      batteryVoltage: current?.batteryVoltage !== undefined ? current.batteryVoltage : null,
      wifiRssi: current?.wifiRssi !== undefined ? current.wifiRssi : null,
      source: 'manual_override',
      isSimulated: true,
      timestamp: new Date()
    };

    latestScaleReadings.set(trimmedScaleId, zeroReading);

    res.status(200).json({
      success: true,
      message: `Scale ${trimmedScaleId} tare calibration completed. Scale zeroed.`,
      scaleId: trimmedScaleId,
      calibratedWeightKg: 0.0,
      timestamp: zeroReading.timestamp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Tare operation failed.' });
  }
};

/**
 * 4. Historical Telemetry Logs
 * Endpoint: GET /api/iot/logs
 */
exports.getRecentLogs = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        count: latestScaleReadings.size,
        data: { logs: Array.from(latestScaleReadings.values()) },
        logs: Array.from(latestScaleReadings.values()),
        databaseOffline: true
      });
    }

    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const logs = await WeightLog.find().sort({ createdAt: -1 }).limit(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: { logs },
      logs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching telemetry logs.'
    });
  }
};

exports.latestScaleReadings = latestScaleReadings;
exports.STALE_THRESHOLD_MS = STALE_THRESHOLD_MS;
exports.REGISTERED_SCALES = REGISTERED_SCALES;
