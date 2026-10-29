import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { getDatabaseStatus } from './db/connection';

// Route imports
import authRouter from './routes/auth';
import videosRouter from './routes/videos';
import searchRouter from './routes/search';
import categoriesRouter from './routes/categories';
import historyRouter from './routes/history';
import continueWatchingRouter from './routes/continueWatching';
import watchLaterRouter from './routes/watchLater';
import playlistsRouter from './routes/playlists';
import channelsRouter from './routes/channels';
import homepageRouter from './routes/homepage';
import reportsRouter from './routes/reports';
import adminRouter from './routes/admin';

export function createApp(): Express {
  const app = express();

  // Core Middlewares
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = process.env.APP_URL?.trim();
      if (!allowed || origin === allowed) return callback(null, true);
      const error = new Error('Origin is not allowed') as Error & { status: number };
      error.status = 403;
      callback(error);
    },
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.get('/api/health', (req: Request, res: Response) => {
    const dbStatus = getDatabaseStatus();
    res.status(dbStatus.connected ? 200 : 503).json({
      status: dbStatus.connected ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      platform: 'VIDORA Video Discovery Platform',
      database: dbStatus,
      env: process.env.NODE_ENV || 'development',
    });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') && req.path !== '/api/health' && mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        error: 'Database connection is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
      return;
    }
    next();
  });

  // Mount API Domain Routes
  app.use('/api/auth', authRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/continue-watching', continueWatchingRouter);
  app.use('/api/watch-later', watchLaterRouter);
  app.use('/api/playlists', playlistsRouter);
  app.use('/api/channels', channelsRouter);
  app.use('/api/homepage', homepageRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);

  // 404 handler for unmatched API routes
  app.all('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found.`,
      code: 'NOT_FOUND',
    });
  });
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found.`,
      code: 'NOT_FOUND',
    });
  });

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server Error Handler]:', err);

    const statusCode = err.status || err.statusCode || 500;
    const isExpected = statusCode >= 400 && statusCode < 500;
    const message = isExpected && err.message
      ? err.message
      : 'An internal server error occurred.';

    res.status(statusCode).json({
      success: false,
      error: message,
      code: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
  });

  return app;
}
