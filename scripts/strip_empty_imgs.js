#!/usr/bin/env node
/**
 * lawnsguide: strip empty-src <img> tags from body
 * Only touches body + modified_time, never title/description
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

(async () => {
  const env = fs.readFileSync('.env.local', 'utf8');
  let url;
  for (const l of env.split('\n')) {
    if (l.startsWith('MYSQL_URL=')) {
      url = l.split('=').slice(1).join('=').replace(/["']/g, '');
      break;
    }
  }

  const u = new URL(url);
  const pool = await mysql.createPool({
    host: u.hostname, port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''), connectTimeout: 15000,
    connectionLimit: 5, charset: 'utf8mb4',
  });

  console.log('═══════════════════════════════════════════════');
  console.log('  lawnsguide: strip empty-src img tags');
  console.log('═══════════════════════════════════════════════\n');

  let lastId = 0;
  let total = 0;
  let cleaned = 0;
  const BATCH = 200;
  const startTime = Date.now();

  // Regex: match <img ... src="" ...> or <img ... src='' ...> (empty src)
  const emptyImgRegex = /<img\s[^>]*src\s*=\s*(?:""|'')[^>]*>/gi;

  while (true) {
    const [batch] = await pool.query(
      "SELECT id, body FROM articles WHERE site=? AND is_online=? AND id > ? AND (body LIKE ? OR body LIKE ?) ORDER BY id LIMIT ?",
      ['lawnsguide', 'Y', lastId, '%src=""%', "%src=''%", BATCH]
    );

    if (batch.length === 0) break;

    for (const row of batch) {
      const matches = row.body.match(emptyImgRegex);
      if (!matches || matches.length === 0) {
        lastId = row.id;
        continue;
      }

      const newBody = row.body.replace(emptyImgRegex, '');
      // Also clean up leftover whitespace/newlines from removed tags
      const finalBody = newBody.replace(/\n{3,}/g, '\n\n');

      await pool.query(
        'UPDATE articles SET body = ?, modified_time = NOW() WHERE id = ?',
        [finalBody, row.id]
      );
      cleaned += matches.length;
    }

    total += batch.length;
    lastId = batch[batch.length - 1].id;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`[${total}] cleaned ${cleaned} empty imgs | lastId:${lastId} | ${elapsed}s`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Done! Articles processed: ${total}`);
  console.log(`  Empty img tags removed: ${cleaned}`);
  console.log(`  Time: ${elapsed}s`);
  console.log('═══════════════════════════════════════════════');

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
