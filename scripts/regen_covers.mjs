import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const SITE = 'lawnsguide';

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

const TOPIC_PROMPTS = {
  'lawn-care': 'Lawn maintenance, grass health, mowing, fertilizing, watering.',
  'landscaping': 'Landscape design, outdoor spaces, plants, hardscaping.',
  'gardening': 'Vegetable and flower gardening, soil, planting, harvesting.',
  'home-garden': 'Home garden design, ornamental plants, garden structures.',
  'pest-control': 'Garden and lawn pest management, organic and chemical controls.',
  'tree-care': 'Tree planting, pruning, health, removal.',
};

async function generateCoverImage(shortTitle, type, description) {
  const fallback = `https://picsum.photos/seed/${shortTitle}/1024/576`;
  const title = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const hint = description || TOPIC_PROMPTS[type] || type;
  const prompt = `Professional blog cover photo for: ${title}. ${hint} Clean editorial style, natural lighting, no text overlay.`;
  try {
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hermesEnv.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen-image-plus', input: { messages: [{ role: 'user', content: [{ text: prompt }] }] }, parameters: { size: '1024*576' } }),
    });
    const data = await res.json();
    const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
    if (!ossUrl) { console.log('no image url, fallback'); return fallback; }
    const imgBuf = Buffer.from(await (await fetch(ossUrl)).arrayBuffer());
    if (imgBuf.length < 1024) return fallback;
    const blob = await put(`covers/${SITE}/${shortTitle}.png`, imgBuf, {
      access: 'public', token: siteEnv.BLOB_READ_WRITE_TOKEN, allowOverwrite: true, contentType: 'image/png'
    });
    return blob.url;
  } catch (e) { console.log(`error: ${e.message}`); return fallback; }
}

async function main() {
  const rows = await sql`SELECT short_title, type, description FROM articles WHERE site=${SITE} ORDER BY id DESC LIMIT 30`;
  console.log(`Processing ${rows.length} articles...`);

  let done = 0;
  for (const row of rows) {
    process.stdout.write(`[${++done}/${rows.length}] ${row.short_title} ... `);
    const imgUrl = await generateCoverImage(row.short_title, row.type, row.description);
    await sql`UPDATE articles SET img=${imgUrl} WHERE site=${SITE} AND short_title=${row.short_title}`;
    console.log(`=> ${imgUrl.slice(0, 70)}`);
  }
  console.log(`\nDone: ${done} covers updated`);
}

main().catch(console.error);
