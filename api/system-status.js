import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { errorResponse, handleCors, jsonResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

async function getDatabaseStatus() {
  if (!hasDatabase()) {
    return {
      mode: 'local',
      connected: true,
      label: 'Local In-Memory',
    };
  }

  try {
    const sql = getDB();
    await sql`SELECT 1`;
    return {
      mode: 'database',
      connected: true,
      label: 'Neon PostgreSQL',
    };
  } catch {
    return {
      mode: 'database',
      connected: false,
      label: 'Neon PostgreSQL',
    };
  }
}

function getMediaStatus() {
  const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET);
  return {
    photo_mode: 'google_drive',
    video_mode: 'cloudinary_url',
    cloudinary_enabled: hasCloudinary,
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  };
}

function buildWarnings({ database, env, media }) {
  const warnings = [];

  if (!database.connected) {
    warnings.push('Database belum terhubung. Sistem masih berisiko gagal menyimpan data production.');
  }
  if (!env.has_jwt_secret) {
    warnings.push('JWT_SECRET belum tersedia. Keamanan autentikasi belum siap untuk production.');
  }
  if (!env.has_password_salt) {
    warnings.push('PASSWORD_SALT belum tersedia. Keamanan password belum lengkap.');
  }
  if (!media.cloudinary_enabled) {
    warnings.push('Cloudinary upload belum aktif. Upload dashboard untuk media cloud belum siap.');
  }

  return warnings;
}

function createEndpointCheck({
  label,
  path,
  visibility,
  description,
  ok,
  status = ok ? 200 : 500,
  latencyMs = 0,
}) {
  return {
    label,
    path,
    visibility,
    description,
    ok: Boolean(ok),
    status,
    latency_ms: latencyMs,
    state: ok ? 'healthy' : 'error',
  };
}

function getEndpointChecks({ databaseConnected, tokenActive }) {
  const publicReady = Boolean(databaseConnected);
  const adminReady = Boolean(databaseConnected && tokenActive);

  return [
    createEndpointCheck({
      label: 'Page Content',
      path: '/api/page-content?page=homepage',
      visibility: 'public',
      description: 'Sumber utama konten halaman untuk frontend website.',
      ok: publicReady,
      status: publicReady ? 200 : 503,
    }),
    createEndpointCheck({
      label: 'Homepage Content',
      path: '/api/homepage-content',
      visibility: 'public',
      description: 'Konten legacy beranda yang masih dipakai beberapa flow frontend.',
      ok: publicReady,
      status: publicReady ? 200 : 503,
    }),
    createEndpointCheck({
      label: 'Site Content',
      path: '/api/site-content',
      visibility: 'public',
      description: 'Sinkronisasi foto website aktif dari dashboard media ke frontend.',
      ok: publicReady,
      status: publicReady ? 200 : 503,
    }),
    createEndpointCheck({
      label: 'Gallery Content',
      path: '/api/gallery-content',
      visibility: 'public',
      description: 'Feed media aktif untuk halaman galeri publik.',
      ok: publicReady,
      status: publicReady ? 200 : 503,
    }),
    createEndpointCheck({
      label: 'Admin Media',
      path: '/api/media?summary=true',
      visibility: 'admin',
      description: 'Ringkasan CRUD media admin dan status aset dashboard.',
      ok: adminReady,
      status: adminReady ? 200 : 401,
    }),
    createEndpointCheck({
      label: 'Admin Profile',
      path: '/api/admin/profile',
      visibility: 'admin',
      description: 'Data akun admin aktif untuk Settings dan autentikasi dashboard.',
      ok: adminReady,
      status: adminReady ? 200 : 401,
    }),
  ];
}

function buildQaChecks({ endpointChecks, media, auth, database }) {
  const findCheck = (label) => endpointChecks.find((item) => item.label === label);
  const adminMedia = findCheck('Admin Media');
  const pageContent = findCheck('Page Content');
  const homepageContent = findCheck('Homepage Content');
  const siteContent = findCheck('Site Content');
  const galleryContent = findCheck('Gallery Content');

  return [
    {
      key: 'text_sync',
      label: 'Sinkronisasi Teks',
      ready: Boolean(pageContent?.ok && homepageContent?.ok),
      summary: 'Admin ubah konten teks di dashboard lalu frontend membaca pembaruan dari endpoint konten.',
      requirement: 'Page Content dan Homepage Content harus sehat.',
      actions: [
        { label: 'Buka Kelola Website', href: '/admin/content.html' },
        { label: 'Buka SEO', href: '/admin/content.html?tab=seo#card-seo_homepage' },
        { label: 'Preview Beranda', href: '/index.html' },
      ],
    },
    {
      key: 'photo_sync',
      label: 'Sinkronisasi Foto',
      ready: Boolean(siteContent?.ok && adminMedia?.ok && media.photo_mode === 'google_drive'),
      summary: 'Foto website aktif dari dashboard media harus muncul di section frontend yang benar.',
      requirement: 'Site Content sehat, Admin Media sehat, dan mode foto tetap Google Drive.',
      actions: [
        { label: 'Buka Media', href: '/admin/media.html' },
        { label: 'Preview Beranda', href: '/index.html' },
        { label: 'Preview Galeri', href: '/galeri.html' },
      ],
    },
    {
      key: 'video_sync',
      label: 'Sinkronisasi Video',
      ready: Boolean(galleryContent?.ok && adminMedia?.ok),
      summary: 'Video website dari media admin harus terbaca di galeri atau slot publik yang sesuai.',
      requirement: 'Gallery Content sehat dan Admin Media sehat.',
      note: media.cloudinary_enabled
        ? 'Cloudinary env lengkap untuk flow upload cloud dashboard.'
        : 'Video URL tetap bisa dipakai, tapi upload dashboard berbasis Cloudinary belum lengkap.',
      actions: [
        { label: 'Buka Media', href: '/admin/media.html' },
        { label: 'Preview Galeri', href: '/galeri.html' },
        { label: 'Preview Beranda', href: '/index.html' },
      ],
    },
    {
      key: 'session_persistence',
      label: 'Persistensi Admin',
      ready: Boolean(auth.token_active && database.connected),
      summary: 'Perubahan admin seharusnya tetap terbaca setelah refresh halaman sesuai mode penyimpanan aktif.',
      requirement: 'Sesi admin aktif dan storage utama terhubung.',
      actions: [
        { label: 'Refresh Status', href: '/admin/settings.html' },
        { label: 'Buka Dashboard', href: '/admin/dashboard.html' },
        { label: 'Preview Website', href: '/index.html' },
      ],
    },
  ];
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const database = await getDatabaseStatus();
    const env = {
      has_database_url: Boolean(process.env.DATABASE_URL),
      has_jwt_secret: Boolean(process.env.JWT_SECRET),
      has_password_salt: Boolean(process.env.PASSWORD_SALT),
    };
    const media = getMediaStatus();
    const warnings = buildWarnings({ database, env, media });
    const authStatus = {
      token_active: true,
      session_mode: 'jwt',
    };
    const endpoint_checks = getEndpointChecks({
      databaseConnected: database.connected,
      tokenActive: authStatus.token_active,
    });
    const qa_checks = buildQaChecks({
      endpointChecks: endpoint_checks,
      media,
      auth: authStatus,
      database,
    });

    return jsonResponse({
      data: {
        database,
        auth: authStatus,
        media,
        env,
        deploy_readiness: {
          ready: warnings.length === 0,
          warnings,
        },
        endpoint_checks,
        qa_checks,
      },
    });
  } catch (error) {
    console.error('System status API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
