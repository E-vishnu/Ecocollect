const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema(
  {
    scaleId: {
      type: String,
      required: true,
      index: true
    },
    pickupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pickup'
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    weightKg: {
      type: Number,
      required: true
    },
    rawADC: {
      type: Number
    },
    batteryVoltage: {
      type: Number
      // Intentionally no default: never invent fake voltage when missing
    },
    wifiRssi: {
      type: Number
      // Intentionally no default: never invent fake signal strength when missing
    },
    source: {
      type: String,
      enum: ['hardware_esp32', 'simulator', 'manual_override'],
      default: 'hardware_esp32'
    },
    isSimulated: {
      type: Boolean,
      default: false
    },
    packetId: {
      type: String,
      index: true
    },
    deviceTimestamp: {
      type: Date
    },
    tareOffset: {
      type: Number
    },
    calibrationFactor: {
      type: Number,
      default: 2280.0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WeightLog', weightLogSchema);
