# First Boot Docker Runbook

Panduan ini dibuat untuk first boot Docker Deoksi yang cepat dan minim bingung.

## 1. Siapkan Env

Copy template:

```bash
cp .env.docker.example .env
```

Isi minimal:

```env
JWT_SECRET=replace-with-a-long-random-secret
PASSWORD_SALT=replace-with-a-second-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_UPLOAD_FOLDER=deoksi/uploads
DATABASE_URL=postgresql://deoksi:<POSTGRES_PASSWORD>@db:5432/deoksi
POSTGRES_DB=deoksi
POSTGRES_USER=deoksi
POSTGRES_PASSWORD=ganti-dengan-password-random-panjang
```

## 2. Nyalakan Stack

```bash
npm run docker:up
```

Tunggu sampai:

1. `deoksi-app`
2. `deoksi-db`
3. `deoksi-redis`

semuanya aktif.

## 3. Bootstrap Database

Untuk first boot, jalankan:

```bash
npm run docker:init-db
```

Expected:

1. schema PostgreSQL dibuat
2. admin default dibuat
3. data minimum resmi untuk content, media, articles, dan customers ikut ditanam

## 4. Akses Aplikasi

Buka:

- website/admin/api: `http://localhost:3001`

Halaman penting:

- `http://localhost:3001/`
- `http://localhost:3001/admin/content.html`
- `http://localhost:3001/admin/media.html`
- `http://localhost:3001/admin/customers.html`
- `http://localhost:3001/admin/settings.html`

## 5. Login Admin

Default lokal:

- username: `admin`
- password: `deoksi2026`

Setelah login pertama, password sebaiknya segera diganti. Secret `JWT_SECRET`, `PASSWORD_SALT`, dan `POSTGRES_PASSWORD` juga wajib diisi dulu karena compose sekarang tidak lagi menerima fallback default untuk nilai sensitif itu.

## 6. Smoke Test Cepat

1. buka homepage
2. buka admin content
3. buka admin media
4. buka admin customers
5. cek `http://localhost:3001/api/system-status`

Kalau semua normal, stack first boot dianggap berhasil.

## 7. Jika Gagal

Lihat konfigurasi:

```bash
npm run docker:config
```

Lihat log app:

```bash
npm run docker:logs
```

Matikan stack:

```bash
npm run docker:down
```

## 8. Mode Developer

Kalau butuh Vite HMR:

```bash
npm run docker:up:dev
```

Lalu buka:

- frontend dev: `http://localhost:5173`
- API bridge: `http://localhost:3001`

## 9. Dokumen Lanjutan

- [DOCKER_COMPOSE_QUICKSTART.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_COMPOSE_QUICKSTART.md)
- [DOCKER_SMOKE_TEST_CHECKLIST.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_SMOKE_TEST_CHECKLIST.md)
