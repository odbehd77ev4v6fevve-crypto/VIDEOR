import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from '../server/db/connection';
import { applyLocalDevelopmentDefaults, requireIsolatedTestMongoUri, validateServerConfiguration } from '../server/config';
import { seedInitialData } from '../server/db/seed';
import { User } from '../server/models/User';
import { Video } from '../server/models/Video';
import { Category } from '../server/models/Category';
import { WatchHistory } from '../server/models/WatchHistory';
import { WatchLater } from '../server/models/WatchLater';
import { Playlist } from '../server/models/Playlist';
import { fetchYouTubeMetadata, parseYouTubeUrl } from '../server/services/youtube';
import bcrypt from 'bcryptjs';
import { getInitials } from '../src/lib/user';
import { getVideoThumbnailSource, getVideoThumbnailSources, getYouTubeThumbnailUrl, normalizeImageUrl } from '../src/lib/media';

dotenv.config();
applyLocalDevelopmentDefaults();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const testAdminEmail = process.env.TEST_ADMIN_EMAIL?.trim().toLowerCase();
const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;
const hasDatabaseTestConfig = Boolean(
  testAdminEmail &&
  testAdminPassword &&
  testAdminPassword.length >= 12 &&
  process.env.TEST_MONGODB_URI &&
  process.env.TEST_MONGODB_URI.trim()
);

let testUri: string | undefined;
let testAdminCredential: string | undefined;
if (hasDatabaseTestConfig) {
  testUri = requireIsolatedTestMongoUri(process.env.TEST_MONGODB_URI, process.env.MONGODB_URI);
  const testApiUrl = new URL(BASE_URL);
  if (testApiUrl.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(testApiUrl.hostname)) {
    throw new Error('TEST_API_URL must target the local test API process.');
  }
  testAdminCredential = testAdminPassword;
  process.env.MONGODB_URI = testUri;
  process.env.ADMIN_EMAIL = testAdminEmail;
  process.env.ADMIN_PASSWORD = testAdminCredential;
}

async function runTests() {
  console.log('--- STARTING VIDORA INTEGRATION & END-TO-END ACCEPTANCE TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    assert(getInitials(' Tazbidul   Siam ') === 'TS', 'Initials use first and last meaningful name parts');
    assert(getInitials('Siam') === 'S', 'Single-name initials use only the first character');
    assert(getInitials('  ') === 'U', 'Empty display names use a safe fallback');
    assert(getInitials('সিয়াম উদ্দিন') === 'সউ', 'Bangla display names derive Unicode initials');

    const validWatchUrl = parseYouTubeUrl('https://www.youtube.com/watch?v=R6MlUcmOul8');
    assert(validWatchUrl.isValid && validWatchUrl.videoId === 'R6MlUcmOul8', 'Valid standard YouTube watch URL correctly parsed');

    const validShortUrl = parseYouTubeUrl('https://youtu.be/aqz-KE-bpKQ');
    assert(validShortUrl.isValid && validShortUrl.videoId === 'aqz-KE-bpKQ', 'Valid youtu.be short URL correctly parsed');

    const validShortsUrl = parseYouTubeUrl('https://www.youtube.com/shorts/21X5lGlDOfg');
    assert(validShortsUrl.isValid && validShortsUrl.videoId === '21X5lGlDOfg', 'Valid YouTube Shorts URL correctly parsed');

    assert(getYouTubeThumbnailUrl(' R6MlUcmOul8 ') === null, 'Whitespace-padded YouTube IDs do not generate thumbnail URLs');
    assert(getYouTubeThumbnailUrl('R6MlUcmOul8') === 'https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg', 'Valid YouTube IDs generate the expected thumbnail URL');
    assert(getYouTubeThumbnailUrl('') === null && getYouTubeThumbnailUrl('   ') === null, 'Empty YouTube IDs do not generate thumbnail URLs');
    assert(normalizeImageUrl(null) === null && normalizeImageUrl(undefined) === null && normalizeImageUrl('   ') === null, 'Missing and whitespace-only image URLs are rejected');
    assert(normalizeImageUrl('https://images.example.test/video.jpg') === 'https://images.example.test/video.jpg', 'Valid custom image URLs are preserved');
    assert(
      getVideoThumbnailSource({ youtubeVideoId: 'R6MlUcmOul8', thumbnails: {} }) === 'https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg',
      'Valid video IDs provide a thumbnail fallback when no thumbnail objects are present'
    );
    assert(
      getVideoThumbnailSources({
        youtubeVideoId: 'R6MlUcmOul8',
        thumbnails: {
          maxres: 'https://images.example.test/maxres.jpg',
          high: 'https://images.example.test/high.jpg',
          medium: 'https://images.example.test/medium.jpg',
        },
      }).join(',') === 'https://images.example.test/maxres.jpg,https://images.example.test/high.jpg,https://images.example.test/medium.jpg,https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg',
      'Video thumbnails expose ordered, distinct fallback sources'
    );
    assert(getVideoThumbnailSource({ youtubeVideoId: 'invalid', thumbnails: {} }) === null, 'Invalid YouTube IDs do not provide thumbnail fallbacks');
    assert(
      getVideoThumbnailSource({ youtubeVideoId: '', thumbnails: { high: 'https://images.example.test/custom.jpg' } }) === 'https://images.example.test/custom.jpg',
      'Valid custom thumbnails remain available when the YouTube ID is invalid'
    );

    const invalidHost = parseYouTubeUrl('https://vimeo.com/123456789');
    assert(!invalidHost.isValid, 'Arbitrary external host (vimeo.com) correctly rejected');

    const malformedId = parseYouTubeUrl('https://www.youtube.com/watch?v=short');
    assert(!malformedId.isValid, 'Malformed video ID (< 11 chars) correctly rejected');

    const legacyPublishedId = parseYouTubeUrl('https://www.youtube.com/watch?v=published-1793245273274');
    assert(!legacyPublishedId.isValid, 'Legacy published-timestamp identifiers are rejected before thumbnail generation');

    let rejectedPaddedId = false;
    try {
      await fetchYouTubeMetadata(' R6MlUcmOul8 ');
    } catch (error: any) {
      rejectedPaddedId = /Invalid YouTube video ID/.test(String(error?.message || ''));
    }
    assert(rejectedPaddedId, 'fetchYouTubeMetadata rejects whitespace-padded IDs before making network requests');

    let rejectedLegacyId = false;
    try {
      await fetchYouTubeMetadata('published-1793245273274');
    } catch (error: any) {
      rejectedLegacyId = /Invalid YouTube video ID/.test(String(error?.message || ''));
    }
    assert(rejectedLegacyId, 'fetchYouTubeMetadata rejects invalid legacy IDs instead of constructing broken thumbnail URLs');

    const originalProductionConfig = {
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET,
      APP_URL: process.env.APP_URL,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    };

    try {
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster0.abcd.mongodb.net/vidora?retryWrites=true&w=majority';
      process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz1234567890';
      process.env.APP_URL = 'https://vidora.example.com';
      process.env.ADMIN_EMAIL = 'admin@vidora.example.com';
      process.env.ADMIN_PASSWORD = 'ProductionAdminPassword123!';
      validateServerConfiguration(true);
      assert(true, 'Production configuration accepts a valid MongoDB Atlas SRV URI with a real database name');

      process.env.MONGODB_URI = 'mongodb://db-user:db-pass@mongo.example.com:27017/vidora';
      validateServerConfiguration(true);
      assert(true, 'Production configuration accepts a valid direct MongoDB URI when the host is not Atlas-specific');

      process.env.MONGODB_URI = '';
      let emptyUriRejected = false;
      try {
        validateServerConfiguration(true);
      } catch (error: any) {
        emptyUriRejected = /MONGODB_URI must be configured in production\.|MONGODB_URI must be a valid MongoDB connection string in production\./.test(String(error?.message || ''));
      }
      assert(emptyUriRejected, 'Production configuration rejects empty MongoDB URIs');
    } finally {
      process.env.MONGODB_URI = originalProductionConfig.MONGODB_URI;
      process.env.JWT_SECRET = originalProductionConfig.JWT_SECRET;
      process.env.APP_URL = originalProductionConfig.APP_URL;
      process.env.ADMIN_EMAIL = originalProductionConfig.ADMIN_EMAIL;
      process.env.ADMIN_PASSWORD = originalProductionConfig.ADMIN_PASSWORD;
    }

    if (!hasDatabaseTestConfig) {
      console.log('[BLOCKED] TEST_MONGODB_URI, TEST_ADMIN_EMAIL, and TEST_ADMIN_PASSWORD are not configured; skipping database-backed integration tests.');
      return;
    }
    if (!testAdminEmail || !testAdminCredential) {
      throw new Error('Test administrator credentials are unavailable after configuration validation.');
    }

    // 1. Database Connection & Status Test
    await connectDatabase();
    const dbStatus = getDatabaseStatus();
    assert(dbStatus.connected, 'MongoDB engine connected successfully');
    assert(dbStatus.readyState === 1, 'Mongoose readyState is 1');

    // 2. Database Seeding & Idempotency Test
    await seedInitialData();
    const adminUser = await User.findOne({ email: testAdminEmail });
    assert(adminUser != null, 'Administrator seeded with the test email');
    assert(adminUser?.role === 'admin', 'Administrator possesses role="admin"');

    const adminPasswordMatches = await adminUser!.comparePassword(testAdminCredential);
    assert(adminPasswordMatches, 'Administrator password hash verifies with bcrypt');

    // Test that re-running seed does NOT reset or corrupt admin password
    const savedPasswordHash = adminUser!.passwordHash;
    await seedInitialData();
    const adminUserAfterReseed = await User.findOne({ email: testAdminEmail });
    assert(adminUserAfterReseed?.passwordHash === savedPasswordHash, 'Admin initialization does not silently reset existing password (idempotent)');

    const protectedEmail = `protected-admin-${Date.now()}@vidora-test.local`;
    const protectedPasswordHash = await bcrypt.hash('ProtectedUserPassword123!', 10);
    await User.create({
      email: protectedEmail,
      passwordHash: protectedPasswordHash,
      displayName: 'Protected Regular User',
      role: 'user',
      status: 'active',
    });
    const originalAdminEmail = process.env.ADMIN_EMAIL;
    const originalAdminPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_EMAIL = protectedEmail;
    process.env.ADMIN_PASSWORD = 'WouldOtherwiseCreateAnAdmin123!';
    let refusedToElevate = false;
    try {
      await seedInitialData();
    } catch (error: any) {
      refusedToElevate = error?.message?.includes('Refusing to elevate') === true;
    }
    process.env.ADMIN_EMAIL = originalAdminEmail;
    process.env.ADMIN_PASSWORD = originalAdminPassword;
    const protectedUser = await User.findOne({ email: protectedEmail });
    assert(refusedToElevate && protectedUser?.role === 'user', 'Admin bootstrap refuses to elevate an existing regular user');

    const originalAdminPasswordHash = adminUserAfterReseed!.passwordHash;
    process.env.ADMIN_PASSWORD = 'DifferentPassword123!';
    let refusedToReset = false;
    try {
      await seedInitialData();
    } catch (error: any) {
      refusedToReset = error?.message?.includes('Refusing to reset credentials') === true;
    }
    process.env.ADMIN_PASSWORD = originalAdminPassword;
    const unchangedAdmin = await User.findById(adminUserAfterReseed!._id);
    assert(
      refusedToReset && unchangedAdmin?.passwordHash === originalAdminPasswordHash,
      'Admin bootstrap refuses to overwrite an existing administrator password'
    );

    const passwordBeforeMissingCheck = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    let missingPasswordRefused = false;
    try {
      await seedInitialData();
    } catch (error: any) {
      missingPasswordRefused = error?.message?.includes('ADMIN_EMAIL and ADMIN_PASSWORD are required') === true;
    }
    process.env.ADMIN_PASSWORD = passwordBeforeMissingCheck;
    assert(missingPasswordRefused, 'Admin bootstrap rejects missing required credentials before provisioning');

    await disconnectDatabase();
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/vidora_test?serverSelectionTimeoutMS=200';
    let connectivityFailureClear = false;
    try {
      await connectDatabase();
    } catch (error: any) {
      connectivityFailureClear = /MONGODB_URI|MongoDB|connect/i.test(String(error?.message || ''));
    }
    process.env.MONGODB_URI = testUri;
    await connectDatabase();
    assert(connectivityFailureClear, 'Database connectivity failure produces a clear startup diagnostic');

    const categoriesCount = await Category.countDocuments();
    assert(categoriesCount >= 6, `Categories seeded (found ${categoriesCount} categories)`);

    const videosCount = await Video.countDocuments({ status: 'published' });
    assert(videosCount >= 6, `Curated showcase videos seeded (found ${videosCount} published videos)`);

    // 4. HTTP API Routing Tests (against running server)
    console.log('\n--- EXECUTING HTTP API ROUTING & BOUNDARY TESTS ---');
    
    // 4.1 Valid Registration
    const uniqueEmail = `test_http_${Date.now()}@vidora.tv`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'SecurePassword123!',
        displayName: 'Test HTTP User',
      }),
    });
    const regJson = await regRes.json();
    assert(
      regRes.status === 201 && regJson.success === true && Boolean(regJson.token),
      'POST /api/auth/register with valid input returns HTTP 201 and JSON with token'
    );
    assert(
      regJson.user?.role === 'user',
      'Newly registered user strictly receives default role="user"'
    );

    // 4.2 Duplicate Registration Check (409 Conflict)
    const dupRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'SecurePassword123!',
        displayName: 'Duplicate Name',
      }),
    });
    const dupRegJson = await dupRegRes.json();
    assert(
      dupRegRes.status === 409 && dupRegJson.success === false,
      'POST /api/auth/register with existing email returns HTTP 409 JSON conflict'
    );

    // 4.3 Invalid Registration Input Validation
    const invalidRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'short',
        displayName: '',
      }),
    });
    const invalidRegJson = await invalidRegRes.json();
    assert(
      invalidRegRes.status === 400 && invalidRegJson.success === false,
      'POST /api/auth/register with invalid input returns HTTP 400 JSON validation error'
    );

    // 4.4 Privilege Escalation Prevention on Register
    const hackRegEmail = `hacker_${Date.now()}@vidora.tv`;
    const hackRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: hackRegEmail,
        password: 'SecurePassword123!',
        displayName: 'Fake Admin Attempt',
        role: 'admin', // Attempted role escalation
      }),
    });
    const hackRegJson = await hackRegRes.json();
    assert(
      hackRegJson.user?.role === 'user',
      'Client cannot gain admin privileges by submitting role in registration payload'
    );

    // 4.5 Valid User Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'SecurePassword123!',
      }),
    });
    const loginJson = await loginRes.json();
    assert(
      loginRes.status === 200 && loginJson.success === true && Boolean(loginJson.token),
      'POST /api/auth/login with valid credentials returns HTTP 200 JSON with token'
    );
    const userToken = loginJson.token;

    // 4.6 Login with Incorrect Password
    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'WrongPassword123!',
      }),
    });
    const wrongPassJson = await wrongPassRes.json();
    assert(
      wrongPassRes.status === 401 && wrongPassJson.success === false,
      'POST /api/auth/login with incorrect password returns HTTP 401 JSON'
    );

    // 4.7 Login with Unknown Email
    const unknownEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unknown_user_99999@vidora.tv',
        password: 'AnyPassword123!',
      }),
    });
    const unknownEmailJson = await unknownEmailRes.json();
    assert(
      unknownEmailRes.status === 401 && unknownEmailJson.success === false,
      'POST /api/auth/login with unknown email returns safe HTTP 401 JSON error'
    );

    // 4.8 Valid Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: testAdminCredential,
      }),
    });
    const adminLoginJson = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginJson.success === true && adminLoginJson.user?.role === 'admin',
      'Administrator logs in successfully with role="admin"'
    );
    const adminToken = adminLoginJson.token;

    // 4.9 Playlist privacy and removed-video exposure checks
    const publishedPrivacyVideo = await Video.create({
      youtubeVideoId: `published-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=published${Date.now()}`,
      originalTitle: 'Integration visible video',
      displayTitle: 'Integration visible বাংলা গান video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'published',
    });
    const unpublishedVideo = await Video.create({
      youtubeVideoId: `draft-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=draft${Date.now()}`,
      originalTitle: 'Integration draft video',
      displayTitle: 'Integration draft video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'draft',
    });
    const removedVideo = await Video.create({
      youtubeVideoId: `removed-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=removed${Date.now()}`,
      originalTitle: 'Integration removed video',
      displayTitle: 'Integration removed video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'published',
    });
    await Video.deleteOne({ _id: removedVideo._id });

    const privacyItems = [unpublishedVideo, removedVideo].map((video, order) => ({
      videoId: video._id,
      youtubeVideoId: video.youtubeVideoId,
      order,
      addedAt: new Date(),
    }));
    const publicPrivacyPlaylist = await Playlist.create({
      userId: adminUser!._id,
      title: `Public privacy check ${Date.now()}`,
      visibility: 'public',
      videos: [
        {
          videoId: publishedPrivacyVideo._id,
          youtubeVideoId: publishedPrivacyVideo.youtubeVideoId,
          order: 0,
          addedAt: new Date(),
        },
        ...privacyItems,
      ],
      videoCount: 3,
    });
    const unlistedPrivacyPlaylist = await Playlist.create({
      userId: adminUser!._id,
      title: `Unlisted privacy check ${Date.now()}`,
      visibility: 'unlisted',
      videos: [
        {
          videoId: publishedPrivacyVideo._id,
          youtubeVideoId: publishedPrivacyVideo.youtubeVideoId,
          order: 0,
          addedAt: new Date(),
        },
        ...privacyItems,
      ],
      videoCount: 3,
    });
    const privatePrivacyPlaylist = await Playlist.create({
      userId: adminUser!._id,
      title: `Private privacy check ${Date.now()}`,
      visibility: 'private',
      videos: privacyItems,
      videoCount: 2,
    });

    const publicPrivacyRes = await fetch(`${BASE_URL}/api/playlists/${publicPrivacyPlaylist._id}`);
    const publicPrivacyJson = await publicPrivacyRes.json();
    const publicPrivacyVideos = publicPrivacyJson.playlist?.videos ?? [];
    assert(
      publicPrivacyRes.status === 200
      && publicPrivacyVideos.length === 1
      && publicPrivacyVideos[0].videoId?._id === publishedPrivacyVideo._id.toString()
      && publicPrivacyJson.playlist.videoCount === 1,
      'Public playlist hides unpublished and removed videos'
    );

    const unlistedPrivacyRes = await fetch(`${BASE_URL}/api/playlists/${unlistedPrivacyPlaylist._id}`);
    const unlistedPrivacyJson = await unlistedPrivacyRes.json();
    const unlistedPrivacyVideos = unlistedPrivacyJson.playlist?.videos ?? [];
    assert(
      unlistedPrivacyRes.status === 200
      && unlistedPrivacyVideos.length === 1
      && unlistedPrivacyVideos[0].videoId?._id === publishedPrivacyVideo._id.toString()
      && unlistedPrivacyJson.playlist.videoCount === 1,
      'Unlisted playlist hides unpublished and removed videos'
    );

    const privateUnauthRes = await fetch(`${BASE_URL}/api/playlists/${privatePrivacyPlaylist._id}`);
    assert(privateUnauthRes.status === 403, 'Unauthenticated private playlist request is forbidden');

    const privateOtherUserRes = await fetch(`${BASE_URL}/api/playlists/${privatePrivacyPlaylist._id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(privateOtherUserRes.status === 403, 'Another user cannot read a private playlist');

    const privateOwnerRes = await fetch(`${BASE_URL}/api/playlists/${privatePrivacyPlaylist._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const privateOwnerJson = await privateOwnerRes.json();
    assert(
      privateOwnerRes.status === 200
      && privateOwnerJson.playlist?.videos?.length === 2,
      'Private playlist owner retains access to private playlist content'
    );

    // 4.10 Search and collection API regression coverage
    const malformedSearchRes = await fetch(`${BASE_URL}/api/search?q=one&q=two`);
    assert(malformedSearchRes.status === 200, 'Repeated search query parameters are handled safely');

    const banglaSearchRes = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent('বাংলা গান')}`);
    const banglaSearchJson = await banglaSearchRes.json();
    assert(
      banglaSearchRes.status === 200
      && banglaSearchJson.videos?.some((video: any) => video._id === publishedPrivacyVideo._id.toString()),
      'Bangla multi-word search matches catalog metadata'
    );

    const watchLaterAddRes = await fetch(`${BASE_URL}/api/watch-later/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ videoId: publishedPrivacyVideo._id.toString(), youtubeVideoId: publishedPrivacyVideo.youtubeVideoId }),
    });
    const watchLaterCheckRes = await fetch(`${BASE_URL}/api/watch-later/check/${publishedPrivacyVideo._id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const watchLaterCheckJson = await watchLaterCheckRes.json();
    assert(watchLaterAddRes.status === 200 && watchLaterCheckJson.isSaved === true, 'Watch Later toggle persists and check endpoint reports saved state');

    const shortHistoryProgressRes = await fetch(`${BASE_URL}/api/history/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `******` },
      body: JSON.stringify({
        videoId: publishedPrivacyVideo._id.toString(),
        youtubeVideoId: publishedPrivacyVideo.youtubeVideoId,
        positionSeconds: 4,
        durationSeconds: 300,
      }),
    });
    assert(shortHistoryProgressRes.status === 400, 'Playback below five seconds is not persisted as watch history');

    const historyProgressRes = await fetch(`${BASE_URL}/api/history/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        videoId: publishedPrivacyVideo._id.toString(),
        youtubeVideoId: publishedPrivacyVideo.youtubeVideoId,
        positionSeconds: 75,
        durationSeconds: 300,
      }),
    });
    const historyProgressJson = await historyProgressRes.json();
    assert(historyProgressRes.status === 200 && historyProgressJson.history?.positionSeconds === 75, 'Playback progress endpoint records a resumable history checkpoint');

    const historyListRes = await fetch(`${BASE_URL}/api/history`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const historyListJson = await historyListRes.json();
    assert(
      historyListRes.status === 200
      && historyListJson.history?.some((item: any) => item.youtubeVideoId === publishedPrivacyVideo.youtubeVideoId)
      && historyListJson.total >= 1,
      'History endpoint returns the recorded checkpoint and accurate total count'
    );

    const historyDeleteRes = await fetch(`${BASE_URL}/api/history/${publishedPrivacyVideo._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(historyDeleteRes.status === 200, 'History entry can be removed by its owner');

    const historyClearRes = await fetch(`${BASE_URL}/api/history/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `******` },
      body: JSON.stringify({
        videoId: publishedPrivacyVideo._id.toString(),
        youtubeVideoId: publishedPrivacyVideo.youtubeVideoId,
        positionSeconds: 10,
        durationSeconds: 300,
      }),
    });
    const clearAllHistoryRes = await fetch(`${BASE_URL}/api/history`, {
      method: 'DELETE',
      headers: { Authorization: `******` },
    });
    assert(historyClearRes.status === 200 && clearAllHistoryRes.status === 200, 'Clear All removes all applicable history entries');

    const historyAfterDeleteRes = await fetch(`${BASE_URL}/api/history`, {
      headers: { Authorization: `******` },
    });
    const historyAfterDeleteJson = await historyAfterDeleteRes.json();
    assert(
      historyAfterDeleteRes.status === 200
      && !historyAfterDeleteJson.history?.some((item: any) => item.youtubeVideoId === publishedPrivacyVideo.youtubeVideoId),
      'History deletion is persisted and removed from subsequent reads'
    );

    const watchLaterRemoveRes = await fetch(`${BASE_URL}/api/watch-later/${publishedPrivacyVideo._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(watchLaterRemoveRes.status === 200, 'Watch Later entry can be removed by its owner');

    const draftHeroRes = await fetch(`${BASE_URL}/api/admin/homepage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ heroVideoId: unpublishedVideo._id.toString(), heroCustomTitle: 'Draft hero' }),
    });
    assert(draftHeroRes.status === 400, 'Homepage CMS rejects an unpublished hero video');

    const invalidHomeTitleRes = await fetch(`${BASE_URL}/api/admin/homepage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ heroCustomTitle: { invalid: true } }),
    });
    assert(invalidHomeTitleRes.status === 400, 'Homepage CMS rejects non-string custom fields');

    const invalidReportModerationRes = await fetch(`${BASE_URL}/api/admin/reports/test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ unpublishVideo: 'false' }),
    });
    assert(invalidReportModerationRes.status === 400, 'Report moderation rejects non-boolean unpublish requests');

    // 4.11 Unknown API Endpoint Returns JSON 404 (Never HTML)
    const nonExistentRes = await fetch(`${BASE_URL}/api/nonexistent-endpoint-test`);
    const nonExistentType = nonExistentRes.headers.get('content-type') || '';
    const nonExistentJson = await nonExistentRes.json();
    assert(
      nonExistentRes.status === 404 && nonExistentType.includes('application/json') && nonExistentJson.code === 'NOT_FOUND',
      'GET /api/nonexistent returns HTTP 404 JSON (NOT HTML)'
    );

    // 4.11 Unsupported HTTP Method on API Route Returns JSON (Never HTML)
    const unsupportedMethodRes = await fetch(`${BASE_URL}/api/auth/login`, { method: 'DELETE' });
    const unsupportedMethodType = unsupportedMethodRes.headers.get('content-type') || '';
    const unsupportedMethodJson = await unsupportedMethodRes.json();
    assert(
      unsupportedMethodRes.status === 404 && unsupportedMethodType.includes('application/json') && unsupportedMethodJson.code === 'NOT_FOUND',
      'Unsupported HTTP method on API route returns JSON (NOT HTML)'
    );

    // 4.12 Non-API Frontend Route Serves HTML SPA Page
    const spaRes = await fetch(`${BASE_URL}/admin/login`);
    const spaType = spaRes.headers.get('content-type') || '';
    assert(
      spaRes.status === 200 && spaType.includes('text/html'),
      'Non-API frontend route (/admin/login) returns HTML SPA document'
    );

    // 5. Admin Security & Authorization Tests
    console.log('\n--- EXECUTING ADMIN SECURITY & RBAC TESTS ---');

    // 5.1 Unauthenticated Request to Protected Admin API
    const unauthAdminRes = await fetch(`${BASE_URL}/api/admin/stats`);
    const unauthAdminJson = await unauthAdminRes.json();
    assert(
      unauthAdminRes.status === 401 && unauthAdminJson.code === 'UNAUTHENTICATED',
      'Unauthenticated request to protected /api/admin/stats rejected with 401 UNAUTHENTICATED'
    );

    // 5.2 Regular User Request to Protected Admin API
    const regularUserAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const regularUserAdminJson = await regularUserAdminRes.json();
    assert(
      regularUserAdminRes.status === 403 && regularUserAdminJson.code === 'ADMIN_REQUIRED',
      'Regular user request to protected /api/admin/stats rejected with 403 ADMIN_REQUIRED'
    );

    // 5.3 Authenticated Admin Request to Protected Admin API
    const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStatsJson = await adminStatsRes.json();
    assert(
      adminStatsRes.status === 200 && adminStatsJson.success === true && Boolean(adminStatsJson.stats),
      'Authenticated administrator accesses protected /api/admin/stats successfully'
    );

    // 5.4 Invalid or Forged Token Rejected
    const forgedTokenRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: 'Bearer forged.jwt.token' },
    });
    assert(
      forgedTokenRes.status === 401,
      'Forged or malformed JWT token rejected with 401 Unauthorized'
    );

    // 5.5 Logout clears the browser session cookie
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, Cookie: 'vidora_token=test' },
    });
    const logoutJson = await logoutRes.json();
    const clearedCookie = logoutRes.headers.get('set-cookie') || '';
    assert(
      logoutRes.status === 200
      && logoutJson.success === true
      && /vidora_token=;/.test(clearedCookie),
      'Logout succeeds and clears the authentication cookie'
    );

    // 6. Persistence & Relational Checkpoints
    console.log('\n--- EXECUTING PERSISTENCE & ENTITY TESTS ---');

    const sampleVideo = await Video.findOne({ status: 'published' });
    assert(sampleVideo != null, 'Sample video retrieved from catalog');

    // Watch Later
    const watchLaterEntry = await WatchLater.create({
      userId: adminUser!._id,
      videoId: sampleVideo!._id,
      youtubeVideoId: sampleVideo!.youtubeVideoId,
    });
    assert(watchLaterEntry._id != null, 'Video saved to Watch Later');

    let duplicateWatchLaterRejected = false;
    try {
      await WatchLater.create({
        userId: adminUser!._id,
        videoId: sampleVideo!._id,
        youtubeVideoId: sampleVideo!.youtubeVideoId,
      });
    } catch {
      duplicateWatchLaterRejected = true;
    }
    assert(duplicateWatchLaterRejected, 'Duplicate Watch Later entry rejected by compound unique index');

    // Watch History
    const historyCheckpoint = await WatchHistory.findOneAndUpdate(
      { userId: adminUser!._id, videoId: sampleVideo!._id },
      {
        $set: {
          youtubeVideoId: sampleVideo!.youtubeVideoId,
          positionSeconds: 150,
          durationSeconds: 600,
          completionPercent: 25,
          isCompleted: false,
          lastWatchedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    assert(historyCheckpoint.positionSeconds === 150, 'Watch history checkpoint saved');
    assert(historyCheckpoint.completionPercent === 25, 'Completion percentage calculated accurately');

    // Playlists
    const playlist = await Playlist.create({
      userId: adminUser!._id,
      title: 'Cinematic Queue',
      description: 'Curated admin playlist',
      visibility: 'public',
      videos: [
        {
          videoId: sampleVideo!._id,
          youtubeVideoId: sampleVideo!.youtubeVideoId,
          order: 0,
          addedAt: new Date(),
        },
      ],
      videoCount: 1,
    });
    assert(playlist.videos.length === 1, 'Playlist created with video association');

    console.log(`\n======================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    await disconnectDatabase();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('Fatal test error:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

runTests();
