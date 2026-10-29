import fs from 'fs';
import { createApp } from './server/app.ts';
import { connectDatabase, disconnectDatabase } from './server/db/connection.ts';
import { seedInitialData } from './server/db/seed.ts';
import { User } from './server/models/User.ts';
import { Video } from './server/models/Video.ts';
import { Playlist } from './server/models/Playlist.ts';

const envText = fs.readFileSync('./.env', 'utf8');
const match = envText.match(/^MONGODB_URI=(.*)$/m);
if (!match) throw new Error('MONGODB_URI missing');
process.env.MONGODB_URI = match[1].trim().replace(/^"|"$/g, '');
process.env.ADMIN_EMAIL = 'qa-admin@vidora.local';
process.env.ADMIN_PASSWORD = 'QATestAdminPassword123!';
process.env.ADMIN_NAME = 'QA Admin';
process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz1234567890';

const app = createApp();
const port = 3101;

async function main() {
  await connectDatabase();
  await seedInitialData();

  const server = app.listen(port, '0.0.0.0', async () => {
    const base = `http://localhost:${port}`;
    const uniqueEmail = `test_http_${Date.now()}@vidora.tv`;
    const regRes = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'SecurePassword123!', displayName: 'Test HTTP User' })
    });
    const regJson = await regRes.json();
    console.log('register', regRes.status, regJson.success, regJson.user && regJson.user.role);

    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'SecurePassword123!' })
    });
    const loginJson = await loginRes.json();
    console.log('login', loginRes.status, loginJson.success, !!loginJson.token);
    const userToken = loginJson.token;

    const adminLoginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
    });
    const adminLoginJson = await adminLoginRes.json();
    console.log('admin login', adminLoginRes.status, adminLoginJson.success, adminLoginJson.user && adminLoginJson.user.role, !!adminLoginJson.token);

    const publishedPrivacyVideo = await Video.create({
      youtubeVideoId: `published-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=published${Date.now()}`,
      originalTitle: 'Integration visible video',
      displayTitle: 'Integration visible ????? ??? video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'published'
    });
    const unpublishedVideo = await Video.create({
      youtubeVideoId: `draft-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=draft${Date.now()}`,
      originalTitle: 'Integration draft video',
      displayTitle: 'Integration draft video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'draft'
    });
    const removedVideo = await Video.create({
      youtubeVideoId: `removed-${Date.now()}`,
      originalUrl: `https://www.youtube.com/watch?v=removed${Date.now()}`,
      originalTitle: 'Integration removed video',
      displayTitle: 'Integration removed video',
      channelId: 'integration-test',
      channelTitle: 'Integration Test',
      status: 'published'
    });
    await Video.deleteOne({ _id: removedVideo._id });
    const privacyItems = [unpublishedVideo, removedVideo].map((video, order) => ({
      videoId: video._id,
      youtubeVideoId: video.youtubeVideoId,
      order,
      addedAt: new Date()
    }));
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
    const playlist = await Playlist.create({
      userId: adminUser._id,
      title: 'Public privacy check',
      visibility: 'public',
      videos: [{ videoId: publishedPrivacyVideo._id, youtubeVideoId: publishedPrivacyVideo.youtubeVideoId, order: 0, addedAt: new Date() }, ...privacyItems],
      videoCount: 3
    });

    const publicRes = await fetch(base + '/api/playlists/' + playlist._id);
    const publicJson = await publicRes.json();
    console.log('public playlist', publicRes.status, publicJson.playlist && publicJson.playlist.videos && publicJson.playlist.videos.length, publicJson.playlist && publicJson.playlist.videoCount);

    const searchRes = await fetch(base + '/api/search?q=' + encodeURIComponent('????? ???'));
    const searchJson = await searchRes.json();
    console.log('search', searchRes.status, searchJson.videos && searchJson.videos.map(v => v.displayTitle));

    const watchLaterAdd = await fetch(base + '/api/watch-later/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ videoId: publishedPrivacyVideo._id.toString(), youtubeVideoId: publishedPrivacyVideo.youtubeVideoId })
    });
    const watchLaterAddJson = await watchLaterAdd.json();
    console.log('watchlater toggle', watchLaterAdd.status, watchLaterAddJson);

    const historyProgress = await fetch(base + '/api/history/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ videoId: publishedPrivacyVideo._id.toString(), youtubeVideoId: publishedPrivacyVideo.youtubeVideoId, positionSeconds: 75, durationSeconds: 300 })
    });
    console.log('history progress', historyProgress.status, await historyProgress.text());

    server.close();
    await disconnectDatabase();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
