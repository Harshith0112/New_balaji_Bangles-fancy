import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    nbfCode: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    image: { type: String, default: '' },
    packed: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    rawMessage: { type: String, default: '' },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    totalValid: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'shipped', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    shippingCharge: { type: Number, default: 0 },
    trackingNumber: { type: String, default: '', trim: true },
    packedAt: { type: Date },
    shippedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ orderId: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', orderSchema);
