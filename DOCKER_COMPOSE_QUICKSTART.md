# Docker Compose Quickstart

Panduan ini menyiapkan stack Docker minimum untuk Deoksi tanpa mengubah frontend publik.

## Tujuan Stack

Stack ini dibuat untuk:

1. local environment yang lebih konsisten
2. staging yang lebih mirip production
3. fondasi modular sebelum memecah domain service

## Service yang Disiapkan

1. `app`
   Menjalankan `api-bridge.mjs` dan melayani website + admin + route `/api/*`.
   Untuk mode production-like, service ini menyajikan hasil build `dist`.

2. `db`
   PostgreSQL lokal untuk kebutuhan dev/staging.

3. `redis`
   Fondasi cache / queue / rate limit jika nanti dibutuhkan.

## Catatan Penting

Saat ini Docker stack sudah lebih mendekati production:

1. image `app` menjalankan build Vite lebih dulu
2. `api-bridge.mjs` di container melayani file dari `dist`
3. route API tetap memakai source backend yang sama

Jadi Compose ini bukan sekadar menjalankan source mentah, tapi sudah mensimulasikan deploy hasil build frontend.

## Menjalankan Stack

```bash
docker compose up --build
```

Atau lewat script npm:

```bash
npm run docker:up
```

Jika ingin mode developer dengan Vite HMR di `5173` sambil tetap memakai API bridge container di `3001`:

```bash
npm run docker:up:dev
```

Jika ingin bootstrap schema database lokal:

```bash
npm run docker:init-db
```

Jika ingin memeriksa hasil gabungan konfigurasi Compose:

```bash
npm run docker:config
```

Lalu akses:

- Website/Admin/API: `http://localhost:3001`
- Vite dev server opsional: `http://localhost:5173`

`db` dan `redis` sekarang hanya dibuka di network internal Compose. Ini lebih aman untuk laptop shared, staging, atau VM publik kecil.

## Env yang Disarankan

Bisa pakai env host biasa, atau export dulu sebelum menjalankan compose.

Template siap pakai tersedia di [.env.docker.example](/Users/macbook/Downloads/deoksi-web--main/.env.docker.example).

Minimal yang aman:

```env
JWT_SECRET=replace-with-a-long-random-secret
PASSWORD_SALT=replace-with-another-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_UPLOAD_FOLDER=deoksi/uploads
```

Jika ingin app benar-benar memakai PostgreSQL container lokal:

```env
DATABASE_URL=postgresql://deoksi:<POSTGRES_PASSWORD>@db:5432/deoksi
POSTGRES_DB=deoksi
POSTGRES_USER=deoksi
POSTGRES_PASSWORD=ganti-dengan-password-random-panjang
```

## Guardrail Keamanan

Sekarang Compose akan gagal lebih cepat jika env sensitif belum diisi:

1. `JWT_SECRET`
2. `PASSWORD_SALT`
3. `POSTGRES_PASSWORD`

Jika `DATABASE_URL` belum diisi, app akan tetap bisa berjalan dengan mode lokal yang sekarang dipakai project.

Ini sengaja dipertahankan agar adopsi Docker tidak langsung memaksa migrasi database.

## Checklist Setelah `up`

1. cek `http://localhost:3001/`
2. cek `http://localhost:3001/admin/content.html`
3. cek `http://localhost:3001/api/system-status`
4. login admin
5. cek edit konten dan refresh halaman publik
6. cek asset frontend tetap tampil normal dari hasil build

Checklist versi lebih lengkap tersedia di [DOCKER_SMOKE_TEST_CHECKLIST.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_SMOKE_TEST_CHECKLIST.md).

## Script yang Disiapkan

Di [package.json](/Users/macbook/Downloads/deoksi-web--main/package.json) sekarang tersedia:

1. `npm run docker:up`
2. `npm run docker:up:dev`
3. `npm run docker:init-db`
4. `npm run docker:config`
5. `npm run docker:down`
6. `npm run docker:logs`

Ini membantu tim non-teknis atau operator lokal agar tidak perlu mengingat command Compose panjang.

## Mode Development dengan Vite

File [docker-compose.override.yml](/Users/macbook/Downloads/deoksi-web--main/docker-compose.override.yml) menambahkan service `web-dev` dengan profile `dev`.

Gunakan mode ini jika kamu ingin:

1. frontend Vite tetap hidup di `5173`
2. API bridge tetap hidup di `3001`
3. HMR tetap nyaman, tapi stack lain tetap containerized

Catatan:

1. `web-dev` hanya aktif jika profile `dev` dijalankan.
2. Frontend di `5173` tetap memakai proxy `/api` ke bridge di `3001`, sesuai [vite.config.js](/Users/macbook/Downloads/deoksi-web--main/vite.config.js).

## Catatan Audit Konfigurasi

Ada 1 penyesuaian kecil yang saya buat agar startup awal lebih aman:

1. service `app` cukup menunggu `db` dalam status `started`, bukan `healthy`
2. alasannya: app masih bisa berjalan pada mode lokal default walau `DATABASE_URL` belum dipakai
3. bootstrap schema tetap dilakukan terpisah lewat `npm run docker:init-db`

## Urutan Migrasi Aman Berikutnya

1. hidupkan stack `app + db + redis`
2. verifikasi login admin, content, media, customers
3. jika stabil, aktifkan `DATABASE_URL` ke postgres container lokal
4. jalankan `npm run docker:init-db`
5. baru evaluasi split service domain seperti `media-service` atau `news-service`

Catatan:

`docker:init-db` sekarang melakukan tiga hal:

1. membuat schema
2. membuat admin default
3. menanam seed resmi minimum untuk page content, articles, customers, dan media assets jika tabel masih kosong

## Rekomendasi Arsitektur

Jangan langsung microservice per halaman.

Urutan yang lebih sehat:

1. Docker Compose
2. modular monolith
3. cache + observability
4. split service per domain bisnis

## File Terkait

- [Dockerfile](/Users/macbook/Downloads/deoksi-web--main/Dockerfile)
- [docker-compose.yml](/Users/macbook/Downloads/deoksi-web--main/docker-compose.yml)
- [api-bridge.mjs](/Users/macbook/Downloads/deoksi-web--main/api-bridge.mjs)
- [FIRST_BOOT_DOCKER_RUNBOOK.md](/Users/macbook/Downloads/deoksi-web--main/FIRST_BOOT_DOCKER_RUNBOOK.md)
- [DOCKER_ADOPTION_RISKS_AND_PHASE2.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_ADOPTION_RISKS_AND_PHASE2.md)
- [DOCKER_BACKUP_RESTORE_RUNBOOK.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_BACKUP_RESTORE_RUNBOOK.md)
