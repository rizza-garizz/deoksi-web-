const BASE_URL = process.env.DOCKER_APP_URL || 'http://localhost:3001';
const ADMIN_USERNAME = process.env.DOCKER_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.DOCKER_ADMIN_PASSWORD || 'deoksi2026';

function printLine(label, value) {
  console.log(`${label.padEnd(28)} ${value}`);
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
  console.log(' Deoksi Docker Seed Report');
  console.log('====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const token = await login();

  const homepage = await getAuthorized('/api/page-content?page=homepage&admin=1', token);
  const tentang = await getAuthorized('/api/page-content?page=tentang&admin=1', token);
  const lokasi = await getAuthorized('/api/page-content?page=lokasi&admin=1', token);
  const articles = await getAuthorized('/api/articles?admin=true&limit=50', token);
  const media = await getAuthorized('/api/media?limit=100', token);
  const customers = await getAuthorized('/api/customers?limit=50', token);

  const articleRows = Array.isArray(articles?.data) ? articles.data : [];
  const mediaRows = Array.isArray(media?.data) ? media.data : [];
  const customerRows = Array.isArray(customers?.data) ? customers.data : [];

  const activeMedia = mediaRows.filter((item) => item.status === 'active').length;
  const draftMedia = mediaRows.filter((item) => item.status === 'draft').length;
  const photoMedia = mediaRows.filter((item) => item.media_kind === 'website_photo').length;
  const videoMedia = mediaRows.filter((item) => item.media_kind === 'video_cloudinary').length;

  const newCustomers = customerRows.filter((item) => item.customer_type === 'new').length;
  const existingCustomers = customerRows.filter((item) => item.customer_type === 'existing').length;
  const verifiedCustomers = customerRows.filter((item) => item.identity_status === 'verified').length;

  printLine('Homepage promos', Array.isArray(homepage?.data?.promos) ? homepage.data.promos.length : 0);
  printLine('Tentang doctors', Array.isArray(tentang?.data?.doctors) ? tentang.data.doctors.length : 0);
  printLine('Lokasi premium address', String(lokasi?.data?.address || '').includes('50 meter') ? 'yes' : 'no');
  printLine('Lokasi maps embed', String(lokasi?.data?.maps_embed_url || '').includes('112.6259121') ? 'yes' : 'no');
  printLine('Articles total', articleRows.length);
  printLine('Articles published', articleRows.filter((item) => item.is_published).length);
  printLine('Media total', mediaRows.length);
  printLine('Media active', activeMedia);
  printLine('Media draft', draftMedia);
  printLine('Media photo', photoMedia);
  printLine('Media video', videoMedia);
  printLine('Customers total', customerRows.length);
  printLine('Customers new', newCustomers);
  printLine('Customers existing', existingCustomers);
  printLine('Customers verified', verifiedCustomers);

  console.log('');
  console.log('Report selesai.');
}

main().catch((error) => {
  console.error('');
  console.error('FAILED seed report');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
