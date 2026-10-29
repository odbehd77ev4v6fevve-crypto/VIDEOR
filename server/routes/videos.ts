import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { Category } from '../models/Category';

const router = Router();

// GET /api/videos - Public catalog listing with filters, search, sort, pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    const categorySlug = req.query.category as string;
    const sortKey = (req.query.sort as string) || 'latest';
    const searchQuery = (req.query.search as string) || '';

    const filter: any = { status: 'published' };

    if (categorySlug && categorySlug !== 'all') {
      filter.categorySlug = categorySlug;
    }

    if (searchQuery && searchQuery.trim() !== '') {
      filter.$text = { $search: searchQuery.trim() };
    }

    let sort: any = { publishedAt: -1, _id: -1 };
    if (sortKey === 'popular' || sortKey === 'views') {
      sort = { viewCount: -1, viewsOnVidora: -1, _id: -1 };
    } else if (sortKey === 'duration') {
      sort = { durationSeconds: -1, _id: -1 };
    } else if (sortKey === 'latest') {
      sort = { publishedAt: -1, createdAt: -1, _id: -1 };
    }

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate('categoryId', 'name slug icon')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments(filter),
    ]);

    res.json({
      success: true,
      videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Videos Route] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve videos.' });
  }
});

// GET /api/videos/featured - Returns featured video(s)
router.get('/featured', async (req: Request, res: Response): Promise<void> => {
  try {
    let featured = await Video.findOne({ status: 'published', isFeatured: true })
      .populate('categoryId', 'name slug icon')
      .sort({ featuredOrder: 1, publishedAt: -1 })
      .lean();

    if (!featured) {
      featured = await Video.findOne({ status: 'published' })
        .populate('categoryId', 'name slug icon')
        .sort({ viewCount: -1, publishedAt: -1 })
        .lean();
    }

    res.json({
      success: true,
      video: featured,
    });
  } catch (err: any) {
    console.error('[Videos Route] Featured error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve featured video.' });
  }
});

// GET /api/videos/:id - Single video details + related videos
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let query: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { youtubeVideoId: id }] };
    } else {
      query = { youtubeVideoId: id };
    }

    const video = await Video.findOne({ ...query, status: 'published' }).populate('categoryId', 'name slug icon description');

    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found in catalog.' });
      return;
    }

    await Video.updateOne({ _id: video._id }, { $inc: { viewsOnVidora: 1 } });

    // Fetch up to 8 related videos
    let relatedVideos = await Video.find({
      status: 'published',
      _id: { $ne: video._id },
      $or: [
        { categorySlug: video.categorySlug },
        { channelId: video.channelId },
        { tags: { $in: video.tags || [] } },
      ],
    })
      .populate('categoryId', 'name slug')
      .limit(8)
      .lean();

    if (relatedVideos.length < 4) {
      const moreVideos = await Video.find({
        status: 'published',
        _id: { $ne: video._id, $nin: relatedVideos.map((v) => v._id) },
      })
        .populate('categoryId', 'name slug')
        .sort({ viewCount: -1 })
        .limit(8 - relatedVideos.length)
        .lean();
      relatedVideos = [...relatedVideos, ...moreVideos];
    }

    res.json({
      success: true,
      video,
      relatedVideos,
    });
  } catch (err: any) {
    console.error('[Videos Route] Single video error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve video details.' });
  }
});

export default router;
