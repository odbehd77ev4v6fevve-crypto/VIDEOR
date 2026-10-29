import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import type { ViteDevServer } from 'vite';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app';
import { connectDatabase, disconnectDatabase } from './server/db/connection';
import { applyLocalDevelopmentDefaults, requireIsolatedTestMongoUri, validateServerConfiguration } from './server/config';

dotenv.config();
applyLocalDevelopmentDefaults();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    process.env.MONGODB_URI = requireIsolatedTestMongoUri(
      process.env.TEST_MONGODB_URI,
      process.env.MONGODB_URI
    );

    const testAdminEmail = process.env.TEST_ADMIN_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || 'admin@vidora.local';
    const testAdminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'VidoraLocalPassword123!';
    if (!testAdminEmail || !testAdminPassword || testAdminPassword.length < 12) {
      throw new Error('TEST_ADMIN_EMAIL and a TEST_ADMIN_PASSWORD of at least 12 characters are required in test mode.');
    }

    process.env.ADMIN_EMAIL = testAdminEmail;
    process.env.ADMIN_PASSWORD = testAdminPassword;
    if (!process.env.ADMIN_NAME && process.env.TEST_ADMIN_NAME) {
      process.env.ADMIN_NAME = process.env.TEST_ADMIN_NAME;
    }
  } else {
    if (!process.env.MONGODB_URI && process.env.TEST_MONGODB_URI) {
      process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
    }
    if (!process.env.ADMIN_EMAIL && process.env.TEST_ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
    }
    if (!process.env.ADMIN_PASSWORD && process.env.TEST_ADMIN_PASSWORD) {
      process.env.ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
    }
    if (!process.env.ADMIN_NAME && process.env.TEST_ADMIN_NAME) {
      process.env.ADMIN_NAME = process.env.TEST_ADMIN_NAME;
    }
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  validateServerConfiguration(isProduction);
  await connectDatabase();

  const app = createApp();
  app.all('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found.`, code: 'NOT_FOUND' });
  });
  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found.`, code: 'NOT_FOUND' });
  });

  let vite: ViteDevServer | undefined;
  if (!isProduction) {
    vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found.`, code: 'NOT_FOUND' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] VIDORA is ready on port ${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async (error) => {
      try {
        await vite?.close();
        await disconnectDatabase();
      } catch (cleanupError) {
        console.error(`[Shutdown] Cleanup failed after ${signal}:`, cleanupError);
      }
      if (error) {
        console.error(`[Shutdown] HTTP server failed after ${signal}:`, error);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown startup failure';
  console.error('[Fatal Server Startup Error]:', message);
  process.exit(1);
});
