// Pages middleware:
// 1) keeps repository-only files off the public site,
// 2) server-side renders the live feed into / and /en/ so the LCP image is in the first HTML byte stream.
import { buildFeed } from '../workers/site-api/src/index.js';
import { renderRegions, escapeHtml, safeHttpUrl } from '../workers/site-api/src/lib.js';

const BLOCKED = /^\/(docs|tests|workers|wp-plugin|functions|scripts|node_modules)(\/|$)|^\/(package(-lock)?\.json|\.gitignore|README\.md|_headers)$/i;
const SSR_PATHS = new Map([['/', 'tr'], ['/index.html', 'tr'], ['/en/', 'en'], ['/en/index.html', 'en']]);
const FEED_TTL = 1800;
const FEED_TIMEOUT_MS = 1500;

async function getFeed(ctx) {
  const cache = caches.default;
  const key = new Request('https://ahmetrifatalbuz.com/__ssr-feed?v=1');
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const feed = await buildFeed();
  if (feed.columns.length) {
    const ttl = feed.errors.length ? 120 : FEED_TTL;
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(feed), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttl}` } })));
  }
  return feed;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

class SetInner {
  constructor(html) { this.html = html; }
  element(el) { if (this.html) el.setInnerContent(this.html, { html: true }); }
}

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED.test(pathname)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  const lang = SSR_PATHS.get(pathname);
  if (!lang || context.request.method !== 'GET') return context.next();

  const feedP = getFeed(context).catch(() => null);
  context.waitUntil(feedP); // even on timeout, finish and warm the cache for the next visitor
  const [res, feed] = await Promise.all([context.next(), withTimeout(feedP, FEED_TIMEOUT_MS)]);
  if (!feed || !feed.columns?.length || !(res.headers.get('content-type') || '').includes('text/html')) return res;

  const lcp = safeHttpUrl(feed.columns[0]?.image);
  const regions = renderRegions(feed, lang);
  let rw = new HTMLRewriter()
    .on('head', { element(el) { if (lcp) el.append(`<link rel="preload" as="image" href="${escapeHtml(lcp)}" fetchpriority="high">`, { html: true }); } })
    .on('body', { element(el) { el.setAttribute('data-ssr', '1'); } });
  for (const [id, html] of Object.entries(regions)) rw = rw.on(`#${id}`, new SetInner(html));
  const rewritten = rw.transform(res);

  const out = new Response(rewritten.body, rewritten);
  out.headers.set('cache-control', 'public, max-age=0, must-revalidate');
  out.headers.set('x-ssr', '1');
  return out;
}
