import mongoose from 'mongoose';

const optionValueSchema = new mongoose.Schema({
  value: { type: String, required: true, trim: true },
  inStock: { type: Boolean, default: true },
  price: { type: Number, default: 0 }, // optional price modifier (added to product base price)
}, { _id: false });

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  values: {
    type: [mongoose.Schema.Types.Mixed],
    validate: {
      validator: function(v) {
        return v.every(item =>
          typeof item === 'string' ||
          (typeof item === 'object' && item !== null && typeof item.value === 'string')
        );
      },
      message: 'Values must be strings or objects with value property'
    }
  },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number },
    category: { type: String, required: true, trim: true },
    nbfCode: { type: String, trim: true },
    options: [optionSchema],
    images: [{ type: String }],
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    newArrivals: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
