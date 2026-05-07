import { buildWebsiteSlotMap, groupWebsiteContentAssets } from './content-sections.js';
import { normalizeMediaPayload, normalizeMediaPlacement } from './media-library.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function nowIso() {
  return new Date().toISOString();
}

function getDefaultHomepageContent() {
  return {
    hero_media: '',
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

const DEFAULT_LOCATION_HOURS = 'Senin–Jumat: 10.30–18.30 WIB\nSabtu–Minggu: 09.00–17.00 WIB';
const DEFAULT_GLOBAL_HOURS = 'Senin - Jumat, 10.30 - 18.30 WIB<br>Sabtu - Minggu, 09.00 - 17.00 WIB';
const DEFAULT_LOCATION_ADDRESS = 'Deoksi Beauty Clinic, Jl. Puncak Borobudur Kav. 6, Kota Malang, Jawa Timur — sekitar 50 meter di sebelah barat Bundaran Soekarno Hatta.';
const DEFAULT_GLOBAL_ADDRESS = 'Jl. Puncak Borobudur Kav. 6, Kota Malang — sekitar 50 meter di sebelah barat Bundaran Soekarno Hatta.';
const DEFAULT_LOCATION_MAP_EMBED = 'https://www.google.com/maps?q=-7.9364532,112.6259121&z=17&output=embed';
const DEFAULT_LOCATION_MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=-7.9364532,112.6259121';
const DEFAULT_HERO_VIDEO_URL = 'https://res.cloudinary.com/demo/video/upload/samples/sea-turtle.mp4';
const DEFAULT_PROMO_DRIVE_URL = 'https://drive.google.com/file/d/1PromoDriveQa111111111111111111111/view?usp=sharing';
const DEFAULT_FEATURED_DRIVE_URL = 'https://drive.google.com/file/d/1FeaturedDriveQa111111111111111111/view?usp=sharing';
const LEGACY_LOCATION_HOURS = 'Senin–Sabtu: 09.00–20.00\nMinggu: Tutup';
const LEGACY_GLOBAL_HOURS = 'Senin - Sabtu, 09.00 - 20.00';
const LEGACY_LOCATION_ADDRESS = 'Deoksi Beauty Clinic, Jl. Puncak Borobudur Kav. 6, Kota Malang, Jawa Timur.';
const LEGACY_GLOBAL_ADDRESS = 'Jl. Puncak Borobudur Kav. 6, Kota Malang';
const LEGACY_LOCATION_MAP_EMBED = 'https://www.google.com/maps?q=Malang%2C%20Jawa%20Timur&output=embed';
const LEGACY_HERO_IMAGE_URL = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80';
const LEGACY_PROMO_IMAGE_URL = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80';
const LEGACY_FEATURED_IMAGE_URL = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80';

function shouldUpgradeLocationAddress(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return true;
  const mentionsBaseAddress =
    normalized.includes('puncak borobudur') ||
    normalized.includes('borobudur kav. 6') ||
    normalized.includes('soekarno hatta');
  const hasDirectionalHint =
    normalized.includes('50 meter') ||
    normalized.includes('bundaran soekarno hatta') ||
    normalized.includes('bundaran sukarno hatta');

  return mentionsBaseAddress && !hasDirectionalHint;
}

function ensureLegacyMediaCompliance(media = []) {
  return (media || []).map((item) => {
    if (
      item?.slot_key === 'hero_media' &&
      item?.source_type === 'cloudinary' &&
      item?.type === 'image' &&
      String(item?.original_url || item?.url || '').includes('photo-1519494026892-80bbd2d6fd0d')
    ) {
      return {
        ...item,
        filename: 'clinic-lobby.mp4',
        source_type: 'cloudinary',
        media_kind: 'video_cloudinary',
        type: 'video',
        category: 'video',
        original_url: DEFAULT_HERO_VIDEO_URL,
        optimized_url: DEFAULT_HERO_VIDEO_URL,
        thumb_url: DEFAULT_HERO_VIDEO_URL,
        url: DEFAULT_HERO_VIDEO_URL,
        notes: 'Video hero contoh Cloudinary untuk library lokal.',
      };
    }

    if (
      item?.slot_key === 'promo_featured' &&
      item?.source_type === 'cloudinary' &&
      item?.type === 'image' &&
      String(item?.original_url || item?.url || '').includes('photo-1522335789203-aabd1fc54bc9')
    ) {
      return {
        ...item,
        source_type: 'google_drive',
        media_kind: item.media_kind || 'website_photo',
        original_url: DEFAULT_PROMO_DRIVE_URL,
        optimized_url: DEFAULT_PROMO_DRIVE_URL,
        thumb_url: DEFAULT_PROMO_DRIVE_URL,
        url: DEFAULT_PROMO_DRIVE_URL,
        notes: 'Foto promo contoh Google Drive untuk library lokal.',
      };
    }

    if (
      item?.slot_key === 'featured_media' &&
      item?.source_type === 'cloudinary' &&
      item?.type === 'image' &&
      String(item?.original_url || item?.url || '').includes('photo-1559839734-2b71ea197ec2')
    ) {
      return {
        ...item,
        source_type: 'google_drive',
        original_url: DEFAULT_FEATURED_DRIVE_URL,
        optimized_url: DEFAULT_FEATURED_DRIVE_URL,
        thumb_url: DEFAULT_FEATURED_DRIVE_URL,
        url: DEFAULT_FEATURED_DRIVE_URL,
        notes: 'Foto featured contoh Google Drive untuk library lokal.',
      };
    }

    return item;
  });
}

function getDefaultHomepagePageContent() {
  const defaults = getDefaultHomepageContent();
  return {
    hero: {
      hero_media: '',
      hero_badge: defaults.hero_badge,
      headline: defaults.headline,
      highlight_text: defaults.highlight_text,
      description: defaults.description,
      cta_text: defaults.cta_text,
      cta_link: defaults.cta_link,
    },
    hero_benefits: {
      bullet_benefit_1: defaults.bullet_benefit_1,
      bullet_benefit_2: defaults.bullet_benefit_2,
      bullet_benefit_3: defaults.bullet_benefit_3,
      consultation_card_title: defaults.consultation_card_title,
      consultation_card_description: defaults.consultation_card_description,
    },
    promos: [
      {
        title: 'Brightening Starter Package',
        description: 'Rangkaian konsultasi, facial, dan skincare dasar untuk membantu kulit tampak lebih segar dan merata.',
        price: 'Rp 399.000',
        image_url: '/assets/images/service_products.png',
        cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20menanyakan%20promo%20Brightening%20Starter%20Package.',
        is_visible: true,
      },
      {
        title: 'Acne Recovery Program',
        description: 'Program perawatan bertahap untuk kulit berjerawat dengan fokus pada pemulihan skin barrier dan kontrol minyak.',
        price: 'Rp 549.000',
        image_url: '/assets/images/service_consult.png',
        cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20menanyakan%20promo%20Acne%20Recovery%20Program.',
        is_visible: true,
      },
      {
        title: 'Skin Booster Glow Session',
        description: 'Paket treatment intensif untuk membantu kulit terasa lebih lembap, halus, dan tampak glowing.',
        price: 'Rp 699.000',
        image_url: '/assets/images/service_aging.png',
        cta_link: 'https://wa.me/6282333344919?text=Halo%20Deoksi%20Clinic,%20saya%20ingin%20menanyakan%20promo%20Skin%20Booster%20Glow%20Session.',
        is_visible: true,
      },
    ],
  };
}

function getDefaultPageContent() {
  return {
    homepage: getDefaultHomepagePageContent(),
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
        { name: 'Deoksi Facial Wash', category: 'sabun', price: 'Rp 85.000', rating: 4.8, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200001', key_benefit: 'Membantu membersihkan wajah tanpa membuat kulit terasa kering.', netto: '100 ml', usage_hint: 'Gunakan pagi dan malam pada wajah yang telah dibasahi.', is_visible: true, sort_order: 1 },
        { name: 'Deoksi Gentle Cleanser', category: 'sabun', price: 'Rp 95.000', rating: 4.7, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200002', key_benefit: 'Membantu menjaga kebersihan kulit sensitif dengan rasa yang lebih lembut.', netto: '100 ml', usage_hint: 'Gunakan secukupnya, pijat lembut, lalu bilas hingga bersih.', is_visible: true, sort_order: 2 },
        { name: 'Deoksi Glow Serum', category: 'serum', price: 'Rp 150.000', rating: 4.9, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200003', key_benefit: 'Membantu membuat tampilan kulit terlihat lebih cerah dan segar.', netto: '20 ml', usage_hint: 'Gunakan 2-3 tetes setelah toner, pagi atau malam hari.', is_visible: true, sort_order: 3 },
        { name: 'Deoksi Barrier Serum', category: 'serum', price: 'Rp 165.000', rating: 4.8, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200004', key_benefit: 'Membantu menjaga kelembapan dan kenyamanan skin barrier.', netto: '20 ml', usage_hint: 'Aplikasikan merata pada wajah bersih sebelum pelembap.', is_visible: true, sort_order: 4 },
        { name: 'Deoksi Sun Shield SPF 50', category: 'sunscreen', price: 'Rp 95.000', rating: 4.8, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200005', key_benefit: 'Membantu melindungi kulit dari paparan sinar matahari harian.', netto: '40 ml', usage_hint: 'Gunakan 15 menit sebelum aktivitas luar ruang dan ulangi seperlunya.', is_visible: true, sort_order: 5 },
        { name: 'Deoksi UV Daily Defense', category: 'sunscreen', price: 'Rp 110.000', rating: 4.7, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200006', key_benefit: 'Membantu memberi perlindungan UV harian dengan rasa ringan di kulit.', netto: '40 ml', usage_hint: 'Gunakan merata pada wajah dan leher sebelum beraktivitas.', is_visible: true, sort_order: 6 },
        { name: 'Deoksi Age Defy', category: 'serum', price: 'Rp 175.000', rating: 4.9, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200007', key_benefit: 'Membantu merawat tampilan kulit agar terasa lebih halus dan terawat.', netto: '20 ml', usage_hint: 'Gunakan pada malam hari setelah rangkaian pembersih wajah.', is_visible: true, sort_order: 7 },
        { name: 'Deoksi Deep Cleanser', category: 'sabun', price: 'Rp 88.000', rating: 4.8, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200008', key_benefit: 'Membantu mengangkat sisa kotoran dan minyak berlebih dengan nyaman.', netto: '100 ml', usage_hint: 'Gunakan secukupnya pada wajah yang lembap, lalu bilas.', is_visible: true, sort_order: 8 },
        { name: 'Deoksi Hydrating Toner', category: 'serum', price: 'Rp 125.000', rating: 4.8, has_bpom: true, has_halal_mui: true, bpom_number: 'NA18251200009', key_benefit: 'Membantu memberi hidrasi awal agar kulit terasa lebih siap menerima skincare.', netto: '120 ml', usage_hint: 'Tepuk perlahan ke wajah setelah mencuci muka.', is_visible: true, sort_order: 9 },
      ]
    },
    berita: {
      page_tag: 'Informasi Terkini',
      page_title: 'Berita & Edukasi Klinik',
      page_description: 'Temukan berbagai informasi terbaru mengenai tren kecantikan, tips perawatan kulit, dan aktivitas terkini dari para ahli kami.',
      articles: [
        {
          title: '5 Langkah Medis Menjaga Skin Barrier Pasca Treatment Laser & Peeling',
          author: 'Tim Medis Deoksi',
          publish_date: '20 April 2026',
          excerpt: 'Jangan biarkan hasil treatment Anda sia-sia. Pahami cara melindungi lapisan pelindung kulit agar pemulihan lebih cepat dan hasil lebih glowing.',
          content: 'Setelah treatment seperti laser atau peeling, kulit membutuhkan perawatan yang lembut, hidrasi yang cukup, dan proteksi sinar UV yang konsisten. Edukasi ini membantu pasien memahami langkah pemulihan yang aman dan terarah.',
          image_url: '/assets/images/service_aging.png',
          is_published: true,
        },
        {
          title: 'Glow Up Series: Paket Brightening Premium dengan Teknologi Antioksidatif',
          author: 'Deoksi Admin',
          publish_date: '19 April 2026',
          excerpt: 'Sambut momen penting dengan kulit cerah dan sehat melalui kombinasi treatment brightening dan skincare pendukung yang tepat.',
          content: 'Paket brightening Deoksi dirancang untuk membantu meratakan warna kulit, menjaga hidrasi, dan memberikan tampilan kulit yang lebih segar melalui evaluasi kebutuhan kulit secara personal.',
          image_url: '/assets/images/service_products.png',
          is_published: true,
        },
        {
          title: 'Mengenal Teknologi Pico Laser untuk Membantu Menyamarkan Flek',
          author: 'Deoksi Clinic',
          publish_date: '18 April 2026',
          excerpt: 'Solusi modern untuk masalah pigmentasi dengan downtime yang lebih singkat dan pendekatan medis yang terarah.',
          content: 'Teknologi Pico Laser dapat menjadi salah satu opsi perawatan untuk membantu menangani pigmentasi tertentu. Pemilihan tindakan tetap perlu diawali dengan konsultasi agar sesuai kondisi kulit pasien.',
          image_url: '/assets/images/hero_clinic.png',
          is_published: false,
        },
      ],
    },
    galeri: {
      page_tag: 'Visual Clinic Journal',
      page_title: 'Galeri Klinik',
      page_description: 'Dokumentasi suasana ruang, proses treatment, dan momen klinik yang membantu calon pasien memahami pengalaman perawatan secara lebih utuh.',
      media_items: [
        {
          title: 'Suasana lobby utama Deoksi Clinic',
          media_type: 'image',
          media_url: '/assets/images/hero_clinic.png',
          is_visible: true,
        },
        {
          title: 'Area treatment yang bersih dan tertata',
          media_type: 'image',
          media_url: '/assets/images/gallery_one.png',
          is_visible: true,
        },
        {
          title: 'Cuplikan visual proses treatment di klinik',
          media_type: 'video',
          media_url: '/assets/videos/hover-utama.mp4',
          is_visible: true,
        },
      ],
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
        { name: 'Tim Konsultasi Deoksi', specialization: 'Koordinator Konsultasi', description: 'Membantu memastikan alur konsultasi awal, edukasi layanan, dan kebutuhan pasien terkoordinasi dengan rapi sebelum treatment dilakukan.', photo_url: '/assets/images/service_consult.png', sort_order: 4 },
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
      address: DEFAULT_LOCATION_ADDRESS,
      operating_hours: DEFAULT_LOCATION_HOURS,
      phone: '+6282333344919',
      whatsapp_link: 'https://wa.me/6282333344919',
      maps_embed_url: DEFAULT_LOCATION_MAP_EMBED,
      google_maps_link: DEFAULT_LOCATION_MAP_LINK
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
      address: DEFAULT_GLOBAL_ADDRESS,
      phone: '+6282 3333 44919 (WA)',
      whatsapp_number: '6282333344919',
      instagram_url: 'https://www.instagram.com/deoksi_clinic',
      tiktok_url: 'https://www.tiktok.com/@deoksi_clinic',
      operating_hours: DEFAULT_GLOBAL_HOURS,
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

function ensureDefaultPageContentShape(pageContent) {
  const defaults = getDefaultPageContent();
  if (!pageContent || typeof pageContent !== 'object') return clone(defaults);

  if (!pageContent.homepage || typeof pageContent.homepage !== 'object') {
    pageContent.homepage = clone(defaults.homepage);
  } else if (!Array.isArray(pageContent.homepage.promos) || pageContent.homepage.promos.length === 0) {
    pageContent.homepage.promos = clone(defaults.homepage.promos);
  }

  if (!pageContent.berita || typeof pageContent.berita !== 'object') {
    pageContent.berita = clone(defaults.berita);
  } else {
    pageContent.berita.page_tag ||= defaults.berita.page_tag;
    pageContent.berita.page_title ||= defaults.berita.page_title;
    pageContent.berita.page_description ||= defaults.berita.page_description;
    if (!Array.isArray(pageContent.berita.articles) || pageContent.berita.articles.length === 0) {
      pageContent.berita.articles = clone(defaults.berita.articles);
    }
  }

  if (!pageContent.galeri || typeof pageContent.galeri !== 'object') {
    pageContent.galeri = clone(defaults.galeri);
  } else {
    pageContent.galeri.page_tag ||= defaults.galeri.page_tag;
    pageContent.galeri.page_title ||= defaults.galeri.page_title;
    pageContent.galeri.page_description ||= defaults.galeri.page_description;
    if (!Array.isArray(pageContent.galeri.media_items) || pageContent.galeri.media_items.length === 0) {
      pageContent.galeri.media_items = clone(defaults.galeri.media_items);
    }
  }

  if (pageContent.tentang && Array.isArray(pageContent.tentang.doctors) && pageContent.tentang.doctors.length === 3) {
    pageContent.tentang.doctors = clone(defaults.tentang.doctors);
  }

  if (!pageContent.lokasi || typeof pageContent.lokasi !== 'object') {
    pageContent.lokasi = clone(defaults.lokasi);
  } else if (!pageContent.lokasi.operating_hours || pageContent.lokasi.operating_hours === LEGACY_LOCATION_HOURS) {
    pageContent.lokasi.operating_hours = defaults.lokasi.operating_hours;
  }
  if (pageContent.lokasi && (!pageContent.lokasi.address || pageContent.lokasi.address === LEGACY_LOCATION_ADDRESS || shouldUpgradeLocationAddress(pageContent.lokasi.address))) {
    pageContent.lokasi.address = defaults.lokasi.address;
  }
  if (pageContent.lokasi && (!pageContent.lokasi.maps_embed_url || pageContent.lokasi.maps_embed_url === LEGACY_LOCATION_MAP_EMBED)) {
    pageContent.lokasi.maps_embed_url = defaults.lokasi.maps_embed_url;
  }
  if (pageContent.lokasi && !pageContent.lokasi.google_maps_link) {
    pageContent.lokasi.google_maps_link = defaults.lokasi.google_maps_link;
  }

  if (!pageContent.global || typeof pageContent.global !== 'object') {
    pageContent.global = clone(defaults.global);
  } else if (!pageContent.global.operating_hours || pageContent.global.operating_hours === LEGACY_GLOBAL_HOURS) {
    pageContent.global.operating_hours = defaults.global.operating_hours;
  }
  if (pageContent.global && (!pageContent.global.address || pageContent.global.address === LEGACY_GLOBAL_ADDRESS || shouldUpgradeLocationAddress(pageContent.global.address))) {
    pageContent.global.address = defaults.global.address;
  }

  return pageContent;
}

function normalizePageContentRecord(pageKey, content = {}) {
  const defaults = getDefaultPageContent();
  const next = clone(content);

  if (pageKey === 'lokasi') {
    next.address = defaults.lokasi.address;
    next.maps_embed_url = defaults.lokasi.maps_embed_url;
    next.google_maps_link = defaults.lokasi.google_maps_link;
    if (!next.operating_hours || next.operating_hours === LEGACY_LOCATION_HOURS) {
      next.operating_hours = defaults.lokasi.operating_hours;
    }
  }

  if (pageKey === 'global') {
    next.address = defaults.global.address;
    if (!next.operating_hours || next.operating_hours === LEGACY_GLOBAL_HOURS) {
      next.operating_hours = defaults.global.operating_hours;
    }
  }

  if (pageKey === 'tentang' && Array.isArray(next.doctors) && next.doctors.length === 3) {
    next.doctors = clone(defaults.tentang.doctors);
  }

  return next;
}

function getDefaultCustomers() {
  return [
    {
      id: 1,
      full_name: 'Nadya Prameswari',
      phone: '081234567890',
      email: 'nadya@example.com',
      gender: 'Perempuan',
      age_range: '25-34',
      concerns: ['Jerawat', 'Bekas jerawat'],
      message: 'Ingin konsultasi treatment untuk acne scar.',
      customer_type: 'new',
      nik: null,
      address: null,
      identity_verified: false,
      identity_verified_at: null,
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
      customer_type: 'new',
      nik: null,
      address: null,
      identity_verified: false,
      identity_verified_at: null,
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
      customer_type: 'existing',
      nik: '3578011204830002',
      address: 'Jl. Soekarno Hatta No. 18, Lowokwaru, Malang',
      identity_verified: true,
      identity_verified_at: '2026-04-21T09:20:00.000Z',
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
      customer_type: 'existing',
      nik: '3578012001990004',
      address: 'Perum Griya Cempaka Blok B2, Malang',
      identity_verified: true,
      identity_verified_at: '2026-04-19T10:10:00.000Z',
      status: 'done',
      created_at: '2026-04-18T15:00:00.000Z',
      updated_at: '2026-04-19T10:10:00.000Z',
    },
  ];
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
      adminUser: {
        id: 1,
        username: process.env.LOCAL_ADMIN_USERNAME || 'admin',
        password: process.env.LOCAL_ADMIN_PASSWORD || 'deoksi2026',
        full_name: process.env.LOCAL_ADMIN_FULL_NAME || 'Admin Deoksi',
        role: 'admin',
      },
      counters: {
        customers: 4,
        articles: 3,
        media: 3,
      },
      homepageContent: getDefaultHomepageContent(),
      pageContent: getDefaultPageContent(),
      customers: getDefaultCustomers(),
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
          filename: 'clinic-lobby.mp4',
          title: 'Lobby Klinik Utama',
          source_type: 'cloudinary',
          cloudinary_id: null,
          section_name: 'Homepage',
          slot_key: 'hero_media',
          slot_name: 'Hero Media',
          is_slot_active: true,
          display_order: 1,
          original_url: DEFAULT_HERO_VIDEO_URL,
          optimized_url: DEFAULT_HERO_VIDEO_URL,
          thumb_url: DEFAULT_HERO_VIDEO_URL,
          url: DEFAULT_HERO_VIDEO_URL,
          type: 'video',
          category: 'video',
          alt_text: 'Lobby klinik Deoksi',
          tags: ['lobby', 'branding'],
          platform: 'website',
          campaign: 'Evergreen Clinic Profile',
          status: 'active',
          notes: 'Video hero contoh Cloudinary untuk library lokal.',
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
          source_type: 'google_drive',
          cloudinary_id: null,
          section_name: 'Promo Section',
          slot_key: 'promo_featured',
          slot_name: 'Promo Featured',
          is_slot_active: true,
          display_order: 1,
          original_url: DEFAULT_PROMO_DRIVE_URL,
          optimized_url: DEFAULT_PROMO_DRIVE_URL,
          thumb_url: DEFAULT_PROMO_DRIVE_URL,
          url: DEFAULT_PROMO_DRIVE_URL,
          type: 'image',
          category: 'promo',
          alt_text: 'Poster promo April',
          tags: ['promo', 'facial', 'april'],
          platform: 'instagram',
          campaign: 'Promo April 2026',
          status: 'active',
          notes: 'Foto promo contoh Google Drive untuk library lokal.',
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
          source_type: 'google_drive',
          cloudinary_id: null,
          section_name: 'Featured Media',
          slot_key: 'featured_media',
          slot_name: 'Featured Media',
          is_slot_active: false,
          display_order: 1,
          original_url: DEFAULT_FEATURED_DRIVE_URL,
          optimized_url: DEFAULT_FEATURED_DRIVE_URL,
          thumb_url: DEFAULT_FEATURED_DRIVE_URL,
          url: DEFAULT_FEATURED_DRIVE_URL,
          type: 'image',
          category: 'doctor',
          alt_text: 'Dokter utama Deoksi',
          tags: ['dokter', 'team'],
          platform: 'website',
          campaign: 'Doctor Profile',
          status: 'draft',
          notes: 'Foto featured contoh Google Drive untuk library lokal.',
          last_used_at: null,
          usage_count: 0,
          size_bytes: 360000,
          uploaded_at: '2026-04-19T07:00:00.000Z',
          updated_at: '2026-04-19T07:00:00.000Z',
        },
      ],
    };
  }

  globalThis.__DEOKSI_LOCAL_DB__.media = ensureLegacyMediaCompliance(globalThis.__DEOKSI_LOCAL_DB__.media);
  globalThis.__DEOKSI_LOCAL_DB__.pageContent = ensureDefaultPageContentShape(globalThis.__DEOKSI_LOCAL_DB__.pageContent);
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

function summarizeCustomers(rows = []) {
  const summary = {
    total: rows.length,
    new: 0,
    contacted: 0,
    scheduled: 0,
    done: 0,
  };

  rows.forEach((row) => {
    if (summary[row.status] !== undefined) {
      summary[row.status] += 1;
    }
  });

  return summary;
}

export function isLocalMode() {
  return !process.env.DATABASE_URL;
}

export function getLocalAdmin() {
  const state = ensureState();
  return clone(state.adminUser);
}

export function updateLocalAdminProfile(payload = {}) {
  const state = ensureState();
  if (payload.full_name !== undefined) {
    state.adminUser.full_name = String(payload.full_name || '').trim() || state.adminUser.full_name;
  }
  if (payload.username !== undefined) {
    state.adminUser.username = String(payload.username || '').trim() || state.adminUser.username;
  }
  return clone(state.adminUser);
}

export function updateLocalAdminPassword(nextPassword) {
  const state = ensureState();
  state.adminUser.password = String(nextPassword || '');
  return clone(state.adminUser);
}

function getCustomerPeriodStart(period) {
  const now = new Date();

  if (period === 'week') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return start;
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return null;
}

function applyCustomerFilters(rows, { status, search, period, customerType, identityStatus } = {}) {
  let nextRows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const periodStart = getCustomerPeriodStart(period);
  if (periodStart) {
    nextRows = nextRows.filter((row) => new Date(row.created_at) >= periodStart);
  }

  if (status) {
    nextRows = nextRows.filter((row) => row.status === status);
  }

  if (customerType) {
    nextRows = nextRows.filter((row) => row.customer_type === customerType);
  }

  if (identityStatus) {
    nextRows = nextRows.filter((row) => {
      const statusLabel = row.customer_type === 'existing'
        ? (row.identity_verified ? 'verified' : 'pending')
        : 'not_required';
      return statusLabel === identityStatus;
    });
  }

  if (search) {
    const query = search.toLowerCase();
    nextRows = nextRows.filter((row) =>
      row.full_name.toLowerCase().includes(query) ||
      row.phone.toLowerCase().includes(query)
    );
  }

  return nextRows;
}

export function listCustomers({ status, search, period, customerType, identityStatus, page = 1, limit = 20 } = {}) {
  const state = ensureState();
  const rows = applyCustomerFilters(state.customers, { status, search, period, customerType, identityStatus });
  return {
    ...paginate(rows, page, limit),
    summary: summarizeCustomers(rows),
  };
}

export function resetLocalCustomers() {
  const state = ensureState();
  state.customers = getDefaultCustomers();
  state.counters.customers = state.customers.length;
  return clone(state.customers);
}

export function findCustomerByNik(nik, excludeId = null) {
  const state = ensureState();
  const normalizedNik = String(nik || '').trim();
  if (!normalizedNik) return null;

  return clone(state.customers.find((item) =>
    String(item.nik || '').trim() === normalizedNik &&
    String(item.id) !== String(excludeId)
  ) || null);
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
    customer_type: payload.customer_type || 'new',
    nik: payload.nik || null,
    address: payload.address || null,
    identity_verified: Boolean(payload.identity_verified),
    identity_verified_at: payload.identity_verified ? (payload.identity_verified_at || timestamp) : null,
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

export function updateCustomerProfile(id, payload = {}) {
  const state = ensureState();
  const customer = state.customers.find((item) => String(item.id) === String(id));
  if (!customer) return null;

  if (payload.customer_type !== undefined) {
    customer.customer_type = payload.customer_type;
  }
  if (payload.nik !== undefined) {
    customer.nik = payload.nik;
  }
  if (payload.address !== undefined) {
    customer.address = payload.address;
  }
  if (payload.identity_verified !== undefined) {
    customer.identity_verified = Boolean(payload.identity_verified);
  }
  if (payload.identity_verified_at !== undefined) {
    customer.identity_verified_at = payload.identity_verified_at;
  }

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch;
  }

  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function listMedia({ category, type, status, platform, slot_key, section_name, media_kind, page_key, section_key, position_key, search, page = 1, limit = 20 } = {}) {
  const state = ensureState();
  let rows = [...state.media]
    .map((item) => normalizeMediaPlacement(item))
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

  if (category) rows = rows.filter((item) => item.category === category);
  if (type) rows = rows.filter((item) => item.type === type);
  if (status) rows = rows.filter((item) => item.status === status);
  if (platform) rows = rows.filter((item) => item.platform === platform);
  if (media_kind) rows = rows.filter((item) => item.media_kind === media_kind);
  if (page_key) rows = rows.filter((item) => item.page_key === page_key);
  if (section_key) rows = rows.filter((item) => item.section_key === section_key);
  if (position_key) rows = rows.filter((item) => item.position_key === position_key);
  if (slot_key) rows = rows.filter((item) => item.slot_key === slot_key);
  if (section_name) rows = rows.filter((item) => item.section_name === section_name);
  if (search) {
    const query = String(search).toLowerCase();
    rows = rows.filter((item) =>
      [item.filename, item.title, item.category, item.campaign, item.platform, item.alt_text, item.notes, item.page_label, item.section_label, item.position_label, item.usage_label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)) ||
      [item.slot_key, item.slot_name, item.section_name, item.page_key, item.section_key, item.position_key].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)) ||
      (item.tags || []).some((tag) => String(tag).toLowerCase().includes(query))
    );
  }

  return paginate(rows, page, limit);
}

export function getMediaSummary() {
  const state = ensureState();
  const rows = state.media.map((item) => normalizeMediaPlacement(item));

  return {
    total: rows.length,
    active: rows.filter((item) => item.status === 'active').length,
    draft: rows.filter((item) => item.status === 'draft').length,
    archived: rows.filter((item) => item.status === 'archived').length,
    documents: rows.filter((item) => item.type === 'document').length,
    videos: rows.filter((item) => item.media_kind === 'video_cloudinary').length,
    photos: rows.filter((item) => item.media_kind === 'website_photo').length,
  };
}

export function getActiveMediaBySlotKeys(slotKeys = []) {
  const state = ensureState();
  const allowed = new Set((slotKeys || []).filter(Boolean));
  return clone(
    state.media
      .map((item) => normalizeMediaPlacement(item))
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
  const homepage = getPageContent('homepage');
  return clone({
    ...getDefaultHomepageContent(),
    ...(homepage.hero || {}),
    ...(homepage.hero_benefits || {}),
    promos: Array.isArray(homepage.promos) ? homepage.promos : [],
  });
}

export function updateHomepageContent(payload = {}) {
  const currentHomepage = getPageContent('homepage');
  const nextHomepage = clone(currentHomepage);
  const defaults = getDefaultHomepageContent();

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (payload[key] === undefined) return;

    const value = String(payload[key] ?? '').trim() || defaultValue;
    if (['hero_badge', 'headline', 'highlight_text', 'description', 'cta_text', 'cta_link', 'hero_media'].includes(key)) {
      nextHomepage.hero = {
        ...(nextHomepage.hero || {}),
        [key]: value,
      };
      return;
    }

    nextHomepage.hero_benefits = {
      ...(nextHomepage.hero_benefits || {}),
      [key]: value,
    };
  });

  if (payload.promos !== undefined) {
    nextHomepage.promos = Array.isArray(payload.promos) ? payload.promos : [];
  }

  updatePageContent('homepage', nextHomepage);
  return getHomepageContent();
}

export function getPageContent(pageKey) {
  const state = ensureState();
  if (!state.pageContent) state.pageContent = getDefaultPageContent();
  const defaults = getDefaultPageContent()[pageKey] || {};
  return normalizePageContentRecord(pageKey, {
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

  const nextContent = deepMerge(state.pageContent[pageKey], payload);
  state.pageContent[pageKey] = normalizePageContentRecord(pageKey, nextContent);
  return clone(state.pageContent[pageKey]);
}

export { normalizePageContentRecord };

export function createMedia(payload) {
  const state = ensureState();
  const timestamp = nowIso();
  const normalizedPayload = normalizeMediaPayload(payload);
  const media = {
    id: ++state.counters.media,
    filename: normalizedPayload.filename,
    title: normalizedPayload.title || normalizedPayload.filename,
    media_kind: normalizedPayload.media_kind || null,
    source_type: normalizedPayload.source_type || 'external',
    cloudinary_id: normalizedPayload.cloudinary_id || null,
    page_key: normalizedPayload.page_key || null,
    section_key: normalizedPayload.section_key || null,
    position_key: normalizedPayload.position_key || null,
    replace_policy: normalizedPayload.replace_policy || 'multiple',
    section_name: normalizedPayload.section_name || null,
    slot_key: normalizedPayload.slot_key || null,
    slot_name: normalizedPayload.slot_name || null,
    is_slot_active: Boolean(normalizedPayload.is_slot_active),
    display_order: normalizedPayload.display_order || 0,
    original_url: normalizedPayload.original_url || normalizedPayload.url,
    optimized_url: normalizedPayload.optimized_url || normalizedPayload.url,
    thumb_url: normalizedPayload.thumb_url || normalizedPayload.url,
    url: normalizedPayload.url,
    type: normalizedPayload.type || 'image',
    category: normalizedPayload.category || 'gallery',
    alt_text: normalizedPayload.alt_text || null,
    tags: normalizeTags(normalizedPayload.tags),
    platform: normalizedPayload.platform || 'website',
    campaign: normalizedPayload.campaign || null,
    status: normalizeStoredStatus(normalizedPayload.status),
    notes: normalizedPayload.notes || null,
    last_used_at: normalizedPayload.last_used_at || null,
    usage_count: normalizedPayload.usage_count || 0,
    size_bytes: normalizedPayload.size_bytes || null,
    uploaded_at: timestamp,
    updated_at: timestamp,
  };

  if (media.is_slot_active && media.slot_key && media.replace_policy === 'single') {
    state.media.forEach((item) => {
      if (item.slot_key === media.slot_key) {
        item.is_slot_active = false;
        item.status = item.status === 'active' ? 'archived' : item.status;
      }
    });
  }

  state.media.push(media);
  return clone(normalizeMediaPlacement(media));
}

export function updateMedia(id, payload) {
  const state = ensureState();
  const media = state.media.find((item) => String(item.id) === String(id));
  if (!media) return null;
  const normalizedPayload = normalizeMediaPayload({ ...media, ...payload });

  if (normalizedPayload.is_slot_active === true && normalizedPayload.slot_key && normalizedPayload.replace_policy === 'single') {
    for (const item of state.media) {
      if (item.slot_key === normalizedPayload.slot_key && item.id !== media.id) {
        item.is_slot_active = false;
        item.status = item.status === 'active' ? 'archived' : item.status;
      }
    }
  }

  if (payload.filename !== undefined) media.filename = normalizedPayload.filename || media.filename;
  if (payload.title !== undefined) media.title = normalizedPayload.title || media.title;
  if (payload.media_kind !== undefined) media.media_kind = normalizedPayload.media_kind || media.media_kind;
  if (payload.source_type !== undefined) media.source_type = normalizedPayload.source_type || media.source_type;
  if (payload.page_key !== undefined) media.page_key = normalizedPayload.page_key || media.page_key || null;
  if (payload.section_key !== undefined) media.section_key = normalizedPayload.section_key || media.section_key || null;
  if (payload.position_key !== undefined) media.position_key = normalizedPayload.position_key || media.position_key || null;
  if (payload.replace_policy !== undefined) media.replace_policy = normalizedPayload.replace_policy || 'multiple';
  if (payload.section_name !== undefined) media.section_name = normalizedPayload.section_name || media.section_name || null;
  if (payload.slot_key !== undefined) media.slot_key = normalizedPayload.slot_key || media.slot_key || null;
  if (payload.slot_name !== undefined) media.slot_name = normalizedPayload.slot_name || media.slot_name || null;
  if (payload.is_slot_active !== undefined) media.is_slot_active = Boolean(normalizedPayload.is_slot_active);
  if (payload.display_order !== undefined) media.display_order = normalizedPayload.display_order || 0;
  if (payload.url !== undefined) media.url = normalizedPayload.url || media.url;
  if (payload.original_url !== undefined) media.original_url = normalizedPayload.original_url || media.original_url;
  if (payload.optimized_url !== undefined) media.optimized_url = normalizedPayload.optimized_url || media.optimized_url;
  if (payload.thumb_url !== undefined) media.thumb_url = normalizedPayload.thumb_url || media.thumb_url;
  if (payload.type !== undefined) media.type = normalizedPayload.type || media.type;
  if (payload.category !== undefined) media.category = normalizedPayload.category || media.category;
  if (payload.alt_text !== undefined) media.alt_text = normalizedPayload.alt_text || null;
  if (payload.tags !== undefined) media.tags = normalizeTags(normalizedPayload.tags);
  if (payload.platform !== undefined) media.platform = normalizedPayload.platform || 'website';
  if (payload.campaign !== undefined) media.campaign = normalizedPayload.campaign || null;
  if (payload.status !== undefined) media.status = normalizeStoredStatus(normalizedPayload.status);
  if (payload.notes !== undefined) media.notes = normalizedPayload.notes || null;
  if (payload.last_used_at !== undefined) media.last_used_at = normalizedPayload.last_used_at || null;
  if (payload.usage_count !== undefined) media.usage_count = normalizedPayload.usage_count || 0;
  if (payload.size_bytes !== undefined) media.size_bytes = normalizedPayload.size_bytes || null;
  media.updated_at = nowIso();

  return clone(normalizeMediaPlacement(media));
}

export function deleteMediaById(id) {
  const state = ensureState();
  const index = state.media.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;

  const [removed] = state.media.splice(index, 1);
  return clone(removed);
}
