import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHomepageSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'recent' | 'popular' | 'category' | 'collection' | 'custom';
  categorySlug?: string;
  playlistId?: Types.ObjectId;
  videoIds?: Types.ObjectId[];
  limit: number;
  isVisible: boolean;
  order: number;
}

export interface IHomepageConfig extends Document {
  heroVideoId?: Types.ObjectId;
  heroCustomTitle?: string;
  heroCustomSubtitle?: string;
  heroCustomBadge?: string;
  sections: IHomepageSection[];
  updatedAt: Date;
}

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    type: {
      type: String,
      enum: ['recent', 'popular', 'category', 'collection', 'custom'],
      default: 'recent',
    },
    categorySlug: { type: String, default: '' },
    playlistId: { type: Schema.Types.ObjectId, ref: 'Playlist' },
    videoIds: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    limit: { type: Number, default: 8, min: 1, max: 100 },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const HomepageConfigSchema = new Schema<IHomepageConfig>(
  {
    heroVideoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
    },
    heroCustomTitle: {
      type: String,
      default: '',
    },
    heroCustomSubtitle: {
      type: String,
      default: '',
    },
    heroCustomBadge: {
      type: String,
      default: '',
    },
    sections: {
      type: [HomepageSectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const HomepageConfig = mongoose.model<IHomepageConfig>('HomepageConfig', HomepageConfigSchema);
