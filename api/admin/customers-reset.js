import { hasDatabase } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { resetLocalCustomers } from '../_lib/local-db.js';
import { handleCors, errorResponse, jsonResponse } from '../_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (hasDatabase()) {
    return errorResponse('Pemulihan data contoh hanya tersedia di mode lokal.', 400);
  }

  const customers = resetLocalCustomers();
  return jsonResponse({
    success: true,
    message: 'Data pelanggan contoh berhasil dipulihkan.',
    data: {
      total: customers.length,
    },
  });
}
