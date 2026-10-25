const express = require('express');
const router = express.Router();
const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { protect, authorize } = require('./auth');

// In-memory store for active agent locations
// Key: agentId, Value: { lat, lng, speed, heading, accuracy, updatedAt, activePickupId, vehicleNumber }
const activeAgentLocations = new Map();

// Helper to check if an agent has an actively assigned pickup
async function getActivePickupForAgent(agentId) {
  return await Pickup.findOne({
    agent: agentId,
    status: { $in: ['assigned', 'collected', 'verified'] }
  }).populate('resident', 'name address coordinates');
}

/**
 * @route   POST /api/tracking/agent-location
 * @desc    Agent mobile app sends periodic GPS location updates
 * @access  Agent only
 */
router.post('/agent-location', protect, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { lat, lng, speed = 0, heading = 0, accuracy = 5, pickupId } = req.body;
    const agentId = req.user._id.toString();

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    // Verify if agent currently has an active pickup assigned (Privacy enforcement)
    let activePickup = null;
    if (pickupId) {
      activePickup = await Pickup.findOne({
        _id: pickupId,
        agent: agentId,
        status: { $in: ['assigned', 'collected', 'verified'] }
      });
    } else {
      activePickup = await getActivePickupForAgent(agentId);
    }

    const hasActiveAssignment = !!activePickup;

    const locationData = {
      agentId,
      agentName: req.user.name,
      vehicleNumber: req.user.agentDetails?.vehicleNumber || 'KA-01-EQ-7788',
      coordinates: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      speed: parseFloat(speed) || 0,
      heading: parseFloat(heading) || 0,
      accuracy: parseFloat(accuracy) || 5,
      updatedAt: new Date(),
      activePickupId: activePickup ? activePickup._id : null,
      pickupStatus: activePickup ? activePickup.status : null,
      isTrackingShared: hasActiveAssignment // Privacy flag: only broadcasted to resident when pickup is active
    };

    activeAgentLocations.set(agentId, locationData);

    res.json({
      success: true,
      message: hasActiveAssignment 
        ? 'Location updated and shared with active pickup resident' 
        : 'Location recorded privately (No active pickup assigned - location hidden from residents)',
      data: locationData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/tracking/pickup/:pickupId
 * @desc    Resident or Admin gets dynamic tracking & agent location for a specific pickup
 * @access  Resident (own pickup) or Admin
 */
router.get('/pickup/:pickupId', protect, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.pickupId)
      .populate('agent', 'name phone agentDetails')
      .populate('resident', 'name address phone');

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    // Access check: Only resident of this pickup, assigned agent, or admin can access
    const isResident = req.user.role === 'resident' && pickup.resident._id.toString() === req.user._id.toString();
    const isAssignedAgent = req.user.role === 'agent' && pickup.agent && pickup.agent._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isResident && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view tracking for this pickup' });
    }

    // Privacy rule: Only share agent location if pickup is actively assigned or en route
    const isActivelyAssigned = ['assigned', 'collected', 'verified'].includes(pickup.status);
    let agentLocation = null;

    if (isActivelyAssigned && pickup.agent) {
      const liveData = activeAgentLocations.get(pickup.agent._id.toString());
      if (liveData) {
        // Obfuscate slightly or provide approximate location for resident privacy if desired
        agentLocation = {
          lat: liveData.coordinates.lat,
          lng: liveData.coordinates.lng,
          heading: liveData.heading,
          speed: liveData.speed,
          updatedAt: liveData.updatedAt,
          vehicleNumber: liveData.vehicleNumber
        };
      } else {
        // Default agent starting point near Bangalore center/depot
        agentLocation = {
          lat: 12.9345,
          lng: 77.6189,
          heading: 45,
          speed: 18.5,
          updatedAt: new Date(),
          vehicleNumber: pickup.agent.agentDetails?.vehicleNumber || 'KA-01-EQ-7788'
        };
      }
    }

    res.json({
      success: true,
      pickup: {
        id: pickup._id,
        pickupCode: pickup.pickupCode,
        status: pickup.status,
        categoryDeclared: pickup.categoryDeclared,
        categoryVerified: pickup.categoryVerified,
        scheduledDate: pickup.scheduledDate,
        timeSlot: pickup.timeSlot,
        address: pickup.address,
        weightKg: pickup.weightKg,
        pricing: pickup.pricing,
        paymentStatus: pickup.paymentStatus,
        timestamps: pickup.timestamps
      },
      agent: pickup.agent ? {
        id: pickup.agent._id,
        name: pickup.agent.name,
        phone: pickup.agent.phone,
        vehicleNumber: pickup.agent.agentDetails?.vehicleNumber
      } : null,
      tracking: {
        isLive: isActivelyAssigned && !!agentLocation,
        privacyMode: !isActivelyAssigned ? 'SHIELDED_INACTIVE' : 'ACTIVE_BROADCAST',
        agentLocation,
        residentDestination: {
          street: pickup.address?.street || 'Flat 402, Green Valley Apts',
          area: pickup.address?.area || 'Koramangala 4th Block',
          lat: 12.9352,
          lng: 77.6245
        },
        estimatedEtaMinutes: isActivelyAssigned ? 8 : null,
        distanceRemainingKm: isActivelyAssigned ? 1.4 : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/tracking/all-agents
 * @desc    Admin fleet view: get all agent live locations and active assignments
 * @access  Admin only
 */
router.get('/all-agents', protect, authorize('admin'), async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('-password');
    
    const fleetStatus = agents.map(agent => {
      const live = activeAgentLocations.get(agent._id.toString());
      return {
        agentId: agent._id,
        name: agent.name,
        phone: agent.phone,
        vehicleNumber: agent.agentDetails?.vehicleNumber || 'KA-01-EQ-7788',
        status: agent.agentDetails?.currentStatus || 'available',
        assignedArea: agent.agentDetails?.assignedArea || 'Koramangala',
        liveLocation: live ? {
          lat: live.coordinates.lat,
          lng: live.coordinates.lng,
          speed: live.speed,
          heading: live.heading,
          updatedAt: live.updatedAt,
          activePickupId: live.activePickupId,
          isTrackingShared: live.isTrackingShared
        } : {
          lat: 12.9345,
          lng: 77.6189,
          speed: 0,
          heading: 0,
          updatedAt: new Date(),
          activePickupId: null,
          isTrackingShared: false
        }
      };
    });

    res.json({
      success: true,
      count: fleetStatus.length,
      fleet: fleetStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = {
  router,
  activeAgentLocations
};
