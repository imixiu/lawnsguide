require('dotenv').config({ path: '/root/vercel-projects/lawnsguide/.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.MYSQL_URL;
  const u = new URL(url);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  });

  // Fix description for article 15650244 (was 161 chars, need ≤155)
  const newDesc = 'Fix brown patches in your lawn after summer heat stress. Step-by-step recovery guide with watering, aeration, and overseeding tips.';
  console.log('New desc length:', newDesc.length, 'chars');
  
  await conn.query(`UPDATE articles SET description = ? WHERE id = 15650244`, [newDesc]);
  console.log('Fixed description for article 15650244');

  // Verify both articles
  const [rows] = await conn.query(`SELECT id, short_title, title, description, img, CHAR_LENGTH(title) as tlen, CHAR_LENGTH(description) as dlen FROM articles WHERE id IN (15650244, 15650245)`);
  for (const r of rows) {
    console.log(`ID ${r.id}: "${r.title}" (${r.tlen} chars) | desc: ${r.dlen} chars | img: ${r.img ? 'YES' : 'NULL'}`);
  }

  await conn.end();
}
main().catch(e => { console.error(e.message); });
