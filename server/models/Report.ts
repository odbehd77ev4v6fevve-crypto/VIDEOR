import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReport extends Document {
  videoId: Types.ObjectId;
  youtubeVideoId: string;
  videoTitle: string;
  userId?: Types.ObjectId;
  reporterEmail?: string;
  reason: 'broken' | 'inappropriate' | 'copyright' | 'misleading' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    youtubeVideoId: {
      type: String,
      required: true,
      index: true,
    },
    videoTitle: {
      type: String,
      default: '',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reporterEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    reason: {
      type: String,
      enum: ['broken', 'inappropriate', 'copyright', 'misleading', 'other'],
      required: true,
      index: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index(
  { videoId: 1, userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', userId: { $exists: true } } }
);
ReportSchema.index(
  { videoId: 1, reporterEmail: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', reporterEmail: { $type: 'string' } } }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
