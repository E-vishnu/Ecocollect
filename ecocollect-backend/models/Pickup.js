const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema(
  {
    pickupCode: {
      type: String,
      required: true,
      unique: true,
      default: () => 'ECO-' + Math.floor(100000 + Math.random() * 900000)
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    residentName: { type: String, required: true },
    residentPhone: { type: String, required: true },
    residentAddress: {
      street: String,
      area: String,
      city: String,
      pincode: String,
      lat: Number,
      lng: Number
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    agentName: String,
    agentPhone: String,
    agentVehicle: String,
    status: {
      type: String,
      enum: ['requested', 'assigned', 'collected', 'verified', 'priced', 'completed', 'cancelled'],
      default: 'requested'
    },
    pickupType: {
      type: String,
      enum: ['routine', 'bulk', 'commercial', 'e_waste_special', 'off_schedule'],
      default: 'routine'
    },
    categoryDeclared: {
      type: String,
      enum: ['biodegradable', 'dry_recyclable', 'plastic', 'e_waste', 'mixed'],
      required: true
    },
    categoryVerified: {
      type: String,
      enum: ['biodegradable', 'dry_recyclable', 'plastic', 'e_waste', 'mixed']
    },
    scheduledDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    instructions: { type: String, default: '' },
    
    // IoT Hardware scale reading
    weightKg: { type: Number, default: 0 },
    scaleIdUsed: { type: String, default: 'ESP32-HX711-UNIT-01' },
    weightSource: {
      type: String,
      enum: ['iot_loadcell', 'hardware_esp32', 'simulator', 'manual_override'],
      default: 'iot_loadcell'
    },
    isSegregated: { type: Boolean, default: true },
    photoUrl: String,
    
    // AI MobileNet CNN result
    classifierResult: {
      predictedClass: String,
      confidence: Number,
      probabilities: mongoose.Schema.Types.Mixed,
      mismatchFlagged: { type: Boolean, default: false },
      flagReason: String,
      analyzedAt: Date
    },

    // Dynamic Pricing & Cashback Breakdown
    pricing: {
      totalWeight: Number,
      segregationFactor: Number,
      serviceFee: Number,
      baseRates: [
        {
          category: String,
          weightKg: Number,
          ratePerKg: Number,
          subtotal: Number
        }
      ],
      processingFeeTotal: Number,
      recyclablesPayoutBreakdown: [
        {
          category: String,
          weightKg: Number,
          resaleRatePerKg: Number,
          subtotalPayout: Number
        }
      ],
      recyclablePayoutTotal: Number,
      netAmount: Number,
      isPayout: Boolean,
      settlementAmount: Number,
      summaryText: String
    },

    paymentStatus: {
      type: String,
      enum: [
        'unbilled',
        'free_routine',
        'pending_resident_pay',
        'paid_by_resident',
        'pending_agent_payout',
        'payout_settled'
      ],
      default: 'unbilled'
    },
    paymentDetails: {
      paymentMethod: String,
      paymentId: String,
      upiId: String,
      paidAt: Date
    },

    // Admin Mismatch Resolution
    adminReview: {
      reviewedBy: String,
      reviewedAt: Date,
      mismatchResolved: Boolean,
      originalDeclared: String,
      approvedCategory: String,
      adminNotes: String,
      adjustedSegregationFactor: Number
    },

    timestamps: {
      requestedAt: { type: Date, default: Date.now },
      assignedAt: Date,
      enRouteAt: Date,
      collectedAt: Date,
      verifiedAt: Date,
      completedAt: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pickup', pickupSchema);
