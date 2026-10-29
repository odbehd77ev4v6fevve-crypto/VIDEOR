export interface UserProfile {
  _id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  bio?: string;
  status: 'active' | 'suspended';
  preferences?: {
    theme: string;
    autoplayNext: boolean;
    defaultQuality: string;
  };
  stats?: {
    historyCount: number;
    watchLaterCount: number;
    playlistsCount: number;
  };
  createdAt?: string;
}

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  thumbnailUrl?: string;
  order: number;
  status: 'published' | 'hidden';
  videoCount: number;
}

export interface VideoThumbnails {
  default: string;
  medium: string;
  high: string;
  maxres?: string;
}

export interface VideoItem {
  _id: string;
  youtubeVideoId: string;
  originalUrl: string;
  originalTitle: string;
  originalDescription: string;
  displayTitle: string;
  displayDescription: string;
  channelId?: string;
  channelTitle: string;
  channelThumbnailUrl?: string;
  duration: string;
  durationSeconds: number;
  publishedAt: string;
  thumbnails: VideoThumbnails;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  categoryId?: CategoryItem | string;
  categorySlug?: string;
  tags: string[];
  status: 'published' | 'draft' | 'archived';
  isFeatured: boolean;
  featuredOrder: number;
  viewsOnVidora: number;
  syncStatus: 'synced' | 'failed' | 'pending';
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchHistoryItem {
  _id: string;
  userId: string;
  videoId: VideoItem;
  youtubeVideoId: string;
  positionSeconds: number;
  durationSeconds: number;
  completionPercent: number;
  isCompleted: boolean;
  lastWatchedAt: string;
}

export interface WatchLaterItem {
  _id: string;
  userId: string;
  videoId: VideoItem;
  youtubeVideoId: string;
  addedAt: string;
}

export interface PlaylistItem {
  _id: string;
  videoId: VideoItem;
  youtubeVideoId: string;
  order: number;
  addedAt: string;
}

export interface PlaylistData {
  _id: string;
  userId: {
    _id: string;
    displayName: string;
    avatarUrl?: string;
  } | string;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  isCurated: boolean;
  coverUrl?: string;
  videos: PlaylistItem[];
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'recent' | 'popular' | 'category' | 'collection' | 'custom';
  categorySlug?: string;
  videos: VideoItem[];
}

export interface HomepageData {
  hero: {
    video: VideoItem | null;
    customTitle?: string;
    customSubtitle?: string;
    customBadge?: string;
  };
  sections: HomepageSection[];
  topCategories: CategoryItem[];
}

export interface ReportItem {
  _id: string;
  videoId: {
    _id: string;
    displayTitle: string;
    youtubeVideoId: string;
    status: string;
    thumbnails: VideoThumbnails;
  };
  youtubeVideoId: string;
  videoTitle: string;
  userId?: {
    _id: string;
    displayName: string;
    email: string;
  };
  reporterEmail?: string;
  reason: 'broken' | 'inappropriate' | 'copyright' | 'misleading' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  ip?: string;
  createdAt: string;
}

export interface DbStatusInfo {
  connected: boolean;
  type: 'atlas' | 'embedded' | 'disconnected';
  host: string;
  database: string;
  readyState: number;
  uriRedacted: string;
}
