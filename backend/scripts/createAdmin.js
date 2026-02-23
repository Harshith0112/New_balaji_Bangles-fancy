import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../models/Admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_EMAIL = 'admin@newbalajibanglesfancy.com';
const DEFAULT_PASSWORD = 'admin123';

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/womens-emporium');
    let admin = await Admin.findOne({ email });
    if (admin) {
      admin.password = password;
      await admin.save();
      console.log('Admin password updated.');
    } else {
      await Admin.create({ email, password });
      console.log('Admin created.');
    }
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Login at: /admin');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
