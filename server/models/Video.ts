import mongoose, { Schema, Document, Types } from 'mongoose';
import { isValidYouTubeVideoId } from '../services/youtube';

export interface IVideoThumbnails {
  default: string;
  medium: string;
  high: string;
  maxres?: string;
}

export interface IVideo extends Document {
  youtubeVideoId: string;
  originalUrl: string;
  originalTitle: string;
  originalDescription: string;
  displayTitle: string;
  displayDescription: string;
  channelId: string;
  channelTitle: string;
  channelThumbnailUrl?: string;
  duration: string;
  durationSeconds: number;
  publishedAt: Date;
  thumbnails: IVideoThumbnails;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  categoryId?: Types.ObjectId;
  categorySlug?: string;
  tags: string[];
  status: 'published' | 'draft' | 'archived';
  isFeatured: boolean;
  featuredOrder: number;
  curatedCollectionId?: string;
  viewsOnVidora: number;
  syncStatus: 'synced' | 'failed' | 'pending';
  syncError?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    youtubeVideoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      validate: {
        validator(value: string) {
          return isValidYouTubeVideoId(value);
        },
        message: 'youtubeVideoId must be a valid 11-character YouTube video ID.',
      },
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    originalTitle: {
      type: String,
      required: true,
      trim: true,
    },
    originalDescription: {
      type: String,
      default: '',
    },
    displayTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    displayDescription: {
      type: String,
      default: '',
    },
    channelId: {
      type: String,
      trim: true,
      index: true,
    },
    channelTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    channelThumbnailUrl: {
      type: String,
      default: '',
    },
    duration: {
      type: String,
      default: '0:00',
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    thumbnails: {
      default: { type: String, default: '' },
      medium: { type: String, default: '' },
      high: { type: String, default: '' },
      maxres: { type: String, default: '' },
    },
    viewCount: {
      type: Number,
      default: 0,
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    categorySlug: {
      type: String,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    curatedCollectionId: {
      type: String,
      index: true,
    },
    viewsOnVidora: {
      type: Number,
      default: 0,
      index: true,
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'failed', 'pending'],
      default: 'synced',
    },
    syncError: {
      type: String,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

VideoSchema.index({
  displayTitle: 'text',
  originalTitle: 'text',
  displayDescription: 'text',
  channelTitle: 'text',
  tags: 'text',
});

export const Video = mongoose.model<IVideo>('Video', VideoSchema);
