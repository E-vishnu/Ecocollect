const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
  }
  return secret || 'ecocollect_development_jwt_secret_placeholder';
};

const signToken = (id) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Exclude password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        upiId: user.upiId,
        agentDetails: user.agentDetails,
        status: user.status
      }
    }
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, upiId } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, and phone number.'
      });
    }

    // Security requirement: Ensure public registration cannot create administrator or agent accounts
    if (role && (role === 'admin' || role === 'agent')) {
      return res.status(403).json({
        success: false,
        message: 'Public registration is restricted to resident accounts. Agent and Administrator accounts must be provisioned by municipal authorities.'
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'resident', // Strictly enforce resident role for public signup
      phone: phone.trim(),
      address: address || {
        street: '12th Main Road',
        area: 'Koramangala 4th Block',
        city: 'Bengaluru',
        pincode: '560034'
      },
      upiId: upiId ? upiId.trim() : `${email.split('@')[0]}@okaxis`
    });

    sendTokenResponse(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Could not register user.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Login failed.'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.'
    });
  }
};
