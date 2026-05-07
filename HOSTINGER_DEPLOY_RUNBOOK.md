# Hostinger Deploy Runbook

Tanggal acuan dokumen ini: 30 April 2026.

## Scope

Runbook ini dipakai untuk deploy stack berikut:

1. Frontend + admin dashboard
2. API Node untuk `/api/*`
3. Neon PostgreSQL
4. Cloudinary untuk upload image dashboard

## Preflight lokal

Jalankan dari project root:

```bash
bash npm-local run test
bash npm-local run build
```

Opsional untuk cek env:

```bash
bash node-local api/_lib/check-env.mjs
```

Atau via script npm:

```bash
bash npm-local run check:env
```

## Env production

Isi env berikut di Hostinger:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
PASSWORD_SALT=replace-with-a-second-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
CLOUDINARY_UPLOAD_FOLDER=deoksi/uploads
```

Checklist:

1. `DATABASE_URL` bukan placeholder.
2. `JWT_SECRET` panjang dan acak.
3. `PASSWORD_SALT` panjang dan acak.
4. `CLOUDINARY_CLOUD_NAME` dan `CLOUDINARY_UPLOAD_PRESET` aktif.

## Neon setup

1. Buat database production di Neon.
2. Copy connection string dengan `sslmode=require`.
3. Pastikan schema sudah dibuat:

```bash
bash node-local api/_lib/setup-db.mjs
```

4. Login admin pertama akan memakai seed default dari script setup.
5. Setelah login pertama berhasil, ganti credential admin lewat prosedur internal tim.

## Cloudinary setup

1. Buat unsigned upload preset khusus dashboard.
2. Batasi folder upload, misalnya `deoksi/uploads`.
3. Pastikan format image umum diizinkan.
4. Simpan `cloud name`, `upload preset`, dan folder ke env Hostinger.

## Hostinger deploy

1. Deploy project sebagai Node app, bukan static-only site.
2. Upload source project atau sambungkan repo sesuai workflow tim.
3. Install dependency production.
4. Set semua env di panel Hostinger.
5. Jalankan build production:

```bash
bash npm-local run build
```

6. Pastikan process start melayani frontend dan route `/api/*`.
7. Pastikan domain production mengarah ke app yang sama, bukan hanya folder `dist`.

## Post-deploy smoke test

Jalankan berurutan:

1. Buka halaman login admin.
2. Login dengan admin production.
3. Edit headline homepage lalu simpan.
4. Refresh homepage production dan pastikan headline berubah.
5. Upload 1 image dari media manager.
6. Pastikan upload berhasil dan URL media mengarah ke Cloudinary.
7. Tambah 1 foto layanan lalu cek halaman layanan.
8. Tambah 1 promo homepage lalu cek beranda.
9. Tambah 1 item galeri lalu cek halaman galeri.
10. Archive 1 media lalu cek item hilang dari halaman publik yang sesuai.

## API smoke check

Minimal endpoint yang harus sehat:

1. `/api/auth/login`
2. `/api/page-content?page=homepage`
3. `/api/site-content`
4. `/api/gallery-content`
5. `/api/media`
6. `/api/upload`
7. `/api/media-config`

## Go-live criteria

Deploy dianggap siap live jika:

1. Test lokal dan build lolos.
2. Env production lolos check.
3. Neon schema sudah siap.
4. Upload image sudah terbukti masuk Cloudinary.
5. Edit dari admin langsung tampil di website production setelah refresh.
6. Tidak ada `500` pada endpoint publik utama.

## Rollback trigger

Tunda go-live atau rollback jika salah satu ini terjadi:

1. Upload image gagal.
2. `/api/site-content` atau `/api/page-content` memberi `500`.
3. Data admin tersimpan tapi tidak muncul di website.
4. Login admin gagal setelah deploy.
5. Media archived masih tetap tampil di halaman publik.
