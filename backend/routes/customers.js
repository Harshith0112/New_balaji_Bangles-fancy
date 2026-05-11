import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { protectCustomer } from '../middleware/customerAuth.js';
import { sendEmail } from '../utils/mailer.js';
import { welcomeEmail, passwordResetEmail } from '../utils/emailTemplates.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'womens-emporium-secret';
const PASSWORD_RESET_TTL_MIN = 30;

function digits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function frontendUrl() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

// Register
router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty(),
    body('phone').notEmpty(),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, phone, email, password } = req.body || {};
      const phoneDigits = digits(phone);
      const emailLower = String(email || '').trim().toLowerCase();
      if (!phoneDigits || phoneDigits.length < 10) return res.status(400).json({ message: 'Valid phone is required' });

      const existing = await Customer.findOne({ phone: phoneDigits });
      if (existing) return res.status(409).json({ message: 'Phone already registered' });

      const customer = await Customer.create({
        name: String(name).trim(),
        phone: phoneDigits,
        email: emailLower,
        password,
      });
      const token = jwt.sign({ id: customer._id }, JWT_SECRET, { expiresIn: '30d' });

      // Fire-and-forget welcome email — never block registration on mail.
      const { subject, html, text } = welcomeEmail({ name: customer.name, phone: customer.phone });
      sendEmail({ to: customer.email, subject, html, text }).catch((e) =>
        console.error('[customers] welcome email failed:', e?.message || e)
      );

      res.status(201).json({
        token,
        customer: { id: customer._id, name: customer.name, phone: customer.phone, email: customer.email },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('phone').notEmpty(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { phone, password } = req.body || {};
      const phoneDigits = digits(phone);
      const customer = await Customer.findOne({ phone: phoneDigits });
      if (!customer) return res.status(401).json({ message: 'Invalid phone or password' });

      const ok = await customer.comparePassword(password);
      if (!ok) return res.status(401).json({ message: 'Invalid phone or password' });

      const token = jwt.sign({ id: customer._id }, JWT_SECRET, { expiresIn: '30d' });
      res.json({
        token,
        customer: { id: customer._id, name: customer.name, phone: customer.phone },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Me
router.get('/me', protectCustomer, async (req, res) => {
  const customer = req.customer;
  res.json({
    customer: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      addresses: customer.addresses || [],
    },
  });
});

/**
 * Forgot password — request a reset link by phone or email.
 *
 * Always returns 200 with a generic message so we don't leak whether a phone /
 * email is registered. The link is only sent if we found a customer with an
 * email on file.
 */
router.post(
  '/forgot-password',
  [
    body('phone').optional({ nullable: true, checkFalsy: true }).isString(),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  ],
  async (req, res) => {
    const generic = {
      message:
        "If we have an account matching that phone or email, we've sent a password reset link.",
    };
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.json(generic);

      const { phone, email } = req.body || {};
      const phoneDigits = digits(phone);
      const emailLower = String(email || '').trim().toLowerCase();
      if (!phoneDigits && !emailLower) return res.json(generic);

      const query = { $or: [] };
      if (phoneDigits) query.$or.push({ phone: phoneDigits });
      if (emailLower) query.$or.push({ email: emailLower });
      const customer = await Customer.findOne(query);

      if (!customer || !customer.email) {
        // Don't leak which one didn't match.
        return res.json(generic);
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      customer.passwordResetTokenHash = sha256(rawToken);
      customer.passwordResetExpires = new Date(
        Date.now() + PASSWORD_RESET_TTL_MIN * 60 * 1000
      );
      await customer.save();

      const resetUrl = `${frontendUrl()}/customer/account/reset?token=${encodeURIComponent(rawToken)}`;
      const { subject, html, text } = passwordResetEmail({
        name: customer.name,
        resetUrl,
        expiresInMinutes: PASSWORD_RESET_TTL_MIN,
      });
      sendEmail({ to: customer.email, subject, html, text }).catch((e) =>
        console.error('[customers] reset email failed:', e?.message || e)
      );

      return res.json(generic);
    } catch (err) {
      console.error('[customers] forgot-password error:', err?.message || err);
      // Even on internal error, return generic 200 to avoid info leak.
      return res.json(generic);
    }
  }
);

/**
 * Reset password — consume a reset token and set a new password.
 */
router.post(
  '/reset-password',
  [
    body('token').isString().trim().notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { token, password } = req.body || {};
      const tokenHash = sha256(String(token).trim());
      const customer = await Customer.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: new Date() },
      });
      if (!customer) {
        return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
      }

      customer.password = password; // pre('save') hashes it
      customer.passwordResetTokenHash = '';
      customer.passwordResetExpires = undefined;
      await customer.save();

      return res.json({ message: 'Password updated. You can now sign in with your new password.' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// Add address
router.post(
  '/addresses',
  protectCustomer,
  [
    body('doorNo').isString().trim().notEmpty(),
    body('street').isString().trim().notEmpty(),
    body('city').isString().trim().notEmpty(),
    body('landmark').optional({ nullable: true }).isString().trim(),
    body('pincode').notEmpty(),
    body('state').isString().trim().notEmpty(),
    body('label').optional({ nullable: true }).isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { label, doorNo, street, city, landmark, pincode, state } = req.body || {};
      const customer = req.customer;

      const parts = [
        String(doorNo || '').trim(),
        String(street || '').trim(),
        String(landmark || '').trim(),
        String(city || '').trim(),
      ].filter(Boolean);
      const combinedAddress = parts.join(', ');

      customer.addresses.push({
        label: label ? String(label).trim() : '',
        doorNo: String(doorNo || '').trim(),
        street: String(street || '').trim(),
        city: String(city || '').trim(),
        landmark: String(landmark || '').trim(),
        address: combinedAddress,
        pincode: String(pincode).trim(),
        state: String(state).trim(),
      });
      await customer.save();

      res.status(201).json({
        addresses: customer.addresses,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete address
router.delete('/addresses/:id', protectCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = req.customer;
    const before = (customer.addresses || []).length;
    customer.addresses = (customer.addresses || []).filter((a) => String(a._id) !== String(id));
    if (before === (customer.addresses || []).length) return res.status(404).json({ message: 'Address not found' });
    await customer.save();
    res.json({ addresses: customer.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Orders for this customer
router.get('/orders', protectCustomer, async (req, res) => {
  try {
    const customer = req.customer;
    const orders = await Order.find({ customerPhone: customer.phone })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const list = orders.map((o) => ({
      _id: o._id,
      orderId: o.orderId,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      total: Number(o.total) || 0,
      trackingNumber:
        o.status === 'shipped' || o.status === 'completed' ? String(o.trackingNumber || '').trim() : '',
      shippingCarrier:
        o.status === 'shipped' || o.status === 'completed' ? String(o.shippingCarrier || '').trim() : '',
    }));

    res.json({ orders: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single order details (must belong to logged-in customer’s phone)
router.get('/orders/:id', protectCustomer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order' });
    }
    const customer = req.customer;
    const order = await Order.findOne({
      _id: req.params.id,
      customerPhone: customer.phone,
    }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const items = (order.items || []).map((i) => ({
      productId: i.productId || null,
      name: i.name,
      nbfCode: i.nbfCode || '',
      quantity: i.quantity,
      price: Number(i.price) || 0,
      lineTotal: Number(i.lineTotal) || 0,
      image: String(i.image || '').trim(),
      selectedOptions:
        i.selectedOptions && typeof i.selectedOptions === 'object' ? i.selectedOptions : {},
    }));
    const itemsSubtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const couponDiscount = Number(order.couponDiscount) || 0;
    const itemsTotal = Number(order.total) || 0;
    const shippingCharge = Number(order.shippingCharge) || 0;

    res.json({
      order: {
        _id: order._id,
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        items,
        itemsSubtotal,
        couponCode: order.couponCode || '',
        couponDiscount,
        itemsTotal,
        shippingCharge,
        grandTotal: itemsTotal + shippingCharge,
        delivery: order.delivery
          ? {
              address: String(order.delivery.address || '').trim(),
              pincode: String(order.delivery.pincode || '').trim(),
              state: String(order.delivery.state || '').trim(),
            }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

