import { requireAuth } from './_lib/auth.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

export function getCloudinaryUploadConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || '',
  };
}

export function buildCloudinaryUploadUrl(cloudName) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
}

function shouldUseCloudinary() {
  const { cloudName, uploadPreset } = getCloudinaryUploadConfig();
  return Boolean(cloudName && uploadPreset);
}

async function uploadToCloudinary(file) {
  const { cloudName, uploadPreset, folder } = getCloudinaryUploadConfig();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch(buildCloudinaryUploadUrl(cloudName), {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Cloudinary upload gagal.');
  }

  return {
    success: true,
    url: payload.secure_url || payload.url,
    filename: payload.public_id || file.name,
    size: payload.bytes || file.size,
    type: file.type,
    provider: 'cloudinary',
    public_id: payload.public_id || null,
    width: payload.width || null,
    height: payload.height || null,
    format: payload.format || null,
  };
}

export default async function handler(request) {
  const cors = handleCors(request);
  if (cors) return cors;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Content-Type must be multipart/form-data', 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return errorResponse('No file uploaded or invalid file format.', 400);
    }

    if (shouldUseCloudinary()) {
      const result = await uploadToCloudinary(file);
      return jsonResponse(result, 201);
    }

    return errorResponse('Upload cloud belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET.', 503);

  } catch (error) {
    console.error('Upload API Error:', error);
    return errorResponse('Terjadi kesalahan server saat upload file.', 500);
  }
}
