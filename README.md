<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/74aa9538-1088-440a-84d2-4fb5f3237d1f

## Run locally

**Prerequisites:** Node.js 22+, a MongoDB Atlas cluster, and an Atlas database user.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`.
3. For local development and test runs, the app now falls back to a local MongoDB instance at `mongodb://127.0.0.1:27017/vidora_dev` and a default development JWT secret if the environment is left unset. Configure a real Atlas URI only when you want to override those defaults for a specific environment.
4. Start the application with `npm run dev`.

VIDORA does not use an embedded or in-memory database. Startup fails unless the configured database URI is a valid MongoDB connection.

Administrator provisioning and application-content seeding are separate responsibilities. To provision the first legitimate administrator on an explicitly selected database, provide `ADMIN_EMAIL` plus an operator-selected password of at least 12 characters in `ADMIN_PASSWORD`, then run `npm run provision-admin`. Provisioning never elevates regular users or resets an existing administrator password.

Optional application sample content is disabled by default. Set `VIDORA_SEED=true` and run `npm run seed` to initialize categories, the curated catalog, homepage configuration, and a public showcase playlist only. Set `VIDORA_SEED=false` again after initialization. The content seed preserves existing data and only creates missing records.

Both commands require `MONGODB_URI` to include an explicit database name and never report success until database operations complete. Do not run either command against Production unless the exact target database has been operator-approved.

Production requires `MONGODB_URI` in `mongodb+srv://` format whose authority is an Atlas `*.mongodb.net` host. A development-only `mongodb://` URI must not be used in production. Obtain the Atlas SRV URI for the intended database from Atlas and verify the database name and least-privilege database user before deployment.

Run the integration suite only against a disposable database whose name contains `test`, with a test-only administrator. Configure `TEST_MONGODB_URI`, `TEST_ADMIN_EMAIL`, and `TEST_ADMIN_PASSWORD` (at least 12 characters) in your local environment. The test runner loads `.env`, verifies the test URI differs from `MONGODB_URI`, and refuses non-local `TEST_API_URL` targets. `TEST_API_URL` is optional and defaults to `http://localhost:3000`.

Start the API in a separate terminal with `NODE_ENV=test`. In this mode, the API explicitly selects `TEST_MONGODB_URI` instead of the `MONGODB_URI` loaded from `.env`, verifies the test database name and URI distinction, and uses the test administrator credentials:

```powershell
$env:NODE_ENV = "test"
npm run dev
```

Run `npm test` in another terminal with the same test variables available. The API listens on port `3000` unless `PORT` is set. Do not copy production credentials into test settings or point `TEST_MONGODB_URI` at a production database.
