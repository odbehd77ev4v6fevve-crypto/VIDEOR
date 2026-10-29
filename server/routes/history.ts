import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { WatchHistory } from '../models/WatchHistory';
import { Video } from '../models/Video';
import { requireAuth } from '../middleware/auth';
import { isValidObjectId, parseNonNegativeNumber } from '../utils';

const router = Router();

// GET /api/history - Paginated user watch history
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;

    const [items, totalResult] = await Promise.all([
      WatchHistory.find({ userId, videoId: { $ne: null } })
        .populate({
          path: 'videoId',
          populate: { path: 'categoryId', select: 'name slug' },
        })
        .sort({ lastWatchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WatchHistory.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), videoId: { $ne: null } } },
        {
          $lookup: {
            from: 'videos',
            localField: 'videoId',
            foreignField: '_id',
            as: 'existingVideo',
          },
        },
        { $match: { 'existingVideo.0': { $exists: true } } },
        { $count: 'total' },
      ]),
    ]);

    const validItems = items.filter((item) => item.videoId != null);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      history: validItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[History Route] Get history error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve watch history.' });
  }
});

// POST /api/history/progress - Record or update playback checkpoint
router.post('/progress', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { videoId, youtubeVideoId, positionSeconds, durationSeconds } = req.body;

    if (!isValidObjectId(videoId) || typeof youtubeVideoId !== 'string' || !youtubeVideoId.trim()) {
      res.status(400).json({ success: false, error: 'A valid videoId and youtubeVideoId are required.' });
      return;
    }

    const pos = Math.min(parseNonNegativeNumber(positionSeconds), 86_400);
    const dur = Math.min(parseNonNegativeNumber(durationSeconds), 86_400);
    if (pos < 5) {
      res.status(400).json({ success: false, error: 'A history entry requires at least five qualifying seconds of playback.' });
      return;
    }
    if (dur > 0 && pos > dur) {
      res.status(400).json({ success: false, error: 'positionSeconds cannot exceed durationSeconds.' });
      return;
    }
    const completionPercent = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
    const isCompleted = completionPercent >= 90;

    // Verify video exists
    const videoExists = await Video.findById(videoId).select('_id youtubeVideoId');
    if (!videoExists) {
      res.status(404).json({ success: false, error: 'Target video not found in catalog.' });
      return;
    }
    if (videoExists.youtubeVideoId !== youtubeVideoId.trim()) {
      res.status(400).json({ success: false, error: 'youtubeVideoId does not match videoId.' });
      return;
    }

    const updatedHistory = await WatchHistory.findOneAndUpdate(
      { userId, videoId },
      {
        $set: {
          youtubeVideoId: videoExists.youtubeVideoId,
          positionSeconds: pos,
          durationSeconds: dur,
          completionPercent,
          isCompleted,
          lastWatchedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      history: updatedHistory,
    });
  } catch (err: any) {
    console.error('[History Route] Update progress error:', err);
    res.status(500).json({ success: false, error: 'Failed to record playback progress.' });
  }
});

// DELETE /api/history/:videoId - Remove single entry from history
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

    const result = await WatchHistory.deleteOne(targetQuery);

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, error: 'History record not found.' });
      return;
    }

    res.json({ success: true, message: 'Removed from watch history.' });
  } catch (err: any) {
    console.error('[History Route] Delete item error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete history record.' });
  }
});

// DELETE /api/history - Clear all user watch history
router.delete('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    await WatchHistory.deleteMany({ userId });

    res.json({ success: true, message: 'Watch history cleared successfully.' });
  } catch (err: any) {
    console.error('[History Route] Clear all error:', err);
    res.status(500).json({ success: false, error: 'Failed to clear watch history.' });
  }
});

export default router;
