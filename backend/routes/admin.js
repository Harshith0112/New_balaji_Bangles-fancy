import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'womens-emporium-secret';

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { email, password } = req.body;
      const admin = await Admin.findOne({ email });
      if (!admin || !(await admin.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, admin: { id: admin._id, email: admin.email } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get current admin (protected)
router.get('/me', protect, (req, res) => {
  res.json({ admin: req.admin });
});

// Register first admin (only if no admin exists - for initial setup)
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const existing = await Admin.countDocuments();
      if (existing > 0) return res.status(403).json({ message: 'Registration disabled' });
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const admin = await Admin.create(req.body);
      const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, admin: { id: admin._id, email: admin.email } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
