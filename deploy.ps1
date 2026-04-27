# Script untuk deploy website Deoksi ke Netlify
Write-Host "Membangun proyek (Building project)..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build sukses! Memulai proses deploy..." -ForegroundColor Green
    npx netlify deploy --prod --dir=dist
} else {
    Write-Host "Build gagal. Silakan cek pesan error di atas." -ForegroundColor Red
}
