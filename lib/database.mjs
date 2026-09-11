// Only imported by server routes and command-line tools, never by client components.
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const cacheKey = Symbol.for('path-edu.database');
export async function getDatabase() {
  if (globalThis[cacheKey]) return globalThis[cacheKey];
  const database = (async () => {
    if (process.env.DATABASE_MODE === 'pglite') {
      if (process.env.NODE_ENV === 'production') throw new Error('Local database is disabled in production');
      const { PGlite } = await import('@electric-sql/pglite');
      const path=process.env.PGLITE_PATH || '.local/database';
      await mkdir(dirname(path),{recursive:true,mode:0o700});
      const db = new PGlite(path);
      await db.waitReady;
      return { query: db.query.bind(db), transaction: fn => db.transaction(fn), close: () => db.close() };
    }
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
    const { Pool } = await import('pg');
    const url = new URL(process.env.DATABASE_URL);
    // TLS verification cannot be weakened via connection-string options.
    if (process.env.NODE_ENV === 'production' && ['sslmode','ssl','sslcert','sslkey','sslrootcert'].some(key => url.searchParams.has(key))) throw new Error('Configure verified TLS through DATABASE_CA, not URL parameters');
    const pool = new Pool({connectionString: url.toString(), max: 3, connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000, ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_TLS === 'true'
        ? {rejectUnauthorized: true, ...(process.env.DATABASE_CA ? {ca: process.env.DATABASE_CA.replace(/\\n/g,'\n')} : {})} : undefined});
    pool.on('error', () => console.error('Database idle connection failed'));
    return {query: (sql, values) => pool.query(sql, values), async transaction(fn) {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
      catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }, close: () => pool.end()};
  })();
  globalThis[cacheKey]=database;
  try { return await database; } catch (error) { delete globalThis[cacheKey]; throw error; }
}
