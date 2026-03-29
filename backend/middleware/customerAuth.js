import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'womens-emporium-secret';

export const protectCustomer = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const customer = await Customer.findById(decoded.id);
    if (!customer) return res.status(401).json({ message: 'Customer not found' });
    req.customer = customer;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

