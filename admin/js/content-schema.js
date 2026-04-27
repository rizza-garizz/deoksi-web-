export const PAGE_SCHEMAS = {
  homepage: {
    title: '🏠 Beranda',
    shortTitle: 'Beranda',
    desc: 'Edit konten halaman utama website.',
    pageUrl: '/',
    icon: '🏠',
    sections: [
      {
        id: 'hero',
        title: 'Hero Section',
        desc: 'Teks utama dan tombol CTA pada bagian atas.',
        ctaLabel: 'Edit Hero',
        icon: '🎬',
        isHero: true,
        previewFields: ['headline', 'highlight_text'],
        previewImage: 'hero_media',
        fields: [
          { id: 'hero_media', label: 'Background Video / Gambar Hero', type: 'media' },
          { id: 'hero_badge', label: 'Hero Badge', type: 'text' },
          { id: 'headline', label: 'Headline', type: 'text' },
          { id: 'highlight_text', label: 'Highlight Text', type: 'text' },
          { id: 'description', label: 'Description', type: 'textarea' },
          { id: 'cta_text', label: 'CTA Text', type: 'text' },
          { id: 'cta_link', label: 'CTA Link', type: 'text', fullWidth: true }
        ]
      },
      {
        id: 'hero_benefits',
        title: 'Hero Benefits & Card',
        desc: 'Poin-poin benefit dan info card melayang.',
        ctaLabel: 'Edit Benefits',
        icon: '✨',
        previewFields: ['bullet_benefit_1', 'bullet_benefit_2', 'bullet_benefit_3'],
        fields: [
          { id: 'bullet_benefit_1', label: 'Benefit 1', type: 'text' },
          { id: 'bullet_benefit_2', label: 'Benefit 2', type: 'text' },
          { id: 'bullet_benefit_3', label: 'Benefit 3', type: 'text' },
          { id: 'consultation_card_title', label: 'Card Title', type: 'text' },
          { id: 'consultation_card_description', label: 'Card Description', type: 'textarea' }
        ]
      },
      {
        id: 'promos',
        title: 'Promo Section',
        desc: 'Daftar paket promo yang tampil di Beranda.',
        ctaLabel: 'Kelola Promo',
        icon: '🏷️',
        isArray: true,
        itemFields: [
          { id: 'title', label: 'Judul Promo', type: 'text' },
          { id: 'description', label: 'Deskripsi Singkat', type: 'textarea' },
          { id: 'price', label: 'Harga Promo', type: 'text', default: 'Rp ' },
          { id: 'image_url', label: 'Upload Foto Promo', type: 'media', fullWidth: true },
          { id: 'cta_link', label: 'Link Tombol', type: 'text', default: 'https://wa.me/6282333344919', fullWidth: true },
          { id: 'is_visible', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  layanan: {
    title: '🩺 Layanan',
    shortTitle: 'Layanan',
    desc: 'Kelola halaman daftar layanan klinik.',
    pageUrl: '/layanan.html',
    icon: '🩺',
    sections: [
      {
        id: 'layanan_hero',
        title: 'Header Layanan',
        desc: 'Judul dan teks pembuka halaman.',
        ctaLabel: 'Edit Header',
        icon: '📝',
        previewFields: ['page_title', 'page_description'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' }
        ]
      },
      {
        id: 'services',
        title: 'Daftar Layanan',
        desc: 'Tambah, edit, atau hapus layanan yang tersedia.',
        ctaLabel: 'Kelola Layanan',
        icon: '💆',
        isArray: true,
        itemFields: [
          { id: 'name', label: 'Nama Layanan', type: 'text' },
          { id: 'description', label: 'Deskripsi', type: 'textarea' },
          { id: 'cta_text', label: 'CTA Text', type: 'text', default: 'Jadwalkan Konsultasi' },
          { id: 'cta_link', label: 'CTA Link', type: 'text', default: '/konsultasi.html' },
          { id: 'is_visible', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  produk: {
    title: '🧴 Produk',
    shortTitle: 'Produk',
    desc: 'Kelola katalog produk skincare klinik.',
    pageUrl: '/produk.html',
    icon: '🧴',
    sections: [
      {
        id: 'produk_hero',
        title: 'Header Produk',
        desc: 'Judul dan teks pembuka.',
        ctaLabel: 'Edit Header',
        icon: '📝',
        previewFields: ['page_title', 'page_description'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' }
        ]
      },
      {
        id: 'products',
        title: 'Katalog Produk',
        desc: 'Daftar produk, harga, dan kategori.',
        ctaLabel: 'Kelola Produk',
        icon: '📦',
        isArray: true,
        itemFields: [
          { id: 'name', label: 'Nama Produk', type: 'text' },
          { id: 'image_url', label: 'Foto Produk', type: 'media', fullWidth: true },
          { id: 'category', label: 'Kategori', type: 'select', options: [
            { value: 'sabun', label: 'Sabun' },
            { value: 'serum', label: 'Serum' },
            { value: 'sunscreen', label: 'Sunscreen' }
          ]},
          { id: 'price', label: 'Harga', type: 'text', default: 'Rp ' },
          { id: 'rating', label: 'Rating (0-5)', type: 'number', default: 5 },
          { id: 'has_bpom', label: 'Badge BPOM?', type: 'checkbox', default: true },
          { id: 'is_visible', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  berita: {
    title: '📰 Berita',
    shortTitle: 'Berita',
    desc: 'Kelola artikel, berita, dan blog klinik.',
    pageUrl: '/berita.html',
    icon: '📰',
    sections: [
      {
        id: 'berita_hero',
        title: 'Header Berita',
        desc: 'Judul dan teks pengantar halaman berita.',
        ctaLabel: 'Edit Header',
        icon: '📝',
        previewFields: ['page_title', 'page_description'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' }
        ]
      },
      {
        id: 'articles',
        title: 'Daftar Artikel',
        desc: 'Tulis dan kelola artikel berita terbaru.',
        ctaLabel: 'Kelola Artikel',
        icon: '📄',
        isArray: true,
        itemFields: [
          { id: 'title', label: 'Judul Artikel', type: 'text' },
          { id: 'author', label: 'Penulis', type: 'text' },
          { id: 'publish_date', label: 'Tanggal Terbit', type: 'text' },
          { id: 'excerpt', label: 'Kutipan Singkat (Excerpt)', type: 'textarea' },
          { id: 'content', label: 'Isi Artikel', type: 'textarea', fullWidth: true },
          { id: 'image_url', label: 'Upload Gambar Sampul', type: 'media', fullWidth: true },
          { id: 'is_published', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  galeri: {
    title: '🖼️ Galeri',
    shortTitle: 'Galeri',
    desc: 'Dokumentasi foto dan video kegiatan klinik.',
    pageUrl: '/galeri.html',
    icon: '🖼️',
    sections: [
      {
        id: 'galeri_hero',
        title: 'Header Galeri',
        desc: 'Judul dan teks pengantar galeri.',
        ctaLabel: 'Edit Header',
        icon: '📝',
        previewFields: ['page_title', 'page_description'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' }
        ]
      },
      {
        id: 'media_items',
        title: 'Daftar Foto / Video',
        desc: 'Kelola foto dan video yang tampil di halaman galeri.',
        ctaLabel: 'Kelola Gallery',
        icon: '📸',
        isArray: true,
        itemFields: [
          { id: 'title', label: 'Judul / Caption', type: 'text' },
          { id: 'media_type', label: 'Jenis Media', type: 'select', options: [
            { value: 'image', label: 'Foto (Gambar)' },
            { value: 'video', label: 'Video (MP4/WebM)' }
          ]},
          { id: 'media_url', label: 'Upload Foto / Video', type: 'media', fullWidth: true },
          { id: 'is_visible', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  tentang: {
    title: 'ℹ️ Tentang Kami',
    shortTitle: 'Tentang',
    desc: 'Profil klinik, visi misi, tim dokter, dan sertifikasi.',
    pageUrl: '/tentang.html',
    icon: 'ℹ️',
    sections: [
      {
        id: 'tentang_hero',
        title: 'Profil Klinik',
        desc: 'Teks pengantar sejarah dan profil.',
        ctaLabel: 'Edit Profil',
        icon: '🏥',
        previewFields: ['page_title', 'visi_text'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' },
          { id: 'visi_title', label: 'Judul Visi', type: 'text' },
          { id: 'visi_text', label: 'Teks Visi', type: 'textarea' },
          { id: 'misi_title', label: 'Judul Misi', type: 'text' },
          { id: 'misi_text', label: 'Teks Misi', type: 'textarea' }
        ]
      },
      {
        id: 'doctors',
        title: 'Tim Dokter / Staf',
        desc: 'Daftar profil dokter yang tampil di web.',
        ctaLabel: 'Kelola Dokter',
        icon: '👨‍⚕️',
        isArray: true,
        itemFields: [
          { id: 'name', label: 'Nama', type: 'text' },
          { id: 'specialization', label: 'Spesialisasi', type: 'text' },
          { id: 'description', label: 'Deskripsi', type: 'textarea' },
          { id: 'photo_url', label: 'Upload Foto Profil', type: 'media', fullWidth: true }
        ]
      },
      {
        id: 'certificates',
        title: 'Sertifikasi & Legalitas',
        desc: 'Daftar sertifikat klinik.',
        ctaLabel: 'Kelola Sertifikat',
        icon: '📜',
        isArray: true,
        itemFields: [
          { id: 'name', label: 'Nama Sertifikat', type: 'text' },
          { id: 'badge_code', label: 'Kode Badge (Max 3 char)', type: 'text' },
          { id: 'description', label: 'Deskripsi Singkat', type: 'text' },
          { id: 'image_url', label: 'Upload Gambar Sertifikat', type: 'media', fullWidth: true },
          { id: 'issuer', label: 'Penerbit', type: 'text', fullWidth: true }
        ]
      }
    ]
  },
  lokasi: {
    title: '📍 Lokasi & Kontak',
    shortTitle: 'Lokasi',
    desc: 'Informasi alamat dan peta cabang klinik.',
    pageUrl: '/lokasi.html',
    icon: '📍',
    sections: [
      {
        id: 'lokasi_info',
        title: 'Info Lokasi Utama',
        desc: 'Alamat lengkap, telepon, dan peta embed.',
        ctaLabel: 'Edit Lokasi',
        icon: '🗺️',
        previewFields: ['address', 'phone'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' },
          { id: 'address', label: 'Alamat Lengkap', type: 'textarea' },
          { id: 'operating_hours', label: 'Jam Operasional', type: 'textarea' },
          { id: 'phone', label: 'Nomor Telepon', type: 'text' },
          { id: 'whatsapp_link', label: 'Link WhatsApp (wa.me/...)', type: 'text' },
          { id: 'maps_embed_url', label: 'Google Maps Embed URL', type: 'text', fullWidth: true },
          { id: 'google_maps_link', label: 'Google Maps External Link', type: 'text', fullWidth: true }
        ]
      }
    ]
  },
  konsultasi: {
    title: '📋 Konsultasi',
    shortTitle: 'Konsultasi',
    desc: 'Konfigurasi teks dan keluhan pada formulir konsultasi.',
    pageUrl: '/konsultasi.html',
    icon: '📋',
    sections: [
      {
        id: 'konsultasi_teks',
        title: 'Teks Formulir',
        desc: 'Judul dan pesan privasi formulir.',
        ctaLabel: 'Edit Formulir',
        icon: '📄',
        previewFields: ['form_title', 'form_subtitle'],
        fields: [
          { id: 'page_tag', label: 'Page Tag', type: 'text' },
          { id: 'page_title', label: 'Page Title', type: 'text' },
          { id: 'page_description', label: 'Page Description', type: 'textarea' },
          { id: 'form_title', label: 'Judul Formulir', type: 'text' },
          { id: 'form_subtitle', label: 'Subjudul Formulir', type: 'textarea' },
          { id: 'privacy_text', label: 'Teks Persetujuan Privasi', type: 'textarea' },
          { id: 'success_message', label: 'Pesan Sukses (Setelah Kirim)', type: 'textarea' }
        ]
      },
      {
        id: 'concern_options',
        title: 'Pilihan Keluhan',
        desc: 'Keluhan yang bisa dipilih pasien (Checkboxes).',
        ctaLabel: 'Kelola Keluhan',
        icon: '🩹',
        isArray: true,
        itemFields: [
          { id: 'text', label: 'Opsi Keluhan', type: 'text' }
        ]
      }
    ]
  },
  testimoni: {
    title: '⭐ Testimoni',
    shortTitle: 'Testimoni',
    desc: 'Kelola review dan testimoni yang tampil di homepage.',
    pageUrl: '/#testimonial',
    icon: '⭐',
    sections: [
      {
        id: 'testimoni_header',
        title: 'Header Testimoni',
        desc: 'Judul area testimoni.',
        ctaLabel: 'Edit Header',
        icon: '📝',
        previewFields: ['section_title'],
        fields: [
          { id: 'section_tag', label: 'Section Tag', type: 'text' },
          { id: 'section_title', label: 'Section Title', type: 'text' },
          { id: 'google_maps_link', label: 'Link Google Maps Review', type: 'text', fullWidth: true }
        ]
      },
      {
        id: 'reviews',
        title: 'Daftar Review',
        desc: 'Kumpulan ulasan dari pasien.',
        ctaLabel: 'Kelola Review',
        icon: '💬',
        isArray: true,
        itemFields: [
          { id: 'name', label: 'Nama Pasien', type: 'text' },
          { id: 'text', label: 'Isi Review', type: 'textarea' },
          { id: 'rating', label: 'Rating (1-5)', type: 'number', default: 5 },
          { id: 'treatment', label: 'Treatment', type: 'text' },
          { id: 'date', label: 'Tanggal (teks)', type: 'text' },
          { id: 'is_visible', label: 'Tampilkan?', type: 'checkbox', default: true }
        ]
      }
    ]
  },
  global: {
    title: '🔗 Global/Footer',
    shortTitle: 'Global',
    desc: 'Data yang digunakan di seluruh halaman website.',
    pageUrl: '/',
    icon: '🔗',
    sections: [
      {
        id: 'global_footer',
        title: 'Informasi Klinik',
        desc: 'Identitas, Footer, dan Media Sosial.',
        ctaLabel: 'Edit Info Klinik',
        icon: '🏢',
        previewFields: ['clinic_name', 'clinic_tagline'],
        fields: [
          { id: 'clinic_name', label: 'Nama Klinik', type: 'text' },
          { id: 'clinic_tagline', label: 'Tagline', type: 'text' },
          { id: 'footer_description', label: 'Deskripsi Footer', type: 'textarea' },
          { id: 'address', label: 'Alamat Pendek (Footer)', type: 'text' },
          { id: 'phone', label: 'Telepon (Display)', type: 'text' },
          { id: 'whatsapp_number', label: 'Nomor WhatsApp (Ex: 628...)', type: 'text' },
          { id: 'instagram_url', label: 'Link Instagram', type: 'text' },
          { id: 'tiktok_url', label: 'Link TikTok', type: 'text' },
          { id: 'operating_hours', label: 'Jam Buka Singkat', type: 'text' },
          { id: 'copyright_text', label: 'Teks Copyright', type: 'text', fullWidth: true }
        ]
      }
    ]
  },
  seo: {
    title: '🔍 SEO Meta',
    shortTitle: 'SEO',
    desc: 'Konfigurasi meta title dan description untuk mesin pencari.',
    pageUrl: '/',
    icon: '🔍',
    sections: [
      {
        id: 'seo_homepage',
        title: 'Beranda & Utama',
        desc: 'SEO untuk Beranda dan image bawaan.',
        ctaLabel: 'Edit SEO Utama',
        icon: '🔎',
        previewFields: ['homepage_meta_title'],
        fields: [
          { id: 'homepage_meta_title', label: 'Homepage - Title', type: 'text', fullWidth: true },
          { id: 'homepage_meta_description', label: 'Homepage - Description', type: 'textarea' },
          { id: 'homepage_og_image', label: 'Homepage - OG Image', type: 'media', fullWidth: true }
        ]
      },
      {
        id: 'seo_subpages',
        title: 'Sub-halaman',
        desc: 'SEO untuk halaman lain.',
        ctaLabel: 'Edit SEO Halaman',
        icon: '📊',
        fields: [
          { id: 'layanan_meta_title', label: 'Layanan - Title', type: 'text', fullWidth: true },
          { id: 'layanan_meta_description', label: 'Layanan - Description', type: 'textarea' },
          { id: 'produk_meta_title', label: 'Produk - Title', type: 'text', fullWidth: true },
          { id: 'produk_meta_description', label: 'Produk - Description', type: 'textarea' },
          { id: 'tentang_meta_title', label: 'Tentang - Title', type: 'text', fullWidth: true },
          { id: 'tentang_meta_description', label: 'Tentang - Description', type: 'textarea' },
          { id: 'lokasi_meta_title', label: 'Lokasi - Title', type: 'text', fullWidth: true },
          { id: 'lokasi_meta_description', label: 'Lokasi - Description', type: 'textarea' },
          { id: 'konsultasi_meta_title', label: 'Konsultasi - Title', type: 'text', fullWidth: true },
          { id: 'konsultasi_meta_description', label: 'Konsultasi - Description', type: 'textarea' }
        ]
      }
    ]
  }
};
