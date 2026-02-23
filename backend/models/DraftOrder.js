import mongoose from 'mongoose';

const draftItemSchema = new mongoose.Schema(
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

const draftOrderSchema = new mongoose.Schema(
  {
    rawMessage: { type: String, default: '' },
    items: [draftItemSchema],
    total: { type: Number, required: true },
    totalValid: { type: Boolean, default: true },
    readyForOrderId: { type: Boolean, default: false },
  },
  { timestamps: true }
);

draftOrderSchema.index({ createdAt: -1 });

export default mongoose.model('DraftOrder', draftOrderSchema);
