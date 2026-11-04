# ahmetrifatalbuz.com Ağı — 360° Omega Analiz Raporu

**Tarih:** 4 Kasım 2026 · **Kapsam:** ahmetrifatalbuz.com (Cloudflare Pages `ahmet-rifat-albuz`), arn-site-api Worker, yeninesil.tv ve tumcezalar.com (WordPress) arası trafik ağı.
**Durum:** Yeni site canlıda (Pages production, 4 Kasım 2026). Canlı duman testi geçti: `LIVE SITE OK: columns=7 guides=6 videos=6`.

---

## 1. 360° Analiz

### 1.1 Önceki durum (6d50b8d, Haziran 2026)
| Alan | Bulgu | Kanıt |
|---|---|---|
| Form | Sahteydi. `setTimeout` ile "gönderildi" deniyordu, her mesaj kayboluyordu | eski `script.js:224-246` |
| İçerik | En yeni yazı 3 Haziran 2026'ydı. Gerçekte 30 Ekim 2026'da yazı var | yeninesil REST `posts?author=10` |
| Linkler | 3 "Yazının Devamı" linki ana sayfaya gidiyordu | eski `index.html:439,459,479` |
| SEO | X kartı `property=` ile yazıldığı için okunmuyordu. Canonical ve favicon yoktu | eski `index.html:21-25` |
| Güvenlik | CSP ve HSTS yoktu. `innerHTML` + kullanıcı adı ile self-XSS vardı | canlı başlıklar, eski `script.js:241` |
| Erişilebilirlik | `aria-live` yoktu, reduced-motion yoktu, 375px'te ikonlar taşıyordu | Haiku denetimi + doğrulama |
| Ağ | Hiçbir site tumcezalar.com'a link vermiyordu. yeninesil.tv yazar kutusunda `href="#"` vardı | crawl |

### 1.2 Yeni mimari
```
Ziyaretçi ─► ahmetrifatalbuz.com (Cloudflare Pages, statik + _middleware)
                │  /api/*  (Workers route, aynı alan adı)
                ▼
          arn-site-api Worker ──► yeninesil.tv REST (author=10)   → Köşe yazıları
                │               ├► tumcezalar.com REST            → Rehberler
                │               └► YouTube RSS (UCpsRZvDbmRjiIRqBaiEQOSQ) → Videolar
                │  POST /api/contact → doğrulama, honeypot, IP limiti → KV inbox (180 gün) + Email binding
                ▼
          WordPress eklentisi (arn-network-links) ⇄ yeninesil.tv ⇄ tumcezalar.com
```
- Bölüm sırası referans düzende: menü → son 3 yazı → köşe yazıları (4 kart) → videolar → **Kanallar** (Teke Tek yerine Yeni Nesil TV ve beyaz logo) → Tüm Cezalar rehberleri → hakkımda/kariyer → iletişim → 3 sütunlu alt bilgi.
- Tasarım, renkler, yazı tipi ve kod tamamen özgün. Referans siteden metin, logo, görsel veya kod alınmadı.

---

## 2. Darboğazlar ve kör noktalar

1. **E-posta teslimi kapalı.** Cloudflare Email Sending, `Unauthorized [code: 2036]` hatası veriyor (büyük olasılıkla Workers Paid planı gerekiyor). Mesajlar kaybolmuyor, KV'ye kaydediliyor, ama Gmail'e düşmüyor.
2. **Email Routing açılırsa Purelymail bozulur.** Alan adının MX kayıtları Purelymail'de. Email Routing kök MX'i ister (hata 2008). Asla açılmamalı.
3. **DMARC yok.** `_dmarc.ahmetrifatalbuz.com` kaydı bulunmuyor, bu da sahte gönderime açık kapı bırakıyor.
4. **WordPress eklentisi henüz kurulmadı.** Karşılıklı trafiğin yarısı (yeninesil ⇄ tumcezalar) kurulumu bekliyor.
5. **Pages Git'e bağlı değil.** Yayın, doğrudan yükleme (`scripts/deploy.ps1`) ile yapılıyor; push edince otomatik yayın yok, CI yok.
6. **Eski Vercel projesi** `ahmetrifatalbuz` hesapta duruyor. Karışıklık riski var.
7. **Çelişkili içerik** doğrulanmadı (bkz. Bölüm 5.3).
8. **Ölçüm eksik.** Search Console bağlı değil; UTM var ama raporlanmıyor.
9. **Lighthouse/axe ölçülmedi.** Performans ve erişilebilirlik puanları tahmindir.
10. **PHP lint yapılmadı.** Bu makinede PHP yok, eklenti sözdizimi otomatik doğrulanmadı.
11. **Sosyal rakamlar statik.** Takipçi sayıları elle yazılı, eskiyecek.
12. **yeninesil.tv öne çıkan görseli** her yazıda aynı yazar fotoğrafı; kartlar tekdüze görünüyor.
13. **Turnstile yok.** Spam koruması honeypot + süre tuzağı + IP limiti ile sağlanıyor; bot dalgasına karşı orta düzey.
14. **Tek dil URL'si.** EN içerik aynı URL'de JS ile değişiyor; arama motorları EN'i ayrı indekslemez.

---

## 3. 1000 puan üzerinden puanlama

| # | Alt başlık | Max | Önce | Şimdi | Not |
|---|---|---:|---:|---:|---|
| 1 | Altyapı & hosting | 100 | 70 | 85 | Pages + Worker route. CI yok, Vercel artığı var |
| 2 | Performans | 100 | 60 | 80 | Font Awesome CDN kalktı, ağır animasyonlar kalktı. *Lighthouse ölçülmedi* |
| 3 | SEO & yapısal veri | 120 | 55 | 100 | canonical, twitter name=, JSON-LD @graph, sitemap, robots. EN URL yok |
| 4 | Erişilebilirlik | 80 | 40 | 65 | skip-link, aria-live, aria-pressed, reduced-motion. *axe ölçülmedi* |
| 5 | Güvenlik & KVKK | 120 | 50 | 100 | CSP, HSTS, XFO, textContent, origin kontrolü, rate limit, KVKK metni. DMARC/Turnstile yok |
| 6 | İletişim formu | 80 | 0 | 50 | Gerçek API, KV'ye kayıt. Gmail'e teslim kapalı |
| 7 | İçerik tazeliği & doğruluk | 120 | 40 | 85 | Yazılar/videolar/rehberler otomatik. Çelişkiler açık |
| 8 | Tasarım / UX / mobil | 100 | 65 | 85 | Editoryal düzen, 375px taşma yok. Görsel çeşitliliği zayıf |
| 9 | Ağ trafiği (çapraz link) | 100 | 10 | 45 | Kişisel site → iki siteye UTM'li link. WP eklentisi kurulmadı |
| 10 | Ölçüm & analitik | 50 | 20 | 30 | UTM + CF Web Analytics. Search Console yok |
| 11 | Operasyon & test | 30 | 5 | 22 | 20 birim testi, canlı duman testi, tek komutla yayın. CI yok |
| | **TOPLAM** | **1000** | **415** | **747** | |

---

## 4. 1000/1000 için yapılması gerekenler

1. **Workers Paid planını açın**, ardından `wrangler email sending enable ahmetrifatalbuz.com` komutunu çalıştırın (+30, form). Gerekirse panelden ahmetrifatalbuz@gmail.com adresini doğrulayın.
2. **DMARC ekleyin:** önce `v=DMARC1; p=none; rua=mailto:ahmetrifatalbuz@gmail.com`, 30 gün sonra `p=quarantine` (+10 güvenlik).
3. **Turnstile widget'ı** oluşturun ve siteverify'ı Worker'a ekleyin (+10 güvenlik).
4. **WP eklentisini** iki siteye de kurun: `wp-plugin/KURULUM.md` (+35 ağ).
5. **İçerik çakışmalarını** Ahmet Bey'e doğrulatın (+20 içerik).
6. **Search Console**'a 3 siteyi ekleyin, sitemap gönderin; UTM raporunu (Cloudflare/GA4) kurun (+20 ölçüm, +5 SEO).
7. **Pages'i GitHub'a bağlayın** veya GitHub Actions + `wrangler pages deploy` kurun (+10 altyapı, +8 operasyon).
8. **Vercel artık projesini** silin (+5 altyapı).
9. **Lighthouse ve axe ölçümü** yapın, bulunan sorunları kapatın (+20 performans, +15 erişilebilirlik).
10. **`/en/` sayfası** ve hreflang ekleyin; `/yazilar` arşiv sayfasını sunucu tarafında render edin (+15 SEO).
11. **Takipçi sayılarını** YouTube Data API ile otomatik güncelleyin (+10 içerik).
12. **Görsel çeşitliliği:** yeninesil.tv'de her yazıya kendi öne çıkan görselini yükleyin (+10 tasarım).
13. **yeninesil.tv Yoast ayarları:** "Kişi" şemasına Ahmet Rıfat Albuz'u ve sameAs'e ahmetrifatalbuz.com'u ekleyin (+5 SEO, +10 ağ).
14. **tumcezalar.com yazar sayfası:** biyografi ve görünür byline ekleyin; ilgili rehberlerden yeninesil haberlerine bağlamsal link verin (+10 ağ).
15. **PHP 8 ile lint** ve staging WordPress'te eklenti testi yapın (+5 operasyon).

---

## 5. Görev listesi

### 5.1 Tamamlandı (otomatik, kanıtlı)
- [x] Repo klonlandı, `redesign/v2` dalı açıldı
- [x] Eski site denetlendi (Haiku ×2 + ana model doğrulaması)
- [x] `arn-site-api` Worker canlıda: `/api/feed`, `/api/contact`, `/api/health` (routes: `ahmetrifatalbuz.com/api/*`, `www…/api/*`)
- [x] KV `ARN_INBOX` oluşturuldu (180 gün saklama, IP başına saatte 5 mesaj limiti)
- [x] Site baştan yazıldı: editoryal düzen, Kanallar'da Yeni Nesil beyaz logo, TR/EN, mobil
- [x] KVKK aydınlatma metni `/kvkk`
- [x] SEO: canonical, OG/Twitter, JSON-LD @graph (Person + WebSite), sitemap, robots, favicon
- [x] Güvenlik: CSP, HSTS, X-Frame-Options, Referrer/Permissions-Policy, iç dosyalar 404
- [x] WordPress eklentisi `wp-plugin/arn-network-links.php` + `.zip` + `KURULUM.md`
- [x] Testler: 20/20 birim testi, canlı feed testi, canlı site testi geçti
- [x] `scripts/deploy.ps1` (tek komutla test → Worker → Pages → canlı kontrol), `scripts/inbox.ps1` (form mesajlarını okuma)
- [x] Production yayını yapıldı

### 5.2 Patron / Ahmet Bey aksiyonu gerekiyor
| # | Görev | Kim | Süre |
|---|---|---|---|
| 1 | Workers Paid planı ve `wrangler email sending enable ahmetrifatalbuz.com` | Patron | 5 dk |
| 2 | WP eklentisini yeninesil.tv ve tumcezalar.com'a yükleme | Patron/Ahmet | 2×2 dk |
| 3 | Çelişkili içerik listesini doğrulama (5.3) | Ahmet | 5 dk |
| 4 | Search Console'a 3 site ekleme | Patron | 10 dk |
| 5 | Vercel `ahmetrifatalbuz` projesini silme kararı | Patron | 1 dk |
| 6 | DMARC kaydını onaylama | Patron | 1 dk |

### 5.3 Doğrulanacak içerik (değiştirilmedi)
1. İki aynı anda yürüyen "Genel Yayın Yönetmeni" görevi var: TÜRKİNFORM (Haziran 2026'dan beri) ve yeninesil.tv (2018'den beri). İkisi de doğru mu?
2. "119K+ sosyal medya erişimi" yazıyor, oysa rozetlerin toplamı yaklaşık 237K (85.9K + 28.6K + 34.4K + 88K). Hangisi doğru?
3. Kanal 3'te köşe yazarlığı devam ediyor mu? Zaman çizelgesi 2018'de bitiyor.
4. Takipçi ve abone sayıları güncel mi (85.9K X, 28.6K LinkedIn, 34.4K YouTube, 88K Yeni Nesil X)?
5. Instagram: kişisel hesap `@ahmetrifatalbuz` mı, yoksa sadece `@yeninesil.tv` mi kullanılacak?

---

## 6. Komutlar
```powershell
# Yayın (test + Worker + Pages + canlı kontrol)
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
# Form mesajlarını oku
powershell -ExecutionPolicy Bypass -File scripts/inbox.ps1 -Last 20
# Testler
node --test tests/lib.test.mjs tests/site.test.mjs
node tests/live-site.mjs
```
