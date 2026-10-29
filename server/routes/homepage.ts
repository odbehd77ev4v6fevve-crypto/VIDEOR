import { Router, Request, Response } from 'express';
import { HomepageConfig, IHomepageSection } from '../models/HomepageConfig';
import { Video } from '../models/Video';
import { Category } from '../models/Category';

const router = Router();

// GET /api/homepage - Assembles hero and dynamic sections
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await HomepageConfig.findOne()
      .populate({ path: 'heroVideoId', match: { status: 'published' } })
      .lean();

    // 1. Determine hero video
    let heroVideo: any = config?.heroVideoId && (config.heroVideoId as any).status === 'published'
      ? config.heroVideoId
      : null;
    if (!heroVideo || heroVideo.status !== 'published') {
      heroVideo = await Video.findOne({ status: 'published', isFeatured: true })
        .populate('categoryId', 'name slug icon')
        .sort({ featuredOrder: 1, publishedAt: -1 })
        .lean();

      if (!heroVideo) {
        heroVideo = await Video.findOne({ status: 'published' })
          .populate('categoryId', 'name slug icon')
          .sort({ viewCount: -1, publishedAt: -1 })
          .lean();
      }
    }

    // 2. Build sections
    const rawSections: IHomepageSection[] = config?.sections && config.sections.length > 0
      ? config.sections.filter((s) => s.isVisible).sort((a, b) => a.order - b.order)
      : [
          { id: 'sec-popular', title: 'Trending & Popular', subtitle: 'Most watched right now across VIDORA', type: 'popular', limit: 8, isVisible: true, order: 0, categorySlug: '', videoIds: [] },
          { id: 'sec-recent', title: 'Recently Added', subtitle: 'Fresh uploads and latest releases', type: 'recent', limit: 8, isVisible: true, order: 1, categorySlug: '', videoIds: [] },
        ];

    const populatedSections = await Promise.all(
      rawSections.map(async (sec) => {
        let videos: any[] = [];

        if (sec.type === 'popular') {
          videos = await Video.find({ status: 'published' })
            .populate('categoryId', 'name slug icon')
            .sort({ viewCount: -1, viewsOnVidora: -1, publishedAt: -1 })
            .limit(sec.limit || 8)
            .lean();
        } else if (sec.type === 'recent') {
          videos = await Video.find({ status: 'published' })
            .populate('categoryId', 'name slug icon')
            .sort({ publishedAt: -1, _id: -1 })
            .limit(sec.limit || 8)
            .lean();
        } else if (sec.type === 'category' && sec.categorySlug) {
          videos = await Video.find({ status: 'published', categorySlug: sec.categorySlug })
            .populate('categoryId', 'name slug icon')
            .sort({ publishedAt: -1 })
            .limit(sec.limit || 8)
            .lean();
        } else if (sec.videoIds && sec.videoIds.length > 0) {
          videos = await Video.find({ status: 'published', _id: { $in: sec.videoIds } })
            .populate('categoryId', 'name slug icon')
            .limit(sec.limit || 8)
            .lean();
        }

        return {
          id: sec.id,
          title: sec.title,
          subtitle: sec.subtitle || '',
          type: sec.type,
          categorySlug: sec.categorySlug,
          videos,
        };
      })
    );

    // Filter out empty sections
    const validSections = populatedSections.filter((s) => s.videos.length > 0);

    // Also get top categories for quick browse bar
    const categories = await Category.find({ status: 'published' })
      .sort({ order: 1, name: 1 })
      .limit(8)
      .lean();

    res.json({
      success: true,
      hero: {
        video: heroVideo,
        customTitle: config?.heroCustomTitle || '',
        customSubtitle: config?.heroCustomSubtitle || '',
        customBadge: config?.heroCustomBadge || 'FEATURED CINEMA',
      },
      sections: validSections,
      topCategories: categories,
    });
  } catch (err: any) {
    console.error('[Homepage Route] Failed to assemble homepage:', err);
    res.status(500).json({ success: false, error: 'Failed to assemble homepage.' });
  }
});

export default router;
