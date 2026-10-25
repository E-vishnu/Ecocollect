const mongoose = require('mongoose');
const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { calculatePricing } = require('../utils/pricingEngine');

const VALID_CATEGORIES = ['biodegradable', 'dry_recyclable', 'plastic', 'e_waste', 'mixed'];
const VALID_PICKUP_TYPES = ['routine', 'bulk', 'commercial', 'e_waste_special', 'off_schedule'];
const VALID_STATUSES = ['requested', 'assigned', 'collected', 'verified', 'priced', 'completed', 'cancelled'];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. Resident: Request Doorstep Pickup
exports.createPickup = async (req, res) => {
  try {
    const { categoryDeclared, pickupType = 'routine', scheduledDate, timeSlot, instructions, customAddress } = req.body;

    if (!categoryDeclared || !VALID_CATEGORIES.includes(categoryDeclared)) {
      return res.status(400).json({
        success: false,
        message: `Valid waste category is required. Supported categories: ${VALID_CATEGORIES.join(', ')}.`
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required for pickup request.'
      });
    }

    if (pickupType && !VALID_PICKUP_TYPES.includes(pickupType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid pickup type. Supported types: ${VALID_PICKUP_TYPES.join(', ')}.`
      });
    }

    const userId = req.user.id || req.user._id;
    const resident = await User.findById(userId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident account not found.' });
    }

    const address = customAddress || resident.address;

    // Auto-assign available agent if any exists in area
    const availableAgent = await User.findOne({
      role: 'agent',
      status: 'active'
    });

    const newPickup = await Pickup.create({
      residentId: resident._id,
      residentName: resident.name,
      residentPhone: resident.phone,
      residentAddress: address,
      agentId: availableAgent ? availableAgent._id : undefined,
      agentName: availableAgent ? availableAgent.name : 'Awaiting Assignment',
      agentPhone: availableAgent ? availableAgent.phone : '+91 98450 12345',
      agentVehicle: availableAgent?.agentDetails?.vehicleNumber || 'KA-01-EQ-1002',
      status: availableAgent ? 'assigned' : 'requested',
      pickupType,
      categoryDeclared,
      categoryVerified: categoryDeclared,
      scheduledDate,
      timeSlot: timeSlot || '09:00 - 11:00 AM',
      instructions: instructions || '',
      timestamps: {
        requestedAt: new Date(),
        assignedAt: availableAgent ? new Date() : undefined
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pickup requested successfully.',
      data: { pickup: newPickup },
      pickup: newPickup
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Error creating pickup request.'
    });
  }
};

// 2. Get All Pickups (Role-Filtered)
exports.getPickups = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    let filter = {};

    if (req.user.role === 'resident') {
      filter.residentId = userId;
    } else if (req.user.role === 'agent') {
      filter.$or = [{ agentId: userId }, { status: 'requested' }];
    }
    // Admin sees all

    const { status, pickupType } = req.query;
    if (status) filter.status = status;
    if (pickupType) filter.pickupType = pickupType;

    const pickups = await Pickup.find(filter)
      .populate('residentId', 'name phone address upiId')
      .populate('agentId', 'name phone agentDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pickups.length,
      data: { pickups },
      pickups
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pickups.'
    });
  }
};

// 3. Get Single Pickup Details
exports.getPickupById = async (req, res) => {
  try {
    const { id } = req.params;
    let query = {};
    if (isValidObjectId(id)) {
      query = { _id: id };
    } else {
      query = { pickupCode: id };
    }

    const pickup = await Pickup.findOne(query)
      .populate('residentId', 'name email phone address upiId')
      .populate('agentId', 'name email phone agentDetails');

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found.' });
    }

    // Role-based authorization & private record isolation
    const userId = (req.user.id || req.user._id).toString();
    const residentId = (pickup.residentId?._id || pickup.residentId || '').toString();
    const agentId = (pickup.agentId?._id || pickup.agentId || '').toString();

    if (req.user.role === 'resident' && residentId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view private records of other residents.' });
    }

    if (req.user.role === 'agent' && agentId && agentId !== userId && pickup.status !== 'requested') {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this pickup.' });
    }

    res.status(200).json({
      success: true,
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pickup.'
    });
  }
};

// 4. Update Pickup Status (PUT /api/pickups/:id/status)
exports.updatePickupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, agentId } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required. Allowed values: ${VALID_STATUSES.join(', ')}.`
      });
    }

    const query = isValidObjectId(id) ? { _id: id } : { pickupCode: id };
    const pickup = await Pickup.findOne(query);

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found.' });
    }

    // Authorization checks
    const userId = (req.user.id || req.user._id).toString();
    const residentId = (pickup.residentId?._id || pickup.residentId || '').toString();

    if (req.user.role === 'resident') {
      // Residents can only cancel their own non-completed pickups
      if (residentId !== userId || status !== 'cancelled' || pickup.status === 'completed') {
        return res.status(403).json({ success: false, message: 'Residents are only authorized to cancel their own active pickups.' });
      }
    }

    // Update status and appropriate timestamp
    pickup.status = status;
    if (notes) pickup.instructions = (pickup.instructions ? pickup.instructions + ' | ' : '') + notes;

    if (status === 'assigned') {
      const targetAgentId = agentId || (req.user.role === 'agent' ? userId : null);
      if (targetAgentId) {
        const agent = await User.findById(targetAgentId);
        if (agent) {
          pickup.agentId = agent._id;
          pickup.agentName = agent.name;
          pickup.agentPhone = agent.phone;
          pickup.agentVehicle = agent.agentDetails?.vehicleNumber || 'KA-01-EQ-1002';
        }
      }
      pickup.timestamps.assignedAt = new Date();
    } else if (status === 'collected') {
      pickup.timestamps.collectedAt = new Date();
    } else if (status === 'completed') {
      pickup.timestamps.completedAt = new Date();
    }

    await pickup.save();

    res.status(200).json({
      success: true,
      message: `Pickup status updated to '${status}'.`,
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update pickup status.' });
  }
};

// 5. Agent: Weigh, Photograph & Verify Collection
exports.verifyAndWeighPickup = async (req, res) => {
  try {
    const { pickupId, id } = req.params;
    const targetId = pickupId || id;

    if (!targetId || (!isValidObjectId(targetId) && !targetId.startsWith('ECO-'))) {
      return res.status(400).json({ success: false, message: 'Invalid pickup identifier.' });
    }

    const query = isValidObjectId(targetId) ? { _id: targetId } : { pickupCode: targetId };
    const pickup = await Pickup.findOne(query);

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup record not found.' });
    }

    const { 
      weightKg, 
      scaleIdUsed, 
      weightSource, 
      photoUrl, 
      wastePhotoUrl,
      simulatedCnnPrediction, 
      cnnCategory,
      cnnConfidence,
      mismatchFlagged: explicitMismatchFlagged,
      isSegregated, 
      agentDeclaredCategory 
    } = req.body;

    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 500) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weight value. Weight must be a number between 0 and 500 kg.'
      });
    }

    const segregatedStatus = isSegregated !== undefined ? Boolean(isSegregated) : true;
    const categoryToEvaluate = agentDeclaredCategory || cnnCategory || simulatedCnnPrediction?.predictedClass || pickup.categoryDeclared;

    // AI Classification Verification
    const predictedClass = cnnCategory || simulatedCnnPrediction?.predictedClass || categoryToEvaluate;
    const confidence = cnnConfidence !== undefined ? cnnConfidence : (simulatedCnnPrediction?.confidence || 0.94);
    const isMismatch = explicitMismatchFlagged !== undefined 
      ? Boolean(explicitMismatchFlagged)
      : (predictedClass !== pickup.categoryDeclared && confidence > 0.80);

    const classifierResult = {
      predictedClass,
      confidence,
      probabilities: simulatedCnnPrediction?.probabilities || {
        [predictedClass]: confidence,
        [pickup.categoryDeclared]: isMismatch ? 0.05 : confidence
      },
      mismatchFlagged: isMismatch,
      flagReason: isMismatch 
        ? `Declared as '${pickup.categoryDeclared}' but CNN detected '${predictedClass}' with ${(confidence * 100).toFixed(0)}% confidence.` 
        : undefined,
      analyzedAt: new Date()
    };

    // Calculate dynamic pricing based on verified parameters
    const pricing = calculatePricing({
      category: isMismatch ? predictedClass : pickup.categoryDeclared,
      weightKg: parsedWeight,
      isSegregated: segregatedStatus && !isMismatch,
      pickupType: pickup.pickupType
    });

    pickup.weightKg = parsedWeight;
    pickup.scaleIdUsed = scaleIdUsed || 'ESP32-HX711-UNIT-01';
    pickup.weightSource = weightSource || 'iot_loadcell';
    pickup.photoUrl = photoUrl || wastePhotoUrl || pickup.photoUrl || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';
    pickup.isSegregated = segregatedStatus && !isMismatch;
    pickup.categoryVerified = predictedClass;
    pickup.classifierResult = classifierResult;
    pickup.pricing = pricing;

    // Status logic: A weight reading alone NEVER marks a pickup as completed (unless free routine zero balance)
    if (isMismatch) {
      pickup.status = 'verified'; // Held for admin review
      pickup.paymentStatus = 'unbilled';
    } else {
      pickup.status = 'priced';
      if (pricing.isPayout) {
        pickup.paymentStatus = 'pending_agent_payout';
      } else if (pricing.settlementAmount === 0 && pickup.pickupType === 'routine') {
        pickup.paymentStatus = 'free_routine';
        pickup.status = 'completed';
        pickup.timestamps.completedAt = new Date();
      } else {
        pickup.paymentStatus = 'pending_resident_pay';
      }
    }

    pickup.timestamps.collectedAt = new Date();
    pickup.timestamps.verifiedAt = new Date();

    await pickup.save();

    res.status(200).json({
      success: true,
      message: isMismatch 
        ? 'Pickup logged with category mismatch flagged for Admin audit.' 
        : 'Pickup verified and priced successfully.',
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to verify pickup.'
    });
  }
};

// 6. Assign Agent to Pickup
exports.assignAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const targetAgentId = agentId || (req.user.role === 'agent' ? req.user._id : null);

    if (!targetAgentId) {
      return res.status(400).json({ success: false, message: 'Please specify an agent to assign.' });
    }

    const query = isValidObjectId(id) ? { _id: id } : { pickupCode: id };
    const pickup = await Pickup.findOne(query);

    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found.' });

    const agent = await User.findById(targetAgentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({ success: false, message: 'Invalid collection agent specified.' });
    }

    pickup.agentId = agent._id;
    pickup.agentName = agent.name;
    pickup.agentPhone = agent.phone;
    pickup.agentVehicle = agent.agentDetails?.vehicleNumber || 'KA-01-EQ-1002';
    pickup.status = 'assigned';
    pickup.timestamps.assignedAt = new Date();

    await pickup.save();

    res.status(200).json({
      success: true,
      message: 'Agent successfully assigned.',
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to assign agent.' });
  }
};

// 7. Confirm Collection (Agent field completion)
exports.confirmCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isValidObjectId(id) ? { _id: id } : { pickupCode: id };
    const pickup = await Pickup.findOne(query);

    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found.' });

    pickup.status = 'completed';
    pickup.timestamps.completedAt = new Date();
    await pickup.save();

    res.status(200).json({
      success: true,
      message: 'Collection cycle confirmed as completed.',
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to confirm collection.' });
  }
};

// 8. Settle Payment / Payout
exports.settlePayment = async (req, res) => {
  try {
    const { pickupId, id } = req.params;
    const targetId = pickupId || id;
    const { paymentMethod, upiId, txnId, isPayout } = req.body;

    const query = isValidObjectId(targetId) ? { _id: targetId } : { pickupCode: targetId };
    const pickup = await Pickup.findOne(query);

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found.' });
    }

    // Duplicate settlement protection
    if (['paid_by_resident', 'payout_settled'].includes(pickup.paymentStatus) && pickup.status === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Payment or payout has already been finalized for this pickup.'
      });
    }

    const assignedPaymentId = txnId || ('ECO_TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase());
    const shouldPayout = isPayout !== undefined ? Boolean(isPayout) : (pickup.pricing?.isPayout ?? false);

    if (shouldPayout) {
      pickup.paymentStatus = 'payout_settled';
      pickup.paymentDetails = {
        paymentMethod: 'UPI_DIRECT_CASHBACK',
        paymentId: assignedPaymentId,
        upiId: upiId || pickup.residentPhone + '@upi',
        paidAt: new Date()
      };
    } else {
      pickup.paymentStatus = 'paid_by_resident';
      pickup.paymentDetails = {
        paymentMethod: paymentMethod || 'RAZORPAY_GATEWAY',
        paymentId: assignedPaymentId,
        upiId: upiId || 'resident@okaxis',
        paidAt: new Date()
      };
    }

    pickup.status = 'completed';
    pickup.timestamps.completedAt = new Date();

    await pickup.save();

    res.status(200).json({
      success: true,
      message: 'Payment settled successfully.',
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Payment settlement failed.'
    });
  }
};
