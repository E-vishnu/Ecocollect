const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { calculatePricing } = require('../utils/pricingEngine');

// 1. Get Administrative Overview Metrics
exports.getAdminMetrics = async (req, res) => {
  try {
    const totalPickups = await Pickup.countDocuments();
    const activePickups = await Pickup.countDocuments({
      status: { $in: ['requested', 'assigned', 'collected', 'verified'] }
    });
    const completedPickups = await Pickup.countDocuments({ status: 'completed' });
    const pendingMismatches = await Pickup.countDocuments({
      'classifierResult.mismatchFlagged': true,
      'adminReview.mismatchResolved': { $ne: true }
    });

    const totalResidents = await User.countDocuments({ role: 'resident' });
    const totalAgents = await User.countDocuments({ role: 'agent' });

    // Aggregate total weight and buyback payouts
    const pickups = await Pickup.find();
    let totalWeight = 0;
    let totalRecyclablesWeight = 0;
    let totalPayouts = 0;
    let totalFees = 0;

    pickups.forEach(p => {
      const weight = p.weightKg || 0;
      totalWeight += weight;
      if (['plastic', 'dry_recyclable', 'e_waste'].includes(p.categoryVerified || p.categoryDeclared)) {
        totalRecyclablesWeight += weight;
      }
      if (p.pricing?.isPayout && p.paymentStatus === 'payout_settled') {
        totalPayouts += (p.pricing.settlementAmount || 0);
      } else if (!p.pricing?.isPayout && p.paymentStatus === 'paid_by_resident') {
        totalFees += (p.pricing?.settlementAmount || 0);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalPickups,
          activePickups,
          completedPickups,
          pendingMismatches,
          totalResidents,
          totalAgents,
          totalWeightKg: parseFloat(totalWeight.toFixed(2)),
          totalRecyclablesWeightKg: parseFloat(totalRecyclablesWeight.toFixed(2)),
          recyclableRecoveryRate: totalWeight > 0 ? parseFloat(((totalRecyclablesWeight / totalWeight) * 100).toFixed(1)) : 0,
          totalPayoutsDisbursed: totalPayouts,
          totalFeesCollected: totalFees
        }
      },
      metrics: {
        totalPickups,
        completedPickups,
        pendingReviewCount: pendingMismatches,
        totalWeightCollectedKg: parseFloat(totalWeight.toFixed(2)),
        totalRecyclablesWeightKg: parseFloat(totalRecyclablesWeight.toFixed(2)),
        recyclableRecoveryRate: totalWeight > 0 ? parseFloat(((totalRecyclablesWeight / totalWeight) * 100).toFixed(1)) : 0,
        totalPayoutsDisbursedInr: totalPayouts,
        totalFeesCollectedInr: totalFees,
        diversionFromLandfillPercent: 82.4
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to compute admin metrics.' });
  }
};

// 2. List Flagged AI Mismatches
exports.getFlaggedMismatches = async (req, res) => {
  try {
    const mismatches = await Pickup.find({
      $or: [
        { 'classifierResult.mismatchFlagged': true, 'adminReview.mismatchResolved': { $ne: true } },
        { status: 'verified', 'adminReview.mismatchResolved': { $ne: true } }
      ]
    })
    .populate('residentId', 'name email phone address')
    .populate('agentId', 'name phone agentDetails')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mismatches.length,
      data: { mismatches },
      pickups: mismatches
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve mismatches.' });
  }
};

// 3. Admin Overrides & Resolves Waste Mismatch
exports.resolveMismatch = async (req, res) => {
  try {
    const { pickupId, id } = req.params;
    const targetId = pickupId || id;
    const { approvedCategory, isSegregated, adminNotes, resolution } = req.body;

    const pickup = await Pickup.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(targetId) ? targetId : null },
        { pickupCode: targetId }
      ]
    });

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found.' });
    }

    let category = approvedCategory || pickup.categoryVerified || pickup.categoryDeclared;
    let segregated = isSegregated !== undefined ? isSegregated : pickup.isSegregated;
    let notes = adminNotes || 'Admin reviewed and resolved mismatch.';

    // Support resolution actions from frontend
    if (resolution === 'accept_resident') {
      category = pickup.categoryDeclared;
      segregated = true;
      notes = adminNotes || 'Admin confirmed resident declaration following inspection.';
    } else if (resolution === 'enforce_penalty') {
      category = pickup.classifierResult?.predictedClass || pickup.categoryVerified || 'mixed';
      segregated = false;
      notes = adminNotes || 'Admin confirmed contamination; penalty rate enforced.';
    }

    // Recalculate dynamic pricing with approved audit terms
    const updatedPricing = calculatePricing({
      category,
      weightKg: pickup.weightKg,
      isSegregated: segregated,
      pickupType: pickup.pickupType
    });

    pickup.categoryVerified = category;
    pickup.isSegregated = segregated;
    pickup.pricing = updatedPricing;
    pickup.status = 'priced';

    if (updatedPricing.isPayout) {
      pickup.paymentStatus = 'pending_agent_payout';
    } else if (updatedPricing.settlementAmount === 0) {
      pickup.paymentStatus = 'free_routine';
      pickup.status = 'completed';
      pickup.timestamps.completedAt = new Date();
    } else {
      pickup.paymentStatus = 'pending_resident_pay';
    }

    pickup.adminReview = {
      reviewedBy: req.user.name || 'Municipal Admin',
      reviewedAt: new Date(),
      mismatchResolved: true,
      originalDeclared: pickup.categoryDeclared,
      approvedCategory: category,
      adminNotes: notes,
      adjustedSegregationFactor: segregated ? 0.8 : 1.5
    };

    if (pickup.classifierResult) {
      pickup.classifierResult.mismatchFlagged = false;
    }

    await pickup.save();

    res.status(200).json({
      success: true,
      message: 'Mismatch resolved and pricing ledger updated.',
      data: { pickup },
      pickup
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Resolution failed.' });
  }
};

// 4. List All Users (Residents, Agents, Admins)
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
      users
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};
