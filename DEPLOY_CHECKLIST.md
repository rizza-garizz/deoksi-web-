# Deploy Checklist

Status lokal per 30 April 2026:

- Homepage content sync admin -> website: `PASS`
- Media layanan / promo / galeri sync ke endpoint publik: `PASS`
- Toggle status media tanpa merusak slot mapping: `PASS`
- Build production: `PASS`
- Upload production path: `READY FOR CLOUDINARY`

## `.env` final

Isi minimal variable berikut di environment Hostinger:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
PASSWORD_SALT=replace-with-a-second-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
CLOUDINARY_UPLOAD_FOLDER=deoksi/uploads
```

Template siap isi juga tersedia di [.env.production.example](/Users/macbook/Downloads/deoksi-web--main/.env.production.example).
Versi quickstart untuk tim deploy ada di [HOSTINGER_ENV_QUICKSTART.md](/Users/macbook/Downloads/deoksi-web--main/HOSTINGER_ENV_QUICKSTART.md).

## Hostinger

1. Pastikan app dijalankan sebagai Node app, bukan static-only hosting.
2. Set semua env dari `.env.example` di panel Hostinger.
3. Jalankan build production: `bash npm-local run build`.
4. Pastikan route `/api/*` ikut terdeploy bersama file frontend.
5. Isi env Cloudinary agar `/api/upload` aktif untuk dashboard media dan content picker.
6. Tidak perlu mengandalkan writable filesystem jika Cloudinary sudah aktif.

## Neon

1. Buat database production dan copy `DATABASE_URL` yang memakai `sslmode=require`.
2. Jalankan bootstrap schema dengan `node api/_lib/setup-db.mjs` setelah `.env` production siap.
3. Login admin pertama akan memakai user seed default dari script setup; setelah itu password sebaiknya segera diganti.

## Cloudinary

1. Isi `CLOUDINARY_CLOUD_NAME` agar validasi URL video Cloudinary di admin aktif.
2. Isi `CLOUDINARY_UPLOAD_PRESET` agar upload image dashboard aktif.
3. Opsional: isi `CLOUDINARY_UPLOAD_FOLDER` untuk merapikan folder asset.
4. Status saat ini: video Cloudinary supported lewat URL, upload image dashboard sudah diarahkan ke Cloudinary jika env aktif.

## Peta Slot Resmi Media Website

Gunakan acuan ini agar tim admin tidak salah pilih penempatan media.

### Aturan Sumber Media

1. Semua `frame foto` website wajib memakai `link Google Drive`.
2. Semua `frame video` website wajib memakai `link Cloudinary`.
3. Frontend publik tidak perlu diubah, karena yang dikonsumsi website adalah URL final yang sudah dinormalisasi backend.

### Slot Resmi yang Dipakai `admin/media.html`

Gunakan slot berikut untuk upload atau ganti media dari `Media Manager`.

| Halaman | Section Dashboard | Jenis Frame | Sumber Wajib | Posisi |
| --- | --- | --- | --- | --- |
| Beranda | `Hero Video` | Video | Cloudinary | `primary` |
| Beranda | `Promo Cards` | Foto | Google Drive | `promo_1` s/d `promo_12` |
| Galeri | `Video Gallery` | Video | Cloudinary | `video_1` s/d `video_12` |
| Galeri | `Foto Gallery` | Foto | Google Drive | `photo_1` s/d `photo_24` |
| Layanan | `Kartu Layanan` | Foto | Google Drive | `service_1` s/d `service_12` |
| Produk | `Kartu Produk` | Foto | Google Drive | `product_1` s/d `product_18` |
| Berita | `Cover Berita` | Foto | Google Drive | `article_1` s/d `article_24` |
| Tentang | `Foto Dokter` | Foto | Google Drive | `doctor_1` s/d `doctor_12` |
| Tentang | `Sertifikat` | Foto | Google Drive | `certificate_1` s/d `certificate_18` |
| Lokasi | `Visual Lokasi` | Foto | Google Drive | `primary` |
| Promo | `Banner Promo` | Foto | Google Drive | `banner_1` s/d `banner_8` |
| Testimoni | `Foto Testimoni` | Foto | Google Drive | `testimonial_1` s/d `testimonial_18` |

### Slot Editorial yang Dikelola dari `admin/content.html`

Slot di bawah ini memang dipakai website, tetapi pengelolaannya lebih aman lewat `Content Manager`, bukan lewat `Media Manager` generik.

| Halaman | Jalur Kelola | Contoh Slot / Field |
| --- | --- | --- |
| Beranda | `admin/content.html` | `hero_media`, `hero_image`, `hero_card_image` |
| Beranda | `admin/content.html` | promo item `image_url` di tab Beranda |
| Produk | `admin/content.html` | gambar item produk `image_url` |
| Berita | `admin/content.html` | cover artikel `image_url` |
| Galeri | `admin/content.html` | item galeri `media_url` |
| Tentang | `admin/content.html` | dokter `photo_url`, sertifikat `image_url` |
| Lokasi | `admin/content.html` | visual lokasi dan `maps_embed_url` |

Prinsipnya:

1. Jika yang diubah adalah `isi halaman editorial`, utamakan `admin/content.html`.
2. Jika yang diubah adalah `frame terstruktur berbasis slot`, gunakan `admin/media.html`.
3. Jangan campur dua jalur untuk 1 kebutuhan yang sama tanpa SOP yang jelas.

### Slot Legacy / Generic yang Sebaiknya Tidak Dipakai Lagi

Item berikut masih bisa muncul pada data lama atau seed contoh, tetapi tidak disarankan untuk dipakai sebagai slot baru.

| Slot Key / Pola | Status | Catatan |
| --- | --- | --- |
| `featured_media` | Legacy | Bukan slot website terstruktur baru. Aman dibiarkan jika hanya draft lama. |
| `background_media` | Legacy | Tidak dipakai sebagai jalur resmi media website aktif. |
| `promo_featured` | Editorial lama | Jika perlu promo homepage, utamakan `Promo Cards` atau item promo di `admin/content.html`. |
| `hero_image` / `hero_card_image` | Editorial | Kelola dari `admin/content.html`, bukan slot manual baru di media library. |
| `gallery_*` raw slot seperti `gallery_zone_1_primary` | Editorial | Dipakai halaman galeri, tetapi jalur kelolanya lebih aman dari `site-content` / `content`, bukan upload manual generic. |

### Aturan Operasional yang Wajib Diikuti

1. Jangan membuat slot key baru secara manual jika tidak ada di daftar `Slot Resmi`.
2. Jangan isi `frame foto` dengan URL Cloudinary.
3. Jangan isi `frame video` dengan URL Google Drive.
4. Jika ragu, cocokkan dulu dengan label `usage` di `Media Manager`.
5. Jika kebutuhanmu berupa konten halaman, cek dulu apakah seharusnya diedit dari `Content Manager`.

### Checklist Cepat Sebelum Simpan Media

1. Pastikan `Jenis Frame` sesuai: `foto` atau `video`.
2. Pastikan `Sumber URL` sesuai aturan:
   - foto = Google Drive
   - video = Cloudinary
3. Pastikan `Halaman`, `Section`, dan `Posisi` cocok dengan slot resmi.
4. Pastikan preview tampil normal.
5. Pastikan `Status` di-set `Active` jika memang ingin langsung tampil di website.

## SOP Singkat Admin: Foto Website via Google Drive

Gunakan SOP ini jika foto website tetap disimpan di Google Drive.

### Persiapan

1. Simpan semua aset di 1 folder khusus, misalnya `Deoksi Website Assets`.
2. Gunakan 1 akun Google khusus operasional, jangan akun pribadi.
3. Pastikan file yang akan dipakai website di-set `Anyone with the link can view`.

### Template Nama File Google Drive

Gunakan format:

`deoksi-[halaman]-[section]-[posisi]-[deskripsi]-[yyyymmdd]`

Contoh:

- `deoksi-beranda-promo-promo1-brightening-20260501.jpg`
- `deoksi-layanan-service-service1-facial-20260501.jpg`
- `deoksi-galeri-photo-photo3-klinik-lobby-20260501.jpg`
- `deoksi-tentang-doctor-doctor2-dr-zuliatul-20260501.jpg`

Aturan singkat:

1. Gunakan huruf kecil semua.
2. Gunakan tanda minus `-`, jangan spasi.
3. Nama file harus menjelaskan halaman dan posisi.
4. Saat ganti gambar, upload file baru dengan nama baru, jangan overwrite file lama.

### Tabel Mapping Halaman - Section - Posisi

| Halaman | Section di Admin | Pola Posisi | Keterangan | Contoh Nama File |
| --- | --- | --- | --- | --- |
| Beranda | Promo Cards | `promo_1` s/d `promo_12` | Kartu promo di homepage | `deoksi-beranda-promo-promo1-brightening-20260501.jpg` |
| Galeri | Foto Gallery | `photo_1` s/d `photo_24` | Foto galeri website | `deoksi-galeri-photo-photo3-klinik-lobby-20260501.jpg` |
| Layanan | Kartu Layanan | `service_1` s/d `service_12` | Gambar tiap kartu layanan | `deoksi-layanan-service-service1-facial-20260501.jpg` |
| Produk | Kartu Produk | `product_1` s/d `product_18` | Gambar tiap kartu produk | `deoksi-produk-product-product2-serum-glow-20260501.jpg` |
| Berita | Cover Berita | `article_1` s/d `article_24` | Sampul / thumbnail berita | `deoksi-berita-article-article1-edukasi-barrier-20260501.jpg` |
| Tentang | Foto Dokter | `doctor_1` s/d `doctor_12` | Foto profil dokter / tim | `deoksi-tentang-doctor-doctor2-dr-zuliatul-20260501.jpg` |
| Tentang | Sertifikat | `certificate_1` s/d `certificate_18` | Gambar sertifikat | `deoksi-tentang-certificate-certificate1-iso-20260501.jpg` |
| Lokasi | Visual Lokasi | `primary` | Gambar utama halaman lokasi | `deoksi-lokasi-visual-primary-klinik-depan-20260501.jpg` |
| Promo | Banner Promo | `banner_1` s/d `banner_8` | Banner halaman promo | `deoksi-promo-banner-banner1-mei-promo-20260501.jpg` |
| Testimoni | Foto Testimoni | `testimonial_1` s/d `testimonial_18` | Foto untuk kartu testimoni | `deoksi-testimoni-testimonial-testimonial1-pelanggan-a-20260501.jpg` |

Catatan:

1. `Hero Video` dan `Video Gallery` tetap untuk video Cloudinary, bukan foto Google Drive.
2. Nama `section` di nama file boleh disingkat asal konsisten, misalnya `promo`, `service`, `doctor`, `certificate`.
3. Jika ragu pilih slot, samakan `halaman + section + posisi` di dashboard dengan nama file Google Drive.

### Tabel Singkat: Judul Admin -> Nama File

| Contoh Judul di Admin | Contoh Nama File Google Drive |
| --- | --- |
| Promo Brightening Mei | `deoksi-beranda-promo-promo1-brightening-mei-20260501.jpg` |
| Promo Acne Package | `deoksi-beranda-promo-promo2-acne-package-20260501.jpg` |
| Foto Facial | `deoksi-layanan-service-service1-facial-20260501.jpg` |
| Foto Laser | `deoksi-layanan-service-service2-laser-20260501.jpg` |
| Produk Serum Glow | `deoksi-produk-product-product1-serum-glow-20260501.jpg` |
| Produk Facial Wash | `deoksi-produk-product-product2-facial-wash-20260501.jpg` |
| Cover Artikel Skin Barrier | `deoksi-berita-article-article1-skin-barrier-20260501.jpg` |
| Foto dr Zuliatul | `deoksi-tentang-doctor-doctor2-dr-zuliatul-20260501.jpg` |
| Sertifikat ISO | `deoksi-tentang-certificate-certificate1-iso-20260501.jpg` |
| Foto Klinik Depan | `deoksi-lokasi-visual-primary-klinik-depan-20260501.jpg` |
| Banner Promo Juni | `deoksi-promo-banner-banner1-promo-juni-20260501.jpg` |
| Foto Testimoni A | `deoksi-testimoni-testimonial-testimonial1-pelanggan-a-20260501.jpg` |

Tips cepat:

1. Judul admin boleh lebih natural dibaca tim.
2. Nama file Google Drive harus lebih teknis dan konsisten.
3. Jika judul admin berubah, nama file lama tidak wajib diganti, tetapi file baru sebaiknya tetap mengikuti template.

### Mapping Singkat Judul Admin ke Slot Dashboard

| Judul Admin yang Diisi | Halaman | Section Dashboard | Posisi yang Umum Dipakai | Pola Nama File |
| --- | --- | --- | --- | --- |
| Promo Brightening Mei | Beranda | Promo Cards | `promo_1` | `deoksi-beranda-promo-promo1-...` |
| Promo Acne Package | Beranda | Promo Cards | `promo_2` | `deoksi-beranda-promo-promo2-...` |
| Foto Facial | Layanan | Kartu Layanan | `service_1` | `deoksi-layanan-service-service1-...` |
| Foto Laser | Layanan | Kartu Layanan | `service_2` | `deoksi-layanan-service-service2-...` |
| Produk Serum Glow | Produk | Kartu Produk | `product_1` | `deoksi-produk-product-product1-...` |
| Produk Facial Wash | Produk | Kartu Produk | `product_2` | `deoksi-produk-product-product2-...` |
| Cover Artikel Skin Barrier | Berita | Cover Berita | `article_1` | `deoksi-berita-article-article1-...` |
| Foto dr Zuliatul | Tentang | Foto Dokter | `doctor_2` | `deoksi-tentang-doctor-doctor2-...` |
| Sertifikat ISO | Tentang | Sertifikat | `certificate_1` | `deoksi-tentang-certificate-certificate1-...` |
| Foto Klinik Depan | Lokasi | Visual Lokasi | `primary` | `deoksi-lokasi-visual-primary-...` |
| Banner Promo Juni | Promo | Banner Promo | `banner_1` | `deoksi-promo-banner-banner1-...` |
| Foto Testimoni A | Testimoni | Foto Testimoni | `testimonial_1` | `deoksi-testimoni-testimonial-testimonial1-...` |

Cara pakai cepat:

1. Tulis `Judul Admin` yang mudah dipahami tim.
2. Pilih `Section Dashboard` sesuai tabel di atas.
3. Cocokkan `Posisi` dengan nama file Google Drive.
4. Kalau urutan berubah, sesuaikan nomor posisi di nama file dan di dashboard.

### Cheat Sheet 1 Layar: Judul Admin -> Slot -> Nama File

| Judul Admin | Slot Dashboard | Nama File Google Drive |
| --- | --- | --- |
| Promo Brightening Mei | `Beranda > Promo Cards > promo_1` | `deoksi-beranda-promo-promo1-brightening-mei-20260501.jpg` |
| Promo Acne Package | `Beranda > Promo Cards > promo_2` | `deoksi-beranda-promo-promo2-acne-package-20260501.jpg` |
| Foto Facial | `Layanan > Kartu Layanan > service_1` | `deoksi-layanan-service-service1-facial-20260501.jpg` |
| Foto Laser | `Layanan > Kartu Layanan > service_2` | `deoksi-layanan-service-service2-laser-20260501.jpg` |
| Produk Serum Glow | `Produk > Kartu Produk > product_1` | `deoksi-produk-product-product1-serum-glow-20260501.jpg` |
| Produk Facial Wash | `Produk > Kartu Produk > product_2` | `deoksi-produk-product-product2-facial-wash-20260501.jpg` |
| Cover Artikel Skin Barrier | `Berita > Cover Berita > article_1` | `deoksi-berita-article-article1-skin-barrier-20260501.jpg` |
| Foto dr Zuliatul | `Tentang > Foto Dokter > doctor_2` | `deoksi-tentang-doctor-doctor2-dr-zuliatul-20260501.jpg` |
| Sertifikat ISO | `Tentang > Sertifikat > certificate_1` | `deoksi-tentang-certificate-certificate1-iso-20260501.jpg` |
| Foto Klinik Depan | `Lokasi > Visual Lokasi > primary` | `deoksi-lokasi-visual-primary-klinik-depan-20260501.jpg` |
| Banner Promo Juni | `Promo > Banner Promo > banner_1` | `deoksi-promo-banner-banner1-promo-juni-20260501.jpg` |
| Foto Testimoni A | `Testimoni > Foto Testimoni > testimonial_1` | `deoksi-testimoni-testimonial-testimonial1-pelanggan-a-20260501.jpg` |

Pakai versi ini jika admin hanya perlu:

1. menentukan slot dashboard
2. menamai file Google Drive
3. memastikan posisi file tidak tertukar

### Checklist Troubleshooting: Gambar Tidak Muncul di Website

Ikuti urutan ini dari atas ke bawah:

1. Pastikan file Google Drive masih ada dan tidak masuk trash.
2. Pastikan akses file adalah `Anyone with the link can view`.
3. Pastikan link yang ditempel di admin adalah link file Google Drive, bukan link folder.
4. Buka `admin/media.html`.
5. Cari media yang bermasalah berdasarkan judul atau halaman.
6. Klik `Edit`.
7. Pastikan `Status` adalah `Active`.
8. Pastikan `Halaman`, `Section`, dan `Posisi` sudah benar.
9. Pastikan helper link menunjukkan `valid`.
10. Pastikan field `Direct URL Frontend` terisi.
11. Cek preview gambar di admin.
12. Jika helper tidak valid, paste ulang link Google Drive yang benar.
13. Klik `Cek Link Drive`.
14. Klik `Simpan Media` lagi.
15. Refresh halaman website yang terkait.
16. Jika masih belum tampil, lakukan hard refresh browser.

Jika masih gagal:

1. Coba buka `Direct URL Frontend` di tab baru.
2. Jika direct URL tidak membuka gambar, masalah ada di file atau permission Google Drive.
3. Jika direct URL membuka gambar tetapi website masih tidak berubah, cek apakah slot yang dipilih memang slot yang dipakai halaman itu.
4. Jika gambar lama masih muncul, pastikan admin tidak menyimpan ke posisi yang berbeda.
5. Jika perlu, upload file baru ke Google Drive lalu ganti URL di dashboard.

Tanda bahwa masalah sudah selesai:

1. Preview admin tampil normal.
2. `Direct URL Frontend` terisi.
3. Halaman website menampilkan gambar baru di section yang benar.

### Langkah Upload ke Website

1. Upload file ke folder Google Drive operasional.
2. Rename file sesuai template di atas.
3. Ubah akses file menjadi `Anyone with the link can view`.
4. Copy link file Google Drive.
5. Buka `admin/media.html`.
6. Pilih `Foto Website`.
7. Paste link Google Drive ke field URL.
8. Pastikan helper menunjukkan link valid.
9. Pastikan field `Direct URL Frontend` terisi.
10. Cek preview gambar.
11. Pilih halaman, section, dan posisi yang benar.
12. Isi `Alt Text`.
13. Ubah `Status` ke `Active` jika ingin langsung tampil.
14. Klik `Simpan Media`.

### Setelah Simpan

1. Refresh halaman frontend yang terkait.
2. Pastikan gambar tampil normal.
3. Simpan link asli Google Drive di dokumen internal tim jika gambar penting.

### Larangan

1. Jangan hapus file Google Drive yang sedang dipakai website.
2. Jangan ubah file aktif menjadi private.
3. Jangan pindahkan file aktif ke folder lain tanpa pengecekan ulang.
4. Jangan ganti ownership file aktif sembarangan.

### Jika Gambar Tidak Tampil

1. Buka `admin/media.html`.
2. Cari media yang bermasalah.
3. Pastikan link Google Drive masih aktif dan publik.
4. Klik `Cek Link Drive`.
5. Pastikan `Direct URL Frontend` masih terisi.
6. Simpan ulang jika perlu.
7. Refresh frontend dan cek lagi.

### Audit Rutin

Lakukan minimal 1 kali per bulan:

1. Cek file penting masih publik.
2. Cek akun Google operasional masih aktif.
3. Cek tidak ada file website yang masuk trash.
4. Cek 1 foto dari setiap halaman utama masih tampil normal.

## Sanity Check

Sudah tervalidasi di lokal:

1. Login admin berhasil.
2. Edit homepage dari admin tersimpan dan terbaca ulang lewat endpoint website.
3. Tambah media layanan tampil di endpoint publik website.
4. Tambah media promo homepage tidak lagi membuat `/api/site-content` error.
5. Tambah galeri foto/video tampil di endpoint galeri publik.
6. Archive media tidak lagi menghapus `page_key`, `section_key`, dan `slot_key`.
7. Halaman media tidak lagi memunculkan warning asset CSS saat build.

Wajib dicek lagi di environment deploy:

1. Upload image berjalan sesuai strategi storage final yang dipilih.
2. Semua `/api/*` dapat diakses lewat domain production, bukan hanya lokal.
3. Perubahan admin tampil di browser production setelah refresh tanpa cache lama.
4. Jika memakai Google Drive, minimal 1 foto dari tiap halaman utama sudah diuji tampil dari direct URL hasil konversi.

## Go-Live Decision

Siap deploy untuk flow content + media metadata jika:

1. Env Hostinger dan Neon sudah benar.
2. Bootstrap database production sudah selesai.
3. Env Cloudinary sudah aktif dan sudah diuji sekali upload dari admin.
4. Jika foto website memakai Google Drive, checklist operasional di atas sudah disepakati tim admin.

Belum ideal untuk go-live penuh jika env Cloudinary belum diisi.
