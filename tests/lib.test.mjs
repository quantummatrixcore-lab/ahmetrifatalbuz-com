import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml, truncate, withUtm, normalizeWpPost, normalizeWpList, parseYoutubeFeed, validateContact, buildMailText } from '../workers/site-api/src/lib.js';

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

test('buildMailText contains fields', () => {
  const t = buildMailText({ name: 'A', email: 'a@b.co', subject: 'S', message: 'M' }, { date: 'D', country: 'TR' });
  assert.match(t, /Ad Soyad : A/);
  assert.match(t, /Ülke     : TR/);
});
