const base = 'http://localhost:3000';
const adminEmail = 'admin@vidora.tv';
const adminPassword = 'M8tDb$i3Zk1s3xh#p6jPZpYNVhIt6vsY';

async function req(path, opts = {}) {
  const r = await fetch(base + path, opts);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data, headers: r.headers };
}

(async () => {
  const uniqueEmail = 'qa_' + Date.now() + '@example.com';
  const reg = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'SecurePassword123!', displayName: 'Test User' })
  });
  console.log('reg', reg.status, reg.data.success, reg.data.user && reg.data.user.role);

  const userLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'SecurePassword123!' })
  });
  console.log('user login', userLogin.status, userLogin.data.success, !!userLogin.data.token);

  const badPass = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'WrongPassword123!' })
  });
  console.log('wrong password', badPass.status, badPass.data.success);

  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  console.log('admin login', adminLogin.status, adminLogin.data.success, adminLogin.data.user && adminLogin.data.user.role, adminLogin.data.token ? 'token' : 'no-token');

  const adminToken = adminLogin.data.token;
  const stats = await req('/api/admin/stats', { headers: { Authorization: 'Bearer ' + adminToken } });
  console.log('stats', stats.status, !!stats.data.stats);

  const playlists = await req('/api/playlists');
  console.log('playlists', playlists.status, Array.isArray(playlists.data.playlists), playlists.data.total);

  const search = await req('/api/search?q=bangla');
  console.log('search', search.status, Array.isArray(search.data.videos), search.data.total);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
