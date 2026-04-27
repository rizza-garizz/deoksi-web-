import { requireAuth } from './_lib/auth.js';
import { handleCors, jsonResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  return jsonResponse({
    enabled: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
  });
}
