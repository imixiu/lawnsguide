#!/usr/bin/env node
// Dynamic article generator — generates N fresh titles via LLM, then writes articles to DB.
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { readFileSync } from 'fs';

const SITE = 'lawnsguide';
const SCORE_THRESHOLD = 80;
const CONCURRENCY = 3;
const TARGET = parseInt(process.env.TARGET || '100', 10);

const CATEGORIES = [
  'lawn-care', 'landscaping', 'pest-control', 'tree-care', 'gardening', 'home-garden',
];

const TOPIC_PROMPTS = {
  'lawn-care': 'Lawn maintenance, grass health, mowing, fertilizing, watering. Include specific grass species, product names, application rates, seasonal timing, and references to university extension services or turfgrass research.',
  'landscaping': 'Landscape design, outdoor spaces, plants, hardscaping. Include plant species with Latin names, cost estimates, square footage guidance, and references to landscape architecture principles or ASLA guidelines.',
  'gardening': 'Vegetable and flower gardening, soil, planting, harvesting. Include planting dates by USDA zone, spacing measurements, yield data, and references to university cooperative extension or RHS guidance.',
  'home-garden': 'Home garden design, ornamental plants, garden structures. Include plant hardiness zones, bloom times, soil pH requirements, and references to horticultural societies or botanical gardens.',
  'pest-control': 'Garden and lawn pest management, organic and chemical controls. Include pest lifecycle data, treatment timing, product active ingredients, and references to IPM programs or university entomology departments.',
  'tree-care': 'Tree planting, pruning, health, removal. Include species-specific guidance, growth rates, root spread data, and references to ISA (International Society of Arboriculture) or ANSI A300 standards.',
};

const AUTHORS = [
  'james-miller', 'sarah-chen', 'mike-rodriguez', 'emily-watson',
  'david-park', 'lisa-thompson', 'robert-hayes', 'anna-kowalski',
];

// ── ENV ───────────────────────────────────────────────────────────────────────
function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
  return env;
}
const siteEnv = loadEnvFile(`/root/vercel-projects/${SITE}/.env.local`);
const hermesEnv = loadEnvFile('/root/.hermes/profiles/theme-site-worker/.env');
const sql = neon(siteEnv.DATABASE_URL);
const anthropic = new OpenAI({
  apiKey: hermesEnv.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN_TITLES = ['About ','Why ','Types and Variants','Key Features','Pros and Cons','How to Choose','Conclusion','FAQs','The Bottom Line','In Summary'];
const FORBIDDEN_PHRASES = ['In conclusion','Comprehensive guide','Ultimate guide','Delve into','Navigating the world','Unveil the secrets',"In today's fast-paced",'Look no further',"Whether you're a beginner",'Dive deep into','Tapestry','Testament to','Embark on a journey'];

function scoreArticle(html) {
  let score = 90;
  const text = html.replace(/<[^>]+>/g, '');
  const headings = [...html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gis)].map(m => m[1].replace(/<[^>]+>/g, ''));
  if (FORBIDDEN_TITLES.some(f => headings.some(h => h.toLowerCase().includes(f.toLowerCase())))) score -= 15;
  if (FORBIDDEN_PHRASES.some(f => html.toLowerCase().includes(f.toLowerCase()))) score -= 15;
  if (text.length < 3000) score -= 10;
  const h2=(html.match(/<h2/g)||[]).length, h3=(html.match(/<h3/g)||[]).length, p=(html.match(/<p/g)||[]).length, ul=(html.match(/<ul|<ol/g)||[]).length, tbl=(html.match(/<table/g)||[]).length, bq=(html.match(/<blockquote/g)||[]).length;
  if (!(h2>=5&&h3>=3&&p>=15&&ul>=2&&(tbl>=1||bq>=1))) score -= 10;
  const nums=(text.match(/\b\d+\.?\d*\s*(?:%|degrees?|inches?|feet|foot|lbs?|pounds?|gallons?|sq\.?\s*ft|mph|psi|weeks?|days?|months?|years?|°[FC]|times?|hours?|minutes?|per\s+\w+)/gi)||[]).length;
  const standalone=(text.match(/\b\d{2,}\b/g)||[]).length;
  if (nums+standalone<5) score -= 10;
  if ((text.match(/(?:University|Institute|USDA|EPA|ISA|Journal|Study|Research|according to)[^.]{0,80}\d{4}/gi)||[]).length<2) score -= 10;
  if ((text.match(/\b[A-Z][a-zA-Z&\s.]+(?:University|College|Institute|Extension|State|County|City|Farm|Garden|Park|Department|Association|Foundation)\b/g)||[]).length<3) score -= 10;
  const sentences=text.split(/[.!?]/).map(s=>s.trim().split(/\s+/).length).filter(l=>l>3);
  if (sentences.length>0){const avg=sentences.reduce((a,b)=>a+b,0)/sentences.length;if(sentences.reduce((a,b)=>a+(b-avg)**2,0)/sentences.length<10)score-=10;}
  return Math.max(0, score);
}

async function generateIdeas(existing, count) {
  const perCat = Math.ceil(count / CATEGORIES.length);
  const prompt = `Generate ${count} unique blog article short_titles for a lawn and garden website.
Categories: ${CATEGORIES.join(', ')}
Rules:
- Distribute evenly across categories (~${perCat} per category)
- Format: lowercase, words separated by hyphens (e.g. how-to-overseed-a-thin-lawn)
- 4-10 words each, SEO-friendly, specific and practical
- Must NOT duplicate any of these existing titles: ${[...existing].slice(0, 200).join(', ')}
- Output ONLY a JSON array of [category, short_title] pairs, no explanation.
Example: [["lawn-care","how-to-fix-yellow-patches-in-grass"],["gardening","best-companion-plants-for-tomatoes"]]`;

  const resp = await anthropic.chat.completions.create({
    model: 'qwen-plus', max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  let text = resp.choices[0].message.content.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
  const ideas = JSON.parse(text);
  return ideas.filter(([, st]) => !existing.has(st)).slice(0, count);
}

async function generateArticleHtml(type, shortTitle) {
  const title = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const topicHint = TOPIC_PROMPTS[type] || '';
  const prompt = `Write a high-quality blog article body.

Title: ${title}
Category: ${type}
Topic guidance: ${topicHint}

REQUIREMENTS:
- Output ONLY the article body — NO title, NO author, NO date, NO byline
- Pure text >= 3000 characters
- 5+ h2, 3+ h3, 15+ p, 2+ ul/ol, 1+ table or blockquote
- 5+ specific data points with numbers/measurements
- 2+ citations with org name and year
- 3+ real named institutions or locations
- Start directly with first h2 or intro paragraph

FORBIDDEN headings: About [X], Why [X] Is Gaining Popularity, Types and Variants, Key Features and Benefits, Pros and Cons, How to Choose, Conclusion, FAQs, The Bottom Line, In Summary
FORBIDDEN phrases: In conclusion, Comprehensive guide, Ultimate guide, Delve into, Navigating the world of, Unveil the secrets, In today's fast-paced, Look no further, Whether you're a beginner, Dive deep into, Tapestry, Testament to, Embark on a journey

Output ONLY the HTML body content, no markdown fences, no wrapper article tags.`;
  const resp = await anthropic.chat.completions.create({
    model: 'qwen-plus', max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    timeout: 300000,
  });
  let html = resp.choices[0].message.content.trim();
  html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/, '');
  return html;
}

async function generateCoverImage(shortTitle, type) {
  const fallback = `https://picsum.photos/seed/${shortTitle}/1024/576`;
  const title = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const hint = TOPIC_PROMPTS[type] || type;
  const prompt = `Professional blog cover photo for ${title}. ${hint}. Clean editorial style, natural lighting, no text overlay.`;
  try {
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${siteEnv.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen-image-plus', input: { messages: [{ role: 'user', content: [{ text: prompt }] }] }, parameters: { size: '1024*576' } }),
    });
    const data = await res.json();
    const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
    if (!ossUrl) return fallback;
    const imgBuf = Buffer.from(await (await fetch(ossUrl)).arrayBuffer());
    if (imgBuf.length < 1024) return fallback;
    const blob = await put(`covers/${SITE}/${shortTitle}.png`, imgBuf, { access: 'public', token: siteEnv.BLOB_READ_WRITE_TOKEN, allowOverwrite: true, contentType: 'image/png' });
    return blob.url;
  } catch { return fallback; }
}

async function insertArticle(data) {
  await sql`INSERT INTO articles (site,type,short_title,language,published_time,modified_time,author,img,title,description,url,body,tag,is_online)
    VALUES (${data.site},${data.type},${data.short_title},${data.language},${data.published_time},${data.modified_time},${data.author},${data.img},${data.title},${data.description},${data.url},${data.body},${data.tag},${data.is_online})
    ON CONFLICT DO NOTHING`;
}

async function getExisting() {
  const rows = await sql`SELECT short_title FROM articles WHERE site=${SITE}`;
  return new Set(rows.map(r => r.short_title));
}

async function processOne({ idx, total, type, shortTitle, author }) {
  const title = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  process.stdout.write(`[${idx}/${total}] ${shortTitle} ... `);
  let html = null;
  const MAX_ATTEMPTS = 10;
  let threshold = SCORE_THRESHOLD;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt >= 5) threshold = Math.max(0, SCORE_THRESHOLD - (attempt - 4) * 5);
    try {
      html = await generateArticleHtml(type, shortTitle);
      const sc = scoreArticle(html);
      process.stdout.write(`score=${sc}(thr=${threshold}) `);
      if (sc >= threshold) break;
      process.stdout.write(`(retry ${attempt + 1}) `);
      html = null;
    } catch (e) { process.stdout.write(`ERR:${e.message} `); html = null; }
  }
  if (!html) { process.stdout.write('FAIL\n'); return false; }
  process.stdout.write('img... ');
  const img = await generateCoverImage(shortTitle, type);
  process.stdout.write('img OK ');
  const now = new Date(), modified = new Date(now.getTime() + Math.floor(Math.random() * 30) * 86400000);
  await insertArticle({ site: SITE, type, short_title: shortTitle, language: 'en', published_time: now, modified_time: modified, author, img, title, description: `Learn about ${title.toLowerCase()} with expert tips and data-backed advice.`, url: `/${type}/${shortTitle}`, body: html, tag: type, is_online: '1' });
  process.stdout.write('DB OK\n');
  return true;
}

async function runWithConcurrency(tasks, limit, fn) {
  const results = [], executing = new Set();
  for (const task of tasks) {
    const p = fn(task).then(r => { executing.delete(p); return r; });
    executing.add(p); results.push(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const existing = await getExisting();
console.log(`Existing in DB: ${existing.size}`);

console.log(`Generating ${TARGET} fresh ideas via LLM...`);
const ideas = await generateIdeas(existing, TARGET);
console.log(`Got ${ideas.length} new ideas`);

const tasks = ideas.map(([type, shortTitle], i) => ({
  idx: i + 1, total: ideas.length, type, shortTitle, author: AUTHORS[i % AUTHORS.length],
}));

let written = 0, failed = 0;
const results = await runWithConcurrency(tasks, CONCURRENCY, t => processOne(t));
results.forEach(ok => ok ? written++ : failed++);

const rate = written + failed > 0 ? Math.round(written / (written + failed) * 100) : 0;
console.log(`\nArticles Done!\nSite: ${SITE}\nArticles written: ${written}/${ideas.length}\nQuality pass rate: ${rate}%\nDB: Neon (ep-fancy-leaf-a4zukau9)\n`);

if (written === 0) process.exit(1);
