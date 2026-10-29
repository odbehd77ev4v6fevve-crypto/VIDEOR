import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Playlist } from '../models/Playlist';
import { Video } from '../models/Video';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { isValidObjectId } from '../utils';

const router = Router();

// GET /api/playlists - Public discovery playlists & curated collections
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
    const skip = (page - 1) * limit;

    const [playlists, total] = await Promise.all([
      Playlist.find({ visibility: 'public' })
        .populate('userId', 'displayName avatarUrl')
        .populate({ path: 'videos.videoId', select: 'status' })
        .sort({ isCurated: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Playlist.countDocuments({ visibility: 'public' }),
    ]);

    const safePlaylists = (playlists as any[]).map((playlist) => {
      const videos = (playlist.videos || []).filter((item: any) => item.videoId?.status === 'published');
      return { ...playlist, videos, videoCount: videos.length };
    });

    res.json({
      success: true,
      playlists: safePlaylists,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Public list error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve playlists.' });
  }
});

// GET /api/playlists/mine - Current user's own playlists
router.get('/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const playlists = await Playlist.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      playlists,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Mine error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve your playlists.' });
  }
});

// POST /api/playlists - Create a new playlist
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { title, description, visibility, initialVideoId } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Playlist title is required.' });
      return;
    }

    const videos: any[] = [];
    let coverUrl = '';

    if (initialVideoId !== undefined) {
      if (!isValidObjectId(initialVideoId)) {
        res.status(400).json({ success: false, error: 'initialVideoId is invalid.' });
        return;
      }
      const video = await Video.findOne({ _id: initialVideoId, status: 'published' });
      if (video) {
        videos.push({
          videoId: video._id,
          youtubeVideoId: video.youtubeVideoId,
          order: 0,
          addedAt: new Date(),
        });
        coverUrl = video.thumbnails?.high || video.thumbnails?.medium || '';
      }
    }

    const newPlaylist = await Playlist.create({
      userId,
      title: title.trim().slice(0, 120),
      description: (description || '').trim().slice(0, 1000),
      visibility: ['public', 'unlisted', 'private'].includes(visibility) ? visibility : 'public',
      isCurated: false,
      coverUrl,
      videos,
      videoCount: videos.length,
    });

    res.status(201).json({
      success: true,
      playlist: newPlaylist,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create playlist.' });
  }
});

// GET /api/playlists/:id - Single playlist with populated videos
router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid playlist ID.' });
      return;
    }

    const playlist = await Playlist.findById(id)
      .populate('userId', 'displayName avatarUrl')
      .populate({
        path: 'videos.videoId',
        populate: { path: 'categoryId', select: 'name slug icon' },
      })
      .lean();

    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found.' });
      return;
    }

    // Authorization check for private playlists
    if (playlist.visibility === 'private') {
      const currentUserId = req.user?._id;
      const ownerId = (playlist.userId as any)?._id?.toString() || playlist.userId?.toString();
      if (!currentUserId || currentUserId !== ownerId) {
        res.status(403).json({ success: false, error: 'This playlist is private.' });
        return;
      }
    } else {
      const visibleVideos = (playlist.videos as any[]).filter((item) => {
        const videoDoc = item?.videoId;
        return videoDoc && typeof videoDoc === 'object' && videoDoc.status === 'published';
      });
      playlist.videos = visibleVideos;
      playlist.videoCount = visibleVideos.length;
    }

    res.json({
      success: true,
      playlist,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Get single error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve playlist.' });
  }
});

// PUT /api/playlists/:id - Edit playlist metadata
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid playlist ID.' });
      return;
    }
    const userId = req.user!._id;
    const { title, description, visibility } = req.body;
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      res.status(400).json({ success: false, error: 'Playlist title must be a non-empty string.' });
      return;
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found.' });
      return;
    }

    if (playlist.userId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized to modify this playlist.' });
      return;
    }

    if (title && typeof title === 'string') {
      playlist.title = title.trim().slice(0, 120);
    }
    if (typeof description === 'string') {
      playlist.description = description.trim().slice(0, 1000);
    }
    if (visibility && ['public', 'unlisted', 'private'].includes(visibility)) {
      playlist.visibility = visibility;
    }

    await playlist.save();

    res.json({
      success: true,
      playlist,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update playlist.' });
  }
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid playlist ID.' });
      return;
    }
    const userId = req.user!._id;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found.' });
      return;
    }

    if (playlist.userId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized to delete this playlist.' });
      return;
    }

    await Playlist.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Playlist deleted successfully.',
    });
  } catch (err: any) {
    console.error('[Playlists Route] Delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete playlist.' });
  }
});

// POST /api/playlists/:id/videos - Add video to playlist
router.post('/:id/videos', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid playlist ID.' });
      return;
    }
    const userId = req.user!._id;
    const { videoId } = req.body;
    if (!isValidObjectId(videoId)) {
      res.status(400).json({ success: false, error: 'A valid videoId is required.' });
      return;
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found.' });
      return;
    }

    if (playlist.userId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized to modify this playlist.' });
      return;
    }

    const video = await Video.findOne({ _id: videoId, status: 'published' });
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found in catalog.' });
      return;
    }

    const item = {
      videoId: video._id as any,
      youtubeVideoId: video.youtubeVideoId,
      order: playlist.videos.length,
      addedAt: new Date(),
    };
    const coverUrl = video.thumbnails?.high || video.thumbnails?.medium || '';

    const updatedPlaylist = await Playlist.findOneAndUpdate(
      {
        _id: id,
        'videos.videoId': { $ne: video._id },
      },
      {
        $push: { videos: item },
        $inc: { videoCount: 1 },
        ...(playlist.coverUrl ? {} : { $set: { coverUrl } }),
      },
      { returnDocument: 'after' }
    );

    if (!updatedPlaylist) {
      res.status(409).json({ success: false, error: 'Video is already in this playlist.' });
      return;
    }

    res.json({
      success: true,
      message: 'Video added to playlist.',
      videoCount: updatedPlaylist.videoCount,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Add video error:', err);
    res.status(500).json({ success: false, error: 'Failed to add video to playlist.' });
  }
});

// DELETE /api/playlists/:id/videos/:videoId - Remove video from playlist
router.delete('/:id/videos/:videoId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, videoId } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid playlist ID.' });
      return;
    }
    const userId = req.user!._id;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found.' });
      return;
    }

    if (playlist.userId.toString() !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized to modify this playlist.' });
      return;
    }

    const originalCount = playlist.videos.length;
    playlist.videos = playlist.videos.filter(
      (v) => v.videoId.toString() !== videoId && v.youtubeVideoId !== videoId
    );

    if (playlist.videos.length === originalCount) {
      res.status(404).json({ success: false, error: 'Video was not in this playlist.' });
      return;
    }

    playlist.videoCount = playlist.videos.length;
    await playlist.save();

    res.json({
      success: true,
      message: 'Video removed from playlist.',
      videoCount: playlist.videoCount,
    });
  } catch (err: any) {
    console.error('[Playlists Route] Remove video error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove video from playlist.' });
  }
});

export default router;
