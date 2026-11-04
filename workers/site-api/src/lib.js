// Pure helpers for the ahmetrifatalbuz.com site API. No Workers globals here, so Node tests can import it.

export const SOURCES = {
  columns: 'https://yeninesil.tv/wp-json/wp/v2/posts?author=10&per_page=7&_embed=wp:featuredmedia',
  guides: 'https://tumcezalar.com/wp-json/wp/v2/posts?per_page=6&_embed=wp:featuredmedia',
  videos: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpsRZvDbmRjiIRqBaiEQOSQ',
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };

export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripHtml(s) {
  return decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function truncate(s, max = 180) {
  const t = String(s ?? '');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:!?-]+$/, '') + '…';
}

export function withUtm(url, campaign = 'arn', medium = 'network', source = 'ahmetrifatalbuz') {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.searchParams.set('utm_source', source);
    u.searchParams.set('utm_medium', medium);
    u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return null;
  }
}

export function safeHttpUrl(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

// Smallest WordPress rendition that is still >= minWidth px wide (card images), else the original.
export function pickImage(media, minWidth = 400) {
  if (media?.source_url && AUTHOR_IMAGE_RE.test(String(media.source_url))) return null;
  if (!media) return null;
  const sizes = Object.values(media.media_details?.sizes || {})
    .filter((s) => s && Number(s.width) >= minWidth && safeHttpUrl(s.source_url))
    .sort((a, b) => Number(a.width) - Number(b.width));
  return safeHttpUrl(sizes[0]?.source_url || media.source_url) || null;
}

export function normalizeWpPost(post) {
  if (!post || typeof post !== 'object') return null;
  const link = withUtm(post.link);
  const title = stripHtml(post.title?.rendered);
  if (!link || !title) return null;
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const image = pickImage(media);
  const imageLarge = pickImage(media, 800);
  return {
    title,
    link,
    date: typeof post.date === 'string' ? post.date : null,
    excerpt: truncate(stripHtml(post.excerpt?.rendered), 180),
    image,
    imageLarge,
  };
}

// Author portrait that WordPress uses as a default featured image; never show it as an article image.
const AUTHOR_IMAGE_RE = /\/(ahmetrifatalbuz|ara)(-\d+x\d+)?\.(jpe?g|png|webp)$/i;
const imageBase = (u) => String(u || '').replace(/-\d+x\d+(?=\.\w+$)/, '');

/** Drops author-portrait and repeated (generic) images so cards fall back to a branded cover. */
export function dropGenericImages(items) {
  const count = new Map();
  for (const it of items) if (it.image) count.set(imageBase(it.image), (count.get(imageBase(it.image)) || 0) + 1);
  return items.map((it) => {
    if (!it.image) return it;
    const generic = AUTHOR_IMAGE_RE.test(new URL(it.image).pathname) || count.get(imageBase(it.image)) > 1;
    return generic ? { ...it, image: null, imageLarge: null } : it;
  });
}

export function normalizeWpList(list, limit = 6) {
  if (!Array.isArray(list)) return [];
  return dropGenericImages(list.map(normalizeWpPost).filter(Boolean)).slice(0, limit);
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1].trim()) : '';
}

export function parseYoutubeFeed(xml, limit = 6) {
  const out = [];
  const entries = String(xml ?? '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const e of entries) {
    const id = tag(e, 'yt:videoId');
    const title = tag(e, 'title');
    if (!/^[\w-]{6,20}$/.test(id) || !title) continue;
    out.push({
      id,
      title,
      date: tag(e, 'published') || null,
      link: `https://www.youtube.com/watch?v=${id}`,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (out.length >= limit) break;
  }
  return out;
}

const EMAIL_RE = /^[^\s@<>()",;]{1,64}@[^\s@<>()",;]{1,190}\.[a-z]{2,24}$/i;

export function validateContact(input, now = Date.now()) {
  const f = (k, max) => String(input?.[k] ?? '').replace(/\r/g, '').trim().slice(0, max);
  const data = {
    name: f('name', 120),
    email: f('email', 254),
    subject: f('subject', 200),
    message: f('message', 5000),
    consent: input?.consent === true || input?.consent === 'on' || input?.consent === 'true',
  };
  const errors = [];
  if (String(input?.website ?? '').trim() !== '') return { ok: false, spam: true, errors: ['spam'] };
  const started = Number(input?.started);
  if (!Number.isFinite(started) || now - started < 3000) return { ok: false, spam: true, errors: ['too_fast'] };
  if (data.name.length < 2) errors.push('name');
  if (!EMAIL_RE.test(data.email)) errors.push('email');
  if (data.subject.length < 2) errors.push('subject');
  if (data.message.length < 10) errors.push('message');
  if (!data.consent) errors.push('consent');
  if (/[\n]/.test(data.name) || /[\n]/.test(data.subject) || /[\n]/.test(data.email)) errors.push('header_injection');
  return errors.length ? { ok: false, spam: false, errors } : { ok: true, data };
}

// ---- server-side rendering (HTML strings; every dynamic value is escaped) ----
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function formatDate(iso, lang = 'tr') {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
}

// Variants: 'card' (image top), 'feature' (big image top + excerpt), 'row' (thumb left), 'summary' (no image, source mark).
export function renderCard(item, { cat = '', feature = false, variant, eager = false, lang = 'tr', byline = '', mark = '' } = {}) {
  const href = safeHttpUrl(item?.link);
  if (!href || !item.title) return '';
  const v = variant || (feature ? 'feature' : 'card');
  const img = v === 'summary' ? null : safeHttpUrl((v === 'feature' && item.imageLarge) || item.image);
  const markHtml = mark ? `<span class="card-mark">${escapeHtml(mark)}</span>` : '';
  // Every image card gets the same 16:9 box; without a real photo it shows a branded cover instead.
  const media = v === 'summary'
    ? ''
    : img
      ? `<div class="card-media"><img src="${escapeHtml(img)}" alt="" decoding="async" width="640" height="360"${v === 'feature' ? ' fetchpriority="high"' : ''}${eager ? '' : ' loading="lazy"'}>${v !== 'row' ? markHtml : ''}</div>`
      : `<div class="card-media card-media--cover" aria-hidden="true"><img src="/assets/yeninesil-logo-white.png" alt="" width="180" height="45" loading="lazy"></div>`;
  const dateTxt = item.date ? `<time datetime="${escapeHtml(String(item.date).slice(0, 10))}">${escapeHtml(formatDate(item.date, lang))}</time>` : '';
  const meta = byline || dateTxt ? `<p class="card-meta">${byline ? `<span>${escapeHtml(byline)}</span>` : ''}${byline && dateTxt ? '<span class="dot" aria-hidden="true"></span>' : ''}${dateTxt}</p>` : '';
  const excerpt = v === 'feature' && item.excerpt ? `<p class="card-excerpt">${escapeHtml(item.excerpt)}</p>` : '';
  const catHtml = cat || (v === 'summary' && mark) ? `<span class="card-cat">${v === 'summary' && mark ? markHtml : ''}${escapeHtml(cat)}</span>` : '';
  return `<article class="card card--${v}"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${media}<div class="card-body">${catHtml}<h3 class="card-title">${escapeHtml(item.title)}</h3>${excerpt}${meta}</div></a></article>`;
}

export function renderGrid(items, { limit = 6, featureFirst = false, ...opts } = {}) {
  return (Array.isArray(items) ? items : []).slice(0, limit).map((it, i) => renderCard(it, { ...opts, feature: featureFirst && i === 0 })).join('');
}

/** All dynamic regions of the home page, keyed by element id. Shared by SSR and the client fallback. */
export function renderRegions(feed, lang = 'tr') {
  const en = lang === 'en';
  const columns = feed?.columns || [];
  const videos = feed?.videos || [];
  const byline = 'Ahmet Rıfat Albuz';
  const colCat = en ? 'Columns' : 'Köşe Yazıları';
  return {
    'banner-main': renderCard(columns[0], { variant: 'feature', cat: colCat, byline, lang, eager: true }),
    'banner-side': columns.slice(1, 4).map((c) => renderCard(c, { variant: 'row', cat: colCat, byline, lang, eager: true })).join(''),
    'columns-more': columns.slice(4, 7).map((c) => renderCard(c, { variant: 'card', cat: colCat, byline, lang })).join(''),
    'videos-main': videos.slice(0, 2).map((x) => renderCard(x, { variant: 'card', cat: 'Yeni Nesil TV', mark: 'YouTube', lang })).join(''),
    'videos-side': videos.slice(2, 6).map((x) => renderCard(x, { variant: 'summary', cat: 'Yeni Nesil TV', mark: 'YouTube', lang })).join(''),
    'guides-grid': renderGrid(feed?.guides, { limit: 6, variant: 'card', cat: 'Tüm Cezalar', lang }),
    'nav-latest': renderLatest(columns, lang),
  };
}

export function renderLatest(items, lang = 'tr') {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((it) => {
    const href = safeHttpUrl(it?.link);
    if (!href || !it.title) return '';
    return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><time datetime="${escapeHtml(String(it.date || '').slice(0, 10))}">${escapeHtml(formatDate(it.date, lang))}</time><span>${escapeHtml(it.title)}</span></a></li>`;
  }).join('');
}

export async function verifyTurnstile(token, secret, ip, fetchImpl = fetch) {
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== 'string' || !token || token.length > 2048) return { ok: false, reason: 'missing' };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j = await r.json();
    return j && j.success === true ? { ok: true } : { ok: false, reason: (j && j['error-codes'] || []).join(',') || 'failed' };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

export function buildMailText(d, meta = {}) {
  return [
    'ahmetrifatalbuz.com iletişim formundan yeni mesaj',
    '',
    `Ad Soyad : ${d.name}`,
    `E-posta  : ${d.email}`,
    `Konu     : ${d.subject}`,
    `Tarih    : ${meta.date || new Date().toISOString()}`,
    `Ülke     : ${meta.country || '-'}`,
    '',
    d.message,
    '',
    '— KVKK: Bu mesaj yalnızca iletişim amacıyla işlenir, 180 gün sonra silinir.',
  ].join('\n');
}
