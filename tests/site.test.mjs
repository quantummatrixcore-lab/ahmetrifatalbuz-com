import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const js = read('script.js');

test('core SEO tags present', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/ahmetrifatalbuz\.com\/">/);
  assert.match(html, /<link rel="icon"/);
  assert.match(html, /<meta name="twitter:card"/);
  assert.doesNotMatch(html, /property="twitter:/);
  assert.match(html, /og:site_name/);
});

test('JSON-LD is valid and has Person with sameAs network', () => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const data = JSON.parse(m[1]);
  const person = data['@graph'].find((n) => n['@type'] === 'Person');
  assert.ok(person.sameAs.includes('https://yeninesil.tv/author/ahmetalbuz/'));
  assert.ok(person.sameAs.includes('https://tumcezalar.com/author/ahmet/'));
});

test('every target=_blank link has noopener noreferrer', () => {
  const tags = html.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
  assert.ok(tags.length > 10);
  for (const t of tags) assert.match(t, /rel="noopener noreferrer"/, t);
});

test('single h1 and Yeni Nesil logo in channels block', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  const channels = html.slice(html.indexOf('id="kanallar"'), html.indexOf('id="rehberler"'));
  assert.match(channels, /src="\/assets\/yeninesil-logo-white\.png" alt="Yeni Nesil TV"/);
  assert.ok(existsSync(join(root, 'assets/yeninesil-logo-white.png')));
});

test('no third-party scripts or icon CDNs', () => {
  const scripts = html.match(/<script[^>]*src="[^"]+"/g) || [];
  for (const s of scripts) assert.match(s, /src="\/script\.js"/);
  assert.doesNotMatch(html, /font-awesome|\bfa[srb]? fa-|\bfa-[a-z]/);
});

test('form posts to real API with honeypot, consent and live status region', () => {
  assert.match(html, /action="\/api\/contact"/);
  assert.match(html, /name="website"/);
  assert.match(html, /id="cf-consent"[^>]*required/);
  assert.match(html, /id="cf-status" role="status" aria-live="polite"/);
  assert.ok(existsSync(join(root, 'kvkk.html')));
});

test('script.js never writes HTML from data and does not fake sending', () => {
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(js, /Simulate/i);
  assert.match(js, /fetch\('\/api\/contact'/);
  assert.match(js, /passive: true/);
});

test('CSS has reduced-motion and phone breakpoints', () => {
  const css = read('style.css');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 600px/);
});

test('robots, sitemap, headers exist', () => {
  for (const f of ['robots.txt', 'sitemap.xml', '_headers', 'functions/_middleware.js']) assert.ok(existsSync(join(root, f)), f);
  assert.match(read('_headers'), /Content-Security-Policy/);
});
