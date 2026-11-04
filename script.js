'use strict';
(() => {
    const $ = (s, r = document) => r.querySelector(s);
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
    };
    const root = document.documentElement;

    // ---- theme: system / light / dark (initial value applied by /theme.js before paint) ----
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const applyTheme = (mode) => {
        if (!['system', 'light', 'dark'].includes(mode)) mode = 'system';
        const dark = mode === 'dark' || (mode === 'system' && mq && mq.matches);
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
        root.setAttribute('data-theme-mode', mode);
        document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === mode)));
    };
    applyTheme(store.get('arn-theme') || 'system');
    document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
        store.set('arn-theme', b.dataset.themeSet);
        applyTheme(b.dataset.themeSet);
    }));
    if (mq) mq.addEventListener('change', () => { if ((store.get('arn-theme') || 'system') === 'system') applyTheme('system'); });

    // ---- language: each language has its own URL (/ and /en/) ----
    const lang = document.body.dataset.langDefault === 'en' ? 'en' : 'tr';
    document.querySelectorAll('.lang-btn').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
        b.addEventListener('click', () => {
            store.set('arn-lang', b.dataset.lang);
            if (b.dataset.lang !== lang && /^https?:$/.test(location.protocol)) location.assign(b.dataset.href + location.hash);
        });
    });

    // ---- mobile nav ----
    const nav = $('#main-nav');
    const toggle = $('.nav-toggle');
    if (nav && toggle) {
        const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
        toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
        nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
        window.addEventListener('resize', () => { if (window.innerWidth > 1100) close(); }, { passive: true });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // ---- live feed fallback (only when the server did not render it) ----
    // Uses the exact same escaped renderers as the server (served as /lib.js).
    if (!document.body.dataset.ssr) {
        Promise.all([import('/lib.js'), fetch('/api/feed', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))])
            .then(([lib, feed]) => {
                if (!feed?.columns?.length) return;
                const regions = lib.renderRegions(feed, lang);
                for (const [id, html] of Object.entries(regions)) {
                    const el = document.getElementById(id);
                    if (!el || !html) continue;
                    const doc = new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html');
                    el.replaceChildren(doc.querySelector('template').content);
                }
            })
            .catch(() => { /* static fallback content stays */ });
    }

    // ---- active nav on scroll (rAF throttled) ----
    const links = [...document.querySelectorAll('.main-nav > ul > li > a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY + 120;
            let current = null;
            for (const s of sections) if (s.offsetTop <= y) current = s.id;
            links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
            ticking = false;
        });
    }, { passive: true });

    // ---- contact form ----
    const form = $('#contact-form');
    if (!form) return;
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
    const say = (key, cls) => { status.textContent = msg[key][lang === 'en' ? 1 : 0]; status.className = `form-status ${cls || ''}`; };
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
})();
