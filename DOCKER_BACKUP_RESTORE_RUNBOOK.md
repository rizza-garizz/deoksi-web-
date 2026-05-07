# Docker Backup & Restore Runbook

Panduan ini dipakai untuk backup dan restore data Docker lokal Deoksi, terutama PostgreSQL dan Redis.

## Tujuan

Dokumen ini membantu tim untuk:

1. membuat backup database lokal sebelum eksperimen besar
2. memulihkan data staging/local jika volume rusak atau salah reset
3. menjaga data Docker tidak hilang saat testing

## Cakupan

Yang dibahas:

1. backup PostgreSQL container `deoksi-db`
2. restore PostgreSQL container `deoksi-db`
3. catatan Redis `deoksi-redis`
4. kapan pakai backup logical vs volume

## Prinsip Utama

1. Untuk data aplikasi, prioritaskan backup PostgreSQL.
2. Redis saat ini masih fondasi, jadi belum wajib dibackup rutin jika belum dipakai aktif untuk data bisnis.
3. Jangan restore di atas data penting tanpa memastikan target environment-nya benar.

## A. Backup PostgreSQL

### Opsi yang disarankan: logical dump

Gunakan logical dump agar file backup mudah dipindah dan diinspeksi.

Contoh command:

```bash
docker exec deoksi-db pg_dump -U deoksi -d deoksi > backup-deoksi.sql
```

Jika user / db berbeda, sesuaikan dengan env Docker yang dipakai.

Expected:

1. file `backup-deoksi.sql` terbentuk
2. isi file berupa SQL dump

### Kapan dipakai

Pakai sebelum:

1. reset schema
2. ubah struktur tabel
3. uji seed ulang
4. testing migrasi

## B. Restore PostgreSQL

### Langkah aman

1. pastikan stack hidup
2. pastikan target restore benar-benar environment lokal/staging yang dimaksud
3. jika perlu, kosongkan schema lama dulu

Contoh restore:

```bash
cat backup-deoksi.sql | docker exec -i deoksi-db psql -U deoksi -d deoksi
```

Expected:

1. data kembali masuk ke DB
2. endpoint app membaca data yang dipulihkan

## C. Backup Volume Penuh

Jika kamu ingin backup volume PostgreSQL penuh, pendekatan ini lebih berat tapi lebih menyeluruh.

Catatan:

1. metode volume backup lebih cocok untuk snapshot cepat lokal
2. metode ini lebih sensitif terhadap versi image/container

Jika tidak ada alasan khusus, tetap prioritaskan logical dump.

## D. Redis

Saat ini Redis di Deoksi masih fondasi untuk phase berikutnya.

Rekomendasi:

1. belum perlu backup rutin jika belum menyimpan state bisnis penting
2. kalau nanti Redis mulai dipakai untuk queue/caching penting, baru buat SOP backup terpisah

## E. Urutan Backup yang Aman Sebelum Testing Besar

1. `npm run docker:up`
2. pastikan app sehat
3. jalankan backup PostgreSQL
4. simpan file backup dengan nama bertanggal

Contoh nama file:

`backup-deoksi-2026-05-04.sql`

## F. Checklist Setelah Restore

1. jalankan `npm run docker:ready`
2. jalankan `npm run docker:seed:report`
3. cek:
   - login admin
   - content homepage
   - media
   - customers

## G. Risiko yang Harus Dihindari

1. restore dump ke environment yang salah
2. menimpa DB lokal yang masih dibutuhkan tanpa backup
3. menganggap volume Docker otomatis aman tanpa backup manual

## H. Rekomendasi Operasional

Untuk phase sekarang, pola paling sehat adalah:

1. gunakan logical dump PostgreSQL
2. backup sebelum migrasi / seed ulang
3. restore hanya saat perlu rollback lokal/staging

## Dokumen Terkait

- [DOCKER_COMPOSE_QUICKSTART.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_COMPOSE_QUICKSTART.md)
- [DOCKER_SMOKE_TEST_CHECKLIST.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_SMOKE_TEST_CHECKLIST.md)
- [FIRST_BOOT_DOCKER_RUNBOOK.md](/Users/macbook/Downloads/deoksi-web--main/FIRST_BOOT_DOCKER_RUNBOOK.md)
- [DOCKER_ADOPTION_RISKS_AND_PHASE2.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_ADOPTION_RISKS_AND_PHASE2.md)
