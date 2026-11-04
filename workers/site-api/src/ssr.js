// Shared edge SSR: injects the feed regions into a home-page HTML response (Workers HTMLRewriter).
import { renderRegions, escapeHtml, safeHttpUrl } from './lib.js';

class SetInner {
  constructor(html) { this.html = html; }
  element(el) { if (this.html) el.setInnerContent(this.html, { html: true }); }
}

export function applySsr(res, feed, lang, via) {
  if (!feed?.columns?.length || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const first = feed.columns[0];
  const lcp = safeHttpUrl(first?.imageLarge || first?.image);
  let rw = new HTMLRewriter()
    .on('head', { element(el) { if (lcp) el.append(`<link rel="preload" as="image" href="${escapeHtml(lcp)}" fetchpriority="high">`, { html: true }); } })
    .on('body', { element(el) { el.setAttribute('data-ssr', '1'); } });
  for (const [id, html] of Object.entries(renderRegions(feed, lang))) rw = rw.on(`#${id}`, new SetInner(html));
  const out = new Response(rw.transform(res).body, res);
  out.headers.set('cache-control', 'public, max-age=0, must-revalidate');
  out.headers.set('x-ssr', '1');
  out.headers.set('x-ssr-feed', via);
  return out;
}
