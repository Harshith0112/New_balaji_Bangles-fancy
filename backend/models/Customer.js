import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerAddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    doorNo: { type: String, default: '', trim: true },
    street: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    landmark: { type: String, default: '', trim: true },
    // Backward-compatible combined address string (also used by checkout UI)
    address: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    addresses: { type: [customerAddressSchema], default: [] },
  },
  { timestamps: true }
);

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

customerSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Customer', customerSchema);

