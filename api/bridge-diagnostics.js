import { requireAuth } from './_lib/auth.js';
import { errorResponse, handleCors, jsonResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const logs = Array.isArray(globalThis.__DEOKSI_BRIDGE_LOGS__)
      ? globalThis.__DEOKSI_BRIDGE_LOGS__
      : [];

    return jsonResponse({
      data: {
        total: logs.length,
        items: logs.slice(0, 20),
      },
    });
  }

  if (request.method === 'DELETE') {
    globalThis.__DEOKSI_BRIDGE_LOGS__ = [];
    return jsonResponse({
      success: true,
      message: 'Bridge diagnostics berhasil dibersihkan.',
      data: {
        total: 0,
        items: [],
      },
    });
  }

  return errorResponse('Method not allowed.', 405);
}
