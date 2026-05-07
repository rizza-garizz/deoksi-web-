import { SignJWT, jwtVerify } from 'jose';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'test') {
    return new TextEncoder().encode('test-jwt-secret-for-vitest-only');
  }

  if (!secret) {
    throw new Error('JWT_SECRET is required for admin authentication.');
  }

  return new TextEncoder().encode(secret);
}

function getPasswordSalt() {
  const salt = process.env.PASSWORD_SALT;
  if (!salt && process.env.NODE_ENV === 'test') {
    return 'test-password-salt';
  }

  if (!salt) {
    throw new Error('PASSWORD_SALT is required for password hashing.');
  }

  return salt;
}

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
    .sign(getJwtSecret());
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(password || '') + getPasswordSalt());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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
    const { payload } = await jwtVerify(token, getJwtSecret());
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
