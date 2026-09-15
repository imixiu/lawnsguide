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
  
  const [stats] = await conn.query(`
    SELECT COUNT(*) as total,
           SUM(is_online='Y') as online,
           SUM(img IS NULL) as no_img,
           SUM(CHAR_LENGTH(title) > 60) as long_titles,
           SUM(author IS NULL OR author = '') as no_author
    FROM articles WHERE site='lawnsguide'
  `);
  console.log('Stats:', JSON.stringify(stats[0]));
  
  const [types] = await conn.query(`SELECT type, COUNT(*) as cnt FROM articles WHERE site='lawnsguide' GROUP BY type ORDER BY cnt DESC`);
  console.log('Types:', JSON.stringify(types));
  
  const [authors] = await conn.query(`SELECT DISTINCT author FROM articles WHERE site='lawnsguide' AND author IS NOT NULL AND author != '' LIMIT 10`);
  console.log('Authors:', JSON.stringify(authors));
  
  await conn.end();
}
main().catch(e => { console.error(e.message); });
