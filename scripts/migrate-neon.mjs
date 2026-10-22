import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { parse } from 'dotenv';
import { snapshotDatabase, restoreDatabase } from './lib/database-transfer.mjs';

const pools = [];
try {
  let sourcePath = '.env';
  try { await access('.local/local-settings/pre-neon.env'); sourcePath = '.local/local-settings/pre-neon.env'; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const source = parse(await readFile(sourcePath, 'utf8'));
  if (!source.DATABASE_URL) throw new Error('Your local .env must contain DATABASE_URL.');
  let destination;
  if (!process.argv.includes('--backup-only')) {
    destination = parse(await readFile('.env.neon', 'utf8'));
    const targetUrl = destination.DATABASE_URL_UNPOOLED || destination.DATABASE_URL;
    const url = new URL(targetUrl || '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech'))
      throw new Error('.env.neon must contain the destination Neon DATABASE_URL.');
    if (!['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode')))
      throw new Error('Keep the Neon URL TLS parameter: sslmode=require (or verify-full).');
    if (url.hostname.split('.')[0].endsWith('-pooler'))
      throw new Error('Use the direct Neon URL for the transfer: DATABASE_URL_UNPOOLED (hostname without -pooler).');
    destination.connectionString = targetUrl;
    if (source.DATABASE_URL === targetUrl) throw new Error('Source and destination must be different databases.');
  }
  const local = new pg.Pool({ connectionString: source.DATABASE_URL, max: 1 }); pools.push(local);
  const snapshot = await snapshotDatabase(local);
  const directory = resolve('.local/backups'); await mkdir(directory, { recursive: true });
  const path = resolve(directory, `clover-${new Date().toISOString().replaceAll(':', '-')}.json`);
  await writeFile(path, JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
  console.log(`Private backup saved: ${path}`);
  console.log('Keep this backup private: it contains accounts, password hashes, customer addresses, and orders.');
  if (destination) {
    const neon = new pg.Pool({ connectionString: destination.connectionString, max: 1, connectionTimeoutMillis: 20000 }); pools.push(neon);
    await restoreDatabase(neon, snapshot);
    console.log('Transfer committed and row counts verified. Local data was not changed. Existing passwords, admin roles, order history, payments and stock were preserved.');
  }
} catch (error) {
  console.error(error.code === 'ENOENT' ? 'Missing .env or .env.neon. See DEPLOYMENT.md; keep the local .env unchanged.' : String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[database URL hidden]'));
  process.exitCode = 1;
} finally { await Promise.all(pools.map(pool => pool.end())); }
