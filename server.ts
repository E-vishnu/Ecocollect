import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import { 
  INITIAL_USERS, 
  INITIAL_PICKUPS, 
  INITIAL_WEIGHT_LOGS, 
  INITIAL_NOTIFICATIONS, 
  WASTE_CATEGORIES_REGISTRY,
  BASE_PROCESSING_RATES,
  RECYCLABLE_BUYBACK_RATES,
  calculateDynamicPricing,
  calculateEnvironmentalImpact
} from './src/data/pricingConstants';
import { User, Pickup, WeightLog, AppNotification, WasteCategory, PickupStatus } from './src/types';

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ecocollect_jwt_secret_2026_super_secure';

// Initial passwords for development/demo accounts (securely hashed with bcrypt)
const INITIAL_PASSWORDS: Record<string, string> = {
  usr_res_1: 'Resident@123',
  usr_res_2: 'Rahul@123',
  usr_agent_1: 'Agent@123',
  usr_admin_1: 'Admin@123'
};

// In-Memory Persistent Store (initialized with hashed passwords for all seed accounts)
const db = {
  users: INITIAL_USERS.map(u => ({
    ...u,
    passwordHash: bcrypt.hashSync(INITIAL_PASSWORDS[u.id] || 'EcoCollect@123', 10)
  })) as User[],
  pickups: [...INITIAL_PICKUPS] as Pickup[],
  weightLogs: [...INITIAL_WEIGHT_LOGS] as WeightLog[],
  notifications: [...INITIAL_NOTIFICATIONS] as AppNotification[],
  liveScaleWeight: 4.85
};

function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

// AI Client helper (lazy initialized with aistudio-build header)
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

// Authentication Middleware
interface AuthRequest extends Request {
  user?: User;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: Role };
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account not found or session expired.'
      });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired access token.'
    });
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] permissions.`
      });
    }
    next();
  };
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // ==========================================
  // REST API MODULES
  // ==========================================

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      platform: 'EcoCollect Multi-Waste Platform',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // 2. Auth Module (/api/auth)
  app.post('/api/auth/login', (req, res) => {
    const { email, username, identifier, password, role } = req.body;
    const loginKey = (identifier || email || username || '').trim().toLowerCase();

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/username and password.'
      });
    }

    // Lookup user by email, username, or known demo aliases
    const user = db.users.find(u => {
      const uEmail = u.email.toLowerCase();
      const uName = u.username.toLowerCase();
      if (uEmail === loginKey || uName === loginKey) return true;
      if (u.id === 'usr_res_1' && (loginKey === 'resident@ecocollect.demo' || loginKey === 'resident' || loginKey === 'priya_sharma' || loginKey === 'priya@ecocollect.in')) return true;
      if (u.id === 'usr_res_2' && (loginKey === 'rahul@ecocollect.demo' || loginKey === 'rahul' || loginKey === 'rahul_verma' || loginKey === 'rahul@ecocollect.in')) return true;
      if (u.id === 'usr_agent_1' && (loginKey === 'agent@ecocollect.demo' || loginKey === 'agent' || loginKey === 'rajesh_agent' || loginKey === 'rajesh.agent@ecocollect.in' || loginKey === 'arjun_driver')) return true;
      if (u.id === 'usr_admin_1' && (loginKey === 'admin@ecocollect.demo' || loginKey === 'admin' || loginKey === 'admin_officer' || loginKey === 'admin@ecocollect.in')) return true;
      return false;
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    // Role-based credential verification: Ensure account role matches the selected profile
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'These credentials belong to a different account type.',
        accountRole: user.role,
        expectedRole: role
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  });

  app.post('/api/auth/signup', (req, res) => {
    const { name, email, username, password, role = 'resident', phone, address, upiId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const existing = db.users.find(u => 
      u.email.toLowerCase() === email.trim().toLowerCase() ||
      (username && u.username.toLowerCase() === username.trim().toLowerCase())
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email or username already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser: User = {
      id: `usr_${role}_${Date.now()}`,
      username: username ? username.trim().toLowerCase() : email.split('@')[0].toLowerCase(),
      name: name || 'EcoCollect Resident',
      email: email.trim().toLowerCase(),
      role: role as any,
      passwordHash,
      phone: phone || '+91 98000 00000',
      address: address || {
        street: '12th Main',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        lat: 12.9716,
        lng: 77.6412
      },
      savedAddresses: [
        {
          id: `addr_${Date.now()}`,
          label: 'Home (Default)',
          street: address?.street || '12th Main',
          area: address?.area || 'Indiranagar',
          city: 'Bengaluru',
          pincode: address?.pincode || '560038',
          isDefault: true
        }
      ],
      upiId: upiId || `${email.split('@')[0]}@okbank`,
      rewardPoints: role === 'resident' ? 100 : 0,
      walletBalance: 0,
      agentDetails: role === 'agent' ? {
        agentCode: `AGT-${Math.floor(100 + Math.random() * 900)}`,
        vehicleNumber: 'KA-01-EQ-9988',
        vehicleType: 'EV Cargo Three Wheeler',
        assignedArea: 'Bengaluru East',
        isOnline: true,
        rating: 5.0,
        totalPickupsCompleted: 0,
        todayPickupsCount: 0,
        monthlyEarnings: 0
      } : undefined
    };

    db.users.unshift(newUser);
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: sanitizeUser(newUser) });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    res.json({ success: true, user: sanitizeUser(req.user!) });
  });

  // 3. Waste Registry Module (/api/waste)
  app.get('/api/waste/categories', (req, res) => {
    res.json({
      success: true,
      count: WASTE_CATEGORIES_REGISTRY.length,
      categories: WASTE_CATEGORIES_REGISTRY,
      baseProcessingRates: BASE_PROCESSING_RATES,
      recyclableBuybackRates: RECYCLABLE_BUYBACK_RATES
    });
  });

  // 4. Users Module (/api/users)
  app.get('/api/users', authenticateToken, requireRole('admin'), (req, res) => {
    res.json({ success: true, count: db.users.length, users: db.users });
  });

  app.get('/api/users/:id', authenticateToken, (req: AuthRequest, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  });

  app.put('/api/users/:id', authenticateToken, (req: AuthRequest, res) => {
    const idx = db.users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });
    db.users[idx] = { ...db.users[idx], ...req.body };
    res.json({ success: true, user: db.users[idx] });
  });

  // 5. Agents Module (/api/agents)
  app.get('/api/agents', authenticateToken, (req: AuthRequest, res) => {
    const agents = db.users.filter(u => u.role === 'agent');
    res.json({ success: true, count: agents.length, agents });
  });

  app.put('/api/agents/:id/status', authenticateToken, (req: AuthRequest, res) => {
    const agent = db.users.find(u => u.id === req.params.id && u.role === 'agent');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    if (agent.agentDetails) {
      agent.agentDetails.isOnline = req.body.isOnline !== undefined ? req.body.isOnline : !agent.agentDetails.isOnline;
    }
    res.json({ success: true, agent });
  });

  // 6. Pickups Module (/api/pickups)
  app.get('/api/pickups', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    let filtered = db.pickups;

    if (user.role === 'resident') {
      filtered = db.pickups.filter(p => p.residentId === user.id);
    } else if (user.role === 'agent') {
      // Agent sees their assigned pickups, plus requested pickups in their territory
      filtered = db.pickups.filter(p => p.agentId === user.id || p.status === 'requested' || p.status === 'assigned');
    }
    // Admin sees all

    res.json({ success: true, count: filtered.length, pickups: filtered });
  });

  app.post('/api/pickups', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const body = req.body;
    const category = body.category || 'plastic';
    const pickupType = body.pickupType || 'routine';
    const estWeight = Number(body.weightKg || body.itemDetails?.approxWeight || 3.5);
    const isSegregated = body.isSegregated !== undefined ? body.isSegregated : true;

    // Find available agent to assign
    const availableAgent = db.users.find(u => u.role === 'agent' && u.agentDetails?.isOnline) ||
                           db.users.find(u => u.role === 'agent');

    const pricing = calculateDynamicPricing({
      category,
      pickupType,
      weightKg: estWeight,
      isSegregated
    });

    const newPickupCode = body.pickupCode || 'ECO-' + Math.floor(100000 + Math.random() * 900000);

    const newPickup: Pickup = {
      id: 'pku_' + Date.now(),
      pickupCode: newPickupCode,
      residentId: user.id,
      residentName: body.residentName || user.name,
      residentPhone: body.residentPhone || user.phone,
      residentAddress: body.residentAddress || `${user.address.street}, ${user.address.area}, ${user.address.city}`,
      residentCoordinates: body.residentCoordinates || user.address,
      agentId: availableAgent ? availableAgent.id : undefined,
      agentName: availableAgent ? availableAgent.name : undefined,
      agentPhone: availableAgent ? availableAgent.phone : undefined,
      agentVehicle: availableAgent?.agentDetails?.vehicleNumber || 'KA-01-EQ-1002',
      category,
      categoriesList: body.categoriesList || [category],
      items: body.items,
      itemDetails: body.itemDetails || {},
      pickupType,
      scheduledDate: body.scheduledDate || new Date().toISOString().split('T')[0],
      timeSlot: body.timeSlot || '09:00 AM - 11:00 AM',
      status: availableAgent ? 'assigned' : 'requested',
      isSegregated,
      segregationFactor: isSegregated ? 0.8 : 1.5,
      weightKg: estWeight,
      weightSource: 'pending',
      processingFee: pricing.processingFee,
      recyclablePayout: pricing.recyclablePayout,
      netSettlement: pricing.netSettlement,
      paymentStatus: 'pending',
      mismatchFlagged: false,
      notes: body.notes || '',
      createdAt: new Date().toISOString()
    };

    db.pickups.unshift(newPickup);

    // Create user notification
    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      userId: user.id,
      pickupId: newPickup.id,
      title: 'Pickup Scheduled',
      message: `Your pickup ${newPickup.pickupCode} for ${category.replace('_', ' ')} has been scheduled.`,
      type: 'pickup_update',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.status(201).json({ success: true, pickup: newPickup });
  });

  app.get('/api/pickups/:id', authenticateToken, (req: AuthRequest, res) => {
    const pickup = db.pickups.find(p => p.id === req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });
    
    // Privacy and data security rule: Residents can only access their own pickups
    if (req.user!.role === 'resident' && pickup.residentId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view other residents\' pickup records.'
      });
    }

    res.json({ success: true, pickup });
  });

  // Update pickup status (Lifecycle progression)
  app.put('/api/pickups/:id/status', authenticateToken, requireRole('agent', 'admin'), (req: AuthRequest, res) => {
    const { status, notes, agentId } = req.body;
    const pickup = db.pickups.find(p => p.id === req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    pickup.status = status as PickupStatus;
    if (notes) pickup.notes = notes;
    if (agentId) {
      const agent = db.users.find(u => u.id === agentId);
      if (agent) {
        pickup.agentId = agent.id;
        pickup.agentName = agent.name;
        pickup.agentPhone = agent.phone;
        pickup.agentVehicle = agent.agentDetails?.vehicleNumber || 'KA-01-EQ-1002';
      }
    }

    if (status === 'completed' && !pickup.completedAt) {
      pickup.completedAt = new Date().toISOString();
    }

    // Notify resident on status update
    let notifTitle = 'Pickup Status Updated';
    let notifMsg = `Your pickup ${pickup.pickupCode} is now: ${status.replace('_', ' ')}.`;
    if (status === 'en_route') {
      notifTitle = 'Agent On The Way';
      notifMsg = `${pickup.agentName || 'Your agent'} is en route to collect your waste.`;
    } else if (status === 'recycling_processing') {
      notifTitle = 'Sent for Recycling';
      notifMsg = `Your waste has arrived at the authorized recycling and processing facility.`;
    }

    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      userId: pickup.residentId,
      pickupId: pickup.id,
      title: notifTitle,
      message: notifMsg,
      type: 'pickup_update',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.json({ success: true, pickup });
  });

  // Agent waste verification & weight entry
  app.put('/api/pickups/:id/verify', authenticateToken, requireRole('agent', 'admin'), (req: AuthRequest, res) => {
    const pickup = db.pickups.find(p => p.id === req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    const {
      weightKg,
      weightSource = 'iot_loadcell',
      wastePhotoUrl,
      cnnCategory,
      cnnConfidence,
      mismatchFlagged = false,
      notes,
      recyclingFacility
    } = req.body;

    const actualWeight = Number(weightKg) || pickup.weightKg || 3.0;
    const isSegregated = !mismatchFlagged && pickup.isSegregated;

    const pricing = calculateDynamicPricing({
      category: pickup.category,
      pickupType: pickup.pickupType,
      weightKg: actualWeight,
      isSegregated
    });

    pickup.weightKg = actualWeight;
    pickup.weightSource = weightSource;
    pickup.wastePhotoUrl = wastePhotoUrl || pickup.wastePhotoUrl;
    pickup.cnnCategory = cnnCategory || pickup.cnnCategory;
    pickup.cnnConfidence = cnnConfidence || pickup.cnnConfidence;
    pickup.mismatchFlagged = mismatchFlagged;
    pickup.isSegregated = isSegregated;
    pickup.segregationFactor = isSegregated ? 0.8 : 1.5;
    pickup.processingFee = pricing.processingFee;
    pickup.recyclablePayout = pricing.recyclablePayout;
    pickup.netSettlement = pricing.netSettlement;
    pickup.verifiedAt = new Date().toISOString();
    pickup.verifiedByAgentId = req.user?.id;
    pickup.recyclingDestinationFacility = recyclingFacility || 
      WASTE_CATEGORIES_REGISTRY.find(c => c.id === pickup.category)?.recyclingFacility || 
      'Authorized Municipal Recovery Facility';
    pickup.status = mismatchFlagged ? 'verified' : 'completed';
    pickup.completedAt = new Date().toISOString();

    // Notify user
    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      userId: pickup.residentId,
      pickupId: pickup.id,
      title: mismatchFlagged ? 'Waste Verified with Note' : 'Waste Verified & Weighed',
      message: `Weight recorded: ${actualWeight} KG. Net settlement: ₹${Math.abs(pricing.netSettlement)} ${pricing.isNetPayout ? 'payout' : 'processing fee'}.`,
      type: mismatchFlagged ? 'warning' : 'success',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.json({ success: true, pickup });
  });

  // Settle payment/reward
  app.post('/api/pickups/:id/settle', authenticateToken, (req: AuthRequest, res) => {
    const pickup = db.pickups.find(p => p.id === req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    const { txnId, isPayout } = req.body;
    pickup.status = 'completed';
    pickup.paymentStatus = isPayout ? 'payout_credited' : 'paid';
    if (isPayout) {
      pickup.upiTxnId = txnId || `UPI-${Date.now()}`;
    } else {
      pickup.razorpayPaymentId = txnId || `PAY-${Date.now()}`;
    }

    // Credit resident wallet & points
    const resident = db.users.find(u => u.id === pickup.residentId);
    if (resident) {
      if (isPayout) {
        resident.walletBalance += Math.abs(pickup.netSettlement);
      }
      resident.rewardPoints += 25;
    }

    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      userId: pickup.residentId,
      pickupId: pickup.id,
      title: 'Reward Settlement Confirmed',
      message: `₹${Math.abs(pickup.netSettlement)} settlement recorded and 25 Green Reward Points credited.`,
      type: 'reward',
      timestamp: new Date().toISOString(),
      read: false
    });

    res.json({ success: true, pickup, resident });
  });

  // 7. AI Verification Module (/api/verification/ai-analyze)
  app.post('/api/verification/ai-analyze', async (req, res) => {
    try {
      const { imageBase64, imageUrl, declaredCategory } = req.body;

      if (!imageBase64 && !imageUrl) {
        return res.status(400).json({
          success: false,
          source: 'Unavailable',
          isRealAi: false,
          error: 'No image provided for waste analysis.'
        });
      }

      const ai = getAI();

      // If Gemini API is not configured or client failed to initialize, return error state immediately (NO guessing or fake fallback)
      if (!ai || !process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          success: false,
          source: 'Unavailable',
          isRealAi: false,
          error: 'AI unavailable. Please choose the category manually and let the agent verify.'
        });
      }

      const contents: any[] = [];
      if (imageBase64) {
        // Extract mime type and clean base64 data
        const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const cleanBase64 = mimeMatch ? mimeMatch[2] : imageBase64.replace(/^data:[^;]+;base64,/, '');

        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        });
      }

      const cleanDeclared = declaredCategory ? String(declaredCategory).replace(/["\\]/g, '').trim() : '';

      contents.push({
        text: `You are EcoCollect's strict AI visual waste inspector.
Analyze this image carefully and objectively.

ALLOWED CATEGORIES AND DEFINITIONS:
- organic: food scraps, peels, garden waste
- plastic: bottles, bags, containers, wrappers
- paper_cardboard: newspapers, boxes, books
- glass: bottles, jars
- metal: cans, utensils, scrap
- e_waste: phones, chargers, laptops, batteries, cables
- textile: clothes, bags, shoes, fabric
- hazardous: paint, chemicals, medicines, sprays
- not_waste_or_unclear: people, rooms, screens, blurry or dark images

CRITICAL CLASSIFICATION INSTRUCTIONS:
1. FIRST, describe the main visible object in detail (what is it?) and identify its material composition (what is it made of?) in "mainObjectDescription" and "materialDescription".
2. THEN, choose the category based strictly on that visual description. Use ONLY what is visible in the image.
3. The category MUST ONLY be one of the allowed categories: organic, plastic, paper_cardboard, glass, metal, e_waste, textile, hazardous, not_waste_or_unclear.
4. Return the top 2 category guesses in "topGuesses" with a confidence score (between 0.00 and 1.00) for each. Rank the most likely guess first.
5. CONFIDENCE RULES:
   - Set confidence below 0.60 whenever you are unsure, if lighting is poor, if the item is partially hidden, or if materials are ambiguous.
   - NEVER default to a high confidence. High confidence (>= 0.70) is ONLY allowed when the item is unmistakably clear, well-lit, fully visible, and unquestionably identified.
6. SPECIAL RULES FOR "not_waste_or_unclear":
   - Return "not_waste_or_unclear" whenever the image shows a working device (e.g. laptop, desktop screen, phone screen, tablet in use, keyboard/mouse on a desk), a person, face, room, living space, pet, or anything that is not discarded waste/scrap material.
   - If a working electronic device is shown (e.g., active laptop, desktop screen, or mobile phone), state this clearly in "detectedItem" (e.g., "Laptop (working electronic device, not waste)", "Smartphone screen (working device, not waste)").
   - Also return "not_waste_or_unclear" if the photo is blurry, excessively dark, obstructed, or unidentifiable as waste.
7. The user declared: "${cleanDeclared || 'none'}". Do NOT let this influence your identification. Determine your answer strictly from visible evidence first, and only afterward compare against it to set "declaredMatch".`
      });

      // Model fallback chain: primary stable Gemini Flash vision model + 2 fallback models
      const VISION_MODELS = [
        'gemini-flash-latest',  // Primary Gemini Flash vision model (stable, non-preview)
        'gemini-3.8-flash',     // Fallback model 1
        'gemini-3.1-flash-lite' // Fallback model 2
      ];

      const genConfig: any = {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainObjectDescription: {
              type: Type.STRING,
              description: 'Detailed description of the main visible object in the image.'
            },
            materialDescription: {
              type: Type.STRING,
              description: 'Identified material composition of the object from visual evidence.'
            },
            detectedItem: {
              type: Type.STRING,
              description: 'Specific name of the object. If working electronic device, state that clearly.'
            },
            topGuesses: {
              type: Type.ARRAY,
              description: 'The top 2 category guesses ranked by confidence.',
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Must be one of: organic, plastic, paper_cardboard, glass, metal, e_waste, textile, hazardous, not_waste_or_unclear'
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Confidence score between 0.00 and 1.00 for this category.'
                  }
                },
                required: ['category', 'confidence']
              }
            },
            condition: {
              type: Type.STRING,
              description: 'Physical condition (e.g. Clean & dry, Soiled, Scrap, Broken, Working device, Blurry/Dark).'
            },
            estimatedWeightKg: {
              type: Type.NUMBER,
              description: 'Estimated weight in kg (0 for not_waste_or_unclear).'
            },
            recyclabilityGrade: {
              type: Type.STRING,
              description: 'Grade A, Grade B, Grade C, Non-Recyclable, or N/A.'
            },
            disposalGuideline: {
              type: Type.STRING,
              description: '1-2 sentence guideline for proper segregation or disposal.'
            },
            declaredMatch: {
              type: Type.BOOLEAN,
              description: 'Whether the top identified category matches the user declared category.'
            }
          },
          required: [
            'mainObjectDescription',
            'materialDescription',
            'detectedItem',
            'topGuesses',
            'condition',
            'estimatedWeightKg',
            'recyclabilityGrade',
            'disposalGuideline',
            'declaredMatch'
          ]
        }
      };

      const startTime = Date.now();
      let responseText: string | null = null;
      let successfulModel = '';
      let lastError: any = null;

      modelLoop: for (const modelName of VISION_MODELS) {
        const elapsed = Date.now() - startTime;

        try {
          console.log(`[AI Vision] Querying model '${modelName}' (elapsed: ${Math.round(elapsed / 1000)}s)...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: genConfig
          });

          if (response.text) {
            responseText = response.text;
            successfulModel = modelName;
            console.log(`[AI Vision] Model '${modelName}' answered successfully in ${Date.now() - startTime}ms.`);
            break modelLoop;
          } else {
            throw new Error(`Empty response text returned from ${modelName}`);
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`[AI Vision] Model '${modelName}' encountered error, immediately moving to next model:`, errMsg);
          // On a 503, 429 or retryable error, move straight to the next model with no long waits
          continue modelLoop;
        }
      }

      if (!responseText) {
        throw lastError || new Error('All configured vision models failed to classify the image');
      }

      const parsed = JSON.parse(responseText);

      // Allowed categories only
      const validCategories: WasteCategory[] = [
        'organic',
        'plastic',
        'paper_cardboard',
        'glass',
        'metal',
        'e_waste',
        'textile',
        'hazardous',
        'not_waste_or_unclear'
      ];

      // Sanitize topGuesses (ensure top 2 distinct guesses with valid categories and [0,1] confidence)
      const rawGuesses = Array.isArray(parsed.topGuesses) ? parsed.topGuesses : [];
      const sanitizedGuesses: Array<{ category: WasteCategory; confidence: number }> = [];

      for (const g of rawGuesses) {
        if (sanitizedGuesses.length >= 2) break;
        let cat = String(g?.category || '').toLowerCase().trim();
        if (!validCategories.includes(cat as WasteCategory)) {
          cat = 'not_waste_or_unclear';
        }
        let conf = Number(g?.confidence);
        if (isNaN(conf) || conf < 0) conf = 0.50;
        if (conf > 1) conf = conf / 100;
        sanitizedGuesses.push({
          category: cat as WasteCategory,
          confidence: Math.round(conf * 100) / 100
        });
      }

      // If missing primary guess, construct from parsed fields
      if (sanitizedGuesses.length === 0) {
        let primaryCat = String(parsed.category || 'not_waste_or_unclear').toLowerCase().trim();
        if (!validCategories.includes(primaryCat as WasteCategory)) {
          primaryCat = 'not_waste_or_unclear';
        }
        let conf = Number(parsed.confidence) || 0.50;
        if (conf > 1) conf = conf / 100;
        sanitizedGuesses.push({
          category: primaryCat as WasteCategory,
          confidence: Math.round(conf * 100) / 100
        });
      }

      // If missing secondary guess, add a plausible runner-up
      if (sanitizedGuesses.length === 1) {
        const topCat = sanitizedGuesses[0].category;
        const fallbackCat = topCat === 'not_waste_or_unclear' ? 'plastic' : 'not_waste_or_unclear';
        const secondConf = Math.max(0.05, Math.round((1 - sanitizedGuesses[0].confidence) * 100) / 100);
        sanitizedGuesses.push({
          category: fallbackCat as WasteCategory,
          confidence: secondConf
        });
      }

      const primaryGuess = sanitizedGuesses[0];
      const category: WasteCategory = primaryGuess.category;
      const confidence = primaryGuess.confidence;

      // Check declaredMatch strictly against objective result
      const normalizedDeclared = cleanDeclared.toLowerCase().replace(/[- ]/g, '_');
      const normalizedResult = category.toLowerCase().replace(/[- ]/g, '_');
      const declaredMatch = Boolean(
        cleanDeclared && 
        normalizedDeclared !== 'not_waste_or_unclear' &&
        (normalizedDeclared === normalizedResult || 
         (normalizedDeclared === 'dry_recyclable' && ['paper_cardboard', 'plastic', 'metal'].includes(normalizedResult)) ||
         (normalizedDeclared === 'biodegradable' && normalizedResult === 'organic'))
      );

      const isRecyclable = category !== 'not_waste_or_unclear' && category !== 'hazardous';

      return res.json({
        success: true,
        source: `Gemini (${successfulModel})`,
        modelUsed: successfulModel,
        isRealAi: true,
        isEstimate: false,
        analysis: {
          mainObjectDescription: String(parsed.mainObjectDescription || ''),
          materialDescription: String(parsed.materialDescription || ''),
          detectedItem: String(parsed.detectedItem || (category === 'not_waste_or_unclear' ? 'Unidentified or non-waste object' : 'Inspected waste material')),
          category,
          condition: String(parsed.condition || (category === 'not_waste_or_unclear' ? 'Non-waste / Unclear' : 'Segregated')),
          confidence: Math.round(confidence * 100) / 100,
          topGuesses: sanitizedGuesses,
          estimatedWeightKg: category === 'not_waste_or_unclear' ? 0 : Number(parsed.estimatedWeightKg || 1.0),
          isRecyclable,
          recyclabilityGrade: category === 'not_waste_or_unclear' ? 'N/A' : String(parsed.recyclabilityGrade || 'Grade B'),
          disposalGuideline: String(parsed.disposalGuideline || (category === 'not_waste_or_unclear' ? 'Item is not discarded waste or photo is unclear. Please provide a clear photo of waste.' : 'Route to authorized municipal recycling facility.')),
          declaredMatch
        }
      });
    } catch (geminiErr: any) {
      console.warn('Gemini vision analysis failed:', geminiErr?.message || geminiErr);
      // Return error state without falling back to sample items or guesses
      return res.status(503).json({
        success: false,
        source: 'Unavailable',
        isRealAi: false,
        error: 'AI unavailable. Please choose the category manually and let the agent verify.'
      });
    }
  });

  // 8. Notifications Module (/api/notifications)
  app.get('/api/notifications', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user!;
    const userNotifs = db.notifications.filter(n => n.userId === user.id);
    res.json({ success: true, count: userNotifs.length, notifications: userNotifs });
  });

  app.put('/api/notifications/:id/read', authenticateToken, (req: AuthRequest, res) => {
    const notif = db.notifications.find(n => n.id === req.params.id);
    if (notif) notif.read = true;
    res.json({ success: true, notification: notif });
  });

  // 9. Admin & Analytics Module (/api/admin & /api/analytics)
  app.get('/api/admin/metrics', authenticateToken, requireRole('admin'), (req, res) => {
    const totalUsers = db.users.filter(u => u.role === 'resident').length;
    const activeAgents = db.users.filter(u => u.role === 'agent').length;
    const pendingPickups = db.pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length;
    const completedPickups = db.pickups.filter(p => p.status === 'completed' || p.status === 'recycling_processing').length;
    const totalWeightKg = db.pickups.reduce((acc, p) => acc + (p.weightKg || 0), 0);
    const totalDisbursed = db.pickups.reduce((acc, p) => acc + (p.recyclablePayout || 0), 0);
    const totalFees = db.pickups.reduce((acc, p) => acc + (p.processingFee || 0), 0);

    // Weight by category
    const weightByCategory: Record<string, number> = {};
    db.pickups.forEach(p => {
      weightByCategory[p.category] = (weightByCategory[p.category] || 0) + (p.weightKg || 0);
    });

    const envImpact = calculateEnvironmentalImpact(db.pickups);

    res.json({
      success: true,
      metrics: {
        totalUsers,
        activeAgents,
        pendingPickups,
        completedPickups,
        totalWeightKg: Math.round(totalWeightKg * 10) / 10,
        totalDisbursed: Math.round(totalDisbursed * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        weightByCategory,
        environmentalImpact: envImpact
      }
    });
  });

  app.post('/api/admin/mismatches/:pickupId/resolve', authenticateToken, requireRole('admin'), (req, res) => {
    const pickup = db.pickups.find(p => p.id === req.params.pickupId);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    const { resolution } = req.body;
    const isSegregated = resolution === 'accept_resident';
    const pricing = calculateDynamicPricing({
      category: pickup.category,
      pickupType: pickup.pickupType,
      weightKg: pickup.weightKg,
      isSegregated
    });

    pickup.isSegregated = isSegregated;
    pickup.segregationFactor = isSegregated ? 0.8 : 1.5;
    pickup.adminReviewed = true;
    pickup.mismatchFlagged = false;
    pickup.status = 'priced';
    pickup.processingFee = pricing.processingFee;
    pickup.recyclablePayout = pricing.recyclablePayout;
    pickup.netSettlement = pricing.netSettlement;

    res.json({ success: true, pickup });
  });

  // 10. IoT Gateway Module (/api/iot)
  app.post('/api/iot/weight-reading', (req, res) => {
    const { scaleId = 'ESP32-HX711-UNIT-01', weightKg, rawADC, batteryVoltage = 3.9, wifiRssi = -60, pickupCode } = req.body;
    const parsedWeight = parseFloat(weightKg);

    const log: WeightLog = {
      id: 'wlog_' + Date.now(),
      scaleId,
      weightKg: isNaN(parsedWeight) ? 4.85 : parsedWeight,
      rawADC: rawADC || 842000,
      batteryVoltage,
      wifiRssi,
      pickupCode,
      timestamp: new Date().toISOString()
    };

    db.weightLogs.unshift(log);
    db.liveScaleWeight = log.weightKg;

    // If pickupCode provided, update pickup weight
    if (pickupCode) {
      const pickup = db.pickups.find(p => p.pickupCode === pickupCode);
      if (pickup) {
        pickup.weightKg = log.weightKg;
        pickup.weightSource = 'iot_loadcell';
      }
    }

    res.status(201).json({ success: true, log });
  });

  app.post('/api/iot/tare', (req, res) => {
    db.liveScaleWeight = 0.0;
    res.json({ success: true, liveWeight: 0.0 });
  });

  app.get('/api/iot/logs', (req, res) => {
    res.json({ success: true, liveWeight: db.liveScaleWeight, logs: db.weightLogs });
  });

  // ==========================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoCollect Full-Stack REST API & Web App running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
