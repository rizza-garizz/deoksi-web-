const BASE_URL = process.env.DOCKER_APP_URL || 'http://localhost:3001';
const ADMIN_USERNAME = process.env.DOCKER_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.DOCKER_ADMIN_PASSWORD || 'deoksi2026';

const publicPaths = [
  '/',
  '/layanan.html',
  '/produk.html',
  '/berita.html',
  '/galeri.html',
  '/tentang.html',
  '/lokasi.html',
  '/konsultasi.html',
];

const adminPaths = [
  '/admin/content.html',
  '/admin/media.html',
  '/admin/customers.html',
  '/admin/settings.html',
];

function logStep(status, label, detail = '') {
  const suffix = detail ? ` -> ${detail}` : '';
  console.log(`${status} ${label}${suffix}`);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data, text };
}

async function ensureOk(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  logStep('OK', path, String(response.status));
}

async function login() {
  const { response, data } = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok || !data?.token) {
    throw new Error(`/api/auth/login failed (${response.status})`);
  }

  logStep('OK', '/api/auth/login', 'token issued');
  return data.token;
}

async function ensureAuthorizedJson(path, token) {
  const { response, data } = await requestJson(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  const descriptor = Array.isArray(data?.data)
    ? `${data.data.length} row(s)`
    : data?.data
      ? 'object'
      : 'ok';

  logStep('OK', path, descriptor);
}

async function main() {
  console.log('====================================');
  console.log(' Deoksi Docker Smoke Check');
  console.log('====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  for (const path of publicPaths) {
    await ensureOk(path);
  }

  for (const path of adminPaths) {
    await ensureOk(path);
  }

  const { response: statusRes } = await requestJson('/api/system-status');
  if (!statusRes.ok) {
    throw new Error(`/api/system-status returned ${statusRes.status}`);
  }
  logStep('OK', '/api/system-status', String(statusRes.status));

  const token = await login();

  await ensureAuthorizedJson('/api/page-content?page=homepage&admin=1', token);
  await ensureAuthorizedJson('/api/media?summary=true', token);
  await ensureAuthorizedJson('/api/customers?limit=2', token);
  await ensureAuthorizedJson('/api/site-content', token);

  console.log('');
  console.log('Smoke check selesai: stack dasar siap dipakai.');
}

main().catch((error) => {
  console.error('');
  console.error('FAILED docker smoke check');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
