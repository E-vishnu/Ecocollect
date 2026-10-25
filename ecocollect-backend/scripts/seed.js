const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Pickup = require('../models/Pickup');
const WeightLog = require('../models/WeightLog');
const { calculatePricing } = require('../utils/pricingEngine');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecocollect';

async function seedDatabase() {
  try {
    console.log('[EcoCollect Seed] Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    console.log('[EcoCollect Seed] Clearing old sample data...');
    await User.deleteMany({});
    await Pickup.deleteMany({});
    await WeightLog.deleteMany({});

    console.log('[EcoCollect Seed] Creating Demo Users...');
    
    // 1. Admin User
    const admin = await User.create({
      name: 'Dr. Aruna Shenoy (Municipal Admin)',
      email: 'admin@ecocollect.io',
      password: 'Password123!',
      role: 'admin',
      phone: '+91 98800 11223',
      address: {
        street: 'Central Ward Headquarters, MG Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560001'
      }
    });

    // 2. Collection Agents
    const agent1 = await User.create({
      name: 'Rahul Varma (Field Agent)',
      email: 'agent.rahul@ecocollect.io',
      password: 'Password123!',
      role: 'agent',
      phone: '+91 98765 00101',
      address: {
        street: 'Depot 14, 8th Main',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034'
      },
      agentDetails: {
        vehicleNumber: 'KA-01-EQ-7788 (E-Loader)',
        currentStatus: 'available',
        assignedArea: 'Koramangala Sector 4'
      }
    });

    const agent2 = await User.create({
      name: 'Suresh Kumar (Field Agent)',
      email: 'agent.suresh@ecocollect.io',
      password: 'Password123!',
      role: 'agent',
      phone: '+91 98765 00102',
      address: {
        street: 'Depot 21, Ring Road',
        area: 'HSR Layout',
        city: 'Bengaluru',
        pincode: '560102'
      },
      agentDetails: {
        vehicleNumber: 'KA-51-TR-3399 (Solar E-Trike)',
        currentStatus: 'available',
        assignedArea: 'HSR Sector 2'
      }
    });

    // 3. Demo Residents
    const resident1 = await User.create({
      name: 'Priya Sharma',
      email: 'resident.priya@ecocollect.io',
      password: 'Password123!',
      role: 'resident',
      phone: '+91 99887 76655',
      upiId: 'priyasharma@okaxis',
      address: {
        street: 'Apt 4B, Palm Grove Residency, 12th Cross',
        area: 'Koramangala 4th Block',
        city: 'Bengaluru',
        pincode: '560034'
      }
    });

    const resident2 = await User.create({
      name: 'Anand Kulkarni',
      email: 'resident.anand@ecocollect.io',
      password: 'Password123!',
      role: 'resident',
      phone: '+91 97766 55443',
      upiId: 'anandk@okhdfcbank',
      address: {
        street: 'Villa 18, Green Meadows Estate',
        area: 'HSR Layout Sector 2',
        city: 'Bengaluru',
        pincode: '560102'
      }
    });

    console.log('[EcoCollect Seed] Creating Sample Historical Pickups...');

    // Pickup 1: Plastic Recyclables with Buyback Payout (Completed)
    const pricing1 = calculatePricing({
      category: 'plastic',
      weightKg: 4.8,
      isSegregated: true,
      pickupType: 'routine'
    });

    await Pickup.create({
      pickupCode: 'ECO-882190',
      resident: resident1._id,
      agent: agent1._id,
      status: 'completed',
      pickupType: 'routine',
      categoryDeclared: 'plastic',
      categoryVerified: 'plastic',
      scheduledDate: new Date(Date.now() - 86400000 * 2),
      timeSlot: '09:00 - 11:00 AM',
      address: resident1.address,
      instructions: '2 bags of cleaned PET bottles & milk pouches',
      weightKg: 4.8,
      scaleIdUsed: 'ESP32-HX711-UNIT-01',
      weightSource: 'iot_loadcell',
      isSegregated: true,
      classifierResult: {
        predictedClass: 'plastic',
        confidence: 0.97,
        probabilities: { plastic: 0.97, dry_recyclable: 0.02, biodegradable: 0.01, e_waste: 0.00 },
        mismatchFlagged: false
      },
      pricing: pricing1,
      paymentStatus: 'payout_settled',
      paymentDetails: {
        paymentMethod: 'UPI_Instant_Disbursement',
        upiId: resident1.upiId,
        paymentId: 'UPI_REV_98A27B',
        paidAt: new Date(Date.now() - 86400000 * 2 + 3600000)
      }
    });

    // Pickup 2: Flagged Mismatch (Declared Biodegradable, but CNN detected Plastic)
    const pricing2 = calculatePricing({
      category: 'plastic',
      weightKg: 6.2,
      isSegregated: false, // Penalty factor applied
      pickupType: 'routine'
    });

    await Pickup.create({
      pickupCode: 'ECO-773412',
      resident: resident2._id,
      agent: agent1._id,
      status: 'verified', // held for admin review
      pickupType: 'routine',
      categoryDeclared: 'biodegradable',
      categoryVerified: 'plastic',
      scheduledDate: new Date(),
      timeSlot: '11:00 - 01:00 PM',
      address: resident2.address,
      instructions: 'Organic kitchen waste bin',
      weightKg: 6.2,
      scaleIdUsed: 'ESP32-HX711-UNIT-01',
      weightSource: 'iot_loadcell',
      isSegregated: false,
      classifierResult: {
        predictedClass: 'plastic',
        confidence: 0.93,
        probabilities: { plastic: 0.93, biodegradable: 0.04, dry_recyclable: 0.02, e_waste: 0.01 },
        mismatchFlagged: true,
        flagReason: 'Declared as "biodegradable" but CNN classifier detected "plastic" (93.0% confidence)'
      },
      pricing: pricing2,
      paymentStatus: 'unbilled'
    });

    // Pickup 3: Assigned Live Pickup in Progress
    await Pickup.create({
      pickupCode: 'ECO-994102',
      resident: resident1._id,
      agent: agent1._id,
      status: 'assigned',
      pickupType: 'e_waste_special',
      categoryDeclared: 'e_waste',
      categoryVerified: 'e_waste',
      scheduledDate: new Date(),
      timeSlot: '02:00 - 04:00 PM',
      address: resident1.address,
      instructions: 'Old laptop motherboard, broken chargers, and dead AA batteries',
      weightKg: 0,
      paymentStatus: 'unbilled'
    });

    // Log sample sensor reading
    await WeightLog.create({
      scaleId: 'ESP32-HX711-UNIT-01',
      weightKg: 4.80,
      rawAdcValue: 412980,
      batteryVoltage: 4.12,
      wifiRssi: -58,
      timestamp: new Date()
    });

    console.log('----------------------------------------------------');
    console.log('✅ EcoCollect Database Seeded Successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Login Credentials:');
    console.log('  👑 Admin:    admin@ecocollect.io          / Password123!');
    console.log('  🚚 Agent:    agent.rahul@ecocollect.io    / Password123!');
    console.log('  🏡 Resident: resident.priya@ecocollect.io / Password123!');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[EcoCollect Seed Error]', err);
    process.exit(1);
  }
}

seedDatabase();
