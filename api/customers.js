import { getDB, hasDatabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { createCustomer, deleteCustomerById, listCustomers, updateCustomerStatus } from './_lib/local-db.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

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

      // Validasi minimal
      if (!full_name || !phone) {
        return errorResponse('Nama lengkap dan nomor telepon wajib diisi.', 400);
      }

      if (!hasDatabase()) {
        const result = createCustomer({
          full_name,
          phone,
          email,
          gender,
          age,
          preferred_date,
          concerns,
          message,
        });

        return jsonResponse({
          success: true,
          message: 'Data konsultasi berhasil dikirim!',
          data: {
            id: result.id,
            full_name: result.full_name,
            created_at: result.created_at,
          },
        }, 201);
      }

      const sql = getDB();
      const result = await sql`
        INSERT INTO customers (full_name, phone, email, gender, age, preferred_date, concerns, message)
        VALUES (${full_name}, ${phone}, ${email || null}, ${gender || null}, 
                ${age || null}, ${preferred_date || null}, ${concerns || []}, ${message || null})
        RETURNING id, full_name, created_at
      `;

      return jsonResponse({ 
        success: true, 
        message: 'Data konsultasi berhasil dikirim!',
        data: result[0] 
      }, 201);
    }

    // === ADMIN ONLY ROUTES ===
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    // GET: List semua pelanggan
    if (request.method === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      if (!hasDatabase()) {
        return jsonResponse(listCustomers({ status, search, page, limit }));
      }

      const sql = getDB();
      const offset = (page - 1) * limit;

      let rows;
      if (status && search) {
        rows = await sql`
          SELECT * FROM customers 
          WHERE status = ${status} AND (full_name ILIKE ${'%' + search + '%'} OR phone ILIKE ${'%' + search + '%'})
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status) {
        rows = await sql`
          SELECT * FROM customers WHERE status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (search) {
        rows = await sql`
          SELECT * FROM customers 
          WHERE full_name ILIKE ${'%' + search + '%'} OR phone ILIKE ${'%' + search + '%'}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await sql`
          SELECT * FROM customers ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const countResult = await sql`SELECT COUNT(*) as total FROM customers`;

      return jsonResponse({
        data: rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult[0].total),
        },
      });
    }

    // PATCH: Update status pelanggan
    if (request.method === 'PATCH') {
      if (!id) return errorResponse('ID pelanggan wajib disertakan.', 400);

      const body = await request.json();
      const { status } = body;

      if (!['new', 'contacted', 'scheduled', 'done'].includes(status)) {
        return errorResponse('Status tidak valid.', 400);
      }

      if (!hasDatabase()) {
        const result = updateCustomerStatus(id, status);
        if (!result) {
          return errorResponse('Pelanggan tidak ditemukan.', 404);
        }
        return jsonResponse({ success: true, data: result });
      }

      const sql = getDB();
      const result = await sql`
        UPDATE customers SET status = ${status}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      if (result.length === 0) {
        return errorResponse('Pelanggan tidak ditemukan.', 404);
      }

      return jsonResponse({ success: true, data: result[0] });
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
