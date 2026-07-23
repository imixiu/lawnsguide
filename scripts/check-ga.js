
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
  
  // Full 14 day GA trend
  const [ga] = await conn.query(
    'SELECT date, active_users, sessions, screen_page_views, bounce_rate, avg_session_duration FROM site_ga_data WHERE hostname="lawnsguide.com" ORDER BY date DESC LIMIT 14'
  );
  console.log('GA 14-day trend:');
  ga.forEach(r => console.log('  ' + r.date + ': users=' + r.active_users + ' sessions=' + r.sessions + ' pv=' + r.screen_page_views + ' bounce=' + r.bounce_rate + ' dur=' + r.avg_session_duration));
  
  // Check if site is accessible and responding
  console.log('\nDone.');
  await conn.end();
}
run().catch(e => console.error(e.message));
