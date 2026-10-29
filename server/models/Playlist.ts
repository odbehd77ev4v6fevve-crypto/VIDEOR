import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPlaylistItem {
  videoId: Types.ObjectId;
  youtubeVideoId: string;
  order: number;
  addedAt: Date;
}

export interface IPlaylist extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  isCurated: boolean;
  coverUrl?: string;
  videos: IPlaylistItem[];
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistItemSchema = new Schema<IPlaylistItem>(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    youtubeVideoId: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const PlaylistSchema = new Schema<IPlaylist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
      index: true,
    },
    isCurated: {
      type: Boolean,
      default: false,
      index: true,
    },
    coverUrl: {
      type: String,
      default: '',
    },
    videos: [PlaylistItemSchema],
    videoCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

PlaylistSchema.index({ visibility: 1, isCurated: 1 });
PlaylistSchema.index({ userId: 1, createdAt: -1 });

export const Playlist = mongoose.model<IPlaylist>('Playlist', PlaylistSchema);
