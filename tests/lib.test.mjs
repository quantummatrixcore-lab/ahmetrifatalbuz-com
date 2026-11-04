import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml, truncate, withUtm, normalizeWpPost, normalizeWpList, parseYoutubeFeed, validateContact, buildMailText, verifyTurnstile, pickImage, renderCard, renderGrid, renderLatest, formatDate, renderRegions, dropGenericImages } from '../workers/site-api/src/lib.js';

test('stripHtml decodes entities and removes tags', () => {
  assert.equal(stripHtml('<p>Aile &#8220;Foto&#287;raf&#8221; &amp; Boş Yer</p>'), 'Aile “Fotoğraf” & Boş Yer');
});

test('truncate cuts on word boundary with ellipsis', () => {
  const t = truncate('a'.repeat(50) + ' ' + 'b'.repeat(200), 100);
  assert.ok(t.endsWith('…'));
  assert.ok(t.length <= 101);
});

test('withUtm adds params and rejects non-http', () => {
  const u = new URL(withUtm('https://yeninesil.tv/2026/10/30/x/'));
  assert.equal(u.searchParams.get('utm_source'), 'ahmetrifatalbuz');
  assert.equal(u.searchParams.get('utm_medium'), 'network');
  assert.equal(withUtm('javascript:alert(1)'), null);
});

test('normalizeWpPost maps REST post', () => {
  const p = normalizeWpPost({
    link: 'https://yeninesil.tv/2026/10/30/aile-fotografindaki-bos-yer/',
    date: '2026-10-30T17:07:05',
    title: { rendered: 'Aile Fotoğrafındaki Boş Yer' },
    excerpt: { rendered: '<p>Kısa özet&hellip;</p>' },
    _embedded: { 'wp:featuredmedia': [{ source_url: 'https://yeninesil.tv/wp-content/uploads/a.jpg' }] },
  });
  assert.equal(p.title, 'Aile Fotoğrafındaki Boş Yer');
  assert.equal(p.excerpt, 'Kısa özet…');
  assert.equal(p.image, 'https://yeninesil.tv/wp-content/uploads/a.jpg');
  assert.match(p.link, /utm_campaign=arn/);
});

test('pickImage chooses smallest rendition >= 400px', () => {
  const media = { source_url: 'https://a.tv/full.jpg', media_details: { sizes: {
    thumbnail: { width: 160, source_url: 'https://a.tv/160.jpg' },
    mobil: { width: 540, source_url: 'https://a.tv/540.jpg' },
    boyut: { width: 400, source_url: 'https://a.tv/400.jpg' },
    full: { width: 1280, source_url: 'https://a.tv/full.jpg' },
  } } };
  assert.equal(pickImage(media), 'https://a.tv/400.jpg');
  assert.equal(pickImage({ source_url: 'https://a.tv/only.jpg' }), 'https://a.tv/only.jpg');
  assert.equal(pickImage(null), null);
});

test('normalizeWpList drops invalid entries and limits', () => {
  const ok = { link: 'https://a.tv/x', title: { rendered: 'T' } };
  const list = normalizeWpList([ok, null, { link: 'ftp://x', title: { rendered: 'x' } }, ok, ok], 2);
  assert.equal(list.length, 2);
  assert.deepEqual(normalizeWpList('nope'), []);
});

test('parseYoutubeFeed extracts entries', () => {
  const xml = `<feed><entry><yt:videoId>abcDEF12345</yt:videoId><title>Haber &amp; Gündem</title><published>2026-10-08T06:34:09+00:00</published></entry><entry><yt:videoId>bad id!</yt:videoId><title>x</title></entry></feed>`;
  const v = parseYoutubeFeed(xml);
  assert.equal(v.length, 1);
  assert.equal(v[0].title, 'Haber & Gündem');
  assert.equal(v[0].link, 'https://www.youtube.com/watch?v=abcDEF12345');
});

const good = { name: 'Ayşe Kaya', email: 'ayse@example.com', subject: 'İş birliği', message: 'Merhaba, bir proje için yazıyorum.', consent: 'on', started: 0, website: '' };

test('validateContact accepts valid input', () => {
  const r = validateContact(good, 10_000);
  assert.equal(r.ok, true);
  assert.equal(r.data.consent, true);
});

test('validateContact flags honeypot and too-fast as spam', () => {
  assert.equal(validateContact({ ...good, website: 'http://spam' }, 10_000).spam, true);
  assert.equal(validateContact({ ...good, started: 9_000 }, 10_000).spam, true);
});

test('validateContact reports field errors', () => {
  const r = validateContact({ ...good, email: 'bad', message: 'kısa', consent: false }, 10_000);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.sort(), ['consent', 'email', 'message']);
});

test('validateContact blocks header injection', () => {
  const r = validateContact({ ...good, subject: 'Hi\nBcc: x@y.com' }, 10_000);
  assert.ok(r.errors.includes('header_injection'));
});

test('verifyTurnstile: skipped without secret, rejects missing token, honors siteverify', async () => {
  assert.deepEqual(await verifyTurnstile('', undefined), { ok: true, skipped: true });
  assert.equal((await verifyTurnstile('', 's')).ok, false);
  let sent;
  const okFetch = async (url, init) => { sent = init.body.toString(); return { json: async () => ({ success: true }) }; };
  assert.equal((await verifyTurnstile('tok', 's', '1.2.3.4', okFetch)).ok, true);
  assert.match(sent, /secret=s/);
  assert.match(sent, /remoteip=1\.2\.3\.4/);
  const badFetch = async () => ({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
  assert.deepEqual(await verifyTurnstile('tok', 's', null, badFetch), { ok: false, reason: 'invalid-input-response' });
  const downFetch = async () => { throw new Error('net'); };
  assert.equal((await verifyTurnstile('tok', 's', null, downFetch)).reason, 'unreachable');
});

test('renderCard escapes everything and rejects unsafe links', () => {
  const html = renderCard({ link: 'https://a.tv/x?a=1&b=2', title: '<script>alert(1)</script>', image: 'javascript:x', date: '2026-10-30T17:07:05', excerpt: '"q"' }, { cat: 'A&B', feature: true, eager: true });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/a\.tv\/x\?a=1&amp;b=2"/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /A&amp;B/);
  assert.match(html, /card--feature/);
  assert.match(html, /&quot;q&quot;/);
  assert.equal(renderCard({ link: 'javascript:alert(1)', title: 'x' }), '');
});

test('renderGrid marks first as feature with fetchpriority; others lazy unless eager', () => {
  const items = [1, 2, 3].map((n) => ({ link: `https://a.tv/${n}`, title: `T${n}`, image: `https://a.tv/${n}.jpg` }));
  const g = renderGrid(items, { featureFirst: true, limit: 2 });
  assert.equal((g.match(/<article/g) || []).length, 2);
  assert.match(g, /card--feature.*fetchpriority="high"/);
  assert.equal((g.match(/loading="lazy"/g) || []).length, 2);
  assert.equal((renderGrid(items, { eager: true }).match(/loading="lazy"/g) || []).length, 0);
});

test('formatDate localizes in Istanbul time', () => {
  assert.equal(formatDate('2026-10-30T17:07:05', 'tr'), '30 Ekim 2026');
  assert.equal(formatDate('2026-10-30T17:07:05', 'en'), '30 October 2026');
  assert.equal(formatDate('nope'), '');
  assert.match(renderLatest([{ link: 'https://a.tv/1', title: 'X', date: '2026-10-30' }]), /<li><a href="https:\/\/a\.tv\/1"/);
});

test('renderRegions fills every page region with the right variants', () => {
  const col = (n) => ({ link: `https://yeninesil.tv/${n}`, title: `C${n}`, image: `https://yeninesil.tv/${n}.jpg`, date: '2026-10-30' });
  const vid = (n) => ({ link: `https://www.youtube.com/watch?v=${n}`, title: `V${n}`, image: `https://i.ytimg.com/vi/${n}/hqdefault.jpg`, date: '2026-10-08' });
  const r = renderRegions({ columns: [1, 2, 3, 4, 5].map(col), videos: [1, 2, 3, 4, 5, 6].map(vid), guides: [col(9)] }, 'tr');
  assert.match(r['banner-main'], /card--feature/);
  assert.equal((r['banner-side'].match(/card--row/g) || []).length, 3);
  assert.match(r['banner-side'], /Ahmet Rıfat Albuz/);
  assert.equal((r['videos-main'].match(/<article/g) || []).length, 2);
  assert.equal((r['videos-side'].match(/card--summary/g) || []).length, 4);
  assert.doesNotMatch(r['videos-side'], /<img/);
  assert.match(r['guides-grid'], /Tüm Cezalar/);
  assert.match(r['nav-latest'], /<li>/);
  assert.match(renderRegions({ columns: [col(1)] }, 'en')['banner-main'], /Columns/);
});

test('author portrait and repeated images are dropped; cards get a same-size branded cover', () => {
  const items = dropGenericImages([
    { title: 'a', link: 'https://y.tv/a', image: 'https://y.tv/wp-content/uploads/2026/01/ahmetrifatalbuz-400x225.jpg' },
    { title: 'b', link: 'https://y.tv/b', image: 'https://y.tv/wp-content/uploads/2026/06/ara-400x225.jpg' },
    { title: 'c', link: 'https://y.tv/c', image: 'https://y.tv/up/same-400x225.webp' },
    { title: 'd', link: 'https://y.tv/d', image: 'https://y.tv/up/same-800x450.webp' },
    { title: 'e', link: 'https://y.tv/e', image: 'https://y.tv/up/unique-400x225.webp' },
  ]);
  assert.deepEqual(items.map((i) => Boolean(i.image)), [false, false, false, false, true]);
  const cover = renderCard(items[0], { variant: 'row' });
  assert.match(cover, /card-media card-media--cover/);
  assert.equal(pickImage({ source_url: 'https://y.tv/wp-content/uploads/2026/01/ahmetrifatalbuz.jpg' }), null);
});

test('feature card prefers the large rendition', () => {
  const html = renderCard({ title: 't', link: 'https://y.tv/t', image: 'https://y.tv/s.jpg', imageLarge: 'https://y.tv/l.jpg' }, { variant: 'feature' });
  assert.match(html, /src="https:\/\/y\.tv\/l\.jpg"/);
});

test('buildMailText contains fields', () => {
  const t = buildMailText({ name: 'A', email: 'a@b.co', subject: 'S', message: 'M' }, { date: 'D', country: 'TR' });
  assert.match(t, /Ad Soyad : A/);
  assert.match(t, /Ülke     : TR/);
});
