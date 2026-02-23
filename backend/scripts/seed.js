import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import Admin from '../models/Admin.js';
import Category from '../models/Category.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sampleProducts = [
  { name: 'Gold Plated Pearl Bangle Set', description: 'Elegant gold-plated bangles with pearl accents. Perfect for weddings and parties.', price: 499, originalPrice: 699, category: 'bangles', images: [], inStock: true, featured: true },
  { name: 'Lacquer Red & Green Bangles', description: 'Traditional lacquer bangles in red and green. Set of 12.', price: 299, category: 'bangles', images: [], inStock: true, featured: true },
  { name: 'Kundan Choker Set', description: 'Beautiful kundan choker with matching earrings. Festival special.', price: 899, originalPrice: 1199, category: 'jewellery', images: [], inStock: true, featured: true },
  { name: 'Oxidised Silver Jhumkas', description: 'Handcrafted oxidised silver jhumkas. Lightweight and elegant.', price: 449, category: 'jewellery', images: [], inStock: true, featured: false },
  { name: 'Lakmé 9to5 Primer + Matte Lipstick', description: 'Long-lasting matte lipstick with primer. Shade: Pink Blush.', price: 399, category: 'cosmetics', images: [], inStock: true, featured: true },
  { name: 'Kajal & Eyeliner Combo', description: 'Smudge-proof kajal and liquid eyeliner. Water-resistant.', price: 249, category: 'cosmetics', images: [], inStock: true, featured: false },
  { name: 'Silk Hair Band Set', description: 'Set of 5 silk hair bands in pastel colours. Comfortable for daily wear.', price: 199, category: 'accessories', images: [], inStock: true, featured: true },
  { name: 'Designer Clutch with Mirror', description: 'Compact clutch with mirror inside. Ideal for parties.', price: 549, originalPrice: 699, category: 'accessories', images: [], inStock: true, featured: false },
  { name: 'Stone Studded Maang Tikka', description: 'Bridal maang tikka with stone work. Adjustable chain.', price: 649, category: 'jewellery', images: [], inStock: true, featured: true },
  { name: 'Glass Bangles Multi Colour', description: 'Assorted glass bangles. Set of 24. Festival collection.', price: 179, category: 'bangles', images: [], inStock: true, featured: false },
];

const defaultCategories = [
  { name: 'Bangles', slug: 'bangles', order: 1 },
  { name: 'Fancy Jewellery', slug: 'jewellery', order: 2 },
  { name: 'Cosmetics', slug: 'cosmetics', order: 3 },
  { name: 'Hair & Fashion Accessories', slug: 'accessories', order: 4 },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/womens-emporium');
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.insertMany(defaultCategories);
      console.log('Default categories seeded.');
    }
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany(sampleProducts);
      console.log('Sample products seeded.');
    } else {
      console.log('Products already exist. Skipping product seed.');
    }
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({ email: 'admin@newbalajibanglesfancy.com', password: 'admin123' });
      console.log('Default admin created: admin@newbalajibanglesfancy.com / admin123');
    } else {
      console.log('Admin already exists. Skipping admin seed.');
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
