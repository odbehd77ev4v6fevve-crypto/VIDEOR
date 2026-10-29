import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  siteName: string;
  tagline: string;
  allowRegistration: boolean;
  featuredNotice?: string;
  youtubeApiKeyConfigured: boolean;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    siteName: {
      type: String,
      default: 'VIDORA',
    },
    tagline: {
      type: String,
      default: 'Premium Curated Video Discovery',
    },
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    featuredNotice: {
      type: String,
      default: '',
    },
    youtubeApiKeyConfigured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);
