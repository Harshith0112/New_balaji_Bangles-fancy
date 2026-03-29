import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    /** Percent: 1–100, or fixed amount in ₹ */
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    /** Cap for percent discounts (0 = no cap) */
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });

export default mongoose.model('Coupon', couponSchema);
