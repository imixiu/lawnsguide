import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const JSONL_PATH = '/tmp/lawnsguide-30.jsonl';
const SITE = 'lawnsguide';

// 从 .env.local 读取 DATABASE_URL
const envContent = fs.readFileSync('/root/vercel-projects/lawnsguide/.env.local', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
if (!dbUrlMatch) throw new Error('DATABASE_URL not found in .env.local');
const DATABASE_URL = dbUrlMatch[1].trim();

async function main() {
  const lines = fs.readFileSync(JSONL_PATH, 'utf-8').trim().split('\n');
  const allArticles = [];

  for (const line of lines) {
    const obj = JSON.parse(line);
    const contentStr = obj.response.body.choices[0].message.content;
    const articles = JSON.parse(contentStr);
    allArticles.push(...articles);
  }

  console.log(`Total articles parsed: ${allArticles.length}`);

  let inserted = 0;
  for (const art of allArticles) {
    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const publishedTime = new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000);
    const modifiedTime = publishedTime;

    await client.query(
      `INSERT INTO articles (site, type, short_title, language, published_time, modified_time, author, img, title, description, url, body, tag, is_online)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT DO NOTHING`,
      [
        art.site,
        art.type,
        art.short_title,
        art.language,
        publishedTime,
        modifiedTime,
        'emma-davis',
        `https://picsum.photos/seed/${art.short_title}/1024/576`,
        art.title,
        art.description,
        `/${art.type}/${art.short_title}`,
        art.body,
        art.type,
        '1'
      ]
    );

    await client.end();
    inserted++;
    if (inserted % 10 === 0) console.log(`Inserted ${inserted}/${allArticles.length}`);
  }

  console.log(`\nImport complete: ${inserted} articles written to DB`);
}

main().catch(console.error);
