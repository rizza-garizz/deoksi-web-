import { beforeEach, describe, expect, test } from 'vitest';

import loginHandler from '../api/auth/login.js';
import adminProfileHandler from '../api/admin/profile.js';
import changePasswordHandler from '../api/admin/change-password.js';
import customersResetHandler from '../api/admin/customers-reset.js';
import bridgeDiagnosticsHandler from '../api/bridge-diagnostics.js';
import systemStatusHandler from '../api/system-status.js';

function buildRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`http://local.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function login(password = 'deoksi2026') {
  const response = await loginHandler(buildRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'admin', password },
  }));
  return readJson(response);
}

describe('settings APIs', () => {
  beforeEach(() => {
    delete globalThis.__DEOKSI_LOCAL_DB__;
    delete globalThis.__DEOKSI_BRIDGE_LOGS__;
  });

  test('loads and updates admin profile in local mode', async () => {
    const auth = await login();
    const token = auth.token;

    const getResponse = await adminProfileHandler(buildRequest('/api/admin/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const getPayload = await readJson(getResponse);

    expect(getResponse.status).toBe(200);
    expect(getPayload.data.full_name).toBe('Admin Deoksi');

    const putResponse = await adminProfileHandler(buildRequest('/api/admin/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: { full_name: 'Admin QA Settings' },
    }));
    const putPayload = await readJson(putResponse);

    expect(putResponse.status).toBe(200);
    expect(putPayload.data.full_name).toBe('Admin QA Settings');
  });

  test('changes password in local mode and allows re-login', async () => {
    const auth = await login();
    const token = auth.token;

    const changeResponse = await changePasswordHandler(buildRequest('/api/admin/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        current_password: 'deoksi2026',
        new_password: 'deoksi2026-new',
        confirm_password: 'deoksi2026-new',
      },
    }));
    const changePayload = await readJson(changeResponse);

    expect(changeResponse.status).toBe(200);
    expect(changePayload.success).toBe(true);

    const relogin = await login('deoksi2026-new');
    expect(relogin.success).toBe(true);
  });

  test('returns system status for authenticated admin', async () => {
    const auth = await login();
    const token = auth.token;

    const response = await systemStatusHandler(buildRequest('/api/system-status', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.database.mode).toBe('local');
    expect(payload.data.media.photo_mode).toBe('google_drive');
    expect(Array.isArray(payload.data.endpoint_checks)).toBe(true);
    expect(payload.data.endpoint_checks.length).toBeGreaterThanOrEqual(4);
    expect(payload.data.endpoint_checks.some((item) => item.label === 'Site Content' && item.ok)).toBe(true);
    expect(payload.data.endpoint_checks.some((item) => item.label === 'Admin Media' && item.visibility === 'admin')).toBe(true);
    expect(Array.isArray(payload.data.qa_checks)).toBe(true);
    expect(payload.data.qa_checks.some((item) => item.key === 'text_sync')).toBe(true);
    expect(payload.data.qa_checks.some((item) => item.key === 'photo_sync')).toBe(true);
    expect(payload.data.qa_checks.some((item) => item.key === 'photo_sync' && Array.isArray(item.actions) && item.actions.length > 0)).toBe(true);
    expect(payload.data.qa_checks.some((item) => Array.isArray(item.actions) && item.actions.some((action) => action.href === '/index.html'))).toBe(true);
  });

  test('returns bridge diagnostics for authenticated admin', async () => {
    globalThis.__DEOKSI_BRIDGE_LOGS__ = [
      {
        request_id: 1,
        method: 'GET',
        path: '/api/page-content?page=homepage',
        phase: 'completed',
        status: 200,
        duration_ms: 8,
        timestamp: '2026-05-01T00:00:00.000Z',
      },
    ];

    const auth = await login();
    const token = auth.token;

    const response = await bridgeDiagnosticsHandler(buildRequest('/api/bridge-diagnostics', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.total).toBe(1);
    expect(payload.data.items[0].path).toBe('/api/page-content?page=homepage');
  });

  test('clears bridge diagnostics for authenticated admin', async () => {
    globalThis.__DEOKSI_BRIDGE_LOGS__ = [
      {
        request_id: 2,
        method: 'GET',
        path: '/api/site-content',
        phase: 'completed',
        status: 200,
        duration_ms: 5,
        timestamp: '2026-05-01T00:00:01.000Z',
      },
    ];

    const auth = await login();
    const token = auth.token;

    const response = await bridgeDiagnosticsHandler(buildRequest('/api/bridge-diagnostics', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.total).toBe(0);
    expect(globalThis.__DEOKSI_BRIDGE_LOGS__).toHaveLength(0);
  });

  test('restores local customer sample data for authenticated admin', async () => {
    const auth = await login();
    const token = auth.token;

    globalThis.__DEOKSI_LOCAL_DB__.customers = [];
    globalThis.__DEOKSI_LOCAL_DB__.counters.customers = 0;

    const response = await customersResetHandler(buildRequest('/api/admin/customers-reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.total).toBeGreaterThan(0);
    expect(globalThis.__DEOKSI_LOCAL_DB__.customers.length).toBeGreaterThan(0);
  });
});
