// Builds dist/: copies public files and generates the English page at /en/ from index.html.
import { rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'en'), { recursive: true });
for (const f of ['index.html', 'kvkk.html', 'style.css', 'script.js', 'robots.txt', 'sitemap.xml', '_headers']) cpSync(join(root, f), join(dist, f));
cpSync(join(root, 'assets'), join(dist, 'assets'), { recursive: true });

const tr = readFileSync(join(root, 'index.html'), 'utf8');
const swaps = [
  ['<html lang="tr">', '<html lang="en">'],
  ['<body class="lang-tr">', '<body class="lang-en" data-lang-default="en">'],
  ['<link rel="canonical" href="https://ahmetrifatalbuz.com/">', '<link rel="canonical" href="https://ahmetrifatalbuz.com/en/">'],
  ['<title>Ahmet Rıfat Albuz | Gazeteci, Köşe Yazarı, Yeni Nesil TV Kurucusu</title>', '<title>Ahmet Rıfat Albuz | Journalist, Columnist, Founder of Yeni Nesil TV</title>'],
  [/<meta name="description" content="[^"]*">/, '<meta name="description" content="Official site of Turkish journalist and columnist Ahmet Rıfat Albuz: latest columns, Yeni Nesil TV videos, Tüm Cezalar guides, career and contact.">'],
  ['<meta property="og:locale" content="tr_TR">', '<meta property="og:locale" content="en_GB">\n    <meta property="og:locale:alternate" content="tr_TR">'],
  ['<meta property="og:url" content="https://ahmetrifatalbuz.com/">', '<meta property="og:url" content="https://ahmetrifatalbuz.com/en/">'],
  ['data-lang="tr" data-href="/" aria-pressed="true"', 'data-lang="tr" data-href="/" aria-pressed="false"'],
  ['data-lang="en" data-href="/en/" aria-pressed="false"', 'data-lang="en" data-href="/en/" aria-pressed="true"'],
  ['<a class="skip-link" href="#icerik">İçeriğe geç</a>', '<a class="skip-link" href="#icerik">Skip to content</a>'],
];
let en = tr;
for (const [from, to] of swaps) {
  const before = en;
  en = typeof from === 'string' ? en.replace(from, to) : en.replace(from, to);
  if (en === before) throw new Error(`build: swap not applied: ${from}`);
}
// Cache-bust CSS/JS with a content hash so edge caches never serve a stale asset after deploy.
const { createHash } = await import('node:crypto');
const hash = (f) => createHash('sha256').update(readFileSync(join(root, f))).digest('hex').slice(0, 10);
const bust = (s) => s
  .replace('href="/style.css"', `href="/style.css?v=${hash('style.css')}"`)
  .replace('src="/script.js"', `src="/script.js?v=${hash('script.js')}"`);
writeFileSync(join(dist, 'index.html'), bust(readFileSync(join(dist, 'index.html'), 'utf8')));
writeFileSync(join(dist, 'kvkk.html'), bust(readFileSync(join(dist, 'kvkk.html'), 'utf8')));
writeFileSync(join(dist, 'en', 'index.html'), bust(en));

const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8').replace(
  '</urlset>',
  '  <url><loc>https://ahmetrifatalbuz.com/en/</loc><lastmod>2026-11-04</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n</urlset>',
);
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
console.log('BUILD OK: dist/ + dist/en/index.html');
