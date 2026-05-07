const BASE_URL = process.env.DOCKER_APP_URL || 'http://localhost:3001';
const ADMIN_USERNAME = process.env.DOCKER_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.DOCKER_ADMIN_PASSWORD || 'deoksi2026';

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

  logStep('OK', 'Admin login', 'token issued');
  return data.token;
}

async function getAuthorized(path, token) {
  const { response, data } = await requestJson(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return data;
}

async function main() {
  console.log('====================================');
  console.log(' Deoksi Docker Seed Verification');
  console.log('====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const token = await login();

  const homepage = await getAuthorized('/api/page-content?page=homepage&admin=1', token);
  assert(homepage?.data?.hero?.headline, 'Homepage hero headline kosong');
  assert(Array.isArray(homepage?.data?.promos) && homepage.data.promos.length >= 2, 'Homepage promos kurang dari 2 item');
  logStep('OK', 'Homepage seed', `${homepage.data.promos.length} promo item`);

  const tentang = await getAuthorized('/api/page-content?page=tentang&admin=1', token);
  assert(Array.isArray(tentang?.data?.doctors) && tentang.data.doctors.length >= 4, 'Tentang doctors kurang dari 4 item');
  logStep('OK', 'Tentang seed', `${tentang.data.doctors.length} doctor item`);

  const lokasi = await getAuthorized('/api/page-content?page=lokasi&admin=1', token);
  assert(String(lokasi?.data?.address || '').includes('50 meter'), 'Alamat lokasi premium belum tertanam');
  assert(String(lokasi?.data?.maps_embed_url || '').includes('112.6259121'), 'Maps embed koordinat belum tertanam');
  logStep('OK', 'Lokasi seed', 'alamat + maps valid');

  const articles = await getAuthorized('/api/articles?admin=true&limit=20', token);
  assert(Array.isArray(articles?.data) && articles.data.length >= 3, 'Articles kurang dari 3 item');
  logStep('OK', 'Articles seed', `${articles.data.length} article item`);

  const media = await getAuthorized('/api/media?limit=20', token);
  assert(Array.isArray(media?.data) && media.data.length >= 3, 'Media assets kurang dari 3 item');
  const activeHeroVideo = media.data.find((item) => item.slot_key === 'hero_media' && item.type === 'video' && item.source_type === 'cloudinary');
  assert(activeHeroVideo, 'Hero media video Cloudinary tidak ditemukan');
  logStep('OK', 'Media seed', `${media.data.length} media item`);

  const customers = await getAuthorized('/api/customers?limit=20', token);
  assert(Array.isArray(customers?.data) && customers.data.length >= 4, 'Customers kurang dari 4 item');
  const hasExisting = customers.data.some((item) => item.customer_type === 'existing');
  const hasNew = customers.data.some((item) => item.customer_type === 'new');
  assert(hasExisting && hasNew, 'Seed customers belum mencakup pelanggan baru dan lama');
  logStep('OK', 'Customers seed', `${customers.data.length} customer item`);

  console.log('');
  console.log('Seed verification selesai: baseline database resmi terdeteksi.');
}

main().catch((error) => {
  console.error('');
  console.error('FAILED seed verification');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
