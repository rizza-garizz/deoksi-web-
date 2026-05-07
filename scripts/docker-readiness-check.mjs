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

  logStep('OK', 'Admin auth', 'token issued');
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
  console.log(' Deoksi Docker Readiness Check');
  console.log('====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const statusResult = await requestJson('/api/system-status');
  assert(statusResult.response.ok, `/api/system-status returned ${statusResult.response.status}`);
  logStep('OK', 'System status', String(statusResult.response.status));

  const token = await login();

  const homepage = await getAuthorized('/api/page-content?page=homepage&admin=1', token);
  assert(homepage?.data?.hero, 'Homepage content belum siap');
  logStep('OK', 'Homepage content', 'hero payload available');

  const siteContent = await getAuthorized('/api/site-content', token);
  assert(siteContent?.sections || siteContent?.slots || siteContent?.data, 'Site content belum siap');
  logStep('OK', 'Site content', 'sections/slots available');

  const media = await getAuthorized('/api/media?summary=true', token);
  assert(typeof media?.total === 'number' || typeof media?.active === 'number', 'Media summary belum siap');
  logStep('OK', 'Media summary', `active=${media.active ?? '-'}`);

  const customers = await getAuthorized('/api/customers?limit=1', token);
  assert(Array.isArray(customers?.data), 'Customers endpoint belum siap');
  logStep('OK', 'Customers endpoint', `${customers.data.length} row(s) fetched`);

  const publicHomepage = await fetch(`${BASE_URL}/`);
  assert(publicHomepage.ok, `Homepage public returned ${publicHomepage.status}`);
  logStep('OK', 'Public homepage', String(publicHomepage.status));

  console.log('');
  console.log('Readiness check selesai: stack siap untuk dipakai admin dan website dasar.');
}

main().catch((error) => {
  console.error('');
  console.error('FAILED readiness check');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
