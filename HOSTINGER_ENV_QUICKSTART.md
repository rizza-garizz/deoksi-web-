# Hostinger Env Quickstart

Gunakan dokumen ini kalau kamu cuma butuh urutan paling cepat untuk isi env dan cek siap deploy.

## 1. Isi env di Hostinger

Copy value berikut ke panel environment variables Hostinger:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
PASSWORD_SALT=replace-with-a-second-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
CLOUDINARY_UPLOAD_FOLDER=deoksi/uploads
```

## 2. Pastikan value bukan placeholder

Checklist minimum:

1. `DATABASE_URL` mengarah ke database Neon production.
2. `JWT_SECRET` panjang dan acak.
3. `PASSWORD_SALT` panjang dan acak.
4. `CLOUDINARY_CLOUD_NAME` sesuai akun Cloudinary production.
5. `CLOUDINARY_UPLOAD_PRESET` benar-benar aktif.

## 3. Jalankan preflight lokal sebelum deploy

```bash
bash npm-local run test
bash npm-local run build
bash npm-local run check:env
```

Catatan:

`check:env` akan `FAILED` selama env production belum diisi di mesin lokal. Itu normal kalau kamu hanya mengisi env di Hostinger.

## 4. Setelah deploy, cek ini dulu

1. Login admin berhasil.
2. Edit headline homepage lalu refresh website.
3. Upload 1 image dari dashboard.
4. Pastikan URL image mengarah ke Cloudinary.
5. Archive 1 media dan cek item hilang dari halaman publik terkait.

## 5. Kalau mau panduan lengkap

Lihat [HOSTINGER_DEPLOY_RUNBOOK.md](/Users/macbook/Downloads/deoksi-web--main/HOSTINGER_DEPLOY_RUNBOOK.md).
