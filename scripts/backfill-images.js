#!/usr/bin/env node
/**
 * progradelist image backfill — generate Qwen images for articles without img
 * MySQL version with checkpoint/resume, high concurrency, batch DB updates
 * 
 * Usage:
 *   cd /data/vercel-projects/progradelist
 *   node --env-file=.env.local scripts/backfill-images.js [--shard N --total-shards M]
 * 
 * ENV: MYSQL_URL, DASHSCOPE_API_KEY (in .env.local)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ── Config ──
const SITE = 'lawnsguide';
const SITE_TOPIC = 'lawn care, gardening, landscaping, lawn maintenance, turf management, outdoor living, pest control, tree care';
const CONCURRENCY = parseInt(process.env.IMG_CONCURRENCY || '3');
const BATCH_SIZE = 50;           // DB fetch batch
const UPDATE_BATCH = 20;         // DB update batch size
const MAX_RETRIES = 3;           // Max retries on rate limit
const RETRY_DELAY_MS = 5000;     // Base delay for rate limit retry
const INTER_BATCH_DELAY_MS = 1000; // Delay between batches
const QWEN_API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const CDN_API = 'https://ranking.alibaba.com/verticalSite/image2cdn.json';
const CDN_TOKEN = 'alibaba-icbu-seo-image-to-alicdn-verify';

// ── Parse args ──
const args = process.argv.slice(2);
let SHARD = 0, TOTAL_SHARDS = 1;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--shard') SHARD = parseInt(args[++i]);
  if (args[i] === '--total-shards') TOTAL_SHARDS = parseInt(args[++i]);
}

const CHECKPOINT_FILE = `/tmp/progradelist_img_checkpoint_s${SHARD}.json`;

const DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY || 'sk-b11580cc1fec4c2a814a8a97e3dfd7d1';

// ── Stats ──
let stats = { success: 0, failed: 0, skipped: 0, cdnFail: 0, genFail: 0, start: Date.now() };

// ── Checkpoint ──
function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    }
  } catch {}
  return { lastId: 0 };
}

function saveCheckpoint(lastId) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ lastId }));
}

// ── Qwen Image Generation ──
async function generateImage(title, articleType) {
  const prompt = `Professional editorial photography for a ${SITE_TOPIC} article.\n` +
    `Category: ${articleType}.\n` +
    `Article title: "${title}"\n` +
    `Style: high quality, vivid colors, clean modern composition, natural lighting. No text, no watermark, no overlay.`;

  const resp = await fetch(QWEN_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DASHSCOPE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-image-plus',
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: { size: '1024*576' }
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await resp.json();
  const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!ossUrl) throw new Error(`No image: ${JSON.stringify(data).substring(0, 150)}`);
  return ossUrl;
}

// ── CDN Transfer ──
async function transferToCdn(ossUrl) {
  const encoded = encodeURIComponent(ossUrl);
  const url = `${CDN_API}?url=${encoded}&token=${CDN_TOKEN}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  const data = await resp.json();
  if (data?.code !== 200) throw new Error(`CDN error: ${JSON.stringify(data).substring(0, 100)}`);
  return data.cdn_url;
}

// ── Process one article with retry ──
async function processArticle(article) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ossUrl = await generateImage(article.title, article.type);
      const cdnUrl = await transferToCdn(ossUrl);
      return { id: article.id, img: cdnUrl, ok: true };
    } catch (e) {
      const isRateLimit = e.message.includes('RateQuota') || e.message.includes('Throttling');
      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (isRateLimit) stats.genFail++;
      else if (e.message.includes('CDN')) stats.cdnFail++;
      else stats.genFail++;
      return { id: article.id, ok: false, error: e.message.substring(0, 80) };
    }
  }
}

// ── Main ──
async function main() {
  const u = new URL(process.env.MYSQL_URL);
  const pool = await mysql.createPool({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    connectTimeout: 15000,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });

  // Count total
  const [cntRows] = await pool.query(
    "SELECT COUNT(*) as cnt FROM articles WHERE site=? AND (img IS NULL OR img = '')",
    [SITE]
  );
  const total = cntRows[0].cnt;

  // Checkpoint
  const checkpoint = loadCheckpoint();
  let lastId = checkpoint.lastId;

  console.log(`═══════════════════════════════════════════════`);
  console.log(`  progradelist image backfill`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  Total without images: ${total.toLocaleString()}`);
  console.log(`  Resume from ID:       ${lastId}`);
  console.log(`  Concurrency:          ${CONCURRENCY}`);
  console.log(`  Shard:                ${SHARD}/${TOTAL_SHARDS}`);
  console.log(`  CDN Token:            ${CDN_TOKEN.substring(0, 15)}...`);
  console.log(`═══════════════════════════════════════════════\n`);

  if (total === 0) {
    console.log('All articles already have images!');
    await pool.end();
    return;
  }

  let processed = 0;
  let running = true;

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, finishing current batch...');
    running = false;
  });
  process.on('SIGTERM', () => {
    console.log('\n⚠️  Received SIGTERM, finishing current batch...');
    running = false;
  });

  while (running) {
    // Fetch batch
    let query = "SELECT id, title, type FROM articles WHERE site=? AND (img IS NULL OR img = '') AND id > ? ORDER BY id LIMIT ?";
    let params = [SITE, lastId, BATCH_SIZE];
    
    if (TOTAL_SHARDS > 1) {
      query = "SELECT id, title, type FROM articles WHERE site=? AND (img IS NULL OR img = '') AND id > ? AND MOD(id, ?) = ? ORDER BY id LIMIT ?";
      params = [SITE, lastId, TOTAL_SHARDS, SHARD, BATCH_SIZE];
    }

    const [batch] = await pool.query(query, params);
    if (batch.length === 0) {
      console.log('\n✅ All articles processed!');
      break;
    }

    // Process batch concurrently
    const results = await Promise.all(batch.map(a => processArticle(a)));

    // Collect successful updates
    const updates = results.filter(r => r.ok);
    const failures = results.filter(r => !r.ok);

    // Batch DB update using CASE/WHEN
    if (updates.length > 0) {
      const whenClauses = updates.map(u => `WHEN ${u.id} THEN ?`).join(' ');
      const idList = updates.map(u => u.id).join(',');
      const params = updates.map(u => u.img);
      try {
        await pool.query(
          `UPDATE articles SET img = CASE id ${whenClauses} END WHERE id IN (${idList})`,
          params
        );
      } catch (e) {
        // Fallback: individual updates
        for (const u of updates) {
          try {
            await pool.query('UPDATE articles SET img = ? WHERE id = ?', [u.img, u.id]);
          } catch (e2) {
            console.log(`  ❌ DB update failed for ID ${u.id}: ${e2.message.substring(0, 50)}`);
          }
        }
      }
    }

    // Update stats
    stats.success += updates.length;
    stats.failed += failures.length;
    processed += batch.length;
    lastId = batch[batch.length - 1].id;

    // Progress report every 50 articles
    const elapsed = (Date.now() - stats.start) / 1000;
    const rate = stats.success / elapsed;
    const remaining = total - stats.success - stats.failed - stats.skipped;
    const etaH = rate > 0 ? (remaining / rate / 3600) : 0;

    if (processed % 50 < BATCH_SIZE || batch.length < BATCH_SIZE) {
      console.log(
        `[${processed}/${total}] ✓${stats.success} ✗${stats.failed} (gen:${stats.genFail} cdn:${stats.cdnFail}) ` +
        `${rate.toFixed(1)}/s ETA:${etaH.toFixed(1)}h | lastId:${lastId}`
      );
    }

    // Log first few failures
    for (const f of failures.slice(0, 3)) {
      console.log(`  ❌ ID:${f.id} ${f.error}`);
    }

    // Save checkpoint
    saveCheckpoint(lastId);

    // Inter-batch delay to avoid rate limits
    await new Promise(r => setTimeout(r, INTER_BATCH_DELAY_MS));
  }

  const elapsed = (Date.now() - stats.start) / 1000;
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Complete!`);
  console.log(`  Success: ${stats.success}`);
  console.log(`  Failed:  ${stats.failed} (gen:${stats.genFail} cdn:${stats.cdnFail})`);
  console.log(`  Time:    ${elapsed.toFixed(0)}s (${(elapsed/3600).toFixed(1)}h)`);
  console.log(`  Rate:    ${(stats.success/elapsed).toFixed(1)} img/s`);
  console.log(`═══════════════════════════════════════════════`);

  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
