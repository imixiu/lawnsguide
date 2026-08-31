const mysql = require('mysql2/promise');
const fs = require('fs');
const envContent = fs.readFileSync('/root/vercel-projects/lawnsguide/.env.local', 'utf-8');
const mysqlUrl = envContent.match(/MYSQL_URL=(.+)/)[1].trim();
const u = new URL(mysqlUrl);

(async () => {
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  });
  const [rows] = await conn.query(
    "SELECT id, short_title, title, CHAR_LENGTH(title) as tlen, CHAR_LENGTH(description) as dlen, CHAR_LENGTH(body) as body_len, author, type FROM articles WHERE id IN (7982172, 7982173)"
  );
  for (const a of rows) {
    console.log(`ID: ${a.id}`);
    console.log(`  Author: ${a.author}`);
    console.log(`  Type: ${a.type}`);
    console.log(`  Title (${a.tlen} chars): ${a.title}`);
    console.log(`  Desc (${a.dlen} chars): ${a.description}`);
    console.log(`  Body: ${a.body_len} chars`);
    const tOk = a.tlen <= 60 ? 'PASS' : 'FAIL';
    const dOk = a.dlen <= 155 ? 'PASS' : 'FAIL';
    console.log(`  Title length: ${tOk} (${a.tlen}/60)`);
    console.log(`  Desc length: ${dOk} (${a.dlen}/155)`);
    console.log();
  }
  await conn.end();
})().catch(e => console.error(e.message));
