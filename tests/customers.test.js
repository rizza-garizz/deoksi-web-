import { beforeEach, describe, expect, test } from 'vitest';

import customersHandler from '../api/customers.js';
import loginHandler from '../api/auth/login.js';

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

async function login() {
  const response = await loginHandler(buildRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'admin', password: 'deoksi2026' },
  }));

  const payload = await readJson(response);
  return payload.token;
}

describe('customers API', () => {
  beforeEach(() => {
    delete globalThis.__DEOKSI_LOCAL_DB__;
  });

  test('normalizes customer identity fields in admin list response', async () => {
    const token = await login();
    const response = await customersHandler(buildRequest('/api/customers?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.summary.total).toBeGreaterThan(0);
    expect(payload.data.every((item) => ['new', 'existing'].includes(item.customer_type))).toBe(true);
    expect(payload.data.some((item) => item.customer_type === 'existing' && item.identity_status === 'verified')).toBe(true);
  });

  test('rejects invalid NIK for existing customer submissions', async () => {
    const response = await customersHandler(buildRequest('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        full_name: 'Pasien Lama QA',
        phone: '081212121212',
        customer_type: 'existing',
        nik: '12345',
        address: 'Jl. Mawar No. 1, Malang',
        preferred_date: '2026-05-10',
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toContain('16 digit');
  });

  test('accepts valid existing customer identity payload in local mode', async () => {
    const response = await customersHandler(buildRequest('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        full_name: 'Pasien Lama QA',
        phone: '081212121212',
        customer_type: 'existing',
        nik: '3578011204830009',
        address: 'Jl. Mawar No. 1, Lowokwaru, Malang',
        identity_verified: true,
        preferred_date: '2026-05-10',
        concerns: ['Kontrol rutin'],
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(payload.data.customer_type).toBe('existing');
    expect(payload.data.identity_status).toBe('verified');
  });

  test('rejects invalid public consultation phone number', async () => {
    const response = await customersHandler(buildRequest('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        full_name: 'Pasien WA Salah',
        phone: '12345',
        age: 25,
        preferred_date: '2026-05-10',
        concerns: ['Jerawat'],
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Nomor WhatsApp');
  });

  test('rejects consultation dates in the past', async () => {
    const response = await customersHandler(buildRequest('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        full_name: 'Pasien Tanggal Lewat',
        phone: '081234567890',
        age: 29,
        preferred_date: '2020-01-01',
        concerns: ['Jerawat'],
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Tanggal konsultasi');
  });

  test('rejects unrealistic public consultation full names', async () => {
    const response = await customersHandler(buildRequest('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        full_name: '12',
        phone: '081234567890',
        age: 29,
        preferred_date: '2026-05-10',
        concerns: ['Jerawat'],
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Nama lengkap');
  });

  test('updates customer identity through admin patch in local mode', async () => {
    const token = await login();
    const response = await customersHandler(buildRequest('/api/customers?id=1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        customer_type: 'existing',
        nik: '3578011204830011',
        address: 'Jl. Ijen No. 10, Klojen, Malang',
        identity_verified: true,
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.customer_type).toBe('existing');
    expect(payload.data.identity_status).toBe('verified');
    expect(payload.data.nik).toBe('3578011204830011');
  });

  test('allows saving new customer identity state without NIK and address', async () => {
    const token = await login();
    const response = await customersHandler(buildRequest('/api/customers?id=1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        customer_type: 'new',
        nik: '',
        address: '',
        identity_verified: false,
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.customer_type).toBe('new');
    expect(payload.data.identity_status).toBe('not_required');
    expect(payload.data.nik).toBeNull();
    expect(payload.data.address).toBeNull();
  });

  test('rejects duplicate NIK on customer identity update in local mode', async () => {
    const token = await login();
    const response = await customersHandler(buildRequest('/api/customers?id=1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        customer_type: 'existing',
        nik: '3578011204830002',
        address: 'Jl. Duplikat No. 10, Malang',
        identity_verified: true,
      },
    }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toContain('NIK sudah dipakai');
  });
});
