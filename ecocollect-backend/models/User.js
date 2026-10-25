const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['resident', 'agent', 'admin'],
      default: 'resident'
    },
    phone: {
      type: String,
      required: [true, 'Please provide phone number']
    },
    address: {
      street: { type: String, default: '12th Main Road' },
      area: { type: String, default: 'Koramangala 4th Block' },
      city: { type: String, default: 'Bengaluru' },
      pincode: { type: String, default: '560034' },
      lat: { type: Number, default: 12.9340 },
      lng: { type: Number, default: 77.6200 }
    },
    upiId: {
      type: String,
      trim: true,
      default: 'resident@okaxis'
    },
    agentDetails: {
      vehicleNumber: { type: String, default: 'KA-01-EQ-7788' },
      vehicleType: { type: String, default: 'Electric Cargo Trike' },
      currentStatus: {
        type: String,
        enum: ['available', 'on_route', 'offline'],
        default: 'available'
      },
      assignedArea: { type: String, default: 'Koramangala Sector 4' },
      batteryPercent: { type: Number, default: 92 }
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
