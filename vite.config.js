import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        layanan: resolve(__dirname, 'layanan.html'),
        produk: resolve(__dirname, 'produk.html'),
        berita: resolve(__dirname, 'berita.html'),
        beritaDetail: resolve(__dirname, 'berita-detail.html'),
        galeri: resolve(__dirname, 'galeri.html'),
        tentang: resolve(__dirname, 'tentang.html'),
        lokasi: resolve(__dirname, 'lokasi.html'),
        konsultasi: resolve(__dirname, 'konsultasi.html'),
        sertifikatDemo: resolve(__dirname, 'sertifikat-demo.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminCustomers: resolve(__dirname, 'admin/customers.html'),
        adminArticles: resolve(__dirname, 'admin/articles.html'),
        adminMedia: resolve(__dirname, 'admin/media.html'),
        adminContent: resolve(__dirname, 'admin/content.html'),
      },
    },
  },
});
