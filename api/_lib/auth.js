import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'deoksi-admin-secret-key-2026');

function getAuthorizationHeader(request) {
  if (!request?.headers) return null;
  if (typeof request.headers.get === 'function') {
    return request.headers.get('authorization');
  }

  return request.headers.authorization || request.headers.Authorization || null;
}

/**
 * Generate JWT token untuk admin login
 */
export async function generateToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token dari header Authorization
 */
export async function verifyToken(request) {
  const authHeader = getAuthorizationHeader(request);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware helper: returns 401 if not authenticated
 */
export async function requireAuth(request) {
  const user = await verifyToken(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}
