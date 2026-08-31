
const fs = require('fs');
const mysql = require('mysql2/promise');
const envLines = fs.readFileSync('/root/vercel-projects/lawnsguide/.env.local', 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.substring(0, eq)] = line.substring(eq + 1).trim();
}
const url = new URL(env.MYSQL_URL);
(async () => {
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  });
  const [rows] = await conn.query(
    "SELECT id, type, title, short_title, author, img FROM articles WHERE site='lawnsguide' AND type='gardening' ORDER BY id DESC LIMIT 10"
  );
  rows.forEach(r => console.log(r.id, '|', r.type, '|', r.title.slice(0, 55), '|', r.author || 'no-author', '|', r.img ? 'has-img' : 'no-img'));
  
  // Also check existing authors
  const [authors] = await conn.query("SELECT name, slug FROM authors WHERE site='lawnsguide'");
  console.log('---AUTHORS---');
  authors.forEach(a => console.log(a.name, '|', a.slug));
  
  await conn.end();
})();
