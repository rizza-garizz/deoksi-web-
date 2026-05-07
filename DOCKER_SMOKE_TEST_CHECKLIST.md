# Docker Smoke Test Checklist

Checklist ini dipakai setelah stack Docker Compose Deoksi berhasil dijalankan.

## Tujuan

Memastikan stack `app + db + redis` sudah cukup sehat untuk:

1. buka website publik
2. login admin
3. CRUD dasar content
4. media manager
5. customers / leads

## Persiapan

1. siapkan env dari [.env.docker.example](/Users/macbook/Downloads/deoksi-web--main/.env.docker.example)
2. jalankan:

```bash
npm run docker:up
```

3. tunggu sampai service `app`, `db`, dan `redis` sehat
4. jika compose langsung gagal, cek dulu apakah `JWT_SECRET`, `PASSWORD_SALT`, dan `POSTGRES_PASSWORD` sudah terisi di `.env`

## Shortcut Otomatis

Jika stack sudah hidup, kamu juga bisa menjalankan:

```bash
npm run docker:smoke
```

Script ini melakukan cek read-only ke:

1. halaman publik utama
2. halaman admin utama
3. `/api/system-status`
4. login admin
5. endpoint admin penting seperti `page-content`, `media`, dan `customers`

Jika ingin memastikan baseline seed database resmi benar-benar masuk setelah bootstrap:

```bash
npm run docker:seed:verify
```

Jika tim QA hanya butuh ringkasan cepat isi baseline database:

```bash
npm run docker:seed:report
```

Jika ingin menjawab cepat apakah stack sudah siap dipakai admin:

```bash
npm run docker:ready
```

`docker:ready` lebih fokus ke kesiapan inti:

1. system status
2. login admin
3. page content inti
4. site content
5. media summary
6. customers endpoint

## A. Health Check Dasar

1. buka `http://localhost:3001/`
   Expected: homepage tampil normal
2. buka `http://localhost:3001/admin/content.html`
   Expected: halaman admin content terbuka
3. buka `http://localhost:3001/api/system-status`
   Expected: response JSON status sistem
4. cek log app:

```bash
npm run docker:logs
```

Expected: tidak ada crash loop atau error fatal berulang

## B. Auth Admin

1. login admin dari halaman admin
   Expected: login berhasil
2. refresh halaman admin setelah login
   Expected: session tetap terbaca
3. buka:
   - `admin/content.html`
   - `admin/media.html`
   - `admin/customers.html`
   - `admin/settings.html`

Expected: semua halaman admin utama terbuka normal

## C. Content Sync

1. buka `admin/content.html`
2. ubah 1 field ringan, misalnya judul kecil homepage atau hero badge
3. simpan
4. refresh homepage publik

Expected:

1. perubahan tersimpan
2. perubahan tampil di website
3. refresh kedua tetap konsisten

## D. Media Manager

### Foto

1. buka `admin/media.html`
2. pilih mode `Foto Website`
3. isi 1 item foto dengan link Google Drive valid
4. pastikan halaman, section, posisi, dan alt text terisi
5. simpan

Expected:

1. validasi lolos
2. preview tampil
3. item muncul di daftar media
4. source type terbaca sebagai Google Drive

### Video

1. pilih mode `Video Cloudinary`
2. isi 1 item video dengan URL Cloudinary valid
3. simpan

Expected:

1. validasi lolos
2. preview video tampil
3. item muncul di daftar media
4. source type terbaca sebagai Cloudinary

### Validasi negatif

1. coba isi foto pakai URL Cloudinary
2. coba isi video pakai URL Google Drive

Expected:

1. request ditolak
2. error message jelas

## E. Customers / Leads

1. buka `http://localhost:3001/konsultasi.html`
2. isi form konsultasi sampai lengkap
3. submit
4. buka `admin/customers.html`

Expected:

1. success message tampil
2. data baru masuk ke pelanggan admin
3. status default sesuai flow yang aktif

## F. Halaman Publik Penting

Cek halaman berikut:

1. `/`
2. `/layanan.html`
3. `/produk.html`
4. `/berita.html`
5. `/galeri.html`
6. `/tentang.html`
7. `/lokasi.html`
8. `/konsultasi.html`

Expected:

1. semua `200`
2. konten utama tampil
3. tidak ada blank page
4. media utama termuat

## G. Persistensi Dasar

1. setelah ada perubahan content atau media, restart stack:

```bash
npm run docker:down
npm run docker:up
```

2. cek ulang data yang tadi diubah

Expected:

1. data tetap ada jika memakai database container
2. tidak kembali ke state yang tidak diharapkan

## H. Checklist Akhir

- website publik terbuka
- admin bisa login
- content bisa diubah
- media manager bisa simpan
- validasi Google Drive / Cloudinary aktif
- form konsultasi masuk ke customers
- system status normal
- tidak ada crash loop di log container

## Jika Ada Masalah

1. cek log:

```bash
npm run docker:logs
```

2. cek status service:

```bash
docker compose ps
```

3. cek env yang dipakai
4. cek apakah `DATABASE_URL` mengarah ke `db` container atau mode lokal default
5. cek apakah port `3001`, `5432`, dan `6379` bentrok dengan proses lain
