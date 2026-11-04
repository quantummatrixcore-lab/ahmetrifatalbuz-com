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

export function normalizeWpPost(post) {
  if (!post || typeof post !== 'object') return null;
  const link = withUtm(post.link);
  const title = stripHtml(post.title?.rendered);
  if (!link || !title) return null;
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const image = safeHttpUrl(media?.media_details?.sizes?.medium_large?.source_url || media?.source_url) || null;
  return {
    title,
    link,
    date: typeof post.date === 'string' ? post.date : null,
    excerpt: truncate(stripHtml(post.excerpt?.rendered), 180),
    image,
  };
}

export function normalizeWpList(list, limit = 6) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeWpPost).filter(Boolean).slice(0, limit);
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
