import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchHistory extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  youtubeVideoId: string;
  positionSeconds: number;
  durationSeconds: number;
  completionPercent: number;
  isCompleted: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WatchHistorySchema = new Schema<IWatchHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    youtubeVideoId: {
      type: String,
      required: true,
    },
    positionSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
      max: 86400,
    },
    completionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so user has exactly 1 entry per video
WatchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });
WatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

export const WatchHistory = mongoose.model<IWatchHistory>('WatchHistory', WatchHistorySchema);
