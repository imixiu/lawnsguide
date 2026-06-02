#!/usr/bin/env node
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const SITE = 'lawnsguide';
const SCORE_THRESHOLD = 80;
const CONCURRENCY = 3;

const AUTHORS = [
  'james-miller', 'sarah-chen', 'mike-rodriguez', 'emily-watson',
  'david-park', 'lisa-thompson', 'robert-hayes', 'anna-kowalski',
];

const IDEAS = [
  // lawn-care (13)
  ['lawn-care', 'how-to-overseed-a-thin-lawn-in-fall'],
  ['lawn-care', 'best-grass-seed-for-shady-areas'],
  ['lawn-care', 'how-to-dethatch-your-lawn-by-hand-or-machine'],
  ['lawn-care', 'lawn-aeration-when-and-how-to-do-it'],
  ['lawn-care', 'how-to-fix-bare-patches-in-your-lawn'],
  ['lawn-care', 'spring-lawn-care-checklist-for-homeowners'],
  ['lawn-care', 'how-to-edge-a-lawn-for-a-clean-look'],
  ['lawn-care', 'organic-lawn-fertilizer-vs-synthetic-which-is-better'],
  ['lawn-care', 'how-to-water-new-grass-seed-properly'],
  ['lawn-care', 'winter-lawn-care-tips-to-prepare-for-cold'],
  ['lawn-care', 'how-to-level-an-uneven-lawn'],
  ['lawn-care', 'best-lawn-mowers-for-small-yards'],
  ['lawn-care', 'how-to-stripe-your-lawn-like-a-pro'],
  // landscaping (13)
  ['landscaping', 'how-to-design-a-front-yard-landscape-plan'],
  ['landscaping', 'best-ground-cover-plants-for-slopes'],
  ['landscaping', 'how-to-install-landscape-edging-around-flower-beds'],
  ['landscaping', 'rock-garden-ideas-for-low-maintenance-yards'],
  ['landscaping', 'how-to-create-a-rain-garden-in-your-backyard'],
  ['landscaping', 'native-plants-for-landscaping-by-region'],
  ['landscaping', 'how-to-add-curb-appeal-with-simple-landscaping'],
  ['landscaping', 'backyard-fire-pit-area-landscaping-ideas'],
  ['landscaping', 'how-to-landscape-around-a-pool'],
  ['landscaping', 'seasonal-flower-bed-planting-guide'],
  ['landscaping', 'how-to-use-mulch-in-landscaping-correctly'],
  ['landscaping', 'small-backyard-landscaping-ideas-on-a-budget'],
  ['landscaping', 'how-to-create-a-wildlife-friendly-garden'],
  // gardening (14)
  ['gardening', 'how-to-grow-tomatoes-in-containers'],
  ['gardening', 'best-herbs-to-grow-indoors-year-round'],
  ['gardening', 'how-to-grow-strawberries-in-a-small-garden'],
  ['gardening', 'fall-garden-planting-guide-what-to-grow'],
  ['gardening', 'how-to-improve-clay-soil-for-gardening'],
  ['gardening', 'container-gardening-tips-for-beginners'],
  ['gardening', 'how-to-grow-peppers-from-seed-to-harvest'],
  ['gardening', 'best-flowers-to-attract-pollinators-to-your-garden'],
  ['gardening', 'how-to-water-garden-plants-efficiently'],
  ['gardening', 'square-foot-gardening-method-explained'],
  ['gardening', 'how-to-grow-garlic-in-your-backyard'],
  ['gardening', 'winter-gardening-crops-you-can-grow-in-cold-weather'],
  ['gardening', 'how-to-build-a-trellis-for-climbing-plants'],
  ['gardening', 'organic-pest-control-methods-for-vegetable-gardens'],
  // home-garden (13)
  ['home-garden', 'how-to-create-a-cottage-garden-style'],
  ['home-garden', 'best-perennial-flowers-for-low-maintenance-gardens'],
  ['home-garden', 'how-to-design-a-herb-garden-near-your-kitchen'],
  ['home-garden', 'raised-garden-bed-soil-mix-recipe'],
  ['home-garden', 'how-to-grow-roses-for-beginners'],
  ['home-garden', 'backyard-vegetable-garden-layout-ideas'],
  ['home-garden', 'how-to-start-seeds-indoors-before-spring'],
  ['home-garden', 'best-shade-plants-for-north-facing-gardens'],
  ['home-garden', 'how-to-build-a-cold-frame-for-year-round-growing'],
  ['home-garden', 'garden-irrigation-systems-drip-vs-sprinkler'],
  ['home-garden', 'how-to-grow-blueberries-in-your-backyard'],
  ['home-garden', 'vertical-garden-ideas-for-small-spaces'],
  ['home-garden', 'how-to-make-leaf-mold-compost-for-free'],
  // pest-control (14)
  ['pest-control', 'how-to-get-rid-of-aphids-on-garden-plants'],
  ['pest-control', 'natural-ways-to-repel-mosquitoes-in-your-yard'],
  ['pest-control', 'how-to-identify-and-treat-japanese-beetle-damage'],
  ['pest-control', 'best-methods-to-control-slugs-in-the-garden'],
  ['pest-control', 'how-to-keep-deer-out-of-your-garden'],
  ['pest-control', 'how-to-get-rid-of-moles-in-your-lawn'],
  ['pest-control', 'organic-weed-control-methods-that-work'],
  ['pest-control', 'how-to-prevent-and-treat-powdery-mildew'],
  ['pest-control', 'how-to-control-ants-in-garden-beds'],
  ['pest-control', 'best-companion-plants-to-repel-pests-naturally'],
  ['pest-control', 'how-to-deal-with-squirrels-digging-in-your-garden'],
  ['pest-control', 'identifying-common-garden-diseases-and-treatments'],
  ['pest-control', 'how-to-use-neem-oil-for-garden-pest-control'],
  ['pest-control', 'how-to-get-rid-of-crabgrass-permanently'],
  // tree-care (13)
  ['tree-care', 'how-to-care-for-newly-planted-trees'],
  ['tree-care', 'signs-your-tree-needs-to-be-removed'],
  ['tree-care', 'how-to-fertilize-trees-and-shrubs-correctly'],
  ['tree-care', 'best-fast-growing-trees-for-privacy'],
  ['tree-care', 'how-to-treat-tree-diseases-common-problems'],
  ['tree-care', 'how-to-stake-a-young-tree-properly'],
  ['tree-care', 'fruit-tree-pruning-guide-for-home-orchards'],
  ['tree-care', 'how-to-remove-a-tree-stump-yourself'],
  ['tree-care', 'evergreen-trees-for-year-round-privacy-screening'],
  ['tree-care', 'how-to-protect-trees-from-winter-damage'],
  ['tree-care', 'ornamental-trees-for-small-yards'],
  ['tree-care', 'how-to-identify-tree-pests-and-treat-them'],
  ['tree-care', 'when-to-call-an-arborist-vs-diy-tree-care'],
];

const TOPIC_PROMPTS = {
  'lawn-care': 'Lawn maintenance, grass health, mowing, fertilizing, watering. Include specific grass species, product names, application rates, seasonal timing, and references to university extension services or turfgrass research.',
  'landscaping': 'Landscape design, outdoor spaces, plants, hardscaping. Include plant species with Latin names, cost estimates, square footage guidance, and references to landscape architecture principles or ASLA guidelines.',
  'gardening': 'Vegetable and flower gardening, soil, planting, harvesting. Include planting dates by USDA zone, spacing measurements, yield data, and references to university cooperative extension or RHS guidance.',
  'home-garden': 'Home garden design, ornamental plants, garden structures. Include plant hardiness zones, bloom times, soil pH requirements, and references to horticultural societies or botanical gardens.',
  'pest-control': 'Garden and lawn pest management, organic and chemical controls. Include pest lifecycle data, treatment timing, product active ingredients, and references to IPM programs or university entomology departments.',
  'tree-care': 'Tree planting, pruning, health, removal. Include species-specific guidance, growth rates, root spread data, and references to ISA (International Society of Arboriculture) or ANSI A300 standards.',
};

// ── ENV SETUP ─────────────────────────────────────────────────────────────────
const siteEnv = {};
for (const line of readFileSync(`/root/vercel-projects/${SITE}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) siteEnv[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}
const hermesEnv = {};
for (const line of readFileSync('/root/.hermes/profiles/theme-site-worker/.env', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) hermesEnv[m[1].trim()] = m[2].trim();
}
const sql = neon(siteEnv.DATABASE_URL);
const anthropic = new Anthropic({
  apiKey: hermesEnv.ANTHROPIC_API_KEY,
  baseURL: hermesEnv.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
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

async function generateArticleHtml(type, shortTitle) {
  const title = shortTitle.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const topicHint = TOPIC_PROMPTS[type]||'';
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
  const resp = await anthropic.messages.create({ model:'claude-opus-4-6', max_tokens:4096, messages:[{role:'user',content:prompt}] });
  let html = resp.content[0].text.trim();
  html = html.replace(/^```html?\s*/i,'').replace(/\s*```$/,'');
  return html;
}

async function generateCoverImage(shortTitle, type) {
  const fallback = `https://picsum.photos/seed/${shortTitle}/1024/576`;
  const title = shortTitle.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const hint = TOPIC_PROMPTS[type]||type;
  const prompt = `Professional blog cover photo for ${title}. ${hint}. Clean editorial style, natural lighting, no text overlay.`;
  try {
    const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',{
      method:'POST',
      headers:{Authorization:`Bearer ${siteEnv.DASHSCOPE_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'qwen-image-plus',input:{messages:[{role:'user',content:[{text:prompt}]}]},parameters:{size:'1024*576'}}),
    });
    const data = await res.json();
    const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
    if (!ossUrl) return fallback;
    const imgBuf = Buffer.from(await (await fetch(ossUrl)).arrayBuffer());
    if (imgBuf.length<1024) return fallback;
    const blob = await put(`covers/${SITE}/${shortTitle}.png`,imgBuf,{access:'public',token:siteEnv.BLOB_READ_WRITE_TOKEN,allowOverwrite:true,contentType:'image/png'});
    return blob.url;
  } catch { return fallback; }
}

async function insertArticle(data) {
  await sql`INSERT INTO articles (site,type,short_title,language,published_time,modified_time,author,img,title,description,url,body,tag,is_online) VALUES (${data.site},${data.type},${data.short_title},${data.language},${data.published_time},${data.modified_time},${data.author},${data.img},${data.title},${data.description},${data.url},${data.body},${data.tag},${data.is_online}) ON CONFLICT DO NOTHING`;
}

async function getExisting() {
  const rows = await sql`SELECT short_title FROM articles WHERE site=${SITE}`;
  return new Set(rows.map(r=>r.short_title));
}

async function processOne({idx,total,type,shortTitle,author}) {
  const title = shortTitle.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  process.stdout.write(`[${idx}/${total}] ${shortTitle} ... `);
  let html=null;
  for (let attempt=0;attempt<3;attempt++) {
    try {
      html = await generateArticleHtml(type,shortTitle);
      const sc = scoreArticle(html);
      process.stdout.write(`score=${sc} `);
      if (sc>=SCORE_THRESHOLD) break;
      process.stdout.write(`(retry ${attempt+1}) `);
      html=null;
    } catch(e) { process.stdout.write(`ERR:${e.message} `); html=null; }
  }
  if (!html) { process.stdout.write('FAIL\n'); return false; }
  process.stdout.write('img... ');
  const img = await generateCoverImage(shortTitle,type);
  process.stdout.write('img OK ');
  const now=new Date(), modified=new Date(now.getTime()+Math.floor(Math.random()*30)*86400000);
  await insertArticle({site:SITE,type,short_title:shortTitle,language:'en',published_time:now,modified_time:modified,author,img,title,description:`Learn about ${title.toLowerCase()} with expert tips and data-backed advice.`,url:`/${type}/${shortTitle}`,body:html,tag:type,is_online:'1'});
  process.stdout.write('DB OK\n');
  return true;
}

async function runWithConcurrency(tasks,limit,fn) {
  const results=[], executing=new Set();
  for (const task of tasks) {
    const p=fn(task).then(r=>{executing.delete(p);return r;});
    executing.add(p); results.push(p);
    if (executing.size>=limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

const existing = await getExisting();
console.log(`Existing in DB: ${existing.size}`);
const tasks = IDEAS.map(([type,shortTitle],i)=>({idx:i+1,total:IDEAS.length,type,shortTitle,author:AUTHORS[i%AUTHORS.length]})).filter(t=>!existing.has(t.shortTitle));
console.log(`To generate: ${tasks.length}`);

let written=0,failed=0;
const results = await runWithConcurrency(tasks,CONCURRENCY,t=>processOne(t));
results.forEach(ok=>ok?written++:failed++);

const rate=written+failed>0?Math.round(written/(written+failed)*100):0;
console.log(`\nArticles Done!\nSite: ${SITE}\nArticles written: ${written}/${IDEAS.length}\nQuality pass rate: ${rate}%\nDB: Neon (ep-fancy-leaf-a4zukau9)\n`);
