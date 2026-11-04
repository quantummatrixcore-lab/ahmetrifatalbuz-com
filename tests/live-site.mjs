// Live smoke check of production (network). Exits non-zero on any failure.
import assert from 'node:assert/strict';

const BASE = process.env.SITE_BASE || 'https://ahmetrifatalbuz.com';
const get = (p, init) => fetch(BASE + p, { redirect: 'manual', ...init });

const home = await get('/');
assert.equal(home.status, 200, 'home');
const html = await home.text();
assert.match(html, /id="kanallar"/, 'new layout live');
assert.match(html, /yeninesil-logo-white\.png/, 'logo');
assert.ok(home.headers.get('content-security-policy'), 'csp');

const enPage = await get('/en/');
assert.equal(enPage.status, 200, '/en/');
assert.match(await enPage.text(), /<html lang="en">/, 'en lang');

for (const p of ['/kvkk','/robots.txt', '/sitemap.xml', '/assets/yeninesil-logo-white.png', '/style.css', '/script.js']) {
  const r = await get(p);
  assert.equal(r.status, 200, p);
}
for (const p of ['/docs/RAPOR.md', '/package.json', '/workers/site-api/src/lib.js']) {
  const r = await get(p);
  assert.equal(r.status, 404, `${p} must be hidden`);
}

const health = await (await get('/api/health')).json();
assert.equal(health.ok, true);
const feed = await (await get('/api/feed')).json();
assert.ok(feed.columns.length >= 3 && feed.guides.length >= 3 && feed.videos.length >= 3, 'feed');

const bad = await get('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: '{"name":"x","started":0}' });
assert.ok([200, 422].includes(bad.status), 'contact validation');

console.log(`LIVE SITE OK: columns=${feed.columns.length} guides=${feed.guides.length} videos=${feed.videos.length} email=${health.email}`);
