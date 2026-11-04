# ARN Network Links — Kurulum (yeninesil.tv + tumcezalar.com)

Aynı dosya iki sitede de çalışır; hangi sitede olduğunu alan adından kendisi anlar.

## Kurulum (her iki site için, 2 dakika)
1. `arn-network-links.php` dosyasını indirin.
2. Hosting dosya yöneticisi veya FTP ile `wp-content/mu-plugins/` klasörüne yükleyin. Klasör yoksa oluşturun. Bu klasördeki eklentiler otomatik aktif olur.
   - Alternatif: WordPress panel → Eklentiler → Yeni Ekle → Eklenti Yükle (dosyayı .zip yapıp yükleyin) → Etkinleştir.
3. Bitti. Kontrol: herhangi bir yazının altında kardeş sitenin son 3 yazısının olduğu kutu ve sayfanın en altında "Ağımız" şeridi görünmeli.

## İsteğe bağlı
- Görünüm → Bileşenler → **"ARN: Kardeş Site Yazıları"** bileşenini kenar çubuğuna sürükleyin (5 yazı).
- Herhangi bir sayfaya `[arn_network limit="5"]` kısa kodu ekleyebilirsiniz.
- tumcezalar.com → Kullanıcılar → Profil: "Biyografik bilgi" alanına kısa bir biyografi yazın, "Web sitesi" alanına `https://ahmetrifatalbuz.com` yazın (eklenti boş alanı zaten otomatik düzeltir).
- yeninesil.tv yazar kutusundaki `href="#"` linki, eklenti sayesinde ahmetrifatalbuz.com'a gider.

## Ne yapar
| Özellik | yeninesil.tv'de | tumcezalar.com'da |
|---|---|---|
| Yazı altı kutu | Tüm Cezalar'ın son 3 rehberi | Yeni Nesil TV'nin son 3 haberi |
| Alt şerit "Ağımız" | Ahmet Rıfat Albuz · Tüm Cezalar | Ahmet Rıfat Albuz · Yeni Nesil TV |
| Yazar linki | ahmetrifatalbuz.com | ahmetrifatalbuz.com |
| Ölçüm | Tüm linklerde `utm_medium=network&utm_campaign=arn` | aynı |

Sitelerin yavaşlamaması için kardeş site verisi 1 saat önbellekte tutulur. Kardeş site çökerse kutu gizlenir, sayfa yavaşlamaz.
