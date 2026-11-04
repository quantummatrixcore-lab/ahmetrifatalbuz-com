// Pages middleware:
// 1) keeps repository-only files off the public site,
// 2) fallback SSR for hosts without the API Worker route (e.g. *.pages.dev previews).
//    On ahmetrifatalbuz.com the API Worker renders / and /en/ from its KV snapshot and marks the
//    origin request with x-arn-worker, so this middleware skips the work there.
import { buildFeed } from '../workers/site-api/src/index.js';
import { applySsr } from '../workers/site-api/src/ssr.js';

const BLOCKED = /^\/(docs|tests|workers|wp-plugin|functions|scripts|node_modules)(\/|$)|^\/(package(-lock)?\.json|\.gitignore|README\.md|_headers)$/i;
const SSR_PATHS = new Map([['/', 'tr'], ['/index.html', 'tr'], ['/en/', 'en'], ['/en/index.html', 'en']]);
const FEED_TTL = 600;
const FEED_TIMEOUT_MS = 1500;

async function getFeed(ctx) {
  const cache = caches.default;
  const key = new Request('https://ahmetrifatalbuz.com/__ssr-feed?v=2');
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

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED.test(pathname)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  const lang = SSR_PATHS.get(pathname);
  if (!lang || context.request.method !== 'GET' || context.request.headers.get('x-arn-worker') === '1') return context.next();

  const feedP = getFeed(context).catch(() => null);
  context.waitUntil(feedP);
  const [res, feed] = await Promise.all([context.next(), withTimeout(feedP, FEED_TIMEOUT_MS)]);
  return feed ? applySsr(res, feed, lang, 'pages-edge') : res;
}
