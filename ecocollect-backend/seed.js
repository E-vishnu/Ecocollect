const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Pickup = require('./models/Pickup');
const { calculatePricing } = require('./utils/pricingEngine');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecocollect';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Pickup.deleteMany({});
    console.log('🧹 Purged existing records.');

    // Known testing password for all demo accounts
    const DEMO_PASSWORD = 'password123';

    // 1. Create Municipal Admin
    const admin = await User.create({
      name: 'Dr. Aruna Shenoy',
      email: 'admin@ecocollect.in',
      password: DEMO_PASSWORD,
      role: 'admin',
      phone: '+91 98450 00111',
      address: {
        street: 'Municipal Corporation HQ, N.R. Square',
        area: 'Corporation Ward 82',
        city: 'Bengaluru',
        pincode: '560002',
        lat: 12.9716,
        lng: 77.5946
      },
      status: 'active'
    });

    // 2. Create Field Collection Agents
    const agent1 = await User.create({
      name: 'Rahul Varma',
      email: 'rahul.agent@ecocollect.in',
      password: DEMO_PASSWORD,
      role: 'agent',
      phone: '+91 98450 12345',
      address: {
        street: 'Depot 4, 80 Feet Road',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034',
        lat: 12.9352,
        lng: 77.6245
      },
      agentDetails: {
        vehicleNumber: 'KA-01-EQ-1002',
        vehicleType: 'Euler HiLoad EV Trike',
        currentStatus: 'on_route',
        assignedArea: 'Koramangala 4th & 5th Block',
        batteryPercent: 88
      },
      status: 'active'
    });

    const agent2 = await User.create({
      name: 'Suresh Gowda',
      email: 'suresh.agent@ecocollect.in',
      password: DEMO_PASSWORD,
      role: 'agent',
      phone: '+91 98450 67890',
      address: {
        street: 'Depot 7, 100 Feet Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        lat: 12.9784,
        lng: 77.6408
      },
      agentDetails: {
        vehicleNumber: 'KA-03-EV-4421',
        vehicleType: 'Mahindra Zor Grand EV',
        currentStatus: 'available',
        assignedArea: 'Indiranagar Ward 82',
        batteryPercent: 95
      },
      status: 'active'
    });

    // 3. Create Residents
    const resident1 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@gmail.com',
      password: DEMO_PASSWORD,
      role: 'resident',
      phone: '+91 98765 43210',
      address: {
        street: 'Flat 402, Green Glen Residency, Outer Ring Rd',
        area: 'Bellandur',
        city: 'Bengaluru',
        pincode: '560103',
        lat: 12.9279,
        lng: 77.6771
      },
      upiId: 'priya.sharma@okhdfcbank',
      status: 'active'
    });

    const resident2 = await User.create({
      name: 'Ananya Deshmukh',
      email: 'ananya@gmail.com',
      password: DEMO_PASSWORD,
      role: 'resident',
      phone: '+91 98111 22334',
      address: {
        street: 'Villa 14, Palm Meadows',
        area: 'Whitefield',
        city: 'Bengaluru',
        pincode: '560066',
        lat: 12.9698,
        lng: 77.7499
      },
      upiId: 'ananya.d@icici',
      status: 'active'
    });

    const resident3 = await User.create({
      name: 'Vikram Mehta',
      email: 'vikram@gmail.com',
      password: DEMO_PASSWORD,
      role: 'resident',
      phone: '+91 98222 33445',
      address: {
        street: '12th Main, 4th Block',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034',
        lat: 12.9340,
        lng: 77.6200
      },
      upiId: 'vikram.m@paytm',
      status: 'active'
    });

    console.log(' Demo users seeded.');

    // 4. Create Sample Historical & Active Pickups
    // Pickup 1: Plastic recyclables with cashback settled
    const pricing1 = calculatePricing({ category: 'plastic', weightKg: 4.8, isSegregated: true, pickupType: 'routine' });
    await Pickup.create({
      pickupCode: 'ECO-882194',
      residentId: resident1._id,
      residentName: resident1.name,
      residentPhone: resident1.phone,
      residentAddress: resident1.address,
      agentId: agent1._id,
      agentName: agent1.name,
      agentPhone: agent1.phone,
      agentVehicle: agent1.agentDetails.vehicleNumber,
      status: 'completed',
      pickupType: 'routine',
      categoryDeclared: 'plastic',
      categoryVerified: 'plastic',
      scheduledDate: '2026-08-28',
      timeSlot: '09:00 AM - 10:30 AM',
      instructions: 'Bag of washed PET bottles and milk pouches by main gate.',
      weightKg: 4.8,
      scaleIdUsed: 'ESP32-HX711-UNIT-01',
      weightSource: 'iot_loadcell',
      isSegregated: true,
      photoUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
      classifierResult: {
        predictedClass: 'plastic',
        confidence: 0.96,
        probabilities: { plastic: 0.96, dry_recyclable: 0.03, biodegradable: 0.01, e_waste: 0.0, mixed: 0.0 },
        mismatchFlagged: false
      },
      pricing: pricing1,
      paymentStatus: 'payout_settled',
      paymentDetails: {
        paymentMethod: 'UPI_DIRECT_CASHBACK',
        paymentId: 'RZP_PAY_PLASTIC991',
        upiId: resident1.upiId,
        paidAt: new Date()
      }
    });

    // Pickup 2: CNN Mismatch Flagged (Resident declared biodegradable, AI detected plastic packaging)
    const pricing2 = calculatePricing({ category: 'plastic', weightKg: 6.2, isSegregated: false, pickupType: 'routine' });
    await Pickup.create({
      pickupCode: 'ECO-441209',
      residentId: resident2._id,
      residentName: resident2.name,
      residentPhone: resident2.phone,
      residentAddress: resident2.address,
      agentId: agent1._id,
      agentName: agent1.name,
      agentPhone: agent1.phone,
      agentVehicle: agent1.agentDetails.vehicleNumber,
      status: 'verified',
      pickupType: 'routine',
      categoryDeclared: 'biodegradable',
      categoryVerified: 'plastic',
      scheduledDate: '2026-08-28',
      timeSlot: '11:00 AM - 12:30 PM',
      instructions: 'Kitchen waste bin on porch.',
      weightKg: 6.2,
      scaleIdUsed: 'ESP32-HX711-UNIT-01',
      weightSource: 'iot_loadcell',
      isSegregated: false,
      photoUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=600&q=80',
      classifierResult: {
        predictedClass: 'plastic',
        confidence: 0.89,
        probabilities: { plastic: 0.89, biodegradable: 0.08, dry_recyclable: 0.02, e_waste: 0.01, mixed: 0.0 },
        mismatchFlagged: true,
        flagReason: "Resident declared 'biodegradable' but MobileNet CNN detected 'plastic' packaging film with 89% confidence."
      },
      pricing: pricing2,
      paymentStatus: 'pending_resident_pay'
    });

    // Pickup 3: Active In-Route Pickup
    await Pickup.create({
      pickupCode: 'ECO-994312',
      residentId: resident3._id,
      residentName: resident3.name,
      residentPhone: resident3.phone,
      residentAddress: resident3.address,
      agentId: agent1._id,
      agentName: agent1.name,
      agentPhone: agent1.phone,
      agentVehicle: agent1.agentDetails.vehicleNumber,
      status: 'assigned',
      pickupType: 'routine',
      categoryDeclared: 'dry_recyclable',
      scheduledDate: '2026-08-28',
      timeSlot: '02:00 PM - 03:30 PM',
      instructions: 'Cardboard boxes flattened and bundled.'
    });

    console.log(' Sample pickups seeded.');
    console.log('=============================================');
    console.log('🔑 DEMO LOGIN CREDENTIALS:');
    console.log('1. Admin:    admin@ecocollect.in    / password123');
    console.log('2. Agent:    rahul.agent@ecocollect.in / password123');
    console.log('3. Resident: priya@gmail.com        / password123');
    console.log('=============================================');

    await mongoose.disconnect();
    console.log('✨ Seeding complete. Process exited.');
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
