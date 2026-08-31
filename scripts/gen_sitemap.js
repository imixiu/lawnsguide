#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Use db_router from hermes
const { getMysqlPool, endAll } = require('/root/.hermes/lib/db_router');

const DOMAIN = 'https://lawnsguide.com';
const SITE = 'lawnsguide';
const SITEMAP_DIR = path.join(__dirname, '..', 'public', 'sitemap');
const MAX_PER_FILE = 5000;

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildSitemapXml(urls) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq || 'weekly'}</changefreq>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';
  return xml;
}

function buildSitemapIndexXml(domain, sitemapFiles) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const f of sitemapFiles) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(domain)}/sitemap/${f}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }
  xml += '</sitemapindex>\n';
  return xml;
}

(async () => {
  const pool = getMysqlPool();

  const [rows] = await pool.query(
    `SELECT type, short_title, url, modified_time, published_time 
     FROM articles 
     WHERE site = ? AND is_online IN ('Y', '1') 
     ORDER BY published_time DESC`,
    [SITE]
  );
  
  console.log(`Found ${rows.length} online articles`);

  const urls = [];
  
  // Homepage
  urls.push({ loc: DOMAIN + '/', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily' });
  
  // Category pages
  const types = [...new Set(rows.map(r => r.type))];
  types.forEach(t => {
    urls.push({ loc: DOMAIN + '/categories/' + t, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily' });
  });
  
  // Article pages
  for (const r of rows) {
    const articleUrl = r.url || `/${r.type}/${r.short_title}`;
    const lastmod = r.modified_time || r.published_time;
    const lastmodStr = lastmod ? new Date(lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    urls.push({ loc: DOMAIN + articleUrl, lastmod: lastmodStr, changefreq: 'monthly' });
  }
  
  console.log(`Total URLs: ${urls.length}`);

  fs.mkdirSync(SITEMAP_DIR, { recursive: true });

  const sitemapFiles = [];
  for (let i = 0; i < urls.length; i += MAX_PER_FILE) {
    const chunk = urls.slice(i, i + MAX_PER_FILE);
    const fileNum = Math.floor(i / MAX_PER_FILE) + 1;
    const fileName = `sitemap${fileNum}.xml`;
    const filePath = path.join(SITEMAP_DIR, fileName);
    fs.writeFileSync(filePath, buildSitemapXml(chunk));
    sitemapFiles.push(fileName);
    console.log(`  Written ${fileName}: ${chunk.length} URLs`);
  }

  const indexPath = path.join(SITEMAP_DIR, 'sitemapindex.xml');
  fs.writeFileSync(indexPath, buildSitemapIndexXml(DOMAIN, sitemapFiles));
  console.log(`  Written sitemapindex.xml (${sitemapFiles.length} sitemaps)`);

  // Copy to .open-next/assets/sitemap/
  const cfDir = path.join(__dirname, '..', '.open-next', 'assets', 'sitemap');
  if (fs.existsSync(path.join(__dirname, '..', '.open-next'))) {
    fs.mkdirSync(cfDir, { recursive: true });
    for (const f of sitemapFiles) {
      fs.copyFileSync(path.join(SITEMAP_DIR, f), path.join(cfDir, f));
    }
    fs.copyFileSync(indexPath, path.join(cfDir, 'sitemapindex.xml'));
    console.log(`  Copied to .open-next/assets/sitemap/`);
  }

  await endAll();
  console.log('Done!');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
