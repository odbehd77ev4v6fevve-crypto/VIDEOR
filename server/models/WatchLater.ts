import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchLater extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  youtubeVideoId: string;
  addedAt: Date;
}

const WatchLaterSchema = new Schema<IWatchLater>(
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
    addedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

WatchLaterSchema.index({ userId: 1, videoId: 1 }, { unique: true });
WatchLaterSchema.index({ userId: 1, addedAt: -1 });

export const WatchLater = mongoose.model<IWatchLater>('WatchLater', WatchLaterSchema);
