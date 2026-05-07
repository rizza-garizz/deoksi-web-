# Docker Adoption Risks and Phase 2 Roadmap

Dokumen ini merangkum risiko adopsi Docker Compose untuk Deoksi dan langkah phase 2 yang paling sehat setelah fondasi awal selesai.

## A. Risiko Adopsi Docker Saat Ini

### 1. `Source of truth` data bisa membingungkan

Saat ini project masih mendukung dua mode:

1. mode lokal default tanpa `DATABASE_URL`
2. mode PostgreSQL container / database nyata

Risiko:

- tim mengira data sudah persisten, padahal masih berjalan di mode lokal default
- perubahan di browser terlihat benar, tetapi tidak benar-benar tersimpan ke database container

Mitigasi:

1. selalu putuskan sejak awal apakah stack sedang memakai `DATABASE_URL` atau tidak
2. jika targetnya staging/production-like, wajib isi `DATABASE_URL`
3. jalankan `npm run docker:init-db`

### 2. Perbedaan perilaku `local state` vs `database state`

Beberapa helper dan seed lokal di project sekarang masih sangat membantu untuk dev cepat.

Risiko:

- hasil first boot berbeda antara mode lokal dan mode database
- dummy content / media / customers terasa “hilang” saat beralih ke DB bersih

Mitigasi:

1. pisahkan ekspektasi antara `mode lokal cepat` dan `mode database`
2. siapkan seed database resmi untuk Docker phase 2
3. dokumentasikan data awal minimum yang harus ada setelah bootstrap

### 3. Image build masih membawa seluruh source repo

Dockerfile sekarang aman untuk tahap awal, tetapi runner image masih membawa source lengkap plus `dist`.

Risiko:

- image lebih besar dari yang diperlukan
- boundary frontend build vs backend source belum sebersih production murni

Mitigasi:

1. di phase 2, audit file yang benar-benar perlu dibawa ke runner
2. kurangi file yang tidak diperlukan di runtime image
3. pertimbangkan pemisahan backend runtime dan frontend static serving saat sudah stabil

### 4. `api-bridge` masih single runtime untuk semua hal

Saat ini container `app` masih:

1. serve frontend static
2. handle route admin
3. handle semua `/api/*`

Risiko:

- satu bottleneck untuk seluruh traffic
- debugging performa masih campur
- belum ideal jika load produksi makin besar

Mitigasi:

1. pertahankan untuk phase awal
2. tambah observability
3. pecah per domain service hanya setelah bottleneck nyata teridentifikasi

### 5. Redis belum benar-benar dipakai aktif

Redis sudah ada di Compose sebagai fondasi.

Risiko:

- tim mengira caching sudah aktif padahal belum
- ada service tambahan yang belum memberi manfaat langsung

Mitigasi:

1. tandai Redis saat ini sebagai `foundation only`
2. aktifkan pemakaian nyata baru di phase 2

### 6. Health check masih level dasar

Health check app saat ini hanya memukul endpoint status dasar.

Risiko:

- container terlihat healthy meski ada fungsi bisnis yang belum siap
- masalah auth/media/content baru ketahuan saat test manual

Mitigasi:

1. tambah smoke test terotomasi di phase 2
2. bedakan `liveness` dan `readiness`

### 7. Docker belum tervalidasi langsung di sandbox ini

Konfigurasi Docker sudah disiapkan dan diaudit statis, tetapi binary `docker` tidak tersedia di environment kerja ini.

Risiko:

- masih mungkin ada mismatch kecil saat first run nyata
- beberapa isu baru akan terlihat saat command dijalankan di mesin yang punya Docker

Mitigasi:

1. jalankan `npm run docker:config`
2. jalankan `npm run docker:up`
3. ikuti [FIRST_BOOT_DOCKER_RUNBOOK.md](/Users/macbook/Downloads/deoksi-web--main/FIRST_BOOT_DOCKER_RUNBOOK.md)
4. validasi dengan [DOCKER_SMOKE_TEST_CHECKLIST.md](/Users/macbook/Downloads/deoksi-web--main/DOCKER_SMOKE_TEST_CHECKLIST.md)

## B. Gap yang Masih Tersisa

### 1. Seed database resmi

Saat ini setup DB fokus ke schema + admin default.

Gap:

- belum ada seed resmi untuk content, media, articles, dan sample customers di DB mode

### 2. Readiness automation

Gap:

- belum ada script otomatis yang memverifikasi login admin, content sync, media sync, dan customers setelah stack hidup

### 3. Backup / restore lokal

Gap:

- belum ada panduan snapshot volume PostgreSQL dan Redis untuk Docker local/staging

### 4. Production handoff strategy

Gap:

- belum diputuskan apakah production nanti:
  - tetap Node hosting biasa
  - pindah ke VPS Docker
  - atau hanya memakai Docker untuk local/staging

## C. Roadmap Phase 2

### Phase 2.1 `Database Confidence`

Target:

1. mode Docker + PostgreSQL benar-benar usable untuk staging

Langkah:

1. tambah seed database resmi
2. tambahkan script bootstrap content + media minimum
3. verifikasi login admin, content, media, customers dalam mode DB

### Phase 2.2 `Operational Safety`

Target:

1. stack lebih aman dipakai tim

Langkah:

1. tambah script health / readiness test
2. tambah panduan backup volume
3. tambah logging yang lebih ringkas dan mudah dibaca

### Phase 2.3 `Production-like Hardening`

Target:

1. stack lebih dekat ke deploy sungguhan

Langkah:

1. audit runner image agar lebih ramping
2. rapikan environment separation:
   - local
   - docker
   - staging
   - production
3. tambah readiness check berbasis fungsi penting

### Phase 2.4 `Service Boundary Preparation`

Target:

1. siapkan pemisahan domain service jika nanti dibutuhkan

Langkah:

1. rapikan boundary:
   - content
   - media
   - news
   - customers
2. ukur bottleneck real
3. baru putuskan apakah perlu ekstraksi `media-service` atau `news-service`

## D. Prioritas Paling Masuk Akal

Jika harus memilih urutan paling berdampak:

1. seed database resmi
2. smoke test Docker terotomasi
3. backup/restore lokal
4. image/runtime hardening
5. service extraction hanya jika load nyata menuntut

## E. Kesimpulan

Fondasi Docker Compose Deoksi sekarang sudah cukup baik untuk:

1. local production-like environment
2. staging awal
3. dasar modularisasi berikutnya

Tapi untuk benar-benar matang, phase berikutnya yang paling penting bukan langsung microservice, melainkan:

1. konsistensi database mode
2. automation smoke test
3. operational hardening

Baru setelah itu, pemisahan service per domain akan jauh lebih aman dan bernilai.
