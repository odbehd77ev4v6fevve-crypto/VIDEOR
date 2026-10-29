import { Router, Request, Response } from 'express';
import { Report } from '../models/Report';
import { Video } from '../models/Video';
import { optionalAuth } from '../middleware/auth';
import { isValidObjectId } from '../utils';

const router = Router();

// POST /api/reports - Submit a report against a video
router.post('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId, youtubeVideoId, reason, details, reporterEmail } = req.body;

    if (!isValidObjectId(videoId) || typeof youtubeVideoId !== 'string' || !youtubeVideoId.trim() || typeof reason !== 'string') {
      res.status(400).json({ success: false, error: 'videoId, youtubeVideoId, and reason are required in a valid format.' });
      return;
    }

    const validReasons = ['broken', 'inappropriate', 'copyright', 'misleading', 'other'] as const;
    if (!(validReasons as readonly string[]).includes(reason)) {
      res.status(400).json({ success: false, error: 'Invalid report reason.' });
      return;
    }

    const video = await Video.findById(videoId).select('displayTitle youtubeVideoId');
    if (!video || video.youtubeVideoId !== youtubeVideoId) {
      res.status(404).json({ success: false, error: 'The reported video was not found.' });
      return;
    }
    const videoTitle = video.displayTitle;
    const normalizedEmail = req.user?.email ||
      (typeof reporterEmail === 'string' ? reporterEmail.trim().toLowerCase() : '');
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'reporterEmail must be a valid email address.' });
      return;
    }

    // Simple anti-spam check: prevent identical pending report for the same video and reporter.
    if (normalizedEmail) {
      const existing = await Report.findOne({
        videoId,
        reporterEmail: normalizedEmail,
        status: 'pending',
      });
      if (existing) {
        res.status(429).json({
          success: false,
          error: 'A report from your email is already pending review for this video.',
        });
        return;
      }
    }

    const newReport = await Report.create({
      videoId,
      youtubeVideoId,
      videoTitle,
      userId: req.user?._id as any,
      ...(normalizedEmail ? { reporterEmail: normalizedEmail } : {}),
      reason: reason as (typeof validReasons)[number],
      details: (typeof details === 'string' ? details : '').trim().slice(0, 1000),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you. Your report has been submitted to the moderation team.',
      reportId: (newReport._id as any).toString(),
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(429).json({ success: false, error: 'An identical pending report already exists.' });
      return;
    }
    console.error('[Reports Route] Submit error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit video report.' });
  }
});

export default router;
