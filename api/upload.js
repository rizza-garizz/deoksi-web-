import fs from 'fs';
import path from 'path';
import { requireAuth } from './_lib/auth.js';
import { handleCors, jsonResponse, errorResponse } from './_lib/utils.js';

export const config = { runtime: 'edge' };

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

    // Since we are running in a simulated edge environment locally (api-bridge.mjs),
    // we can use Node.js fs to save the file. In a real Vercel Edge environment,
    // this would fail, and we would need a cloud storage solution (S3, Cloudinary).
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    
    const uploadDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/assets/uploads/${filename}`;

    return jsonResponse({
      success: true,
      url: fileUrl,
      filename: filename,
      size: file.size,
      type: file.type
    }, 201);

  } catch (error) {
    console.error('Upload API Error:', error);
    return errorResponse('Terjadi kesalahan server saat upload file.', 500);
  }
}
