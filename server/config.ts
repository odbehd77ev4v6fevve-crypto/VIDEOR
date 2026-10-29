export const DEFAULT_LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/vidora_dev';
export const DEFAULT_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/vidora_test';
export const DEFAULT_LOCAL_JWT_SECRET = 'vidora-local-development-secret-key-123456';
export const DEFAULT_ADMIN_EMAIL = 'admin@vidora.local';
export const DEFAULT_ADMIN_PASSWORD = 'VidoraLocalPassword123!';

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
