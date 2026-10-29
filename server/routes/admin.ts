import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAdmin } from '../middleware/auth';
import { Video } from '../models/Video';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { Report } from '../models/Report';
import { Playlist } from '../models/Playlist';
import { HomepageConfig } from '../models/HomepageConfig';
import { AuditLog } from '../models/AuditLog';
import { PlatformSettings } from '../models/PlatformSettings';
import { WatchHistory } from '../models/WatchHistory';
import { WatchLater } from '../models/WatchLater';
import { parseYouTubeUrl, fetchYouTubeMetadata } from '../services/youtube';
import { getDatabaseStatus } from '../db/connection';
import { isValidObjectId } from '../utils';

const router = Router();

// Protect all admin routes
router.use(requireAdmin);

// Helper for audit logging
async function logAudit(req: Request, action: string, targetType: string, targetId?: string, details?: any) {
  try {
    await AuditLog.create({
      actorId: req.user?._id,
      actorEmail: req.user?.email || 'admin@vidora.tv',
      action,
      targetType,
      targetId,
      details,
      ip: req.ip || '',
    });
  } catch (err) {
    console.error('[Audit Log] Failed to record:', err);
  }
}

// 1. Dashboard Overview Stats
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalVideos,
      publishedVideos,
      draftVideos,
      archivedVideos,
      totalCategories,
      totalUsers,
      pendingReports,
      recentActivity,
    ] = await Promise.all([
      Video.countDocuments(),
      Video.countDocuments({ status: 'published' }),
      Video.countDocuments({ status: 'draft' }),
      Video.countDocuments({ status: 'archived' }),
      Category.countDocuments(),
      User.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const dbStatus = getDatabaseStatus();

    res.json({
      success: true,
      stats: {
        videos: {
          total: totalVideos,
          published: publishedVideos,
          draft: draftVideos,
          archived: archivedVideos,
        },
        categories: totalCategories,
        users: totalUsers,
        reports: {
          pending: pendingReports,
        },
        database: dbStatus,
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error('[Admin Route] Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve administrative statistics.' });
  }
});

// 2. Video Preview by YouTube URL
router.post('/videos/preview-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    const parsed = parseYouTubeUrl(url);

    if (!parsed.isValid || !parsed.videoId) {
      res.status(400).json({ success: false, error: parsed.error || 'Invalid YouTube URL' });
      return;
    }

    const existingVideo = await Video.findOne({ youtubeVideoId: parsed.videoId }).select('displayTitle status createdAt');
    if (existingVideo) {
      res.status(409).json({
        success: false,
        error: `Video already exists in catalog ("${existingVideo.displayTitle}", Status: ${existingVideo.status}).`,
        existingId: (existingVideo._id as any).toString(),
      });
      return;
    }

    const metadata = await fetchYouTubeMetadata(parsed.videoId);

    res.json({
      success: true,
      metadata,
    });
  } catch (err: any) {
    console.error('[Admin Route] Video preview error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch YouTube video metadata.' });
  }
});

// 3. Add Video to Catalog
router.post('/videos', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      youtubeUrl,
      categoryId,
      displayTitle,
      displayDescription,
      status,
      isFeatured,
      featuredOrder,
      tags,
    } = req.body;

    if (displayTitle !== undefined && typeof displayTitle !== 'string') {
      res.status(400).json({ success: false, error: 'displayTitle must be a string.' });
      return;
    }
    if (displayDescription !== undefined && typeof displayDescription !== 'string') {
      res.status(400).json({ success: false, error: 'displayDescription must be a string.' });
      return;
    }
    if (featuredOrder !== undefined && (!Number.isFinite(Number(featuredOrder)) || Number(featuredOrder) < 0)) {
      res.status(400).json({ success: false, error: 'featuredOrder must be a non-negative number.' });
      return;
    }

    const parsed = parseYouTubeUrl(youtubeUrl);
    if (!parsed.isValid || !parsed.videoId) {
      res.status(400).json({ success: false, error: parsed.error || 'Invalid YouTube URL.' });
      return;
    }

    const existing = await Video.findOne({ youtubeVideoId: parsed.videoId });
    if (existing) {
      res.status(409).json({ success: false, error: 'This video is already in the VIDORA catalog.' });
      return;
    }

    // Fetch official metadata
    const metadata = await fetchYouTubeMetadata(parsed.videoId);

    let categoryDoc = null;
    let categorySlug = '';
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      if (!isValidObjectId(categoryId)) {
        res.status(400).json({ success: false, error: 'categoryId is invalid.' });
        return;
      }
      categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        res.status(404).json({ success: false, error: 'Category not found.' });
        return;
      }
      categorySlug = categoryDoc.slug;
    }
    if (status !== undefined && !['published', 'draft', 'archived'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid video status.' });
      return;
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag: unknown) => typeof tag !== 'string'))) {
      res.status(400).json({ success: false, error: 'tags must be an array of strings.' });
      return;
    }

    const newVideo = await Video.create({
      youtubeVideoId: parsed.videoId,
      originalUrl: metadata.originalUrl,
      originalTitle: metadata.originalTitle,
      originalDescription: metadata.originalDescription,
      displayTitle: (displayTitle && displayTitle.trim()) || metadata.originalTitle,
      displayDescription: displayDescription !== undefined ? displayDescription.trim() : metadata.originalDescription,
      channelId: metadata.channelId,
      channelTitle: metadata.channelTitle,
      channelThumbnailUrl: metadata.channelThumbnailUrl || '',
      duration: metadata.duration,
      durationSeconds: metadata.durationSeconds,
      publishedAt: metadata.publishedAt,
      thumbnails: metadata.thumbnails,
      viewCount: metadata.viewCount,
      likeCount: metadata.likeCount,
      commentCount: metadata.commentCount,
      categoryId: categoryDoc?._id,
      categorySlug: categorySlug,
      tags: Array.isArray(tags) ? tags : metadata.tags,
      status: ['published', 'draft', 'archived'].includes(status) ? status : 'published',
      isFeatured: Boolean(isFeatured),
      featuredOrder: Number(featuredOrder) || 0,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    });

    if (categoryDoc) {
      await Category.updateOne({ _id: categoryDoc._id }, { $inc: { videoCount: 1 } });
    }

    await logAudit(req, 'VIDEO_CREATE', 'Video', (newVideo._id as any).toString(), {
      title: newVideo.displayTitle,
      youtubeVideoId: newVideo.youtubeVideoId,
    });

    res.status(201).json({
      success: true,
      video: newVideo,
    });
  } catch (err: any) {
    console.error('[Admin Route] Create video error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save video to database.' });
  }
});

// 4. Admin Videos Listing
router.get('/videos', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status as string;
    const categoryFilter = req.query.category as string;
    const search = ((req.query.search as string) || '').trim();

    const filter: any = {};
    if (statusFilter && statusFilter !== 'all') {
      filter.status = statusFilter;
    }
    if (categoryFilter && categoryFilter !== 'all') {
      filter.categorySlug = categoryFilter;
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ displayTitle: regex }, { channelTitle: regex }, { youtubeVideoId: regex }];
    }

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
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
    console.error('[Admin Route] Videos list error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve videos list.' });
  }
});

// 5. Single Video Details for Edit
router.get('/videos/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid video ID.' });
      return;
    }
    const video = await Video.findById(id).populate('categoryId', 'name slug');
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found.' });
      return;
    }
    res.json({ success: true, video });
  } catch (err: any) {
    console.error('[Admin Route] Get single video error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve video details.' });
  }
});

// 6. Update Video
router.put('/videos/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid video ID.' });
      return;
    }
    const {
      displayTitle,
      displayDescription,
      categoryId,
      status,
      isFeatured,
      featuredOrder,
      tags,
    } = req.body;

    if (status !== undefined && !['published', 'draft', 'archived'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid video status.' });
      return;
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag: unknown) => typeof tag !== 'string'))) {
      res.status(400).json({ success: false, error: 'tags must be an array of strings.' });
      return;
    }
    if (featuredOrder !== undefined && (!Number.isFinite(Number(featuredOrder)) || Number(featuredOrder) < 0)) {
      res.status(400).json({ success: false, error: 'featuredOrder must be a non-negative number.' });
      return;
    }

    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found.' });
      return;
    }

    const previousCategoryId = video.categoryId?.toString();

    if (displayTitle && typeof displayTitle === 'string') {
      video.displayTitle = displayTitle.trim();
    }
    if (displayDescription !== undefined) {
      video.displayDescription = String(displayDescription).trim();
    }
    if (status && ['published', 'draft', 'archived'].includes(status)) {
      video.status = status;
    }
    if (isFeatured !== undefined) {
      video.isFeatured = Boolean(isFeatured);
    }
    if (featuredOrder !== undefined) {
      video.featuredOrder = Number(featuredOrder) || 0;
    }
    if (Array.isArray(tags)) {
      video.tags = tags;
    }

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      if (!isValidObjectId(categoryId)) {
        res.status(400).json({ success: false, error: 'categoryId is invalid.' });
        return;
      }
      const categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        res.status(404).json({ success: false, error: 'Category not found.' });
        return;
      }
      video.categoryId = categoryDoc._id as any;
      video.categorySlug = categoryDoc.slug;
    } else if (categoryId === null || categoryId === '') {
      video.categoryId = undefined;
      video.categorySlug = undefined;
    }

    await video.save();

    if (previousCategoryId && previousCategoryId !== video.categoryId?.toString()) {
      await Category.updateOne({ _id: previousCategoryId }, { $inc: { videoCount: -1 } });
    }
    if (video.categoryId && previousCategoryId !== video.categoryId.toString()) {
      await Category.updateOne({ _id: video.categoryId }, { $inc: { videoCount: 1 } });
    }

    await logAudit(req, 'VIDEO_UPDATE', 'Video', (video._id as any).toString(), {
      title: video.displayTitle,
      status: video.status,
    });

    res.json({ success: true, video });
  } catch (err: any) {
    console.error('[Admin Route] Update video error:', err);
    res.status(500).json({ success: false, error: 'Failed to update video.' });
  }
});

// 7. Sync Video Metadata from YouTube
router.post('/videos/:id/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid video ID.' });
      return;
    }
    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found.' });
      return;
    }

    const metadata = await fetchYouTubeMetadata(video.youtubeVideoId);

    video.originalTitle = metadata.originalTitle;
    if (metadata.originalDescription) video.originalDescription = metadata.originalDescription;
    if (metadata.channelTitle) video.channelTitle = metadata.channelTitle;
    if (metadata.duration) video.duration = metadata.duration;
    if (metadata.durationSeconds) video.durationSeconds = metadata.durationSeconds;
    if (metadata.viewCount) video.viewCount = metadata.viewCount;
    if (metadata.likeCount) video.likeCount = metadata.likeCount;
    if (metadata.commentCount) video.commentCount = metadata.commentCount;
    video.thumbnails = metadata.thumbnails;
    video.syncStatus = 'synced';
    video.lastSyncedAt = new Date();

    await video.save();

    await logAudit(req, 'VIDEO_SYNC', 'Video', (video._id as any).toString(), {
      youtubeVideoId: video.youtubeVideoId,
    });

    res.json({ success: true, message: 'Video metadata refreshed from YouTube.', video });
  } catch (err: any) {
    console.error('[Admin Route] Sync video error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to refresh metadata from YouTube.' });
  }
});

// 8. Delete / Archive Video
router.delete('/videos/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid video ID.' });
      return;
    }
    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found.' });
      return;
    }

    const title = video.displayTitle;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await WatchHistory.deleteMany({ videoId: video._id }, { session });
        await WatchLater.deleteMany({ videoId: video._id }, { session });

        const playlists = await Playlist.find({ 'videos.videoId': video._id }).session(session);
        for (const playlist of playlists) {
          const nextVideos = (playlist.videos || []).filter(
            (entry) => !entry.videoId || entry.videoId.toString() !== video._id.toString()
          );
          playlist.videos = nextVideos;
          playlist.videoCount = nextVideos.length;
          await playlist.save({ session });
        }

        await HomepageConfig.updateMany(
          { heroVideoId: video._id },
          { $unset: { heroVideoId: '' } },
          { session }
        );
        const homepageConfigs = await HomepageConfig.find({ 'sections.videoIds': video._id }).session(session);
        for (const config of homepageConfigs) {
          config.sections = (config.sections || []).map((section) => {
            const plainSection = typeof (section as any).toObject === 'function' ? (section as any).toObject() : section;
            return {
              ...plainSection,
              videoIds: (plainSection.videoIds || []).filter((id: any) => id.toString() !== video._id.toString()),
            };
          });
          await config.save({ session });
        }
        if (video.categoryId) {
          await Category.updateOne(
            { _id: video.categoryId },
            { $inc: { videoCount: -1 } },
            { session }
          );
        }
        await Video.deleteOne({ _id: video._id }, { session });
      });
    } finally {
      await session.endSession();
    }

    await logAudit(req, 'VIDEO_DELETE', 'Video', id, { title });

    res.json({ success: true, message: `Video "${title}" was permanently removed from catalog.` });
  } catch (err: any) {
    console.error('[Admin Route] Delete video error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete video.' });
  }
});

// 9. Categories Management (List, Add, Update, Delete)
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 }).lean();

    const counts = await Video.aggregate([
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id, c.count));

    const enriched = categories.map((c) => ({
      ...c,
      videoCount: countMap.get(c.slug) || 0,
    }));

    res.json({ success: true, categories: enriched });
  } catch (err: any) {
    console.error('[Admin Route] Categories list error:', err);
    res.status(500).json({ success: false, error: 'Failed to list categories.' });
  }
});

router.post('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, description, icon, status, order } = req.body;

    if (typeof name !== 'string' || typeof slug !== 'string' || !name.trim() || !slug.trim()) {
      res.status(400).json({ success: false, error: 'Category name and slug are required.' });
      return;
    }

    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    if (!normalizedSlug) {
      res.status(400).json({ success: false, error: 'Slug must contain a letter or number.' });
      return;
    }
    const existing = await Category.findOne({ slug: normalizedSlug });
    if (existing) {
      res.status(409).json({ success: false, error: 'A category with this slug already exists.' });
      return;
    }

    const newCategory = await Category.create({
      name: name.trim(),
      slug: normalizedSlug,
      description: (description || '').trim(),
      icon: icon || 'Film',
      status: ['published', 'hidden'].includes(status) ? status : 'published',
      order: Number(order) || 0,
    });

    await logAudit(req, 'CATEGORY_CREATE', 'Category', (newCategory._id as any).toString(), {
      name: newCategory.name,
      slug: newCategory.slug,
    });

    res.status(201).json({ success: true, category: newCategory });
  } catch (err: any) {
    console.error('[Admin Route] Create category error:', err);
    res.status(500).json({ success: false, error: 'Failed to create category.' });
  }
});

router.put('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid category ID.' });
      return;
    }
    const { name, description, icon, status, order } = req.body;
    if (status !== undefined && !['published', 'hidden'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid category status.' });
      return;
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 60)) {
      res.status(400).json({ success: false, error: 'Category name must contain 1 to 60 characters.' });
      return;
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
      res.status(400).json({ success: false, error: 'Category description must be no more than 500 characters.' });
      return;
    }
    if (icon !== undefined && typeof icon !== 'string') {
      res.status(400).json({ success: false, error: 'Category icon must be a string.' });
      return;
    }
    if (order !== undefined && !Number.isFinite(Number(order))) {
      res.status(400).json({ success: false, error: 'Category order must be numeric.' });
      return;
    }

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found.' });
      return;
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon) category.icon = icon;
    if (status && ['published', 'hidden'].includes(status)) category.status = status;
    if (order !== undefined) category.order = Number(order) || 0;

    await category.save();

    await logAudit(req, 'CATEGORY_UPDATE', 'Category', id, { name: category.name });

    res.json({ success: true, category });
  } catch (err: any) {
    console.error('[Admin Route] Update category error:', err);
    res.status(500).json({ success: false, error: 'Failed to update category.' });
  }
});

router.delete('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid category ID.' });
      return;
    }
    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found.' });
      return;
    }

    const linkedCount = await Video.countDocuments({ categorySlug: category.slug });
    if (linkedCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete category: ${linkedCount} video(s) are currently assigned to it. Reassign them first.`,
      });
      return;
    }

    await Category.deleteOne({ _id: id });

    await logAudit(req, 'CATEGORY_DELETE', 'Category', id, { slug: category.slug });

    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    console.error('[Admin Route] Delete category error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete category.' });
  }
});

// 10. Homepage CMS Configuration
router.get('/homepage', async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await HomepageConfig.findOne().populate('heroVideoId').populate('sections.videoIds').lean();
    if (!config) {
      config = await HomepageConfig.create({
        heroCustomTitle: '',
        heroCustomSubtitle: '',
        heroCustomBadge: 'FEATURED DISCOVERY',
        sections: [
          { id: 'sec-popular', title: 'Trending & Popular', subtitle: 'Most watched right now across VIDORA', type: 'popular', limit: 8, isVisible: true, order: 0 },
          { id: 'sec-recent', title: 'Recently Added', subtitle: 'Fresh uploads and latest releases', type: 'recent', limit: 8, isVisible: true, order: 1 },
        ],
      });
    }

    res.json({ success: true, config });
  } catch (err: any) {
    console.error('[Admin Route] Get homepage config error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve homepage configuration.' });
  }
});

router.put('/homepage', async (req: Request, res: Response): Promise<void> => {
  try {
    const { heroVideoId, heroCustomTitle, heroCustomSubtitle, heroCustomBadge, sections } = req.body;
    if (heroVideoId !== undefined && heroVideoId !== null && heroVideoId !== '' && !isValidObjectId(heroVideoId)) {
      res.status(400).json({ success: false, error: 'heroVideoId is invalid.' });
      return;
    }
    if (heroCustomTitle !== undefined && typeof heroCustomTitle !== 'string') {
      res.status(400).json({ success: false, error: 'heroCustomTitle must be a string.' });
      return;
    }
    if (heroCustomSubtitle !== undefined && typeof heroCustomSubtitle !== 'string') {
      res.status(400).json({ success: false, error: 'heroCustomSubtitle must be a string.' });
      return;
    }
    if (heroCustomBadge !== undefined && typeof heroCustomBadge !== 'string') {
      res.status(400).json({ success: false, error: 'heroCustomBadge must be a string.' });
      return;
    }
    if (sections !== undefined && (!Array.isArray(sections) || sections.length > 20)) {
      res.status(400).json({ success: false, error: 'sections must be an array containing no more than 20 items.' });
      return;
    }

    let config = await HomepageConfig.findOne();
    if (!config) {
      config = new HomepageConfig();
    }

    if (heroVideoId && mongoose.Types.ObjectId.isValid(heroVideoId)) {
      const eligibleHero = await Video.findOne({ _id: heroVideoId, status: 'published' }).select('_id');
      if (!eligibleHero) {
        res.status(400).json({ success: false, error: 'heroVideoId must reference a published video.' });
        return;
      }
      config.heroVideoId = heroVideoId;
    } else if (heroVideoId === null) {
      config.heroVideoId = undefined;
    }

    config.heroCustomTitle = (heroCustomTitle ?? '').trim().slice(0, 140);
    config.heroCustomSubtitle = (heroCustomSubtitle ?? '').trim().slice(0, 500);
    config.heroCustomBadge = (heroCustomBadge ?? 'FEATURED DISCOVERY').trim().slice(0, 80);

    if (Array.isArray(sections)) {
      const validTypes = ['recent', 'popular', 'category', 'collection', 'custom'];
      const invalidSection = sections.find((section: any) =>
        !section || typeof section !== 'object' ||
        typeof section.id !== 'string' || !section.id.trim() ||
        typeof section.title !== 'string' || !section.title.trim() ||
        !validTypes.includes(section.type) ||
        !Number.isInteger(Number(section.limit)) || Number(section.limit) < 1 || Number(section.limit) > 100 ||
        (section.videoIds !== undefined && (!Array.isArray(section.videoIds) || section.videoIds.some((id: unknown) => !isValidObjectId(id))))
      );
      if (invalidSection) {
        res.status(400).json({ success: false, error: 'One or more homepage sections are invalid.' });
        return;
      }
      config.sections = sections;
    }

    await config.save();

    await logAudit(req, 'HOMEPAGE_CMS_UPDATE', 'HomepageConfig', (config._id as any).toString());

    res.json({ success: true, config });
  } catch (err: any) {
    console.error('[Admin Route] Update homepage config error:', err);
    res.status(500).json({ success: false, error: 'Failed to update homepage configuration.' });
  }
});

// 11. Reports / Moderation Queue
router.get('/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const statusFilter = req.query.status as string;
    const filter: any = {};
    if (statusFilter && statusFilter !== 'all') {
      filter.status = statusFilter;
    }

    const reports = await Report.find(filter)
      .populate('videoId', 'displayTitle youtubeVideoId status thumbnails')
      .populate('userId', 'displayName email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, reports });
  } catch (err: any) {
    console.error('[Admin Route] Reports list error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve moderation reports.' });
  }
});

router.put('/reports/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid report ID.' });
      return;
    }
    const { status, adminNotes, unpublishVideo } = req.body;
    if (status !== undefined && !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid report status.' });
      return;
    }
    if (adminNotes !== undefined && typeof adminNotes !== 'string') {
      res.status(400).json({ success: false, error: 'adminNotes must be a string.' });
      return;
    }
    if (unpublishVideo !== undefined && typeof unpublishVideo !== 'boolean') {
      res.status(400).json({ success: false, error: 'unpublishVideo must be a boolean.' });
      return;
    }

    const report = await Report.findById(id);
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found.' });
      return;
    }

    if (status && ['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      report.status = status;
      report.reviewedBy = req.user!._id as any;
      report.reviewedAt = new Date();
    }

    if (adminNotes !== undefined) {
      report.adminNotes = adminNotes.trim();
    }

    await report.save();

    // If moderator requested to take down the video immediately
    if (unpublishVideo && report.videoId) {
      await Video.updateOne({ _id: report.videoId }, { status: 'archived' });
      await logAudit(req, 'MODERATION_UNPUBLISH_VIDEO', 'Video', report.videoId.toString(), {
        reportId: id,
        reason: report.reason,
      });
    }

    await logAudit(req, 'REPORT_MODERATE', 'Report', id, { status: report.status });

    res.json({ success: true, report });
  } catch (err: any) {
    console.error('[Admin Route] Moderate report error:', err);
    res.status(500).json({ success: false, error: 'Failed to update report status.' });
  }
});

// 12. Users Management
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Admin Route] Users list error:', err);
    res.status(500).json({ success: false, error: 'Failed to list users.' });
  }
});

router.put('/users/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID.' });
      return;
    }
    const { status, role } = req.body;
    if (status !== undefined && !['active', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid user status.' });
      return;
    }
    if (role !== undefined && !['admin', 'user'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid user role.' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (status && ['active', 'suspended'].includes(status)) {
      user.status = status;
    }
    if (role && ['admin', 'user'].includes(role)) {
      if (req.user?._id === id && role !== 'admin') {
        res.status(400).json({ success: false, error: 'An administrator cannot demote their own account.' });
        return;
      }
      user.role = role;
    }

    await user.save();

    await logAudit(req, 'USER_STATUS_CHANGE', 'User', id, { status: user.status, role: user.role });

    res.json({ success: true, message: 'User updated.', user: { _id: user._id, status: user.status, role: user.role } });
  } catch (err: any) {
    console.error('[Admin Route] User update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user.' });
  }
});

// 13. Audit Logs Listing
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 30);
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();

    res.json({ success: true, logs });
  } catch (err: any) {
    console.error('[Admin Route] Audit logs error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
});

// 14. Platform Settings
router.get('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await PlatformSettings.findOne().lean();
    if (!settings) {
      settings = await PlatformSettings.create({
        siteName: 'VIDORA',
        tagline: 'Premium Curated Video Discovery',
        allowRegistration: true,
        youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY.includes('YourYouTubeDataApiKeyHere')),
      });
    }

    const dbStatus = getDatabaseStatus();

    res.json({
      success: true,
      settings: {
        ...settings,
        youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY.includes('YourYouTubeDataApiKeyHere')),
      },
      database: dbStatus,
    });
  } catch (err: any) {
    console.error('[Admin Route] Settings error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve platform settings.' });
  }
});

router.put('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { siteName, tagline, allowRegistration, featuredNotice } = req.body;
    if (siteName !== undefined && (typeof siteName !== 'string' || !siteName.trim())) {
      res.status(400).json({ success: false, error: 'siteName must be a non-empty string.' });
      return;
    }
    if (tagline !== undefined && typeof tagline !== 'string') {
      res.status(400).json({ success: false, error: 'tagline must be a string.' });
      return;
    }
    if (allowRegistration !== undefined && typeof allowRegistration !== 'boolean') {
      res.status(400).json({ success: false, error: 'allowRegistration must be a boolean.' });
      return;
    }
    if (featuredNotice !== undefined && typeof featuredNotice !== 'string') {
      res.status(400).json({ success: false, error: 'featuredNotice must be a string.' });
      return;
    }

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings();
    }

    if (siteName) settings.siteName = siteName.trim();
    if (tagline) settings.tagline = tagline.trim();
    if (allowRegistration !== undefined) settings.allowRegistration = Boolean(allowRegistration);
    if (featuredNotice !== undefined) settings.featuredNotice = featuredNotice.trim();

    await settings.save();

    await logAudit(req, 'SETTINGS_UPDATE', 'PlatformSettings', (settings._id as any).toString());

    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('[Admin Route] Update settings error:', err);
    res.status(500).json({ success: false, error: 'Failed to update platform settings.' });
  }
});

export default router;
