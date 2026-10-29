import { MongoClient } from 'mongodb';

export const DEFAULT_LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/vidora_dev';
export const DEFAULT_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/vidora_test';
export const DEFAULT_LOCAL_JWT_SECRET = 'vidora-local-development-secret-key-123456';
export const DEFAULT_ADMIN_EMAIL = 'admin@vidora.local';
export const DEFAULT_ADMIN_PASSWORD = 'VidoraLocalPassword123!';

export function normalizeMongoConnectionString(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }

  const withoutQuotes = raw.replace(/^(['"])(.*)\1$/, '$2');
  return withoutQuotes
    .replace(/^export\s+MONGODB_URI\s*=\s*/i, '')
    .replace(/^MONGODB_URI\s*=\s*/i, '')
    .trim();
}

export function getMongoDatabaseName(uriValue: string): string | null {
  const uri = normalizeMongoConnectionString(uriValue);
  if (!uri) {
    return null;
  }

  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?[^/?#]+\/([^/?#]+)(?:[?#]|$)/i);
  return match?.[1]?.trim() || null;
}

export function validateMongoUri(uriValue: string | undefined, options: { production?: boolean } = {}): string {
  const uri = normalizeMongoConnectionString(uriValue);
  if (!uri) {
    if (options.production) {
      throw new Error('MONGODB_URI must be configured in production.');
    }
    throw new Error('MONGODB_URI must be configured before VIDORA can start.');
  }

  if (uri.includes('<username>') || uri.includes('<password>')) {
    throw new Error('MONGODB_URI must not include placeholder credentials.');
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    if (options.production) {
      throw new Error('Production MONGODB_URI must use a MongoDB scheme (mongodb:// or mongodb+srv://).');
    }
    throw new Error('MONGODB_URI must use a MongoDB connection scheme.');
  }

  try {
    new MongoClient(uri);
  } catch (error) {
    if (options.production) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string in production.');
    }
    throw new Error('MONGODB_URI must be a valid MongoDB connection string before VIDORA can start.');
  }

  const databaseName = getMongoDatabaseName(uri);
  if (!databaseName) {
    if (options.production) {
      throw new Error('Production MONGODB_URI must include an explicit database name.');
    }
    throw new Error('MONGODB_URI must explicitly include a database name.');
  }

  if (/(?:^|[?&])directConnection=true(?:&|$)/i.test(uri)) {
    throw new Error('MONGODB_URI must not enable directConnection.');
  }

  return uri;
}

export function applyLocalDevelopmentDefaults(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = DEFAULT_LOCAL_MONGODB_URI;
  }
  if (!process.env.TEST_MONGODB_URI) {
    process.env.TEST_MONGODB_URI = DEFAULT_TEST_MONGODB_URI;
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = DEFAULT_LOCAL_JWT_SECRET;
  }
  if (!process.env.APP_URL) {
    process.env.APP_URL = 'http://localhost:3000';
  }
  if (!process.env.ADMIN_EMAIL) {
    process.env.ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;
  }
  if (!process.env.ADMIN_PASSWORD) {
    process.env.ADMIN_PASSWORD = DEFAULT_ADMIN_PASSWORD;
  }
  if (!process.env.ADMIN_NAME) {
    process.env.ADMIN_NAME = 'Vidora Admin';
  }
}

function validateProductionMongoUri(uriValue: string | undefined): void {
  validateMongoUri(uriValue, { production: true });
}

function validateProductionAdminCredentials(): void {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('ADMIN_EMAIL must be configured with a valid address in production.');
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be configured with at least 12 characters in production.');
  }
  if (/replace|example|changeme|demo|placeholder/i.test(adminPassword)) {
    throw new Error('ADMIN_PASSWORD must not use a placeholder value in production.');
  }
}

export function validateServerConfiguration(isProduction: boolean): void {
  let jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }
    process.env.JWT_SECRET = DEFAULT_LOCAL_JWT_SECRET;
    jwtSecret = process.env.JWT_SECRET;
  }
  if (jwtSecret.length < 32) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }
    process.env.JWT_SECRET = `${jwtSecret}${DEFAULT_LOCAL_JWT_SECRET}`.slice(0, 32);
    jwtSecret = process.env.JWT_SECRET;
  }
  if (isProduction && jwtSecret.toLowerCase().includes('replace')) {
    throw new Error('A production JWT_SECRET must not use the example placeholder.');
  }

  if (isProduction) {
    validateProductionMongoUri(process.env.MONGODB_URI);
    validateProductionAdminCredentials();
  }

  if (isProduction && !process.env.APP_URL?.trim()) {
    throw new Error('APP_URL must be configured in production.');
  }
}

export function requireIsolatedTestMongoUri(
  testUriValue: string | undefined,
  productionUriValue: string | undefined
): string {
  const testUri = testUriValue?.trim() || DEFAULT_TEST_MONGODB_URI;
  const productionUri = productionUriValue?.trim() || DEFAULT_LOCAL_MONGODB_URI;

  if (testUri === productionUri) {
    throw new Error('TEST_MONGODB_URI must not equal MONGODB_URI.');
  }

  const databaseName = testUri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?#]+)(?:[?#]|$)/i)?.[1];
  if (!databaseName?.toLowerCase().includes('test')) {
    throw new Error('TEST_MONGODB_URI must include a database name containing "test".');
  }

  return testUri;
}
