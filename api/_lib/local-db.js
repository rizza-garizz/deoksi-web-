import { buildWebsiteSlotMap, groupWebsiteContentAssets } from './content-sections.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function nowIso() {
  return new Date().toISOString();
}

function getDefaultHomepageContent() {
  return {
    hero_badge: 'Beauty Consultation',
    headline: 'Kulit Berbasis Sains',
    highlight_text: 'Sains',
    description:
      'Konsultasikan kebutuhan kulit Anda bersama dokter berpengalaman untuk mendapatkan rekomendasi perawatan yang aman, nyaman, dan sesuai kondisi kulit.',
    cta_text: 'Konsultasi dengan tim kami',
    cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20konsultasi%20dengan%20tim%20kami.',
    bullet_benefit_1: 'Dokter berpengalaman',
    bullet_benefit_2: 'Perawatan terarah',
    bullet_benefit_3: 'Konsultasi nyaman',
    consultation_card_title: 'Konsultasi Personal',
    consultation_card_description:
      'Pendekatan dokter yang aman, nyaman, dan sesuai kondisi kulit.',
  };
}

function getDefaultPageContent() {
  return {
    layanan: {
      page_tag: 'Solusi Perawatan',
      page_title: 'Layanan yang Disesuaikan dengan Kebutuhan Kulit Anda',
      page_description: 'Setiap kondisi kulit memerlukan pendekatan yang berbeda. Kami membantu Anda memilih perawatan yang tepat melalui konsultasi yang aman dan terarah.',
      services: [
        { name: 'Facial', description: 'Perawatan wajah untuk membantu membersihkan, menutrisi, dan menjaga kulit tetap segar, sehat, dan terawat.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 1 },
        { name: 'Laser', description: 'Teknologi laser untuk membantu peremajaan kulit, meratakan warna kulit, dan menangani kebutuhan kulit tertentu secara lebih terarah.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 2 },
        { name: 'Injeksi', description: 'Tindakan injeksi yang dilakukan secara profesional sesuai kebutuhan, setelah evaluasi kondisi kulit secara menyeluruh.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 3 },
        { name: 'Acne Care', description: 'Rangkaian perawatan untuk membantu mengurangi jerawat, meredakan peradangan, dan merawat tampilan bekas jerawat dengan lebih tepat.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 4 },
        { name: 'Chemical Peeling', description: 'Prosedur medis untuk mengangkat sel kulit mati, memperbaiki tekstur kulit, dan mencerahkan wajah secara merata.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 5, image_url: '/assets/layanan/peeling.png' },
        { name: 'Skin Booster', description: 'Perawatan hidrasi mendalam dengan injeksi nutrisi untuk kulit yang lebih kenyal, sehat, dan bercahaya alami.', cta_text: 'Jadwalkan Konsultasi', cta_link: '/konsultasi.html', is_visible: true, sort_order: 6, image_url: '/assets/layanan/booster.png' },
      ]
    },
    produk: {
      page_tag: 'Skincare Series',
      page_title: 'Produk Kami',
      page_description: 'Pilih produk sesuai kebutuhan kulit. Untuk mendapatkan rekomendasi yang paling tepat, konsultasikan terlebih dahulu.',
      products: [
        { name: 'Deoksi Facial Wash', category: 'sabun', price: 'Rp 85.000', rating: 4.8, has_bpom: true, is_visible: true, sort_order: 1 },
        { name: 'Deoksi Gentle Cleanser', category: 'sabun', price: 'Rp 95.000', rating: 4.7, has_bpom: true, is_visible: true, sort_order: 2 },
        { name: 'Deoksi Glow Serum', category: 'serum', price: 'Rp 150.000', rating: 4.9, has_bpom: true, is_visible: true, sort_order: 3 },
        { name: 'Deoksi Barrier Serum', category: 'serum', price: 'Rp 165.000', rating: 4.8, has_bpom: true, is_visible: true, sort_order: 4 },
        { name: 'Deoksi Sun Shield SPF 50', category: 'sunscreen', price: 'Rp 95.000', rating: 4.8, has_bpom: true, is_visible: true, sort_order: 5 },
        { name: 'Deoksi UV Daily Defense', category: 'sunscreen', price: 'Rp 110.000', rating: 4.7, has_bpom: true, is_visible: true, sort_order: 6 },
        { name: 'Deoksi Age Defy', category: 'serum', price: 'Rp 175.000', rating: 4.9, has_bpom: true, is_visible: true, sort_order: 7 },
        { name: 'Deoksi Deep Cleanser', category: 'sabun', price: 'Rp 88.000', rating: 4.8, has_bpom: true, is_visible: true, sort_order: 8 },
        { name: 'Deoksi Hydrating Toner', category: 'serum', price: 'Rp 125.000', rating: 4.8, has_bpom: true, is_visible: true, sort_order: 9 },
      ]
    },
    tentang: {
      page_tag: 'Mengenal Kami',
      page_title: 'Tentang Deoksi',
      page_description: 'Deoksi Clinic berfokus pada perawatan slow aging dan antioksidatif dengan standar layanan yang aman, nyaman, dan tertata rapi.',
      visi_title: 'Visi',
      visi_text: 'Menjadi klinik kecantikan tepercaya yang menghadirkan perawatan berbasis sains, aman, dan berorientasi pada hasil yang alami untuk setiap pasien.',
      misi_title: 'Misi',
      misi_text: 'Memberikan layanan personal yang profesional, penggunaan teknologi dan bahan berkualitas, serta edukasi perawatan kulit yang mudah dipahami dan konsisten.',
      doctors: [
        { name: 'dr. Beni Lukandar', specialization: 'Dokter Estetika', description: 'Berfokus pada perawatan slow aging dan peremajaan kulit dengan rencana perawatan yang jelas dan aman.', photo_url: '/assets/images/doctor1.jpg', sort_order: 1 },
        { name: 'dr. Zuliatul Chusniyah', specialization: 'Dokter Kulit', description: 'Menangani berbagai masalah kulit dengan pendekatan dermatologi dan perawatan antioksidatif.', photo_url: '/assets/images/doctor2.jpg', sort_order: 2 },
        { name: 'Tim Deoksi Clinic', specialization: 'Layanan Pendamping', description: 'Mendampingi pasien sejak konsultasi hingga perawatan lanjutan agar pengalaman perawatan terasa nyaman.', photo_url: '/assets/images/hero_clinic.png', sort_order: 3 },
      ],
      certificates: [
        { name: 'Kemenkes', description: 'Memenuhi ketentuan kesehatan dan operasional klinik.', badge_code: 'KM', sort_order: 1 },
        { name: 'ISO', description: 'Standar proses layanan untuk kualitas yang konsisten.', badge_code: 'ISO', sort_order: 2 },
        { name: 'BPOM', description: 'Produk dan bahan mengikuti regulasi yang berlaku.', badge_code: 'BP', sort_order: 3 },
        { name: 'Halal', description: 'Komitmen pada transparansi dan kenyamanan pasien.', badge_code: 'HL', sort_order: 4 },
        { name: 'FDA', description: 'Referensi standar internasional untuk keamanan tertentu.', badge_code: 'FD', sort_order: 5 },
      ]
    },
    lokasi: {
      page_tag: 'Temukan Kami',
      page_title: 'Lokasi & Kontak',
      page_description: 'Datang langsung ke klinik atau hubungi kami untuk mendapatkan jadwal konsultasi dan informasi layanan.',
      address: 'Deoksi Beauty Clinic, Jl. Puncak Borobudur Kav. 6, Kota Malang, Jawa Timur.',
      operating_hours: 'Senin–Sabtu: 09.00–20.00\nMinggu: Tutup',
      phone: '+6282333344919',
      whatsapp_link: 'https://wa.me/6282333344919',
      maps_embed_url: 'https://www.google.com/maps?q=Malang%2C%20Jawa%20Timur&output=embed'
    },
    konsultasi: {
      page_tag: 'Langkah Awal',
      page_title: 'Konsultasi Awal dengan Dokter',
      page_description: 'Isi formulir singkat di bawah ini. Tim kami akan menghubungi Anda melalui WhatsApp untuk konfirmasi jadwal.',
      form_title: 'Form Konsultasi',
      form_subtitle: 'Semua field wajib diisi. Pilih minimal 1 keluhan atau kebutuhan perawatan.',
      concern_options: [{ text: 'Jerawat' }, { text: 'Bruntusan / Komedo' }, { text: 'Bekas Jerawat' }, { text: 'Flek / Hiperpigmentasi / Melasma' }, { text: 'Kemerahan / Rosacea' }, { text: 'Kulit Sensitif / Iritasi' }, { text: 'Kerutan / Tanda Penuaan Dini' }, { text: 'Kulit Kusam / Tekstur Tidak Merata' }, { text: 'Pori Besar' }, { text: 'Benang Hidung' }, { text: 'Implan Rambut' }, { text: 'Penyuburan Rambut' }, { text: 'Lainnya' }],
      privacy_text: 'Saya setuju data di atas digunakan untuk keperluan penjadwalan konsultasi dan kerahasiaannya akan dijaga sesuai kebijakan privasi Deoksi Clinic.',
      success_message: 'Data konsultasi Anda telah kami terima. Tim Deoksi Beauty Clinic akan segera menghubungi Anda melalui WhatsApp atau telepon.'
    },
    testimoni: {
      section_tag: 'Dipercaya Pelanggan',
      section_title: 'Pengalaman Pelanggan Deoksi Clinic',
      google_maps_link: '',
      reviews: [
        { name: 'Sarah Amalia', text: 'Kliniknya nyaman dan terasa profesional sejak pertama datang. Setelah menjalani perawatan slow aging, kulit saya tampak lebih segar dan terasa lebih terawat.', rating: 5, treatment: 'Perawatan Slow Aging', date: '1 minggu yang lalu', is_visible: true, sort_order: 1 },
        { name: 'Budi Santoso', text: 'Dokternya komunikatif dan menjelaskan pilihan treatment dengan sangat jelas. Saya merasa lebih yakin karena rekomendasinya benar-benar disesuaikan dengan kondisi kulit saya.', rating: 5, treatment: 'Konsultasi Ahli', date: '2 minggu yang lalu', is_visible: true, sort_order: 2 },
        { name: 'Indah Permata', text: 'Rangkaian Produk Deoksi terasa nyaman dipakai di kulit sensitif saya. Dalam waktu singkat, kulit terasa lebih lembap, tenang, dan tampak lebih cerah.', rating: 5, treatment: 'Rangkaian Produk Deoksi', date: '1 bulan yang lalu', is_visible: true, sort_order: 3 },
        { name: 'Rina Wijaya', text: 'Pelayanannya ramah dari awal hingga akhir. Prosedurnya terasa higienis, rapi, dan membuat saya nyaman selama menjalani perawatan di klinik.', rating: 5, treatment: 'Facial Treatment', date: '3 hari yang lalu', is_visible: true, sort_order: 4 },
      ]
    },
    global: {
      clinic_name: 'Deoksi Beauty Clinic',
      clinic_tagline: 'BEAUTY CENTER',
      footer_description: 'Deoksi Beauty Clinic Malang menghadirkan perawatan slow aging dan antioxidative care berbasis sains.',
      address: 'Jl. Puncak Borobudur Kav. 6, Kota Malang',
      phone: '+6282 3333 44919 (WA)',
      whatsapp_number: '6282333344919',
      instagram_url: 'https://www.instagram.com/deoksi_clinic',
      tiktok_url: 'https://www.tiktok.com/@deoksi_clinic',
      operating_hours: 'Senin - Sabtu, 09.00 - 20.00',
      copyright_text: '© 2026 Deoksi Beauty Clinic. All rights reserved.'
    },
    seo: {
      homepage: { meta_title: 'Deoksi Beauty Clinic Malang - Perawatan Slow Aging | Deoksi Beauty Clinic', meta_description: 'Deoksi Beauty Clinic Malang menghadirkan perawatan slow aging dan antioxidative care berbasis sains.', og_image: 'https://deoksibeautyclinic.id/assets/images/og-preview.jpg' },
      layanan: { meta_title: 'Layanan - Deoksi Beauty Clinic Malang', meta_description: 'Layanan klinik kecantikan Deoksi Clinic: Facial, Laser, Injeksi, dan Acne Care.' },
      produk: { meta_title: 'Produk - Deoksi Beauty Clinic Malang', meta_description: 'Produk Deoksi Clinic: Sabun, Serum, dan Sunscreen.' },
      tentang: { meta_title: 'Tentang - Deoksi Beauty Clinic Malang', meta_description: 'Tentang Deoksi Clinic: visi, misi, tim dokter, dan sertifikasi.' },
      lokasi: { meta_title: 'Lokasi - Deoksi Beauty Clinic Malang', meta_description: 'Lokasi & kontak Deoksi Clinic: alamat, jam operasional, WhatsApp, telepon, dan Google Maps.' },
      konsultasi: { meta_title: 'Konsultasi - Deoksi Beauty Clinic Malang', meta_description: 'Konsultasi gratis Deoksi Clinic: isi formulir untuk jadwal dan keluhan kulit.' }
    }
  };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

function ensureState() {
  if (!globalThis.__DEOKSI_LOCAL_DB__) {
    const now = nowIso();
    globalThis.__DEOKSI_LOCAL_DB__ = {
      counters: {
        customers: 4,
        articles: 3,
        media: 3,
      },
      homepageContent: getDefaultHomepageContent(),
      pageContent: getDefaultPageContent(),
      customers: [
        {
          id: 1,
          full_name: 'Nadya Prameswari',
          phone: '081234567890',
          email: 'nadya@example.com',
          gender: 'Perempuan',
          age_range: '25-34',
          concerns: ['Jerawat', 'Bekas jerawat'],
          message: 'Ingin konsultasi treatment untuk acne scar.',
          status: 'new',
          created_at: '2026-04-22T08:30:00.000Z',
          updated_at: '2026-04-22T08:30:00.000Z',
        },
        {
          id: 2,
          full_name: 'Rama Saputra',
          phone: '081298765432',
          email: 'rama@example.com',
          gender: 'Laki-laki',
          age_range: '25-34',
          concerns: ['Kulit kusam'],
          message: 'Mau tahu paket facial yang cocok.',
          status: 'contacted',
          created_at: '2026-04-21T10:15:00.000Z',
          updated_at: '2026-04-21T12:00:00.000Z',
        },
        {
          id: 3,
          full_name: 'Mira Oktavia',
          phone: '081377788899',
          email: 'mira@example.com',
          gender: 'Perempuan',
          age_range: '35-44',
          concerns: ['Flek hitam', 'Anti aging'],
          message: 'Minta jadwal konsultasi dokter.',
          status: 'scheduled',
          created_at: '2026-04-20T13:45:00.000Z',
          updated_at: '2026-04-21T09:20:00.000Z',
        },
        {
          id: 4,
          full_name: 'Tania Kusuma',
          phone: '081355544433',
          email: 'tania@example.com',
          gender: 'Perempuan',
          age_range: '18-24',
          concerns: ['Bruntusan'],
          message: 'Sudah pernah treatment dan mau lanjut.',
          status: 'done',
          created_at: '2026-04-18T15:00:00.000Z',
          updated_at: '2026-04-19T10:10:00.000Z',
        },
      ],
      articles: [
        {
          id: 1,
          title: '5 Langkah Medis Menjaga Skin Barrier Pasca Treatment Laser & Peeling',
          slug: '5-langkah-medis-menjaga-skin-barrier-pasca-treatment',
          excerpt: 'Jangan biarkan hasil treatment Anda sia-sia. Pahami cara melindungi lapisan pelindung kulit agar pemulihan lebih cepat dan hasil lebih glowing.',
          content: '<h2>Mengapa Skin Barrier Begitu Penting?</h2><p>Setelah menjalani treatment seperti Laser atau Chemical Peeling, kulit Anda berada dalam fase sensitif. Skin barrier yang sehat adalah kunci agar nutrisi terserap maksimal.</p><ul><li><strong>Gunakan Gentle Cleanser:</strong> Hindari sabun dengan scrub kasar selama 3-5 hari.</li><li><strong>Moisturizer adalah Wajib:</strong> Pilih pelembap dengan kandungan Ceramide atau Hyaluronic Acid.</li><li><strong>Proteksi UV Maksimal:</strong> Gunakan Sunscreen SPF 50 setiap 3 jam.</li></ul><p><em>"Pemulihan kulit yang tepat akan menentukan 70% keberhasilan treatment Anda."</em> — Tim Medis Deoksi.</p>',
          cover_image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
          category: 'edukasi',
          is_published: true,
          author: 'Tim Medis Deoksi',
          published_at: '2026-04-20T09:00:00.000Z',
          created_at: '2026-04-20T09:00:00.000Z',
          updated_at: '2026-04-20T09:00:00.000Z',
        },
        {
          id: 2,
          title: 'Glow Up Ramadhan: Paket Brightening Premium dengan Teknologi Antioksidatif',
          slug: 'glow-up-ramadhan-paket-brightening-premium',
          excerpt: 'Sambut hari raya dengan kulit cerah dan sehat. Dapatkan penawaran eksklusif untuk rangkaian treatment Brightening di Deoksi Clinic Malang.',
          content: '<p>Wujudkan impian kulit cerah merata tanpa kusam. Paket Brightening kami menggabungkan teknologi medis modern dengan serum antioksidatif premium.</p><h2>Keunggulan Treatment Deoksi:</h2><ul><li>Prosedur medis oleh dokter bersertifikat.</li><li>Bahan aktif standar farmasi (Medical Grade).</li><li>Hasil alami dan bertahan lama.</li></ul><p>Segera reservasi jadwal Anda melalui WhatsApp sebelum kuota promo mingguan berakhir!</p>',
          cover_image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
          category: 'promo',
          is_published: true,
          author: 'Deoksi Admin',
          published_at: '2026-04-19T09:00:00.000Z',
          created_at: '2026-04-19T09:00:00.000Z',
          updated_at: '2026-04-19T09:00:00.000Z',
        },
        {
          id: 3,
          title: 'Mengenal Teknologi Pico Laser untuk Menghilangkan Flek Hitam',
          slug: 'mengenal-teknologi-pico-laser-untuk-flek-hitam',
          excerpt: 'Solusi modern untuk masalah pigmentasi dengan waktu pemulihan yang lebih singkat.',
          content: 'Konten edukasi mendalam mengenai teknologi laser tercanggih untuk pigmentasi kulit.',
          cover_image: '',
          category: 'tips',
          is_published: false,
          author: 'Deoksi Clinic',
          published_at: null,
          created_at: '2026-04-18T09:00:00.000Z',
          updated_at: '2026-04-18T09:00:00.000Z',
        },
      ],
      media: [
        {
          id: 1,
          filename: 'clinic-lobby.jpg',
          title: 'Lobby Klinik Utama',
          source_type: 'cloudinary',
          cloudinary_id: null,
          section_name: 'Homepage',
          slot_key: 'hero_media',
          slot_name: 'Hero Media',
          is_slot_active: true,
          display_order: 1,
          original_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
          optimized_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1280&q=80',
          thumb_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=320&q=70',
          url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
          type: 'image',
          category: 'gallery',
          alt_text: 'Lobby klinik Deoksi',
          tags: ['lobby', 'branding'],
          platform: 'website',
          campaign: 'Evergreen Clinic Profile',
          status: 'active',
          notes: 'Dipakai untuk hero dan galeri profil klinik.',
          last_used_at: '2026-04-21T07:00:00.000Z',
          usage_count: 3,
          size_bytes: 420000,
          uploaded_at: '2026-04-21T07:00:00.000Z',
          updated_at: '2026-04-21T07:00:00.000Z',
        },
        {
          id: 2,
          filename: 'promo-april.jpg',
          title: 'Poster Promo April',
          source_type: 'cloudinary',
          cloudinary_id: null,
          section_name: 'Promo Section',
          slot_key: 'promo_featured',
          slot_name: 'Promo Featured',
          is_slot_active: true,
          display_order: 1,
          original_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
          optimized_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1280&q=80',
          thumb_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=320&q=70',
          url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
          type: 'image',
          category: 'promo',
          alt_text: 'Poster promo April',
          tags: ['promo', 'facial', 'april'],
          platform: 'instagram',
          campaign: 'Promo April 2026',
          status: 'active',
          notes: 'Versi feed Instagram dan landing promo.',
          last_used_at: '2026-04-20T07:00:00.000Z',
          usage_count: 6,
          size_bytes: 390000,
          uploaded_at: '2026-04-20T07:00:00.000Z',
          updated_at: '2026-04-20T07:00:00.000Z',
        },
        {
          id: 3,
          filename: 'dokter-utama.jpg',
          title: 'Dokter Utama Deoksi',
          source_type: 'cloudinary',
          cloudinary_id: null,
          section_name: 'Featured Media',
          slot_key: 'featured_media',
          slot_name: 'Featured Media',
          is_slot_active: false,
          display_order: 1,
          original_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
          optimized_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1280&q=80',
          thumb_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=320&q=70',
          url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
          type: 'image',
          category: 'doctor',
          alt_text: 'Dokter utama Deoksi',
          tags: ['dokter', 'team'],
          platform: 'website',
          campaign: 'Doctor Profile',
          status: 'draft',
          notes: 'Siap dipakai untuk profil dokter dan about page.',
          last_used_at: null,
          usage_count: 0,
          size_bytes: 360000,
          uploaded_at: '2026-04-19T07:00:00.000Z',
          updated_at: '2026-04-19T07:00:00.000Z',
        },
      ],
    };
  }

  return globalThis.__DEOKSI_LOCAL_DB__;
}

function paginate(rows, page, limit) {
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
  const offset = (normalizedPage - 1) * normalizedLimit;
  return {
    data: rows.slice(offset, offset + normalizedLimit),
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total: rows.length,
    },
  };
}

export function isLocalMode() {
  return !process.env.DATABASE_URL;
}

export function getLocalAdmin() {
  return {
    id: 1,
    username: process.env.LOCAL_ADMIN_USERNAME || 'admin',
    password: process.env.LOCAL_ADMIN_PASSWORD || 'deoksi2026',
    full_name: process.env.LOCAL_ADMIN_FULL_NAME || 'Admin Deoksi',
    role: 'admin',
  };
}

export function listCustomers({ status, search, page = 1, limit = 20 } = {}) {
  const state = ensureState();
  let rows = [...state.customers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  if (search) {
    const query = search.toLowerCase();
    rows = rows.filter((row) =>
      row.full_name.toLowerCase().includes(query) ||
      row.phone.toLowerCase().includes(query)
    );
  }

  return paginate(rows, page, limit);
}

export function createCustomer(payload) {
  const state = ensureState();
  const timestamp = nowIso();
  const customer = {
    id: ++state.counters.customers,
    full_name: payload.full_name,
    phone: payload.phone,
    email: payload.email || null,
    gender: payload.gender || null,
    age_range: payload.age_range || payload.age || null,
    concerns: Array.isArray(payload.concerns) ? payload.concerns : [],
    message: payload.message || null,
    preferred_date: payload.preferred_date || null,
    status: 'new',
    created_at: timestamp,
    updated_at: timestamp,
  };

  state.customers.push(customer);
  return clone(customer);
}

export function updateCustomerStatus(id, status) {
  const state = ensureState();
  const customer = state.customers.find((item) => String(item.id) === String(id));
  if (!customer) return null;

  customer.status = status;
  customer.updated_at = nowIso();
  return clone(customer);
}

export function deleteCustomerById(id) {
  const state = ensureState();
  const index = state.customers.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const [removed] = state.customers.splice(index, 1);
  return clone(removed);
}

export function listArticles({ slug, category, admin = false, page = 1, limit = 12 } = {}) {
  const state = ensureState();

  if (slug) {
    const article = state.articles.find((item) => item.slug === slug && item.is_published);
    return article ? clone(article) : null;
  }

  let rows = [...state.articles];
  if (!admin) {
    rows = rows.filter((item) => item.is_published);
  }
  if (category) {
    rows = rows.filter((item) => item.category === category);
  }

  rows.sort((a, b) => {
    const dateA = a.published_at || a.created_at;
    const dateB = b.published_at || b.created_at;
    return new Date(dateB) - new Date(dateA);
  });

  return paginate(rows, page, limit);
}

export function createArticle(payload) {
  const state = ensureState();
  const timestamp = nowIso();
  const article = {
    id: ++state.counters.articles,
    title: payload.title,
    slug: slugify(payload.title),
    excerpt: payload.excerpt || null,
    content: payload.content || null,
    cover_image: payload.cover_image || null,
    category: payload.category || 'edukasi',
    is_published: Boolean(payload.is_published),
    author: 'Deoksi Clinic',
    published_at: payload.is_published ? timestamp : null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  state.articles.push(article);
  return clone(article);
}

export function updateArticle(id, payload) {
  const state = ensureState();
  const article = state.articles.find((item) => String(item.id) === String(id));
  if (!article) return null;

  if (payload.title !== undefined) {
    article.title = payload.title || article.title;
    article.slug = slugify(article.title);
  }
  if (payload.excerpt !== undefined) article.excerpt = payload.excerpt || null;
  if (payload.content !== undefined) article.content = payload.content || null;
  if (payload.cover_image !== undefined) article.cover_image = payload.cover_image || null;
  if (payload.category !== undefined) article.category = payload.category || 'edukasi';
  if (payload.is_published !== undefined) {
    const nextPublished = Boolean(payload.is_published);
    if (nextPublished && !article.published_at) {
      article.published_at = nowIso();
    }
    article.is_published = nextPublished;
  }
  article.updated_at = nowIso();

  return clone(article);
}

export function deleteArticleById(id) {
  const state = ensureState();
  const index = state.articles.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const [removed] = state.articles.splice(index, 1);
  return clone(removed);
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStoredStatus(status) {
  return status === 'inactive' ? 'archived' : (status || 'draft');
}

export function listMedia({ category, type, status, platform, slot_key, section_name, search, page = 1, limit = 20 } = {}) {
  const state = ensureState();
  let rows = [...state.media].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

  if (category) rows = rows.filter((item) => item.category === category);
  if (type) rows = rows.filter((item) => item.type === type);
  if (status) rows = rows.filter((item) => item.status === status);
  if (platform) rows = rows.filter((item) => item.platform === platform);
  if (slot_key) rows = rows.filter((item) => item.slot_key === slot_key);
  if (section_name) rows = rows.filter((item) => item.section_name === section_name);
  if (search) {
    const query = String(search).toLowerCase();
    rows = rows.filter((item) =>
      [item.filename, item.title, item.category, item.campaign, item.platform, item.alt_text, item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)) ||
      [item.slot_key, item.slot_name, item.section_name].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)) ||
      (item.tags || []).some((tag) => String(tag).toLowerCase().includes(query))
    );
  }

  return paginate(rows, page, limit);
}

export function getMediaSummary() {
  const state = ensureState();
  const rows = state.media;

  return {
    total: rows.length,
    active: rows.filter((item) => item.status === 'active').length,
    draft: rows.filter((item) => item.status === 'draft').length,
    archived: rows.filter((item) => item.status === 'archived').length,
    documents: rows.filter((item) => item.type === 'document').length,
  };
}

export function getActiveMediaBySlotKeys(slotKeys = []) {
  const state = ensureState();
  const allowed = new Set((slotKeys || []).filter(Boolean));
  return clone(
    state.media
      .filter((item) => item.is_slot_active && item.status === 'active' && (!allowed.size || allowed.has(item.slot_key)))
      .sort((a, b) => {
        const orderDiff = Number(a.display_order || 0) - Number(b.display_order || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.updated_at || b.uploaded_at || 0) - new Date(a.updated_at || a.uploaded_at || 0);
      })
  );
}

export function listActiveWebsiteContent(section = '') {
  const state = ensureState();
  const grouped = groupWebsiteContentAssets(
    state.media.filter((item) => item.status === 'active')
  );

  if (section) {
    return { [section]: clone(grouped[section] || []) };
  }

  return clone(grouped);
}

export function listActiveWebsiteSlots() {
  const state = ensureState();
  return clone(
    buildWebsiteSlotMap(
      state.media.filter((item) => item.status === 'active')
    )
  );
}

export function getHomepageContent() {
  const state = ensureState();
  return clone({
    ...getDefaultHomepageContent(),
    ...(state.homepageContent || {}),
  });
}

export function updateHomepageContent(payload = {}) {
  const state = ensureState();
  const nextContent = { ...(state.homepageContent || getDefaultHomepageContent()) };

  Object.entries(getDefaultHomepageContent()).forEach(([key, defaultValue]) => {
    if (payload[key] !== undefined) {
      nextContent[key] = String(payload[key] ?? '').trim() || defaultValue;
    }
  });

  state.homepageContent = nextContent;
  return clone(nextContent);
}

export function getPageContent(pageKey) {
  const state = ensureState();
  if (!state.pageContent) state.pageContent = getDefaultPageContent();
  const defaults = getDefaultPageContent()[pageKey] || {};
  return clone({
    ...defaults,
    ...(state.pageContent[pageKey] || {}),
  });
}

export function updatePageContent(pageKey, payload = {}) {
  const state = ensureState();
  if (!state.pageContent) state.pageContent = getDefaultPageContent();
  if (!state.pageContent[pageKey]) {
    state.pageContent[pageKey] = {};
  }
  
  // Update state deeply if needed, here we just assign properties
  const nextContent = { ...state.pageContent[pageKey], ...payload };
  state.pageContent[pageKey] = nextContent;
  return clone(nextContent);
}

export function createMedia(payload) {
  const state = ensureState();
  const timestamp = nowIso();
  const media = {
    id: ++state.counters.media,
    filename: payload.filename,
    title: payload.title || payload.filename,
    source_type: payload.source_type || 'external',
    cloudinary_id: payload.cloudinary_id || null,
    section_name: payload.section_name || null,
    slot_key: payload.slot_key || null,
    slot_name: payload.slot_name || null,
    is_slot_active: Boolean(payload.is_slot_active),
    display_order: payload.display_order || 0,
    original_url: payload.original_url || payload.url,
    optimized_url: payload.optimized_url || payload.url,
    thumb_url: payload.thumb_url || payload.url,
    url: payload.url,
    type: payload.type || 'image',
    category: payload.category || 'gallery',
    alt_text: payload.alt_text || null,
    tags: normalizeTags(payload.tags),
    platform: payload.platform || 'website',
    campaign: payload.campaign || null,
    status: normalizeStoredStatus(payload.status),
    notes: payload.notes || null,
    last_used_at: payload.last_used_at || null,
    usage_count: payload.usage_count || 0,
    size_bytes: payload.size_bytes || null,
    uploaded_at: timestamp,
    updated_at: timestamp,
  };

  state.media.push(media);
  return clone(media);
}

export function updateMedia(id, payload) {
  const state = ensureState();
  const media = state.media.find((item) => String(item.id) === String(id));
  if (!media) return null;

  if (payload.is_slot_active === true && payload.slot_key) {
    for (const item of state.media) {
      if (item.slot_key === payload.slot_key && item.id !== media.id) {
        item.is_slot_active = false;
      }
    }
  }

  if (payload.filename !== undefined) media.filename = payload.filename || media.filename;
  if (payload.title !== undefined) media.title = payload.title || media.title;
  if (payload.source_type !== undefined) media.source_type = payload.source_type || media.source_type;
  if (payload.section_name !== undefined) media.section_name = payload.section_name || null;
  if (payload.slot_key !== undefined) media.slot_key = payload.slot_key || null;
  if (payload.slot_name !== undefined) media.slot_name = payload.slot_name || null;
  if (payload.is_slot_active !== undefined) media.is_slot_active = Boolean(payload.is_slot_active);
  if (payload.display_order !== undefined) media.display_order = payload.display_order || 0;
  if (payload.url !== undefined) media.url = payload.url || media.url;
  if (payload.original_url !== undefined) media.original_url = payload.original_url || media.original_url;
  if (payload.optimized_url !== undefined) media.optimized_url = payload.optimized_url || media.optimized_url;
  if (payload.thumb_url !== undefined) media.thumb_url = payload.thumb_url || media.thumb_url;
  if (payload.type !== undefined) media.type = payload.type || media.type;
  if (payload.category !== undefined) media.category = payload.category || media.category;
  if (payload.alt_text !== undefined) media.alt_text = payload.alt_text || null;
  if (payload.tags !== undefined) media.tags = normalizeTags(payload.tags);
  if (payload.platform !== undefined) media.platform = payload.platform || 'website';
  if (payload.campaign !== undefined) media.campaign = payload.campaign || null;
  if (payload.status !== undefined) media.status = normalizeStoredStatus(payload.status);
  if (payload.notes !== undefined) media.notes = payload.notes || null;
  if (payload.last_used_at !== undefined) media.last_used_at = payload.last_used_at || null;
  if (payload.usage_count !== undefined) media.usage_count = payload.usage_count || 0;
  if (payload.size_bytes !== undefined) media.size_bytes = payload.size_bytes || null;
  media.updated_at = nowIso();

  return clone(media);
}

export function deleteMediaById(id) {
  const state = ensureState();
  const index = state.media.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const [removed] = state.media.splice(index, 1);
  return clone(removed);
}
