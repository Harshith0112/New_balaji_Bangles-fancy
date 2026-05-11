import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protect } from '../middleware/auth.js';
import { emitSiteDataUpdated } from '../siteSocket.js';

function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const { pathname } = new URL(url);
    const marker = '/upload/';
    const markerIdx = pathname.indexOf(marker);
    if (markerIdx === -1) return null;

    const tail = pathname.slice(markerIdx + marker.length);
    const segments = tail.split('/').filter(Boolean);
    if (!segments.length) return null;

    const looksLikeTransformSegment = (segment) =>
      segment.includes(',') || /^(?:[a-z]{1,3}_.+|t_.+)$/.test(segment);

    let start = 0;
    while (start < segments.length && !/^v\d+$/.test(segments[start]) && looksLikeTransformSegment(segments[start])) {
      start += 1;
    }

    if (start < segments.length && /^v\d+$/.test(segments[start])) {
      start += 1;
    }
    if (start >= segments.length) return null;

    const end = segments.length - 1;
    const last = segments[end].replace(/\.[^.]+$/, '');
    if (!last) return null;
    return decodeURIComponent([...segments.slice(start, end), last].join('/'));
  } catch {
    return null;
  }
}

function sameCloudinaryAsset(urlA, urlB) {
  const a = extractPublicId(urlA);
  const b = extractPublicId(urlB);
  return !!a && !!b && a === b;
}

async function deleteCloudinaryImage(url) {
  if (!url || !process.env.CLOUDINARY_CLOUD_NAME) return;
  if (!url.includes('cloudinary.com')) return;
  try {
    const publicId = extractPublicId(url);
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting category image from Cloudinary:', err.message);
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const MAX_UPLOAD_BYTES = 500 * 1024;

function categoryUploadOptions() {
  return {
    folder: 'womens-emporium/categories',
    format: 'webp',
    transformation: [
      { width: 512, height: 512, crop: 'limit' },
      { quality: 'auto:good' },
    ],
  };
}

const router = express.Router();

// Public: get list of categories with product counts
router.get('/', async (req, res) => {
  try {
    const counts = await Product.aggregate([
      // Count only visible (or unspecified) products, case-insensitive by category
      {
        $match: {
          $or: [
            { visible: { $exists: false } },
            { visible: true },
          ],
        },
      },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } },
    ]);
    const categories = await Category.find().sort({ order: 1, slug: 1 }).lean();
    const list = categories.map((c) => {
      const slug = (c.slug || '').toLowerCase();
      // Try to match both singular/plural variants to be tolerant of data mismatches
      const keys = new Set([slug]);
      if (!slug.endsWith('s')) {
        keys.add(`${slug}s`);
      } else {
        keys.add(slug.slice(0, -1));
      }
      const count = counts
        .filter((x) => x._id && keys.has(x._id))
        .reduce((sum, x) => sum + (x.count || 0), 0);
      return {
        id: slug,
        _id: c._id,
        name: c.name,
        slug,
        icon: c.icon || '🛍️',
        description: (c.description && String(c.description).trim()) || '',
        count,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: list all categories (same as GET but for admin UI)
// Admin: create category (JSON or multipart with optional image → stored in `icon` like emoji URLs)
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { name, slug, icon, description } = req.body;
    const s = (slug || name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let iconValue = (icon && String(icon).trim()) || '🛍️';
    const desc =
      description != null && String(description).trim() !== '' ? String(description).trim() : '';

    if (req.file && process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          categoryUploadOptions(),
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      if (Number(result?.bytes || 0) > MAX_UPLOAD_BYTES) {
        if (result?.secure_url) await deleteCloudinaryImage(result.secure_url);
        return res.status(400).json({ message: 'Category image is too large after optimization (max 500 KB).' });
      }
      iconValue = result.secure_url;
    }

    const category = await Category.create({
      name: name || s,
      slug: s || name,
      icon: iconValue,
    });
    emitSiteDataUpdated();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update category
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Category not found' });

    const { name, slug, icon, description } = req.body;
    const updateData = {};
    if (name != null) updateData.name = name;
    if (slug != null) updateData.slug = String(slug).toLowerCase().trim();
    if (description !== undefined) updateData.description = String(description).trim();

    if (req.file && process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          categoryUploadOptions(),
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      if (Number(result?.bytes || 0) > MAX_UPLOAD_BYTES) {
        if (result?.secure_url) await deleteCloudinaryImage(result.secure_url);
        return res.status(400).json({ message: 'Category image is too large after optimization (max 500 KB).' });
      }
      updateData.icon = result.secure_url;
      if (existing.icon && existing.icon.includes('cloudinary.com')) {
        await deleteCloudinaryImage(existing.icon);
      }
    } else if (icon != null) {
      const trimmed = String(icon).trim() || '🛍️';
      if (existing.icon && existing.icon.includes('cloudinary.com')) {
        const isUrl = /^https?:\/\//i.test(trimmed);
        const replacingImage =
          !isUrl || (isUrl && trimmed !== existing.icon && !sameCloudinaryAsset(trimmed, existing.icon));
        if (replacingImage) {
          await deleteCloudinaryImage(existing.icon);
        }
      }
      updateData.icon = trimmed;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    emitSiteDataUpdated();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: delete category
router.delete('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (category.icon && category.icon.includes('cloudinary.com')) {
      await deleteCloudinaryImage(category.icon);
    }
    emitSiteDataUpdated();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
