export interface ParsedYouTubeUrl {
  isValid: boolean;
  videoId: string | null;
  normalizedUrl: string | null;
  error?: string;
}

export interface FetchedYouTubeMetadata {
  youtubeVideoId: string;
  originalUrl: string;
  originalTitle: string;
  originalDescription: string;
  channelId: string;
  channelTitle: string;
  channelThumbnailUrl?: string;
  duration: string;
  durationSeconds: number;
  publishedAt: Date;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  source: 'youtube_data_api_v3' | 'youtube_oembed';
}

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_REGEX.test(value);
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl {
  if (!input || typeof input !== 'string') {
    return { isValid: false, videoId: null, normalizedUrl: null, error: 'URL is required' };
  }

  const trimmed = input.trim();

  // If input is directly an 11-character video ID
  if (isValidYouTubeVideoId(trimmed)) {
    return {
      isValid: true,
      videoId: trimmed,
      normalizedUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    // Check valid YouTube hostnames
    const validHosts = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtu.be',
    ];

    const isHostValid = validHosts.some(
      (valid) => hostname === valid || hostname.endsWith(`.${valid}`)
    );

    if (!isHostValid) {
      return {
        isValid: false,
        videoId: null,
        normalizedUrl: null,
        error: 'Only valid YouTube URLs (youtube.com or youtu.be) are accepted',
      };
    }

    let videoId: string | null = null;

    if (hostname.includes('youtu.be')) {
      // e.g. https://youtu.be/VIDEO_ID
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && isValidYouTubeVideoId(parts[0])) {
        videoId = parts[0];
      }
    } else {
      // standard watch url: /watch?v=VIDEO_ID
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        if (isValidYouTubeVideoId(v)) {
          videoId = v;
        }
      } else if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 1 && isValidYouTubeVideoId(parts[1])) {
          videoId = parts[1];
        }
      } else if (url.pathname.startsWith('/shorts/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 1 && isValidYouTubeVideoId(parts[1])) {
          videoId = parts[1];
        }
      } else if (url.pathname.startsWith('/v/')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 1 && isValidYouTubeVideoId(parts[1])) {
          videoId = parts[1];
        }
      }
    }

    if (!videoId) {
      return {
        isValid: false,
        videoId: null,
        normalizedUrl: null,
        error: 'Could not extract valid 11-character YouTube video ID from URL',
      };
    }

    return {
      isValid: true,
      videoId,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (err) {
    return {
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: 'Malformed URL provided',
    };
  }
}

export function parseISO8601Duration(isoDuration: string): { formatted: string; seconds: number } {
  if (!isoDuration) return { formatted: '0:00', seconds: 0 };

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: '0:00', seconds: 0 };

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return { formatted, seconds: totalSeconds };
}

export async function fetchYouTubeMetadata(videoId: string): Promise<FetchedYouTubeMetadata> {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error(`Invalid YouTube video ID "${String(videoId)}". Use a valid 11-character YouTube video ID.`);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const standardThumbnails = {
    default: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
    medium: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    high: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    maxres: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  };

  // Attempt YouTube Data API v3 if key is configured
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('YourYouTubeDataApiKeyHere')) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        const item = data.items && data.items[0];

        if (item) {
          const snippet = item.snippet || {};
          const contentDetails = item.contentDetails || {};
          const stats = item.statistics || {};

          const durationInfo = parseISO8601Duration(contentDetails.duration || '');

          return {
            youtubeVideoId: videoId,
            originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
            originalTitle: snippet.title || 'Untitled YouTube Video',
            originalDescription: snippet.description || '',
            channelId: snippet.channelId || '',
            channelTitle: snippet.channelTitle || 'Unknown Creator',
            channelThumbnailUrl: '',
            duration: durationInfo.formatted,
            durationSeconds: durationInfo.seconds,
            publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
            thumbnails: {
              default: snippet.thumbnails?.default?.url || standardThumbnails.default,
              medium: snippet.thumbnails?.medium?.url || standardThumbnails.medium,
              high: snippet.thumbnails?.high?.url || standardThumbnails.high,
              maxres: snippet.thumbnails?.maxres?.url || standardThumbnails.maxres,
            },
            viewCount: parseInt(stats.viewCount || '0', 10),
            likeCount: parseInt(stats.likeCount || '0', 10),
            commentCount: parseInt(stats.commentCount || '0', 10),
            tags: Array.isArray(snippet.tags) ? snippet.tags : [],
            source: 'youtube_data_api_v3',
          };
        }
      } else {
        console.warn(`[YouTube API] Non-OK status ${response.status} from YouTube Data API v3. Falling back to oEmbed.`);
      }
    } catch (err: any) {
      console.warn('[YouTube API] Error querying YouTube Data API v3:', err.message, '. Falling back to oEmbed.');
    }
  }

  // Graceful, standard fallback using YouTube's official oEmbed protocol (No API Key Required)
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
  const oEmbedRes = await fetch(oEmbedUrl);

  if (!oEmbedRes.ok) {
    if (oEmbedRes.status === 404) {
      throw new Error(`Video with ID "${videoId}" was not found or is set to private on YouTube.`);
    }
    if (oEmbedRes.status === 401 || oEmbedRes.status === 403) {
      throw new Error(`Video with ID "${videoId}" has embedding restricted by its owner on YouTube.`);
    }
    throw new Error(`Failed to retrieve video metadata from YouTube (Status: ${oEmbedRes.status}).`);
  }

  const oembedData = await oEmbedRes.json();

  return {
    youtubeVideoId: videoId,
    originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    originalTitle: oembedData.title || 'Untitled YouTube Video',
    originalDescription: '',
    channelId: '',
    channelTitle: oembedData.author_name || 'YouTube Creator',
    channelThumbnailUrl: '',
    duration: '0:00',
    durationSeconds: 0,
    publishedAt: new Date(),
    thumbnails: {
      default: standardThumbnails.default,
      medium: standardThumbnails.medium,
      high: standardThumbnails.high,
      maxres: standardThumbnails.maxres,
    },
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    tags: [],
    source: 'youtube_oembed',
  };
}
