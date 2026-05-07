import { neon } from '@neondatabase/serverless';

/**
 * Koneksi ke Neon.tech PostgreSQL
 * Environment variable DATABASE_URL diset di Vercel Dashboard
 * Format: postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require
 */
export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDB() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}
