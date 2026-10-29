export const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function isValidYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_REGEX.test(value);
}

export function normalizeImageUrl(value?: string | null): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (/^(?:javascript:|data:|vbscript:)/.test(lower)) return null;

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(videoId?: string | null, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string | null {
  if (!isValidYouTubeVideoId(videoId)) return null;

  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    maxres: 'maxresdefault.jpg',
  } as const;

  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}`;
}

export function getVideoThumbnailSources(video?: { youtubeVideoId?: string; thumbnails?: Partial<Record<'default' | 'medium' | 'high' | 'maxres', string>> } | null): string[] {
  if (!video) return [];

  const sourceCandidates = [
    normalizeImageUrl(video.thumbnails?.maxres),
    normalizeImageUrl(video.thumbnails?.high),
    normalizeImageUrl(video.thumbnails?.medium),
    normalizeImageUrl(video.thumbnails?.default),
    getYouTubeThumbnailUrl(video.youtubeVideoId, 'high'),
  ];

  return [...new Set(sourceCandidates.filter((candidate): candidate is string => Boolean(candidate)))];
}

export function getVideoThumbnailSource(video?: { youtubeVideoId?: string; thumbnails?: Partial<Record<'default' | 'medium' | 'high' | 'maxres', string>> } | null): string | null {
  return getVideoThumbnailSources(video)[0] ?? null;
}
