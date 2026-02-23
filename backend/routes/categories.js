import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protect } from '../middleware/auth.js';

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
        count,
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: list all categories (same as GET but for admin UI)
// Admin: create category
router.post('/', protect, async (req, res) => {
  try {
    const { name, slug, icon } = req.body;
    const s = (slug || name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const category = await Category.create({ 
      name: name || s, 
      slug: s || name,
      icon: icon || '🛍️'
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update category
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, slug, icon } = req.body;
    const updateData = {};
    if (name != null) updateData.name = name;
    if (slug != null) updateData.slug = slug.toLowerCase().trim();
    if (icon != null) updateData.icon = icon.trim();
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
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
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
