
const mysql = require('mysql2/promise');
const mysqlUrl = process.env.MYSQL_URL;
if (!mysqlUrl) { console.error('No MYSQL_URL'); process.exit(1); }

async function run() {
  const u = new URL(mysqlUrl);
  const conn = await mysql.createConnection({
    host: u.hostname, port: parseInt(u.port||'3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//,''),
  });
  
  // Get the list of display-name authors
  const [authors] = await conn.query(
    'SELECT DISTINCT author FROM articles WHERE site="lawnsguide" AND author NOT LIKE "%-%" AND author != ""'
  );
  console.log('Display-name authors:', authors.map(r => r.author));
  
  // Fix 1: Missing authors (68 articles)
  const [noAuthor] = await conn.query(
    'SELECT id, short_title FROM articles WHERE site="lawnsguide" AND (author IS NULL OR author = "")'
  );
  console.log('\nFixing ' + noAuthor.length + ' articles with missing author...');
  
  const displayAuthors = authors.map(r => r.author);
  let fixed = 0;
  for (const article of noAuthor) {
    const author = displayAuthors[article.id % displayAuthors.length];
    await conn.query('UPDATE articles SET author = ? WHERE id = ?', [author, article.id]);
    fixed++;
  }
  console.log('Fixed ' + fixed + ' missing authors');
  
  // Fix 2: Standardize slug-format authors to display names
  const mapping = {
    'sarah-chen': 'Sarah Chen',
    'mike-rodriguez': 'Mike Rodriguez',
    'david-park': 'David Park',
    'lisa-thompson': 'Lisa Thompson',
    'james-miller': 'James Miller',
    'emily-watson': 'Emily Watson',
    'robert-hayes': 'Robert Hayes',
    'anna-kowalski': 'Anna Kowalski',
  };
  
  for (const [slug, name] of Object.entries(mapping)) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND author = ?',
      [slug]
    );
    const cnt = rows[0].cnt;
    if (cnt > 0) {
      await conn.query('UPDATE articles SET author = ? WHERE site="lawnsguide" AND author = ?', [name, slug]);
      console.log('Standardized ' + cnt + ' articles: "' + slug + '" -> "' + name + '"');
    }
  }
  
  // Verify
  const [verify] = await conn.query(
    'SELECT COUNT(*) as cnt FROM articles WHERE site="lawnsguide" AND (author IS NULL OR author = "")'
  );
  console.log('\nRemaining missing authors:', verify[0].cnt);
  
  const [verify2] = await conn.query(
    'SELECT DISTINCT author, COUNT(*) as cnt FROM articles WHERE site="lawnsguide" GROUP BY author ORDER BY cnt DESC'
  );
  console.log('\nAuthor distribution after fix:');
  verify2.forEach(r => console.log('  ' + r.author + ': ' + r.cnt));
  
  await conn.end();
}
run().catch(e => console.error(e.message));
