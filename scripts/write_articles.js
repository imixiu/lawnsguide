#!/usr/bin/env node
/**
 * Write 2 new tree-care articles by Emily Watson
 * - Generate HTML body via Anthropic Claude
 * - Generate cover image via DashScope
 * - Insert into MySQL DB
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// ── Config ──
const SITE = 'lawnsguide';
const AUTHOR = 'Emily Watson';
const TYPE = 'tree-care';
const SCORE_THRESHOLD = 80;

// Parse .env.local
const envContent = fs.readFileSync('/root/vercel-projects/lawnsguide/.env.local', 'utf-8');
const MYSQL_URL = envContent.match(/MYSQL_URL=(.+)/)[1].trim();
const DASHSCOPE_API_KEY = envContent.match(/DASHSCOPE_API_KEY=(.+)/)?.[1]?.trim() || '';
const BLOB_TOKEN = envContent.match(/BLOB_READ_WRITE_TOKEN=(.+)/)?.[1]?.trim() || '';

// Parse hermes env for Anthropic key
const hermesEnv = {};
const hermesEnvContent = fs.readFileSync('/root/.hermes/profiles/theme-site-worker/.env', 'utf-8');
for (const line of hermesEnvContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...v] = trimmed.split('=');
    hermesEnv[k] = v.join('=');
  }
}

// ── Article ideas (check against existing) ──
const ARTICLES = [
  {
    short_title: 'identify-treat-bacterial-wetwood-slime-flux-trees',
    title: 'How to Identify and Treat Bacterial Wetwood (Slime Flux) in Trees',
    description: 'Learn how to spot bacterial wetwood slime flux in trees and what treatment options actually work. Expert arborist advice included.',
  },
  {
    short_title: 'best-trees-rain-garden-bioswale-planting',
    title: 'Best Trees for Rain Gardens and Bioswales: Selection Guide',
    description: 'Discover the best tree species for rain gardens and bioswales that tolerate wet soil and help manage stormwater naturally.',
  },
];

// ── Scoring ──
const FORBIDDEN_TITLES = ['About ', 'Why ', 'Types and Variants', 'Key Features', 'Pros and Cons', 'How to Choose', 'Conclusion', 'FAQs', 'The Bottom Line', 'In Summary'];
const FORBIDDEN_PHRASES = ['In conclusion', 'Comprehensive guide', 'Ultimate guide', 'Delve into', 'Navigating the world', 'Unveil the secrets', "In today's fast-paced", 'Look no further', "Whether you're a beginner", 'Dive deep into', 'Tapestry', 'Testament to', 'Embark on a journey'];

function scoreArticle(html) {
  let score = 90;
  const text = html.replace(/<[^>]+>/g, '');
  
  const headings = html.match(/<h[23][^>]*>(.*?)<\/h[23]>/gis) || [];
  const headingText = headings.map(h => h.replace(/<[^>]+>/g, '')).join(' ');
  for (const f of FORBIDDEN_TITLES) {
    if (headingText.toLowerCase().includes(f.toLowerCase())) { score -= 15; break; }
  }
  for (const f of FORBIDDEN_PHRASES) {
    if (html.toLowerCase().includes(f.toLowerCase())) { score -= 15; break; }
  }
  if (text.length < 3000) score -= 10;
  
  const h2 = (html.match(/<h2/g) || []).length;
  const h3 = (html.match(/<h3/g) || []).length;
  const p = (html.match(/<p/g) || []).length;
  const ul = (html.match(/<ul|<ol/g) || []).length;
  const tbl = (html.match(/<table/g) || []).length;
  const bq = (html.match(/<blockquote/g) || []).length;
  if (!(h2 >= 5 && h3 >= 3 && p >= 15 && ul >= 2 && (tbl >= 1 || bq >= 1))) score -= 10;
  
  const nums = text.match(/\b\d+\.?\d*\s*(?:%|degrees?|inches?|feet|foot|lbs?|pounds?|gallons?|sq\.?\s*ft|mph|psi|weeks?|days?|months?|years?|°[FC]|times?|hours?|minutes?|per\s+\w+)/gi) || [];
  const standalone = text.match(/\b\d{2,}\b/g) || [];
  if (nums.length + standalone.length < 5) score -= 10;
  
  const citations = text.match(/(?:University|Institute|USDA|EPA|ISA|Journal|Study|Research|according to)[^.]{0,80}\d{4}/gi) || [];
  if (citations.length < 2) score -= 10;
  
  const named = text.match(/\b[A-Z][a-zA-Z&\s\.]+(?:University|College|Institute|Extension|State|County|City|Farm|Garden|Park|Department|Association|Foundation)\b/g) || [];
  if (named.length < 3) score -= 10;
  
  const sentences = text.split(/[.!?]/).filter(s => s.split(' ').length > 3);
  const lengths = sentences.map(s => s.split(' ').length);
  if (lengths.length > 0) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
    if (variance < 10) score -= 10;
  }
  
  return Math.max(0, score);
}

// ── Generate HTML via Anthropic ──
async function generateHTML(title, type) {
  const anthropic = require('@anthropic-ai/sdk');
  const client = new anthropic({
    apiKey: hermesEnv.ANTHROPIC_API_KEY,
    baseURL: hermesEnv.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  });

  const topicHint = "Include tree species with growth rates (ft/year), pruning timing by USDA hardiness zone, root spread ratios, and arborist certification references (ISA standards).";
  
  const prompt = `Write a high-quality blog article body for a lawn and garden website.

Title: ${title}
Category: ${type}

Topic guidance: ${topicHint}

REQUIREMENTS:
- Output ONLY the article body content — NO title, NO author name, NO date, NO byline
- Pure text >= 3000 characters
- 5+ h2 headings, 3+ h3 headings, 15+ paragraphs
- 2+ ul/ol lists, 1+ table, 1+ blockquote
- 5+ specific data points with numbers/percentages/measurements
- 2+ citations with organization name and year (e.g. "According to USDA research in 2023...")
- 3+ real named locations or institutions (e.g. "Texas A&M University", "Midwest region")
- Start directly with the first h2 or introductory paragraph

FORBIDDEN section headings: About [X], Why [X] Is Gaining Popularity, Types and Variants, Key Features and Benefits, Pros and Cons, How to Choose, Conclusion, FAQs, The Bottom Line, In Summary

FORBIDDEN phrases: "In conclusion", "Comprehensive guide", "Ultimate guide", "Delve into", "Navigating the world of", "Unveil the secrets", "In today's fast-paced", "Look no further", "Whether you're a beginner", "Dive deep into", "Tapestry", "Testament to", "Embark on a journey"

Output ONLY the HTML body content, no markdown fences, no wrapper article tags.`;

  const resp = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  
  let html = resp.content[0].text.trim();
  html = html.replace(/^```html?\s*/, '').replace(/\s*```$/, '');
  return html;
}

// ── Generate cover image ──
async function generateCover(shortTitle, type, description) {
  if (!DASHSCOPE_API_KEY || !BLOB_TOKEN) {
    console.log('  Skip cover (no API keys)');
    return '';
  }
  
  const titleReadable = shortTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const promptText = `Professional blog cover photo for an article about ${titleReadable}. Clean editorial style, natural lighting, no text overlay.`;
  
  const postData = JSON.stringify({
    model: 'qwen-image-plus',
    input: { messages: [{ role: 'user', content: [{ text: promptText }] }] },
    parameters: { size: '1024*576' }
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const ossUrl = result.output.choices[0].message.content[0].image;
          resolve(ossUrl);
        } catch (e) {
          resolve('');
        }
      });
    });
    req.on('error', () => resolve(''));
    req.write(postData);
    req.end();
  });
}

// ── Upload to Vercel Blob ──
async function uploadToBlob(localPath, pathname) {
  try {
    const result = execSync(
      `npx vercel blob put "${localPath}" --pathname "${pathname}" --access public --allow-overwrite true --rw-token "${BLOB_TOKEN}"`,
      { cwd: '/root/vercel-projects/lawnsguide', timeout: 60000, encoding: 'utf-8' }
    );
    for (const line of result.split('\n')) {
      if (line.startsWith('> Success!')) return line.replace('> Success! ', '').trim();
    }
    return '';
  } catch {
    return '';
  }
}

// ── Insert into DB ──
async function insertArticle(data) {
  const u = new URL(MYSQL_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  });
  
  try {
    const [result] = await conn.query(
      `INSERT INTO articles (site, type, short_title, language, published_time, modified_time,
        author, img, title, description, url, body, tag, is_online)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.site, data.type, data.short_title, data.language,
       data.published_time, data.modified_time, data.author,
       data.img, data.title, data.description,
       data.url, data.body, data.tag, data.is_online]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

// ── Check existing ──
async function checkExisting() {
  const u = new URL(MYSQL_URL);
  const conn = await mysql.createConnection({
    host: u.hostname, port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  });
  try {
    const [rows] = await conn.query(
      "SELECT short_title FROM articles WHERE site=? AND type='tree-care'",
      [SITE]
    );
    return new Set(rows.map(r => r.short_title));
  } finally {
    await conn.end();
  }
}

// ── Main ──
async function main() {
  const existing = await checkExisting();
  console.log(`Existing tree-care articles: ${existing.size}`);
  
  const inserted = [];
  
  for (const article of ARTICLES) {
    if (existing.has(article.short_title)) {
      console.log(`SKIP (exists): ${article.short_title}`);
      continue;
    }
    
    console.log(`\n[${ARTICLES.indexOf(article) + 1}/${ARTICLES.length}] ${article.short_title}`);
    
    // Generate HTML (up to 3 attempts)
    let html = null;
    let bestScore = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`  Generating HTML (attempt ${attempt + 1})...`);
        html = await generateHTML(article.title, TYPE);
        const score = scoreArticle(html);
        console.log(`  Score: ${score}`);
        if (score > bestScore) bestScore = score;
        if (score >= SCORE_THRESHOLD) break;
        console.log(`  Below threshold, retrying...`);
        html = null;
      } catch (e) {
        console.log(`  ERROR: ${e.message}`);
        html = null;
      }
    }
    
    if (!html) {
      console.log(`  FAIL: Could not generate acceptable HTML`);
      continue;
    }
    
    // Generate cover image
    let imgUrl = '';
    try {
      console.log('  Generating cover image...');
      const ossUrl = await generateCover(article.short_title, TYPE, article.description);
      if (ossUrl && BLOB_TOKEN) {
        const tmpPath = `/tmp/lawnsguide-${article.short_title}.png`;
        // Download
        const downloadPromise = new Promise((resolve, reject) => {
          https.get(ossUrl, (res) => {
            const ws = fs.createWriteStream(tmpPath);
            res.pipe(ws);
            ws.on('finish', () => resolve(tmpPath));
          }).on('error', reject);
        });
        await downloadPromise;
        
        if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 1024) {
          console.log('  Uploading to Blob...');
          imgUrl = await uploadToBlob(tmpPath, `covers/lawnsguide/${article.short_title}.png`);
          fs.unlinkSync(tmpPath);
        }
        if (!imgUrl) imgUrl = ossUrl;
      } else if (ossUrl) {
        imgUrl = ossUrl;
      }
      console.log(`  Cover: ${imgUrl ? 'OK' : 'FAIL (using fallback)'}`);
    } catch (e) {
      console.log(`  Cover FAIL: ${e.message}`);
    }
    
    // Insert
    const now = new Date();
    const modDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const url = `/${TYPE}/${article.short_title}`;
    
    const insertId = await insertArticle({
      site: SITE, type: TYPE, short_title: article.short_title, language: 'en',
      published_time: now, modified_time: modDate,
      author: AUTHOR, img: imgUrl,
      title: article.title, description: article.description,
      url, body: html, tag: TYPE, is_online: '1',
    });
    
    console.log(`  DB OK (ID: ${insertId})`);
    inserted.push({ id: insertId, title: article.title, short_title: article.short_title });
  }
  
  console.log(`\nDone! Inserted ${inserted.length} articles:`);
  for (const a of inserted) {
    console.log(`  - ${a.title} (ID: ${a.id})`);
  }
  
  return inserted;
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
