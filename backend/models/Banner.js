import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    linkType: { 
      type: String, 
      enum: ['category', 'shop', 'custom'], 
      default: 'shop' 
    },
    linkValue: { type: String, default: '' }, // category slug, or custom URL
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bannerSchema.index({ order: 1, createdAt: -1 });
bannerSchema.index({ active: 1 });

export default mongoose.model('Banner', bannerSchema);
