import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { WatchLater } from '../models/WatchLater';
import { Video } from '../models/Video';
import { requireAuth } from '../middleware/auth';
import { isValidObjectId } from '../utils';

const router = Router();

// GET /api/watch-later - List saved videos
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    const [items] = await Promise.all([
      WatchLater.find({ userId })
        .populate({
          path: 'videoId',
          populate: { path: 'categoryId', select: 'name slug icon' },
        })
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const validItems = items.filter((item) => item.videoId != null);
    const total = validItems.length < limit && page === 1
      ? validItems.length
      : await WatchLater.countDocuments({ userId, videoId: { $ne: null } });

    res.json({
      success: true,
      savedVideos: validItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[WatchLater Route] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve saved videos.' });
  }
});

// GET /api/watch-later/check/:videoId - Check if video is saved
router.get('/check/:videoId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { videoId } = req.params;

    let targetQuery: any = { userId };
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      targetQuery.$or = [{ videoId }, { youtubeVideoId: videoId }];
    } else {
      targetQuery.youtubeVideoId = videoId;
    }

    const exists = await WatchLater.findOne(targetQuery).select('_id');

    res.json({
      success: true,
      isSaved: Boolean(exists),
    });
  } catch (err: any) {
    console.error('[WatchLater Route] Check error:', err);
    res.status(500).json({ success: false, error: 'Failed to check watch later status.' });
  }
});

// POST /api/watch-later/toggle - Toggle save/unsave
router.post('/toggle', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { videoId, youtubeVideoId } = req.body;

    if ((!isValidObjectId(videoId) && typeof videoId !== 'undefined') ||
        (typeof youtubeVideoId !== 'string' && typeof youtubeVideoId !== 'undefined')) {
      res.status(400).json({ success: false, error: 'videoId or youtubeVideoId has an invalid format.' });
      return;
    }
    if (!videoId && !youtubeVideoId) {
      res.status(400).json({ success: false, error: 'videoId or youtubeVideoId is required.' });
      return;
    }

    let targetVideo;
    if (videoId && mongoose.Types.ObjectId.isValid(videoId)) {
      targetVideo = await Video.findById(videoId);
    } else if (youtubeVideoId) {
      targetVideo = await Video.findOne({ youtubeVideoId });
    }

    if (!targetVideo) {
      res.status(404).json({ success: false, error: 'Video not found in catalog.' });
      return;
    }

    const existing = await WatchLater.findOne({ userId, videoId: targetVideo._id });

    if (existing) {
      await WatchLater.deleteOne({ _id: existing._id });
      res.json({
        success: true,
        isSaved: false,
        message: 'Removed from Watch Later.',
      });
    } else {
      await WatchLater.create({
        userId,
        videoId: targetVideo._id,
        youtubeVideoId: targetVideo.youtubeVideoId,
        addedAt: new Date(),
      });
      res.json({
        success: true,
        isSaved: true,
        message: 'Added to Watch Later.',
      });
    }
  } catch (err: any) {
    console.error('[WatchLater Route] Toggle error:', err);
    if (err?.code === 11000) {
      res.status(409).json({ success: false, error: 'Video is already in Watch Later.' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to update Watch Later.' });
  }
});

// DELETE /api/watch-later/:videoId - Remove single entry
router.delete('/:videoId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { videoId } = req.params;

    let targetQuery: any = { userId };
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      targetQuery.$or = [{ videoId }, { youtubeVideoId: videoId }];
    } else {
      targetQuery.youtubeVideoId = videoId;
    }

    const result = await WatchLater.deleteOne(targetQuery);

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, error: 'Video was not in Watch Later.' });
      return;
    }

    res.json({ success: true, message: 'Removed from Watch Later.' });
  } catch (err: any) {
    console.error('[WatchLater Route] Delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove from Watch Later.' });
  }
});

export default router;
