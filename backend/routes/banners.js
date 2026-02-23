import express from 'express';
import Banner from '../models/Banner.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

// Helper function to extract Cloudinary public_id from URL
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
  // or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(url) {
  if (!url || !process.env.CLOUDINARY_CLOUD_NAME) return;
  
  // Only delete if it's a Cloudinary URL
  if (!url.includes('cloudinary.com')) return;
  
  try {
    const publicId = extractPublicId(url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('Error deleting image from Cloudinary:', err.message);
    // Don't throw - continue even if deletion fails
  }
}

const router = express.Router();

// Multer memory storage for Cloudinary
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public: get all active banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all banners (including inactive)
router.get('/admin', protect, async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: create banner
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { title, description, linkType, linkValue, active, order } = req.body;
    let imageUrl = '';

    if (req.file && process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'womens-emporium/banners' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    } else if (req.body.image) {
      imageUrl = req.body.image; // Allow URL input
    } else {
      return res.status(400).json({ message: 'Image is required' });
    }

    const banner = await Banner.create({
      title,
      description: description || '',
      image: imageUrl,
      linkType: linkType || 'shop',
      linkValue: linkValue || '',
      active: active !== 'false' && active !== false,
      order: order ? Number(order) : 0,
    });

    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update banner
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    const { title, description, linkType, linkValue, active, order, image } = req.body;
    const oldImage = banner.image;

    if (title != null) banner.title = title;
    if (description != null) banner.description = description;
    if (linkType != null) banner.linkType = linkType;
    if (linkValue != null) banner.linkValue = linkValue;
    if (active !== undefined) banner.active = active === 'true' || active === true;
    if (order != null) banner.order = Number(order);

    // Handle image upload
    if (req.file && process.env.CLOUDINARY_CLOUD_NAME) {
      // Delete old image if it exists and is from Cloudinary
      if (oldImage) {
        await deleteCloudinaryImage(oldImage);
      }
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'womens-emporium/banners' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        uploadStream.end(req.file.buffer);
      });
      banner.image = result.secure_url;
    } else if (image && !req.file) {
      // If image URL changed and old image was from Cloudinary, delete it
      if (oldImage && oldImage !== image) {
        await deleteCloudinaryImage(oldImage);
      }
      banner.image = image; // Update with URL if provided
    }

    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete banner
router.delete('/:id', protect, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    
    // Delete banner image from Cloudinary
    if (banner.image) {
      await deleteCloudinaryImage(banner.image);
    }
    
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
