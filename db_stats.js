require('dotenv').config({ path: '/root/vercel-projects/lawnsguide/.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const r = await pool.query(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE is_online='Y') as online,
           COUNT(*) FILTER (WHERE img IS NULL) as no_img,
           COUNT(*) FILTER (WHERE LENGTH(title) > 60) as long_titles,
           COUNT(*) FILTER (WHERE author = '' OR author IS NULL) as no_author
    FROM articles WHERE site='lawnsguide'
  `);
  console.log('Stats:', JSON.stringify(r.rows[0]));
  
  const types = await pool.query(`SELECT type, COUNT(*) as cnt FROM articles WHERE site='lawnsguide' GROUP BY type ORDER BY cnt DESC`);
  console.log('Types:', JSON.stringify(types.rows));
  
  pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
