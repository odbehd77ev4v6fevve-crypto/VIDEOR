import { Router, Request, Response } from 'express';
import { Video } from '../models/Video';

const router = Router();

// GET /api/channels/:channelId - Channel details & their catalog videos
router.get('/:channelId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    // Find first video to get channelTitle and channelThumbnail
    const sampleVideo = await Video.findOne({ channelId, status: 'published' }).lean();

    if (!sampleVideo) {
      res.status(404).json({ success: false, error: 'Channel not found in VIDORA catalog.' });
      return;
    }

    const [videos, total] = await Promise.all([
      Video.find({ channelId, status: 'published' })
        .populate('categoryId', 'name slug icon')
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments({ channelId, status: 'published' }),
    ]);

    res.json({
      success: true,
      channel: {
        channelId,
        channelTitle: sampleVideo.channelTitle,
        channelThumbnailUrl: sampleVideo.channelThumbnailUrl || '',
        videoCount: total,
      },
      videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Channels Route] Channel error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve channel.' });
  }
});

export default router;
