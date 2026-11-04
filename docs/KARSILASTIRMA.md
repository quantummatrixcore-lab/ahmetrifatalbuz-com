# Format Karşılaştırması — fatihaltayli.com.tr ve ahmetrifatalbuz.com

**Tarih:** 4 Kasım 2026 · **Yöntem:** Referans sitenin canlı HTML ve CSS'i incelendi (`/assets/zlYSUFpX-style.css`). Sadece **düzen ve format** alındı. Metin, logo, görsel ve kod kopyalanmadı.

## 1. Bölüm bölüm karşılaştırma

| # | Bileşen | fatihaltayli.com.tr (referans) | ahmetrifatalbuz.com v2 (eski) | v3 (yeni hedef) |
|---|---|---|---|---|
| 1 | Tema | Açık + koyu (`data-theme`, `prefers-color-scheme`), toggle var | Sadece açık, toggle yok | **Sistem / Açık / Koyu** 3'lü seçici, ilk boyamada uygulanır (flash yok) |
| 2 | Sol üst logo | Kişinin logosu; açık temada siyah, koyu temada beyaz sürüm | Metin "Ahmet Rıfat Albuz" | **Yeni Nesil logosu**; açık temada siyah, koyu temada beyaz sürüm |
| 3 | Menü | Yazılar (açılır son 3 yazı + kategoriler), Videolar, Teke Tek Bilim, İletişim | 6 düz link | Yazılar (açılır son 3 yazı), Videolar, Yeni Nesil TV, Tüm Cezalar, Hakkımda, İletişim |
| 4 | Arama | Header'da arama kutusu | Yok | Header'da arama: yeninesil.tv'de Ahmet'in yazılarında arar (trafik oraya gider) |
| 5 | Ana banner | Solda büyük kart, sağda 3 yatay kart (görsel + kategori + başlık + yazar·tarih) | Portre + numaralı liste + 4 kart | **Solda büyük kart, sağda 3 yatay kart**, "Ahmet Rıfat Albuz · tarih" satırıyla |
| 6 | Video alanı | Kanal sekmeleri + "Kanala Git"; solda 2 büyük, sağda özet kartlar | 6 eşit kart | **Sekme + Kanala Git; solda 2 büyük, sağda 4 özet kart** |
| 7 | Kanallar | Avatar, ad, abone sayısı, oynatma listeleri ve sayıları, "Tümünü incele" | Koyu bant, 3 kart | **Avatar (YN logosu), ad, abone sayısı, liste satırları ve sayılar** |
| 8 | Kategori bloğu | Otomobil Yazıları (kartlar) | Tüm Cezalar rehberleri | Tüm Cezalar rehberleri, aynı kart formatında |
| 9 | Tipografi | Tek aile: Inter (Regular/Medium/Semibold/Bold) | Inter + Source Serif | **Sadece Inter** |
| 10 | Renk | Siyah/beyaz/gri skala + kırmızı vurgu (#E90000) | Krem + bordo | **Nötr gri skala + kırmızı vurgu** (kendi tonumuz), koyu temada ters skala |
| 11 | Genişlik | max 1248px, 16px kenar boşluğu | 1180px | **1248px / 16px** |
| 12 | Gizli H1 | "… Anasayfa" (ekran okuyucu/SEO için) | Görünür büyük H1 | Gizli H1 "Ahmet Rıfat Albuz", portre Hakkımda'ya taşındı |
| 13 | Reklam alanı | Üstte ve ortada reklam | Yok | Yok (bilinçli olarak eklenmedi) |
| 14 | Alt bilgi | 3 link sütunu + sosyal ikonlar | 3 sütun + logo | 3 sütun + logo + sosyal |

## 2. Bizde olup referansta olmayanlar (korunuyor)
- Sunucu tarafında render edilen canlı içerik (köşe yazıları, videolar, rehberler)
- Çalışan iletişim formu (Turnstile, KVKK)
- TR/EN ayrı URL'ler (hreflang)
- Ağ (cross-traffic) linkleri, UTM ölçümü

## 3. Bilinçli farklar
- Logo, renk tonu ve ikonlar özgün. Referansın görselleri ve kodu kullanılmadı.
- Reklam alanları yok.
