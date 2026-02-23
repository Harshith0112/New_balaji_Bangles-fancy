import express from 'express';
import Product from '../models/Product.js';
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

// Helper to normalize options format (convert old string format to new object format)
function normalizeProductOptions(product) {
  if (!product.options || !Array.isArray(product.options)) return product;
  
  const normalizedOptions = product.options.map(opt => {
    if (!opt.values || !Array.isArray(opt.values)) return opt;
    
    const normalizedValues = opt.values.map(val => {
      if (typeof val === 'string') {
        return { value: val, inStock: true, price: 0 };
      }
      if (val && typeof val === 'object' && val.value) {
        const price = val.price != null && !Number.isNaN(Number(val.price)) ? Number(val.price) : 0;
        return { value: val.value, inStock: val.inStock !== false, price };
      }
      return val;
    });
    
    return { ...opt, values: normalizedValues };
  });
  
  return { ...product, options: normalizedOptions };
}

// Public: get all products (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, featured, newArrivals, inStock, includeHidden } = req.query;
    const filter = {};
    if (category) {
      // Allow case-insensitive matching for category slugs/names,
      // and be tolerant of singular/plural mismatches (bangle/bangles)
      const slug = String(category).toLowerCase();
      const patterns = [slug];
      if (!slug.endsWith('s')) {
        patterns.push(`${slug}s`);
      } else {
        patterns.push(slug.slice(0, -1));
      }
      filter.$or = patterns.map((p) => ({ category: new RegExp(`^${p}$`, 'i') }));
    }
    if (minPrice != null || maxPrice != null) {
      filter.price = {};
      if (minPrice != null) filter.price.$gte = Number(minPrice);
      if (maxPrice != null) filter.price.$lte = Number(maxPrice);
    }
    if (featured === 'true') filter.featured = true;
    if (newArrivals === 'true') filter.newArrivals = true;
    if (inStock === 'true') filter.inStock = true;

    // By default hide products explicitly marked as not visible
    const visibilityFilter = includeHidden === 'true'
      ? {}
      : { $or: [{ visible: { $exists: false } }, { visible: true }] };

    const baseFilter = Object.keys(visibilityFilter).length
      ? { $and: [filter, visibilityFilter] }
      : filter;

    let query = Product.find(baseFilter).sort({ createdAt: -1 });
    if (search && search.trim()) {
      query = Product.find({ ...baseFilter, $text: { $search: search.trim() } }).sort({ score: { $meta: 'textScore' } });
    }
    const products = await query.lean();
    // Normalize options format for all products
    const normalizedProducts = products.map(normalizeProductOptions);
    res.json(normalizedProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get next suggested NBF code (must be before /:id)
router.get('/suggest-nbf', protect, async (req, res) => {
  try {
    const products = await Product.find({ nbfCode: { $exists: true, $ne: '' } }).select('nbfCode').lean();
    let maxNum = 0;
    for (const p of products) {
      const code = (p.nbfCode || '').trim();
      const match = code.match(/(\d+)$/) || code.match(/^(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const suggested = `NBF-${String(maxNum + 1).padStart(3, '0')}`;
    res.json({ suggestedNbf: suggested });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Normalize options format
    const normalizedProduct = normalizeProductOptions(product);
    res.json(normalizedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function parseOptions(op) {
  if (!op) return [];
  if (Array.isArray(op)) {
    // Normalize options: convert old format (strings) to new format (objects)
    return op.map(opt => {
      if (typeof opt === 'string') {
        // Old format: just the option name
        return opt;
      }
      if (opt && typeof opt === 'object' && opt.name) {
        // Normalize values: convert string values to objects with inStock
        const normalizedValues = (opt.values || []).map(val => {
          if (typeof val === 'string') {
            return { value: val, inStock: true, price: 0 };
          }
          if (val && typeof val === 'object' && val.value) {
            const price = val.price != null && !Number.isNaN(Number(val.price)) ? Number(val.price) : 0;
            return { value: val.value, inStock: val.inStock !== false, price };
          }
          return val;
        });
        return { ...opt, values: normalizedValues };
      }
      return opt;
    });
  }
  try {
    const a = typeof op === 'string' ? JSON.parse(op) : op;
    if (Array.isArray(a)) {
      return a.map(opt => {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object' && opt.name) {
          const normalizedValues = (opt.values || []).map(val => {
            if (typeof val === 'string') {
              return { value: val, inStock: true, price: 0 };
            }
            if (val && typeof val === 'object' && val.value) {
              const price = val.price != null && !Number.isNaN(Number(val.price)) ? Number(val.price) : 0;
              return { value: val.value, inStock: val.inStock !== false, price };
            }
            return val;
          });
          return { ...opt, values: normalizedValues };
        }
        return opt;
      });
    }
    return [];
  } catch {
    return [];
  }
}

// Admin: create product (with image upload)
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, nbfCode, inStock, featured, newArrivals, visible, options } = req.body;
    const images = [];
    if (req.files?.length && process.env.CLOUDINARY_CLOUD_NAME) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'womens-emporium' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          uploadStream.end(file.buffer);
        });
        images.push(result.secure_url);
      }
    }
    const trimmedNbf = nbfCode ? String(nbfCode).trim() : '';
    if (trimmedNbf) {
      const existing = await Product.findOne({ nbfCode: new RegExp(`^${trimmedNbf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (existing) {
        return res.status(400).json({ message: 'NBF code already exists' });
      }
    }
    const product = await Product.create({
      name,
      description: description || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: category || 'accessories',
      nbfCode: trimmedNbf || undefined,
      options: parseOptions(options),
      images,
      inStock: inStock !== 'false' && inStock !== false,
      featured: featured === 'true' || featured === true,
      newArrivals: newArrivals === 'true' || newArrivals === true,
      visible: visible !== 'false' && visible !== false,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update product
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { name, description, price, originalPrice, category, nbfCode, inStock, featured, newArrivals, visible, existingImages, options } = req.body;
    if (name != null) product.name = name;
    if (description != null) product.description = description;
    if (price != null) product.price = Number(price);
    if (originalPrice != null) product.originalPrice = Number(originalPrice);
    if (category != null) product.category = category;
    const trimmedNbf = nbfCode !== undefined ? (nbfCode ? String(nbfCode).trim() : '') : undefined;
    if (trimmedNbf !== undefined) {
      if (trimmedNbf) {
        const existing = await Product.findOne({
          _id: { $ne: req.params.id },
          nbfCode: new RegExp(`^${trimmedNbf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        });
        if (existing) {
          return res.status(400).json({ message: 'NBF code already exists' });
        }
      }
      product.nbfCode = trimmedNbf || undefined;
    }
    if (options !== undefined) product.options = parseOptions(options);
    if (inStock !== undefined) product.inStock = inStock === 'true' || inStock === true;
    if (featured !== undefined) product.featured = featured === 'true' || featured === true;
    if (newArrivals !== undefined) product.newArrivals = newArrivals === 'true' || newArrivals === true;
    if (visible !== undefined) product.visible = visible === 'true' || visible === true;

    const oldImages = [...product.images];
    let images = existingImages ? (Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages)) : [...product.images];
    
    if (req.files?.length && process.env.CLOUDINARY_CLOUD_NAME) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'womens-emporium' },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          uploadStream.end(file.buffer);
        });
        images.push(result.secure_url);
      }
    }
    
    // Delete removed images from Cloudinary
    const imagesToDelete = oldImages.filter(img => !images.includes(img));
    for (const imgUrl of imagesToDelete) {
      await deleteCloudinaryImage(imgUrl);
    }
    
    product.images = images;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete product
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Delete all product images from Cloudinary
    if (product.images && Array.isArray(product.images)) {
      for (const imgUrl of product.images) {
        await deleteCloudinaryImage(imgUrl);
      }
    }
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
