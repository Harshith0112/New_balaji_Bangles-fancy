import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import productRoutes from './routes/products.js';
import adminRoutes from './routes/admin.js';
import categoryRoutes from './routes/categories.js';
import offerRoutes from './routes/offer.js';
import bannerRoutes from './routes/banners.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import couponRoutes from './routes/coupons.js';
import { initSiteSocket } from './siteSocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

initSiteSocket(httpServer, { corsOrigin: FRONTEND_ORIGIN });

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (fallback if not using Cloudinary only)
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/offer', offerRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/coupons', couponRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NEW BALAJI BANGLES & FANCY API' });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/womens-emporium')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
