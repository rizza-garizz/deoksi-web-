import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { createCustomer, deleteCustomerById, findCustomerByNik, listCustomers, updateCustomerProfile, updateCustomerStatus } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

function normalizeNik(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function normalizeAddress(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return digits;
  return digits;
}

function isValidIndonesiaPhone(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return false;

  const digits = normalized.replace(/\D/g, '');
  if (normalized.startsWith('+62')) {
    return digits.length >= 11 && digits.length <= 14;
  }

  if (normalized.startsWith('0')) {
    return digits.length >= 10 && digits.length <= 13;
  }

  return false;
}

function isValidPreferredDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed >= today;
}

function normalizeFullName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isValidFullName(value) {
  const normalized = normalizeFullName(value);
  if (normalized.length < 3) return false;
  if (/^\d+$/.test(normalized.replace(/\s+/g, ''))) return false;

  const lettersOnly = normalized.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettersOnly.length < 2) return false;

  return /^[A-Za-zÀ-ÿ0-9'`. -]+$/.test(normalized);
}

function deriveCustomerType(record = {}) {
  if (record.customer_type === 'existing') return 'existing';
  if (record.customer_type === 'new') return 'new';
  return record.nik || record.address ? 'existing' : 'new';
}

function normalizeCustomerRecord(record = {}) {
  const customerType = deriveCustomerType(record);
  const nik = normalizeNik(record.nik);
  const address = normalizeAddress(record.address);
  const identityVerified = customerType === 'existing'
    ? Boolean(record.identity_verified && nik && address)
    : false;

  return {
    ...record,
    customer_type: customerType,
    nik,
    address,
    identity_verified: identityVerified,
    identity_verified_at: identityVerified ? (record.identity_verified_at || record.updated_at || record.created_at || null) : null,
    identity_status: customerType === 'existing'
      ? (identityVerified ? 'verified' : 'pending')
      : 'not_required',
  };
}

function validateCustomerPayload(body = {}) {
  const customerType = body.customer_type === 'existing' ? 'existing' : 'new';
  const nik = normalizeNik(body.nik);
  const address = normalizeAddress(body.address);
  const identityVerified = Boolean(body.identity_verified);

  if (customerType === 'existing') {
    if (!nik) {
      return { error: 'NIK wajib diisi untuk pelanggan lama.' };
    }
    if (nik.length !== 16) {
      return { error: 'NIK pelanggan lama harus terdiri dari 16 digit angka.' };
    }
    if (!address || address.length < 10) {
      return { error: 'Alamat pelanggan lama wajib diisi dengan lengkap.' };
    }
  }

  return {
    value: {
      customer_type: customerType,
      nik,
      address,
      identity_verified: customerType === 'existing' ? identityVerified : false,
      identity_verified_at: customerType === 'existing' && identityVerified ? new Date().toISOString() : null,
    },
  };
}

function ensureUniqueNikLocal(nik, excludeId = null) {
  if (!nik || hasDatabase()) return null;
  const existing = findCustomerByNik(nik, excludeId);
  if (existing) {
    return `NIK sudah dipakai oleh pelanggan lain: ${existing.full_name}.`;
  }
  return null;
}

function getPeriodStart(period) {
  const now = new Date();

  if (period === 'week') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return start.toISOString();
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return null;
}

async function fetchCustomersPage(sql, { status, search, periodStart, customerType, identityStatus, limit, offset }) {
  return fetchCustomersQuery(sql, {
    status,
    search,
    periodStart,
    customerType,
    identityStatus,
    limit,
    offset,
    mode: 'rows',
  });
}

async function fetchCustomersCount(sql, { status, search, periodStart, customerType, identityStatus }) {
  return fetchCustomersQuery(sql, {
    status,
    search,
    periodStart,
    customerType,
    identityStatus,
    mode: 'count',
  });
}

async function fetchCustomersSummary(sql, { search, periodStart, customerType, identityStatus }) {
  return fetchCustomersQuery(sql, {
    search,
    periodStart,
    customerType,
    identityStatus,
    mode: 'summary',
  });
}

function buildIdentitySql(sql, identityStatus) {
  if (identityStatus === 'verified') {
    return sql`identity_verified = true`;
  }
  if (identityStatus === 'pending') {
    return sql`customer_type = 'existing' AND COALESCE(identity_verified, false) = false`;
  }
  if (identityStatus === 'not_required') {
    return sql`customer_type = 'new'`;
  }
  return null;
}

function buildCustomerConditions(sql, { status, search, periodStart, customerType, identityStatus }) {
  const conditions = [];

  if (status) conditions.push(sql`status = ${status}`);
  if (search) conditions.push(sql`(full_name ILIKE ${'%' + search + '%'} OR phone ILIKE ${'%' + search + '%'})`);
  if (periodStart) conditions.push(sql`created_at >= ${periodStart}`);
  if (customerType) conditions.push(sql`customer_type = ${customerType}`);

  const identityClause = buildIdentitySql(sql, identityStatus);
  if (identityClause) conditions.push(identityClause);

  return conditions;
}

function combineConditions(sql, conditions = []) {
  if (!conditions.length) return null;
  return conditions.reduce((acc, condition, index) => (
    index === 0 ? condition : sql`${acc} AND ${condition}`
  ));
}

async function fetchCustomersQuery(sql, { status, search, periodStart, customerType, identityStatus, limit, offset, mode }) {
  const whereClause = combineConditions(sql, buildCustomerConditions(sql, { status, search, periodStart, customerType, identityStatus }));

  if (mode === 'rows') {
    if (!whereClause) {
      return sql`SELECT * FROM customers ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
    return sql`
      SELECT * FROM customers
      WHERE ${whereClause}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (mode === 'count') {
    if (!whereClause) {
      return sql`SELECT COUNT(*) as total FROM customers`;
    }
    return sql`SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`;
  }

  if (!whereClause) {
    return sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'new')::int as new,
        COUNT(*) FILTER (WHERE status = 'contacted')::int as contacted,
        COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
        COUNT(*) FILTER (WHERE status = 'done')::int as done
      FROM customers
    `;
  }

  return sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'new')::int as new,
      COUNT(*) FILTER (WHERE status = 'contacted')::int as contacted,
      COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
      COUNT(*) FILTER (WHERE status = 'done')::int as done
    FROM customers
    WHERE ${whereClause}
  `;
}

export default async function handler(request) {
  // Handle CORS preflight
  const cors = handleCors(request);
  if (cors) return cors;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    // POST: Submit form konsultasi (PUBLIC — tanpa auth)
    if (request.method === 'POST') {
      const body = await request.json();
      const { full_name, phone, email, gender, age, preferred_date, concerns, message } = body;
      const validated = validateCustomerPayload(body);
      if (validated.error) {
        return errorResponse(validated.error, 400);
      }
      const identityPayload = validated.value;
      const duplicateNikError = ensureUniqueNikLocal(identityPayload?.nik);
      if (duplicateNikError) {
        return errorResponse(duplicateNikError, 400);
      }

      // Validasi minimal
      if (!full_name || !phone) {
        return errorResponse('Nama lengkap dan nomor telepon wajib diisi.', 400);
      }

      if (!isValidFullName(full_name)) {
        return errorResponse('Nama lengkap perlu diisi dengan format yang wajar dan mudah dikenali.', 400);
      }

      if (!isValidIndonesiaPhone(phone)) {
        return errorResponse('Nomor WhatsApp harus menggunakan format nomor Indonesia yang valid.', 400);
      }

      if (!isValidPreferredDate(preferred_date)) {
        return errorResponse('Tanggal konsultasi harus diisi dan tidak boleh memilih tanggal yang sudah lewat.', 400);
      }

      if (!hasDatabase()) {
        const result = createCustomer({
          full_name: normalizeFullName(full_name),
          phone: normalizePhone(phone),
          email,
          gender,
          age,
          preferred_date,
          concerns,
          message,
          ...identityPayload,
        });

        return jsonResponse({
          success: true,
          message: 'Data konsultasi berhasil dikirim!',
          data: normalizeCustomerRecord(result),
        }, 201);
      }

      const sql = getDB();
      const result = await sql`
        INSERT INTO customers (full_name, phone, email, gender, age_range, preferred_date, concerns, message, customer_type, nik, address, identity_verified, identity_verified_at)
        VALUES (${normalizeFullName(full_name)}, ${normalizePhone(phone)}, ${email || null}, ${gender || null}, 
                ${age || null}, ${preferred_date || null}, ${concerns || []}, ${message || null},
                ${identityPayload.customer_type}, ${identityPayload.nik}, ${identityPayload.address},
                ${identityPayload.identity_verified}, ${identityPayload.identity_verified_at})
        RETURNING *
      `;

      return jsonResponse({ 
        success: true, 
        message: 'Data konsultasi berhasil dikirim!',
        data: normalizeCustomerRecord({
          ...result[0],
          ...identityPayload,
        }),
      }, 201);
    }

    // === ADMIN ONLY ROUTES ===
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    // GET: List semua pelanggan
    if (request.method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const period = url.searchParams.get('period');
      const customerType = url.searchParams.get('customer_type');
      const identityStatus = url.searchParams.get('identity_status');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      if (!hasDatabase()) {
        const localPayload = listCustomers({ status, search, period, customerType, identityStatus, page, limit });
        return jsonResponse({
          ...localPayload,
          data: localPayload.data.map((row) => normalizeCustomerRecord(row)),
        });
      }

      const sql = getDB();
      const offset = (page - 1) * limit;
      const periodStart = getPeriodStart(period);
      const rows = await fetchCustomersPage(sql, { status, search, periodStart, customerType, identityStatus, limit, offset });
      const countResult = await fetchCustomersCount(sql, { status, search, periodStart, customerType, identityStatus });
      const summaryResult = await fetchCustomersSummary(sql, { search, periodStart, customerType, identityStatus });

      return jsonResponse({
        data: rows.map((row) => normalizeCustomerRecord(row)),
        pagination: {
          page,
          limit,
          total: parseInt(countResult[0].total),
        },
        summary: summaryResult[0],
        filters: {
          status: status || '',
          search: search || '',
          period: period || '',
          customer_type: customerType || '',
          identity_status: identityStatus || '',
        },
      });
    }

    // PATCH: Update status pelanggan
    if (request.method === 'PATCH') {
      if (!id) return errorResponse('ID pelanggan wajib disertakan.', 400);

      const body = await request.json();
      const { status } = body;
      const wantsIdentityUpdate =
        body.customer_type !== undefined ||
        body.nik !== undefined ||
        body.address !== undefined ||
        body.identity_verified !== undefined;

      if (status !== undefined && !['new', 'contacted', 'scheduled', 'done'].includes(status)) {
        return errorResponse('Status tidak valid.', 400);
      }

      let identityPayload = null;
      if (wantsIdentityUpdate) {
        const validated = validateCustomerPayload(body);
        if (validated.error) {
          return errorResponse(validated.error, 400);
        }
        identityPayload = validated.value;
        const duplicateNikError = ensureUniqueNikLocal(identityPayload?.nik, id);
        if (duplicateNikError) {
          return errorResponse(duplicateNikError, 400);
        }
      }

      if (!hasDatabase()) {
        let result = null;

        if (status !== undefined) {
          result = updateCustomerStatus(id, status);
        }

        if (wantsIdentityUpdate) {
          result = updateCustomerProfile(id, identityPayload);
        }

        if (!result) {
          return errorResponse('Pelanggan tidak ditemukan.', 404);
        }
        return jsonResponse({ success: true, data: normalizeCustomerRecord(result) });
      }

      const sql = getDB();
      const updateFragments = [];
      if (status !== undefined) updateFragments.push(sql`status = ${status}`);
      if (wantsIdentityUpdate) {
        updateFragments.push(sql`customer_type = ${identityPayload.customer_type}`);
        updateFragments.push(sql`nik = ${identityPayload.nik}`);
        updateFragments.push(sql`address = ${identityPayload.address}`);
        updateFragments.push(sql`identity_verified = ${identityPayload.identity_verified}`);
        updateFragments.push(sql`identity_verified_at = ${identityPayload.identity_verified_at}`);
      }
      updateFragments.push(sql`updated_at = NOW()`);

      const setClause = updateFragments.reduce((acc, fragment, index) => (
        index === 0 ? fragment : sql`${acc}, ${fragment}`
      ));

      const result = await sql`
        UPDATE customers SET ${setClause}
        WHERE id = ${id} RETURNING *
      `;

      if (result.length === 0) {
        return errorResponse('Pelanggan tidak ditemukan.', 404);
      }

      return jsonResponse({ success: true, data: normalizeCustomerRecord(result[0]) });
    }

    // DELETE: Hapus data pelanggan
    if (request.method === 'DELETE') {
      if (!id) return errorResponse('ID pelanggan wajib disertakan.', 400);

      if (!hasDatabase()) {
        const result = deleteCustomerById(id);
        if (!result) {
          return errorResponse('Pelanggan tidak ditemukan.', 404);
        }
        return jsonResponse({ success: true, message: 'Data berhasil dihapus.' });
      }

      const sql = getDB();
      const result = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;

      if (result.length === 0) {
        return errorResponse('Pelanggan tidak ditemukan.', 404);
      }

      return jsonResponse({ success: true, message: 'Data berhasil dihapus.' });
    }

    return errorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('Customers API Error:', error);
    return errorResponse('Terjadi kesalahan server.', 500);
  }
}
