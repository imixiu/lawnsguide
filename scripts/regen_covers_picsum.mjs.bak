/**
 * regen_covers_picsum.mjs — 只重新生成 img 仍为 picsum 的文章封面
 * 用法: cd /root/vercel-projects/{site} && SITE=lawnsguide node regen_covers_picsum.mjs
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const SITE = process.env.SITE || 'lawnsguide';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^\"|\"$/g, '');
  }
  return env;
}

const siteEnv = loadEnv(`/root/vercel-projects/${SITE}/.env.local`);
const hermesEnv = loadEnv('/root/.hermes/profiles/theme-site-worker/.env');
const sql = neon(siteEnv.DATABASE_URL);

const IMAGE2CDN_API = 'https://ranking.alibaba.com/verticalSite/image2cdn.json';
const IMAGE2CDN_TOKEN = 'alibaba-icbu-seo-image-to-alicdn-verify';
async function transferToAlicdn(ossUrl) {
  const resp = await fetch(`${IMAGE2CDN_API}?url=${encodeURIComponent(ossUrl)}&token=${IMAGE2CDN_TOKEN}`, { signal: AbortSignal.timeout(60000) });
  const data = await resp.json();
  if (data.code === 200 && data.cdn_url) return data.cdn_url;
  throw new Error(`alicdn failed (${data.code}): ${data.message}`);
}

async function generateCoverImage(shortTitle, type, description) {
  const fallback = `https://picsum.photos/seed/${shortTitle}/1024/576`;
  const title = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const prompt = `Professional blog cover photo for: ${title}. ${description || type}. Clean editorial style, natural lighting, no text overlay.`;
  for (let i = 0; i < 3; i++) {
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${hermesEnv.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen-image-plus', input: { messages: [{ role: 'user', content: [{ text: prompt }] }] }, parameters: { size: '1024*576' } }),
      });
      const data = await res.json();
      const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
      if (!ossUrl) continue;
      const cdnUrl = await transferToAlicdn(ossUrl);
      if (cdnUrl) return cdnUrl;
    } catch (e) {}
  }
  return fallback;
}

const CONCURRENCY = 10;
let done = 0;
async function processOne(row, total) {
  const imgUrl = await generateCoverImage(row.short_title, row.type, row.description);
  await sql`UPDATE articles SET img=${imgUrl} WHERE site=${SITE} AND short_title=${row.short_title}`;
  console.log(`[${++done}/${total}] ${row.short_title} => ${imgUrl.slice(0, 70)}`);
}

async function main() {
  const newTitles = JSON.parse(readFileSync('/tmp/new_lawns_1970.json', 'utf8'));
  const rows = await sql`SELECT short_title, type, description FROM articles WHERE site=${SITE} AND short_title = ANY(${newTitles}) AND img LIKE '%picsum%' ORDER BY id`;
  console.log(`Processing ${rows.length} picsum articles (concurrency=${CONCURRENCY})...`);
  const executing = new Set();
  for (const row of rows) {
    const p = processOne(row, rows.length).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= CONCURRENCY) await Promise.race(executing);
  }
  await Promise.all(executing);
  console.log(`\nDone: ${done} covers updated`);
}

main().catch(console.error);
