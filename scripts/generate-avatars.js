/**
 * Generate professional author avatars for lawnsguide
 * 1. Generate via Qwen image-plus API
 * 2. Upload to alicdn
 * 3. Update MySQL DB
 */

const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY;
const ALICDN_TOKEN = 'alibaba-icbu-seo-image-to-alicdn-verify';

const authors = [
  {
    slug: 'james-miller',
    name: 'James Miller',
    prompt: 'Professional corporate headshot portrait of a confident Caucasian male in his early 50s, short graying hair, wearing a dark navy collared polo shirt with subtle logo, authoritative yet warm smile, soft outdoor garden background with lush green lawn bokeh, natural sunlight, high-end corporate photography style, 8k quality',
    desc: 'Master Turfgrass Specialist with 22 years of professional lawn care experience. Holds a Bachelor\'s in Agronomy from Penn State and is certified by the Professional Lawn Care Institute (PLCI). Former consulting turf manager for three PGA championship courses. Published contributor to Lawn & Landscape Magazine and the Journal of Environmental Horticulture. Specializes in integrated turf nutrition programs, drought-resistant grass cultivars, and commercial-scale lawn restoration projects across USDA Zones 4-9.'
  },
  {
    slug: 'sarah-chen',
    name: 'Sarah Chen',
    prompt: 'Professional corporate headshot portrait of an Asian-American female in her early 40s, shoulder-length dark hair, wearing an elegant olive green blouse, confident knowledgeable smile, soft botanical garden background with native wildflowers, warm natural lighting, high-end corporate photography style, 8k quality',
    desc: 'Registered Horticulturist (ASHS) and landscape architect with 18 years of practice. Earned her M.S. in Horticultural Science from UC Davis with research focus on native plant ecology. Led the award-winning Urban Meadows Initiative in Portland, converting 40+ acres of traditional turf to pollinator-friendly native landscapes. Author of The Pacific Northwest Native Garden (Timber Press, 2021). Board member of the Native Plant Society and frequent keynote speaker at regional horticulture conferences.'
  },
  {
    slug: 'mike-rodriguez',
    name: 'Mike Rodriguez',
    prompt: 'Professional corporate headshot portrait of a Hispanic male in his late 40s, clean-shaven with short dark hair, wearing a khaki field shirt with rolled sleeves, friendly expert smile, outdoor park setting with mature trees in soft bokeh background, golden hour lighting, high-end corporate photography style, 8k quality',
    desc: 'Board-Certified Entomologist (BCE) and licensed landscape contractor with 19 years in integrated pest management. Holds dual certifications from the National Pest Management Association and the International Society of Arboriculture (ISA). Previously served as lead IPM consultant for the City of Austin Parks Department, managing pest programs across 12,000+ acres of public green space. Recognized by the EPA for pioneering biocontrol methods that reduced synthetic pesticide use by 68% in municipal landscapes.'
  },
  {
    slug: 'emily-watson',
    name: 'Emily Watson',
    prompt: 'Professional corporate headshot portrait of a Caucasian female in her mid-40s, auburn hair in a neat bob, wearing a professional sage green blazer, confident scholarly expression, background of mature oak trees with dappled light, soft professional lighting, high-end corporate photography style, 8k quality',
    desc: 'Board-Certified Master Arborist (BCMA) and urban forestry consultant with over 20 years of field experience. Holds a Ph.D. in Forest Pathology from the University of Georgia. Has assessed and treated more than 50,000 trees across municipal, commercial, and residential settings. Co-authored the ISA Best Management Practices for Urban Tree Risk Assessment. Serves as expert witness in tree-related legal disputes and has been featured on NPR Science Friday discussing climate adaptation strategies for urban canopies.'
  },
  {
    slug: 'david-park',
    name: 'David Park',
    prompt: 'Professional corporate headshot portrait of a Korean-American male in his early 50s, glasses, short neat black hair, wearing a crisp light blue oxford shirt, warm intellectual smile, background of a well-maintained community garden with raised beds, soft natural lighting, high-end corporate photography style, 8k quality',
    desc: 'Soil scientist and organic agriculture specialist with 21 years of research and field practice. Holds a Ph.D. in Soil Chemistry from Cornell University and is a Certified Professional Soil Scientist (CPSS) through the Soil Science Society of America. Directed the Rutgers Organic Farm Research Program for 8 years, developing soil amendment protocols adopted by over 200 organic farms nationwide. Author of Living Soil: A Practical Guide to Regenerative Gardening (Rodale Books). Active reviewer for the Soil Science Society of America Journal.'
  },
  {
    slug: 'lisa-thompson',
    name: 'Lisa Thompson',
    prompt: 'Professional corporate headshot portrait of an African-American female in her late 30s, elegant natural hair, wearing a stylish terracotta-colored linen blazer, confident creative smile, background of a beautifully designed residential garden with colorful perennials, warm afternoon light, high-end corporate photography style, 8k quality',
    desc: 'Award-winning landscape designer with 17 years of residential design experience and over 800 completed projects. Holds a B.L.A. in Landscape Architecture from the University of Florida and is a registered Landscape Architect (RLA) in 4 states. Her designs have been featured in Better Homes and Gardens, Southern Living, and the APLD International Design Awards. Pioneered the SmartScape Method — a systematic approach to creating beautiful low-maintenance gardens that reduce water usage by up to 60% while increasing property value.'
  },
  {
    slug: 'robert-hayes',
    name: 'Robert Hayes',
    prompt: 'Professional corporate headshot portrait of a rugged Caucasian male in his mid-50s, short salt-and-pepper hair, wearing a dark work shirt, experienced confident smile with slight laugh lines, background of a well-organized workshop with power tools softly blurred, warm industrial lighting, high-end corporate photography style, 8k quality',
    desc: 'Outdoor power equipment specialist and certified small-engine technician with 24 years of hands-on industry experience. Former lead product tester for Consumer Reports lawn and garden equipment division, evaluating over 500 mowers, trimmers, and blowers across 15 testing seasons. Holds ASE certification in small-engine repair and has consulted for major manufacturers including John Deere, Toro, and Husqvarna on product development. Published equipment reviewer for This Old House, Popular Mechanics, and Fine Gardening magazines.'
  },
  {
    slug: 'anna-kowalski',
    name: 'Anna Kowalski',
    prompt: 'Professional corporate headshot portrait of a Caucasian female in her early 60s, silver hair in an elegant updo, wearing a classic cream blouse with pearl necklace, warm wise smile, background of a lush four-season vegetable garden, soft morning light, high-end corporate photography style, 8k quality',
    desc: 'Master Gardener Emeritus and horticulture educator with 25 years of teaching and writing experience. Holds an M.Ed. in Agricultural Education from Michigan State University and has trained over 3,000 Master Gardener volunteers across the Midwest. Author of four gardening books including The Four-Season Harvest Handbook (Storey Publishing) and Companion Planting Decoded — an Amazon bestseller in the Organic Gardening category. Former extension agent for the USDA Cooperative Extension Service and regular contributor to Fine Gardening, Organic Gardening Magazine, and the National Gardening Association educational programs.'
  }
];

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error(`JSON parse failed: ${data.substring(0,200)}`)); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBinary(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function generateImage(prompt) {
  const body = JSON.stringify({
    model: 'qwen-image-plus',
    input: {
      messages: [{
        role: 'user',
        content: [{ text: prompt }]
      }]
    }
  });

  const result = await fetchJSON('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_KEY}`,
      'Content-Type': 'application/json'
    },
    body
  });

  const imageUrl = result?.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) throw new Error('No image URL in response: ' + JSON.stringify(result).substring(0, 200));
  return imageUrl;
}

async function uploadToAlicdn(imageUrl) {
  const uploadUrl = `https://pre-perspective.picasso.aliyun.com/v1/images/upload?url=${encodeURIComponent(imageUrl)}&token=${ALICDN_TOKEN}`;
  const result = await fetchJSON(uploadUrl);
  if (!result?.url) throw new Error('Alicdn upload failed: ' + JSON.stringify(result).substring(0, 200));
  return result.url;
}

async function main() {
  const MYSQL_URL = process.env.MYSQL_URL || 'mysql://seo_site_db_account:icbuseo%401234@rm-0xi0gf1e337s71g2a5o.rwlb.rds-aliyun-america.rds.aliyuncs.com:3306/seo-site-db';
  const u = new URL(MYSQL_URL);
  
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    disableEval: true
  });

  console.log(`Processing ${authors.length} authors...\n`);

  const results = [];

  for (const author of authors) {
    console.log(`[${author.name}] Generating image...`);
    try {
      const dashscopeUrl = await generateImage(author.prompt);
      console.log(`  ✓ Generated: ${dashscopeUrl.substring(0, 60)}...`);

      console.log(`  Uploading to alicdn...`);
      const alicdnUrl = await uploadToAlicdn(dashscopeUrl);
      console.log(`  ✓ Alicdn: ${alicdnUrl}`);

      console.log(`  Updating DB (description + image)...`);
      await conn.execute(
        'UPDATE authors SET img = ?, description = ? WHERE site = ? AND slug = ?',
        [alicdnUrl, author.desc, 'lawnsguide', author.slug]
      );
      console.log(`  ✓ DB updated\n`);

      results.push({ name: author.name, slug: author.slug, img: alicdnUrl, status: 'OK' });
    } catch (e) {
      console.error(`  ✗ ERROR: ${e.message}\n`);
      results.push({ name: author.name, slug: author.slug, status: 'FAILED', error: e.message });
    }
  }

  // Verify
  console.log('=== Verification ===');
  const [updated] = await conn.execute('SELECT name, slug, img, LEFT(description, 80) as desc_preview FROM authors WHERE site = ?', ['lawnsguide']);
  updated.forEach(a => {
    console.log(`${a.name}: img=${a.img ? 'OK' : 'MISSING'}, desc=${a.desc_preview}...`);
  });

  await conn.end();

  const ok = results.filter(r => r.status === 'OK').length;
  const fail = results.filter(r => r.status === 'FAILED').length;
  console.log(`\nDone: ${ok} OK, ${fail} FAILED`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
