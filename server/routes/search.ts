import { Router, Request, Response } from 'express';
import { Video } from '../models/Video';

const router = Router();

const getSingleQueryString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

// GET /api/search - Full search endpoint
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = getSingleQueryString(req.query.q).trim().slice(0, 200);
    const categorySlug = getSingleQueryString(req.query.category).trim().slice(0, 100);
    const sortKey = getSingleQueryString(req.query.sort).trim();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    const filter: any = { status: 'published' };

    if (categorySlug && categorySlug !== 'all') {
      filter.categorySlug = categorySlug;
    }

    let sort: any = { publishedAt: -1, _id: -1 };

    if (query) {
      const searchableFields = [
        'displayTitle',
        'originalTitle',
        'channelTitle',
        'tags',
        'displayDescription',
        'originalDescription',
      ];
      const terms = query.split(/\s+/u).filter(Boolean).slice(0, 8);
      filter.$and = terms.map((term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'iu');
        return { $or: searchableFields.map((field) => ({ [field]: regex })) };
      });

      if (sortKey === 'popular') {
        sort = { viewCount: -1, _id: -1 };
      } else if (sortKey === 'latest') {
        sort = { publishedAt: -1, _id: -1 };
      } else if (sortKey === 'duration') {
        sort = { durationSeconds: -1, _id: -1 };
      } else {
        // Default relevance: prioritizes exact/prefix titles or higher views
        sort = { viewCount: -1, publishedAt: -1, _id: -1 };
      }
    } else {
      if (sortKey === 'popular') {
        sort = { viewCount: -1, _id: -1 };
      } else {
        sort = { publishedAt: -1, _id: -1 };
      }
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
      query,
      videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Search Route] Search error:', err);
    res.status(500).json({ success: false, error: 'Search operation failed.' });
  }
});

// GET /api/search/autocomplete - Fast prefix search for instant dropdown
router.get('/autocomplete', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = getSingleQueryString(req.query.q).trim().slice(0, 200);
    if (!q || q.length < 2) {
      res.json({ success: true, suggestions: [] });
      return;
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const suggestions = await Video.find({
      status: 'published',
      $or: [{ displayTitle: regex }, { channelTitle: regex }, { tags: regex }],
    })
      .select('displayTitle youtubeVideoId channelTitle categorySlug thumbnails duration')
      .limit(6)
      .lean();

    res.json({
      success: true,
      suggestions: suggestions.map((s) => ({
        id: (s._id as any).toString(),
        videoId: s.youtubeVideoId,
        title: s.displayTitle,
        channel: s.channelTitle,
        category: s.categorySlug,
        thumbnail: s.thumbnails?.medium || s.thumbnails?.default || '',
        duration: s.duration,
      })),
    });
  } catch (err: any) {
    console.error('[Search Route] Autocomplete error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve search suggestions.' });
  }
});

export default router;
