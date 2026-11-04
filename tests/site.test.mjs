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
  assert.match(channels, /class="chnl-avatar chnl-avatar--logo"><img src="\/assets\/yeninesil-logo-white\.png"/);
  assert.match(channels, /<h3 class="chnl-name">Yeni Nesil TV<\/h3>/);
  assert.ok(existsSync(join(root, 'assets/yeninesil-logo-white.png')));
});

test('no third-party scripts or icon CDNs', () => {
  const scripts = html.match(/<script[^>]*src="[^"]+"/g) || [];
  for (const s of scripts) assert.match(s, /src="\/(script|theme)\.js"/);
  assert.match(html, /class="cf-turnstile" data-sitekey="0x/);
  assert.match(read('_headers'), /frame-src https:\/\/challenges\.cloudflare\.com/);
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
  assert.match(js, /addEventListener\('focusin', loadTurnstile/);
  assert.doesNotMatch(html, /turnstile\/v0\/api\.js/, 'Turnstile must load lazily, not in HTML');
});

test('CSS has reduced-motion and phone breakpoints', () => {
  const css = read('style.css');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 600px/);
});

test('build generates English page with hreflang and canonical', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'pipe' });
  const en = read('dist/en/index.html');
  assert.match(en, /<html lang="en" data-theme="light">/);
  assert.match(en, /<li class="nav-lang"><a href="\/" hreflang="tr" lang="tr">Türkçe<\/a><\/li>/);
  assert.ok(existsSync(join(root, 'dist/lib.js')) && existsSync(join(root, 'dist/theme.js')));
  assert.match(en, /<link rel="canonical" href="https:\/\/ahmetrifatalbuz\.com\/en\/">/);
  assert.match(en, /data-lang-default="en"/);
  assert.match(en, /hreflang="tr"/);
  assert.match(html, /hreflang="en" href="https:\/\/ahmetrifatalbuz\.com\/en\/"/);
  assert.match(read('dist/sitemap.xml'), /\/en\/<\/loc>/);
  for (const f of ['dist/index.html', 'dist/en/index.html']) {
    assert.match(read(f), /src="\/script\.js\?v=[0-9a-f]{10}"/, f);
    assert.match(read(f), /href="\/style\.css\?v=[0-9a-f]{10}"/, f);
  }
  assert.ok(!existsSync(join(root, 'dist/docs')));
});

test('header: Yeni Nesil logo top-left in light+dark variants, 3-way theme switch, search', () => {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.match(header, /<a href="\/" class="hdr-logo" aria-label="[^"]+">/, 'logo link has a name in both themes');
  const firstLink = header.slice(header.indexOf('<a href="/" class="hdr-logo"'), header.indexOf('</a>', header.indexOf('class="hdr-logo"')));
  assert.match(firstLink, /class="logo-light" src="\/assets\/yeninesil-logo-black\.png"/);
  assert.match(firstLink, /class="logo-dark" src="\/assets\/yeninesil-logo-white\.png"/);
  assert.ok(existsSync(join(root, 'assets/yeninesil-logo-black.png')));
  for (const m of ['system', 'light', 'dark']) assert.match(header, new RegExp(`data-theme-set="${m}"`));
  assert.match(header, /class="hdr-search"/);
  assert.match(html, /<script src="\/theme\.js"><\/script>/, 'theme applied before paint');
  const css = read('style.css');
  assert.match(css, /\[data-theme="dark"\] \{/);
  assert.match(css, /\[data-theme="dark"\] \.logo-dark \{ display: block; \}/);
});

test('news-portal layout regions exist in order', () => {
  const order = ['id="banner-main"', 'id="banner-side"', 'id="videos-main"', 'id="videos-side"', 'id="kanallar"', 'id="guides-grid"', 'id="hakkimda"', 'id="iletisim"'];
  let last = -1;
  for (const o of order) { const i = html.indexOf(o); assert.ok(i > last, o); last = i; }
});

test('robots, sitemap, headers exist', () => {
  for (const f of ['robots.txt', 'sitemap.xml', '_headers', 'functions/_middleware.js']) assert.ok(existsSync(join(root, f)), f);
  assert.match(read('_headers'), /Content-Security-Policy/);
});
