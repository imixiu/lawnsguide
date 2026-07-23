
const mysql = require('mysql2/promise');

const mysqlUrl = process.env.MYSQL_URL;
if (!mysqlUrl) { console.error('No MYSQL_URL env var'); process.exit(1); }

async function run() {
  const u = new URL(mysqlUrl);
  const conn = await mysql.createConnection({
    host: u.hostname, port: parseInt(u.port||'3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//,''),
  });
  
  const [total] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide"');
  console.log('Total articles:', total[0].cnt);
  
  const [byType] = await conn.query('SELECT type, COUNT(*) as cnt FROM articles WHERE site="lawnsguide" GROUP BY type ORDER BY cnt DESC');
  byType.forEach(r => console.log('  ' + r.type + ': ' + r.cnt));
  
  const [noImg] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND (img IS NULL OR img = "")');
  console.log('Missing images:', noImg[0].cnt);
  
  const [noAuthor] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND (author IS NULL OR author = "")');
  console.log('Missing author:', noAuthor[0].cnt);
  
  const [longTitle] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND LENGTH(title) > 60');
  console.log('Long titles (>60):', longTitle[0].cnt);
  
  const [noDesc] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND (description IS NULL OR description = "")');
  console.log('Missing description:', noDesc[0].cnt);
  
  const [offline] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND is_online != "Y"');
  console.log('Not online:', offline[0].cnt);
  
  const [authors] = await conn.query('SELECT DISTINCT author FROM articles WHERE site="lawnsguide" AND author IS NOT NULL AND author != ""');
  console.log('Authors:', authors.map(r => r.author).join(', '));
  
  const [recent] = await conn.query('SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND published_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
  console.log('Articles last 7 days:', recent[0].cnt);
  
  const [latest] = await conn.query('SELECT id, LEFT(title,60) as t, type, published_time FROM articles WHERE site="lawnsguide" ORDER BY id DESC LIMIT 3');
  latest.forEach(r => console.log('  #' + r.id + ' - ' + r.t + ' (' + r.published_time + ')'));
  
  await conn.end();
}
run().catch(e => console.error(e.message));
