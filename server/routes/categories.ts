import { Router, Request, Response } from 'express';
import { Category } from '../models/Category';
import { Video } from '../models/Video';

const router = Router();

// GET /api/categories - All published categories
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ status: 'published' })
      .sort({ order: 1, name: 1 })
      .lean();

    // Dynamically calculate actual published video counts
    const counts = await Video.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id, c.count));

    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      videoCount: countMap.get(cat.slug) || 0,
    }));

    res.json({
      success: true,
      categories: categoriesWithCounts,
    });
  } catch (err: any) {
    console.error('[Categories Route] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

// GET /api/categories/:slug - Category details & videos
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, status: 'published' }).lean();

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found.' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find({ categorySlug: slug, status: 'published' })
        .populate('categoryId', 'name slug icon')
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments({ categorySlug: slug, status: 'published' }),
    ]);

    res.json({
      success: true,
      category: {
        ...category,
        videoCount: total,
      },
      videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Categories Route] Single category error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve category details.' });
  }
});

export default router;
