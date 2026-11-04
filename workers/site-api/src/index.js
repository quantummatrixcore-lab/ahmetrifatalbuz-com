// ahmetrifatalbuz.com site API Worker. Routes: GET /api/feed, POST /api/contact, GET /api/health.
import { SOURCES, normalizeWpList, parseYoutubeFeed, validateContact, buildMailText, verifyTurnstile } from './lib.js';

const FEED_TTL = 1800; // seconds
const RATE_LIMIT = 5; // messages per IP per hour
const INBOX_TTL = 180 * 24 * 3600; // KVKK retention: 180 days
const MAIL_TO = 'ahmetrifatalbuz@gmail.com';
const MAIL_FROM = 'form@ahmetrifatalbuz.com';
const ALLOWED_ORIGINS = new Set(['https://ahmetrifatalbuz.com', 'https://www.ahmetrifatalbuz.com']);

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', ...extra },
  });

async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ahmetrifatalbuz-site-api/1.0' }, cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'ahmetrifatalbuz-site-api/1.0' }, cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

export async function buildFeed() {
  const [c, g, v] = await Promise.allSettled([fetchJson(SOURCES.columns), fetchJson(SOURCES.guides), fetchText(SOURCES.videos)]);
  return {
    updated: new Date().toISOString(),
    columns: c.status === 'fulfilled' ? normalizeWpList(c.value, 7) : [],
    guides: g.status === 'fulfilled' ? normalizeWpList(g.value, 6) : [],
    videos: v.status === 'fulfilled' ? parseYoutubeFeed(v.value, 6) : [],
    errors: [c, g, v].map((x, i) => (x.status === 'rejected' ? ['columns', 'guides', 'videos'][i] : null)).filter(Boolean),
  };
}

const SNAPSHOT_KEY = 'feed:v2'; // bump when normalization rules change
const SNAPSHOT_MAX_AGE_MS = 3 * 3600 * 1000;

/** Rebuilds the feed and stores it in KV. A failed source keeps its previous items (no empty sections). */
export async function refreshSnapshot(env, build = buildFeed) {
  const fresh = await build();
  const prev = env.INBOX ? await env.INBOX.get(SNAPSHOT_KEY, 'json').catch(() => null) : null;
  const merged = { ...fresh };
  for (const k of ['columns', 'guides', 'videos']) if (!merged[k]?.length && prev?.[k]?.length) merged[k] = prev[k];
  if (env.INBOX && merged.columns?.length) await env.INBOX.put(SNAPSHOT_KEY, JSON.stringify(merged));
  return merged;
}

async function handleFeed(request, env, ctx) {
  // 1) KV snapshot (refreshed every 15 min by cron) -> fast, global, no cold start.
  const snap = env.INBOX ? await env.INBOX.get(SNAPSHOT_KEY, 'json').catch(() => null) : null;
  if (snap?.columns?.length) {
    if (Date.now() - Date.parse(snap.updated) > SNAPSHOT_MAX_AGE_MS) ctx.waitUntil(refreshSnapshot(env).catch(() => {}));
    return json(snap, 200, { 'cache-control': 'public, max-age=300', 'x-feed-source': 'snapshot' });
  }
  // 2) No snapshot yet: build live, store, serve.
  const feed = await refreshSnapshot(env);
  const ttl = feed.errors.length ? 120 : FEED_TTL;
  return json(feed, 200, { 'cache-control': `public, max-age=${Math.min(ttl, 300)}`, 'x-feed-source': 'live' });
}

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return request.json();
  const fd = await request.formData();
  return Object.fromEntries(fd.entries());
}

async function handleContact(request, env) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: 'origin' }, 403);
  const cl = Number(request.headers.get('content-length') || 0);
  if (cl > 20000) return json({ ok: false, error: 'too_large' }, 413);

  let body;
  try { body = await readBody(request); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  const v = validateContact(body);
  if (v.spam) return json({ ok: true }); // silently accept bots
  if (!v.ok) return json({ ok: false, error: 'validation', fields: v.errors }, 422);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const country = request.headers.get('cf-ipcountry') || '-';
  const ts = await verifyTurnstile(body['cf-turnstile-response'], env.TURNSTILE_SECRET, ip === 'unknown' ? null : ip);
  if (!ts.ok) return json({ ok: false, error: 'captcha' }, 403);
  if (env.INBOX) {
    const rlKey = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const n = Number((await env.INBOX.get(rlKey)) || 0);
    if (n >= RATE_LIMIT) return json({ ok: false, error: 'rate_limited' }, 429);
    await env.INBOX.put(rlKey, String(n + 1), { expirationTtl: 3700 });
  }

  const date = new Date().toISOString();
  const text = buildMailText(v.data, { date, country });
  let delivered = false;
  let mailError = null;
  if (env.EMAIL) {
    try {
      await env.EMAIL.send({
        to: MAIL_TO,
        from: { email: MAIL_FROM, name: 'ahmetrifatalbuz.com Form' },
        replyTo: v.data.email,
        subject: `[Site] ${v.data.subject}`.slice(0, 200),
        text,
      });
      delivered = true;
    } catch (e) {
      mailError = String(e?.message || e).slice(0, 300);
    }
  }
  if (env.INBOX) {
    const id = `msg:${date}:${crypto.randomUUID().slice(0, 8)}`;
    await env.INBOX.put(id, JSON.stringify({ ...v.data, date, country, delivered, mailError }), { expirationTtl: INBOX_TTL });
  }
  if (!delivered && !env.INBOX) return json({ ok: false, error: 'unavailable' }, 503);
  return json({ ok: true, delivered });
}

const HOME_PATHS = new Map([['/', 'tr'], ['/en/', 'en']]);
const PAGES_ORIGIN = 'https://ahmet-rifat-albuz.pages.dev';

async function getSnapshot(env, ctx) {
  const snap = env.INBOX ? await env.INBOX.get(SNAPSHOT_KEY, 'json').catch(() => null) : null;
  if (snap?.columns?.length) {
    if (Date.now() - Date.parse(snap.updated) > SNAPSHOT_MAX_AGE_MS) ctx.waitUntil(refreshSnapshot(env).catch(() => {}));
    return snap;
  }
  return refreshSnapshot(env);
}

/** Home pages: fetch the static page from Pages (origin) and render the feed from the KV snapshot. */
async function handleHome(request, env, ctx, lang) {
  // Fetch the static page from the Pages origin host (not our own zone route -> no self-loop).
  const u = new URL(request.url);
  const headers = new Headers({ accept: 'text/html', 'x-arn-worker': '1', 'user-agent': request.headers.get('user-agent') || 'arn-site-api' });
  const [res, feed] = await Promise.all([
    fetch(new URL(u.pathname, PAGES_ORIGIN), { headers, redirect: 'manual' }),
    getSnapshot(env, ctx).catch(() => null),
  ]);
  if (!res.ok || !feed) return res;
  const { applySsr } = await import('./ssr.js');
  return applySsr(res, feed, lang, 'worker-kv');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const lang = HOME_PATHS.get(url.pathname);
    if (lang && request.method === 'GET') return handleHome(request, env, ctx, lang);
    if (url.pathname === '/api/feed' && request.method === 'GET') return handleFeed(request, env, ctx);
    if (url.pathname === '/api/contact' && request.method === 'POST') return handleContact(request, env);
    if (url.pathname === '/api/health') return json({ ok: true, email: Boolean(env.EMAIL), inbox: Boolean(env.INBOX), turnstile: Boolean(env.TURNSTILE_SECRET) });
    return json({ ok: false, error: 'not_found' }, 404);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshSnapshot(env));
  },
};
