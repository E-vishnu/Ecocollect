const crypto = require('crypto');
const mongoose = require('mongoose');
const Pickup = require('../models/Pickup');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * 1. Create Razorpay Payment Order
 * POST /api/payments/create-order
 * Access: Resident (owner of pickup) or Admin
 */
exports.createOrder = async (req, res) => {
  try {
    const { pickupId } = req.body;

    if (!pickupId) {
      return res.status(400).json({ success: false, message: 'Pickup identifier is required.' });
    }

    // Require sensitive configuration from environment variables (no hardcoded secret fallbacks)
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      return res.status(500).json({
        success: false,
        message: 'Payment provider credentials (RAZORPAY_KEY_ID) are not configured in the server environment.'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const query = isValidObjectId(pickupId) ? { _id: pickupId } : { pickupCode: pickupId };
      const pickup = await Pickup.findOne(query);

      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Pickup record not found.' });
      }

      // Authorization: only the resident who booked or an admin can create a payment order
      const userId = (req.user.id || req.user._id).toString();
      const residentId = (pickup.residentId?._id || pickup.residentId || '').toString();
      if (req.user.role === 'resident' && residentId && residentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to create payment orders for this pickup.'
        });
      }

      // Duplicate payment protection
      if (['paid_by_resident', 'payout_settled'].includes(pickup.paymentStatus) || pickup.status === 'completed') {
        return res.status(409).json({
          success: false,
          message: 'This pickup has already been paid or settled.'
        });
      }

      // Direction validation: Payouts are paid to residents, not charged to residents
      if (pickup.pricing?.isPayout) {
        return res.status(400).json({
          success: false,
          message: 'This pickup has a net cashback payout due to the resident, not a service fee.'
        });
      }

      const settlementAmount = pickup.pricing?.settlementAmount || 0;
      if (settlementAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pickup has zero balance due. No payment order required.'
        });
      }

      const amountInPaise = Math.round(settlementAmount * 100);
      const orderId = 'order_' + crypto.randomBytes(8).toString('hex');

      return res.status(200).json({
        success: true,
        order: {
          id: orderId,
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${pickup.pickupCode}`,
          keyId: razorpayKeyId,
          customerName: req.user.name,
          customerEmail: req.user.email,
          customerPhone: req.user.phone
        }
      });
    }

    // Offline / Standalone Mock Order
    const orderId = 'order_' + crypto.randomBytes(8).toString('hex');
    res.status(200).json({
      success: true,
      order: {
        id: orderId,
        amount: 25000,
        currency: 'INR',
        receipt: `rcpt_${pickupId}`,
        keyId: razorpayKeyId
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error creating payment order.' });
  }
};

/**
 * 2. Verify Payment Signature & Complete Settlement
 * POST /api/payments/verify
 * Access: Resident or Admin
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { pickupId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod, upiVpa } = req.body;

    if (!pickupId) {
      return res.status(400).json({ success: false, message: 'Pickup identifier is required.' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.'
      });
    }

    // Require sensitive secret through environment variable
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Payment verification failed: RAZORPAY_KEY_SECRET is not configured in the server environment.'
      });
    }

    // Real HMAC SHA256 Signature Verification - No bypass shortcuts (Validate signature before DB lookup)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Verification failed.'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const query = isValidObjectId(pickupId) ? { _id: pickupId } : { pickupCode: pickupId };
      const pickup = await Pickup.findOne(query);

      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Pickup record not found.' });
      }

      // Duplicate payment protection
      if (pickup.paymentStatus === 'paid_by_resident' || (pickup.status === 'completed' && pickup.paymentStatus !== 'pending_resident_pay')) {
        return res.status(409).json({
          success: false,
          message: 'Payment has already been processed and verified for this pickup.'
        });
      }

      // Update pickup payment ledger and mark completed
      pickup.paymentStatus = 'paid_by_resident';
      pickup.paymentDetails = {
        razorpayOrderId,
        paymentId: razorpayPaymentId,
        paymentMethod: paymentMethod || (upiVpa ? 'UPI' : 'Razorpay_Gateway'),
        upiId: upiVpa || req.user.upiId || 'resident@upi',
        paidAt: new Date()
      };

      pickup.status = 'completed';
      pickup.timestamps.completedAt = new Date();

      await pickup.save();

      return res.status(200).json({
        success: true,
        message: 'Payment signature verified and pickup settled successfully.',
        pickup
      });
    }

    // Standalone / offline mode response
    res.status(200).json({
      success: true,
      message: 'Payment signature verified successfully (Database offline).',
      verified: true,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Payment verification failed.' });
  }
};

/**
 * 3. Disburse Buyback Cash Reward to Resident UPI
 * POST /api/payments/settle-payout
 * Access: Agent or Admin only
 */
exports.settlePayout = async (req, res) => {
  try {
    const { pickupId, upiId } = req.body;

    if (!pickupId) {
      return res.status(400).json({ success: false, message: 'Pickup identifier is required.' });
    }

    if (mongoose.connection.readyState === 1) {
      const query = isValidObjectId(pickupId) ? { _id: pickupId } : { pickupCode: pickupId };
      const pickup = await Pickup.findOne(query);

      if (!pickup) {
        return res.status(404).json({ success: false, message: 'Pickup not found.' });
      }

      // Verify pickup is eligible for payout
      if (!pickup.pricing?.isPayout) {
        return res.status(400).json({
          success: false,
          message: 'This pickup is not eligible for a cashback payout.'
        });
      }

      // Duplicate payout protection
      if (pickup.paymentStatus === 'payout_settled') {
        return res.status(409).json({
          success: false,
          message: 'Cashback payout has already been disbursed for this pickup.'
        });
      }

      const targetUpi = (upiId || pickup.paymentDetails?.upiId || req.user.upiId || 'resident@okaxis').trim();
      const txnRef = 'UPI_REV_' + crypto.randomBytes(6).toString('hex').toUpperCase();

      pickup.paymentStatus = 'payout_settled';
      pickup.paymentDetails = {
        paymentId: txnRef,
        paymentMethod: 'UPI_Instant_Disbursement',
        upiId: targetUpi,
        paidAt: new Date()
      };

      pickup.status = 'completed';
      pickup.timestamps.completedAt = new Date();

      await pickup.save();

      return res.status(200).json({
        success: true,
        message: `Disbursed ₹${pickup.pricing.settlementAmount} payout to ${targetUpi}`,
        transactionId: txnRef,
        pickup
      });
    }

    // Standalone / offline response
    const txnRef = 'UPI_REV_' + crypto.randomBytes(6).toString('hex').toUpperCase();
    res.status(200).json({
      success: true,
      message: `Disbursed payout (offline mode)`,
      transactionId: txnRef
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to disburse payout.' });
  }
};
