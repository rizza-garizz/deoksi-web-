import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

function loadEnvFile() {
  const envPath = join(projectRoot, '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function maskConnectionString(value) {
  return String(value || '').replace(/:(.*?)@/, ':***@');
}

function isPlaceholder(value = '') {
  return [
    'replace-with-',
    'your-cloud-name',
    'your-unsigned-upload-preset',
    'username:password',
    'ep-xxxxx',
  ].some((marker) => String(value).includes(marker));
}

function checkRequiredEnv() {
  return [
    {
      key: 'DATABASE_URL',
      required: true,
      ok: Boolean(process.env.DATABASE_URL) && !isPlaceholder(process.env.DATABASE_URL),
      detail: process.env.DATABASE_URL ? maskConnectionString(process.env.DATABASE_URL) : 'missing',
    },
    {
      key: 'JWT_SECRET',
      required: true,
      ok: Boolean(process.env.JWT_SECRET) && !isPlaceholder(process.env.JWT_SECRET) && String(process.env.JWT_SECRET).length >= 24,
      detail: process.env.JWT_SECRET ? `length=${String(process.env.JWT_SECRET).length}` : 'missing',
    },
    {
      key: 'PASSWORD_SALT',
      required: true,
      ok: Boolean(process.env.PASSWORD_SALT) && !isPlaceholder(process.env.PASSWORD_SALT) && String(process.env.PASSWORD_SALT).length >= 12,
      detail: process.env.PASSWORD_SALT ? `length=${String(process.env.PASSWORD_SALT).length}` : 'missing',
    },
    {
      key: 'CLOUDINARY_CLOUD_NAME',
      required: true,
      ok: Boolean(process.env.CLOUDINARY_CLOUD_NAME) && !isPlaceholder(process.env.CLOUDINARY_CLOUD_NAME),
      detail: process.env.CLOUDINARY_CLOUD_NAME || 'missing',
    },
    {
      key: 'CLOUDINARY_UPLOAD_PRESET',
      required: true,
      ok: Boolean(process.env.CLOUDINARY_UPLOAD_PRESET) && !isPlaceholder(process.env.CLOUDINARY_UPLOAD_PRESET),
      detail: process.env.CLOUDINARY_UPLOAD_PRESET || 'missing',
    },
    {
      key: 'CLOUDINARY_UPLOAD_FOLDER',
      required: false,
      ok: true,
      detail: process.env.CLOUDINARY_UPLOAD_FOLDER || '(optional, not set)',
    },
  ];
}

loadEnvFile();

const results = checkRequiredEnv();
const failed = results.filter((item) => item.required && !item.ok);

console.log('====================================');
console.log(' Deoksi Deploy Env Check');
console.log('====================================');
console.log('');

for (const item of results) {
  const status = item.ok ? 'OK' : (item.required ? 'MISSING' : 'INFO');
  console.log(`${status.padEnd(8)} ${item.key} -> ${item.detail}`);
}

console.log('');

if (failed.length > 0) {
  console.log('Result: FAILED');
  console.log('Isi env yang masih missing / placeholder sebelum deploy production.');
  process.exit(1);
}

console.log('Result: PASS');
console.log('Env utama sudah siap untuk deploy production.');
