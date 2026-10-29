import { Router, Request, Response } from 'express';
import { WatchHistory } from '../models/WatchHistory';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/continue-watching - Retrieve unfinished videos with stored checkpoints
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 8);

    // Completion percent between 2% and 90% (meaning video has been started but not finished)
    const items = await WatchHistory.find({
      userId,
      isCompleted: false,
      completionPercent: { $gte: 2, $lt: 90 },
      positionSeconds: { $gt: 5 },
    })
      .populate({
        path: 'videoId',
        match: { status: 'published' },
        populate: { path: 'categoryId', select: 'name slug icon' },
      })
      .sort({ lastWatchedAt: -1 })
      .limit(limit)
      .lean();

    const validItems = items.filter((item) => item.videoId != null);

    res.json({
      success: true,
      continueWatching: validItems,
    });
  } catch (err: any) {
    console.error('[Continue Watching Route] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve continue watching items.' });
  }
});

export default router;
