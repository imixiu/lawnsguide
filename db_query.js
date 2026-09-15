require('dotenv').config({ path: '/root/vercel-projects/lawnsguide/.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const r = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_online='Y') as online,
      COUNT(*) FILTER (WHERE img IS NULL) as no_img,
      COUNT(*) FILTER (WHERE LENGTH(title) > 60) as long_titles
    FROM articles WHERE site='lawnsguide'
  `);
  console.log(JSON.stringify(r.rows[0]));
  pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
