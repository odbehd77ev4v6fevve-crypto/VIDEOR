import mongoose from 'mongoose';

export interface DbStatus {
  connected: boolean;
  type: 'atlas' | 'disconnected';
  host: string;
  database: string;
  readyState: number;
}

export function sanitizeMongoUri(uri: string): string {
  if (!uri) return 'none';
  return uri.replace(/^(mongodb(?:\+srv)?):\/\/([^:/?#]+):[^@]+@/i, '$1://$2:***@');
}

function isPlaceholderMongoUri(uri: string): boolean {
  return !uri
    || uri.includes('<username>')
    || uri.includes('<password>')
    || /mongodb(?:\+srv)?:\/\/user:password@/i.test(uri)
    || uri.includes('cluster.mongodb.net/vidora?retryWrites=true');
}

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = (
    process.env.MONGODB_URI ||
    process.env.TEST_MONGODB_URI ||
    (process.env.NODE_ENV === 'test' ? 'mongodb://127.0.0.1:27017/vidora_test' : 'mongodb://127.0.0.1:27017/vidora_dev')
  ).trim();
  if (!uri) {
    throw new Error('MONGODB_URI must be configured before VIDORA can start.');
  }
  if (isPlaceholderMongoUri(uri)) {
    throw new Error('MONGODB_URI must be configured with the Atlas connection string before VIDORA can start.');
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGODB_URI must use a MongoDB connection scheme.');
  }
  const databaseName = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?#]+)(?:\?|#|$)/i)?.[1];
  if (!databaseName) {
    throw new Error('MONGODB_URI must explicitly include a database name.');
  }
  if (process.env.NODE_ENV === 'production' && !/^mongodb\+srv:\/\//i.test(uri)) {
    throw new Error('Production MONGODB_URI must use MongoDB Atlas SRV format (mongodb+srv://).');
  }
  if (process.env.NODE_ENV === 'production') {
    const authority = uri.match(/^mongodb\+srv:\/\/[^/]+@([^/?]+)/i)?.[1];
    if (!authority || !authority.toLowerCase().endsWith('.mongodb.net')) {
      throw new Error('Production MONGODB_URI must point to an Atlas host (*.mongodb.net).');
    }
  }
  if (/^mongodb\+srv:\/\/[^/]*\/[^?]*\?[^\n]*directConnection=true/i.test(uri)) {
    throw new Error('MONGODB_URI must not enable directConnection.');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  mongoose.connection.on('error', (error) => {
    console.error('[Database] MongoDB runtime connection error:', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB connection lost.');
  });
}

export function getDatabaseStatus(): DbStatus {
  const state = mongoose.connection.readyState;
  return {
    connected: state === 1,
    type: state === 1 ? 'atlas' : 'disconnected',
    host: mongoose.connection.host || 'unknown',
    database: mongoose.connection.name || 'unknown',
    readyState: state,
  };
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
