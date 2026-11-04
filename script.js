'use strict';
(() => {
    const $ = (s, r = document) => r.querySelector(s);
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
    };

    // ---- language ----
    const LANGS = ['tr', 'en'];
    const setLang = (lang) => {
        if (!LANGS.includes(lang)) lang = 'tr';
        document.body.classList.remove('lang-tr', 'lang-en');
        document.body.classList.add(`lang-${lang}`);
        document.documentElement.lang = lang;
        document.querySelectorAll('.lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        store.set('arn-lang', lang);
    };
    // Each language has its own URL (/ and /en/); the page's own language wins over stored preference.
    setLang(document.body.dataset.langDefault || 'tr');
    document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => {
        store.set('arn-lang', b.dataset.lang);
        const target = b.dataset.href;
        if (target && location.pathname !== target && /^https?:$/.test(location.protocol)) location.assign(target + location.hash);
        else setLang(b.dataset.lang);
    }));
    const isEn = () => document.body.classList.contains('lang-en');

    // ---- mobile nav ----
    const nav = $('#main-nav');
    const toggle = $('.nav-toggle');
    if (nav && toggle) {
        const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
        window.addEventListener('resize', () => { if (window.innerWidth > 860) close(); }, { passive: true });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // ---- live feed ----
    const fmtDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(isEn() ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    };
    const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

    const card = (item, { cat, feature = false, eager = false } = {}) => {
        const href = safeUrl(item.link);
        if (!href) return null;
        const art = el('article', feature ? 'card card--feature' : 'card');
        const a = el('a');
        a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        const img = safeUrl(item.image);
        if (img) {
            const m = el('div', 'card-media');
            const i = el('img');
            i.src = img; i.alt = ''; i.decoding = 'async'; i.width = 640; i.height = 360;
            if (feature) i.fetchPriority = 'high';
            if (!eager) i.loading = 'lazy';
            m.append(i); a.append(m);
        }
        const body = el('div', 'card-body');
        if (cat) body.append(el('span', 'card-cat', cat));
        body.append(el('h3', 'card-title', item.title));
        if (item.excerpt && feature) body.append(el('p', 'card-excerpt', item.excerpt));
        if (item.date) {
            const t = el('time', 'card-date', fmtDate(item.date));
            t.dateTime = item.date.slice(0, 10);
            body.append(t);
        }
        a.append(body); art.append(a);
        return art;
    };

    const fill = (id, items, opts) => {
        const box = document.getElementById(id);
        if (!box || !items?.length) return;
        const nodes = items.map((it, i) => card(it, { ...opts, feature: opts.featureFirst && i === 0 })).filter(Boolean);
        if (nodes.length) box.replaceChildren(...nodes);
    };

    const fillLatest = (items) => {
        const ol = $('#latest-list');
        if (!ol || !items?.length) return;
        const lis = items.slice(0, 3).map((it) => {
            const href = safeUrl(it.link);
            if (!href) return null;
            const li = el('li');
            const a = el('a');
            a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
            const t = el('time', null, fmtDate(it.date));
            t.dateTime = (it.date || '').slice(0, 10);
            a.append(t, el('span', null, it.title));
            li.append(a);
            return li;
        }).filter(Boolean);
        if (lis.length) ol.replaceChildren(...lis);
    };

    let feed = null;
    const render = () => {
        if (!feed) return;
        fillLatest(feed.columns);
        fill('columns-grid', (feed.columns || []).slice(0, 4), { cat: 'Yeni Nesil TV', featureFirst: true, eager: true });
        fill('videos-grid', (feed.videos || []).slice(0, 6), { cat: 'YouTube' });
        fill('guides-grid', (feed.guides || []).slice(0, 6), { cat: 'Tüm Cezalar' });
    };
    fetch('/api/feed', { headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data) => { feed = data; render(); })
        .catch(() => { /* static fallback content stays in place */ });
    document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', render));

    // ---- active nav on scroll (rAF throttled) ----
    const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY + 120;
            let current = null;
            for (const s of sections) if (s.offsetTop <= y) current = s.id;
            links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
            ticking = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---- contact form ----
    const form = $('#contact-form');
    if (form) {
        const status = $('#cf-status');
        const submit = $('#cf-submit');
        const started = $('#cf-started');
        if (started) started.value = String(Date.now());

        // Turnstile is ~1.8 MB: load it only once the visitor starts using the form.
        let tsLoaded = false;
        const loadTurnstile = () => {
            if (tsLoaded) return;
            tsLoaded = true;
            const s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            s.async = true;
            document.head.append(s);
        };
        form.addEventListener('focusin', loadTurnstile, { once: true });
        form.addEventListener('pointerdown', loadTurnstile, { once: true });

        const msg = {
            sending: ['Gönderiliyor…', 'Sending…'],
            ok: ['Teşekkürler, mesajınız iletildi. En kısa sürede dönüş yapılacak.', 'Thank you, your message has been delivered.'],
            validation: ['Lütfen işaretli alanları kontrol edin.', 'Please check the highlighted fields.'],
            captcha: ['Güvenlik doğrulaması tamamlanmadı. Lütfen kutucuğu onaylayıp tekrar deneyin.', 'Security check incomplete. Please complete it and try again.'],
            rate_limited: ['Çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar deneyin.', 'Too many attempts. Please try again in an hour.'],
            error: ['Mesaj gönderilemedi. Lütfen ahmetrifatalbuz@gmail.com adresine e-posta gönderin.', 'Could not send. Please email ahmetrifatalbuz@gmail.com.'],
        };
        const say = (key, cls) => { status.textContent = msg[key][isEn() ? 1 : 0]; status.className = `form-status ${cls || ''}`; };
        const fieldMap = { name: 'cf-name', email: 'cf-email', subject: 'cf-subject', message: 'cf-message', consent: 'cf-consent' };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
            if (!form.checkValidity()) {
                form.querySelectorAll(':invalid').forEach((n) => n.setAttribute('aria-invalid', 'true'));
                say('validation', 'err');
                form.querySelector(':invalid')?.focus();
                return;
            }
            const data = Object.fromEntries(new FormData(form).entries());
            data.consent = $('#cf-consent').checked;
            submit.disabled = true;
            say('sending');
            try {
                const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
                const j = await r.json().catch(() => ({}));
                if (r.ok && j.ok) {
                    say('ok', 'ok');
                    form.reset();
                    if (started) started.value = String(Date.now());
                } else if (j.error === 'validation') {
                    (j.fields || []).forEach((f) => document.getElementById(fieldMap[f])?.setAttribute('aria-invalid', 'true'));
                    say('validation', 'err');
                } else {
                    say(['rate_limited', 'captcha'].includes(j.error) ? j.error : 'error', 'err');
                }
            } catch {
                say('error', 'err');
            } finally {
                submit.disabled = false;
                try { window.turnstile?.reset(); } catch { /* widget not loaded */ }
            }
        });
    }
})();
