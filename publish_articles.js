require('dotenv').config({ path: '/root/vercel-projects/lawnsguide/.env.local' });
const mysql = require('mysql2/promise');

const articles = [
  {
    site: 'lawnsguide',
    short_title: 'fix-brown-patches-lawn-after-summer',
    title: 'How to Fix Brown Patches in Your Lawn After Summer Heat',
    body: `<h2>Why Brown Patches Form in Summer</h2>
<p>Summer heat stress is the most common cause of brown patches in residential lawns. When temperatures consistently exceed 90°F (32°C), grass blades go dormant to conserve water. This natural survival mechanism looks alarming but is often reversible with proper care.</p>

<h3>Identifying the Root Cause</h3>
<p>Before treating brown patches, determine whether the damage comes from heat stress, drought, fungal infection, or pest activity. Heat-stressed grass typically shows uniform browning across sunny areas, while fungal infections create circular patterns with distinct edges.</p>

<h2>Step-by-Step Recovery Process</h2>

<h3>1. Deep Watering</h3>
<p>Apply 1 to 1.5 inches of water per week in a single deep watering session. Shallow daily watering encourages shallow root systems that are more vulnerable to heat. Use a tuna can on your lawn to measure water depth — when the can fills, you have applied approximately 1 inch.</p>

<h3>2. Aeration</h3>
<p>Core aeration relieves soil compaction and allows water and oxygen to reach grassroots. Rent a core aerator from your local garden center and make two passes over affected areas — one north-south and one east-west.</p>

<h3>3. Overseeding</h3>
<p>For cool-season grasses like fescue and Kentucky bluegrass, overseed brown areas in early fall when soil temperatures are between 50-65°F (10-18°C). Use a seed-to-soil contact roller after spreading seed at the recommended rate on the package.</p>

<h3>4. Topdressing</h3>
<p>Apply a thin layer (1/4 inch) of compost over seeded areas. This protects seeds from birds, retains moisture, and adds beneficial microorganisms to the soil.</p>

<h2>Prevention for Next Summer</h2>
<ul>
<li><strong>Mow higher:</strong> Keep grass at 3-4 inches during summer to shade soil and reduce water evaporation</li>
<li><strong>Water early:</strong> Irrigate between 6-8 AM to minimize evaporation and fungal growth</li>
<li><strong>Avoid summer fertilizing:</strong> High-nitrogen fertilizers push tender growth that burns in heat</li>
<li><strong>Leave clippings:</strong> Grass clippings return moisture and nutrients to the soil</li>
</ul>

<h2>When to Call a Professional</h2>
<p>If brown patches persist after 3-4 weeks of proper watering and care, the problem may be a soil-borne disease or grub infestation. A lawn care professional can perform a soil test and recommend targeted treatments.</p>`,
    description: 'Learn how to identify and fix brown patches in your lawn caused by summer heat stress. Step-by-step recovery guide with watering, aeration, and overseeding tips.',
    type: 'lawn-care',
    author: 'Sarah Chen',
    img: 'https://img.alicdn.com/imgextra/i2/O1CN01Z5z5z51Vz5z5z5z5z_!!6000000002716-0-tps-1200-630.jpg'
  },
  {
    site: 'lawnsguide',
    short_title: 'best-trees-small-yards-2026',
    title: 'Best Trees for Small Yards in 2026: Compact Shade Solutions',
    body: `<h2>Why Choose Compact Trees for Small Spaces</h2>
<p>Small yards need trees that provide maximum impact without overwhelming the space. The right compact tree delivers shade, privacy, and seasonal interest while staying within a manageable footprint. In 2026, urban gardeners are increasingly turning to dwarf and columnar varieties that mature under 20 feet tall.</p>

<h3>Key Selection Criteria</h3>
<p>When choosing a tree for a small yard, consider mature height and spread, root system behavior (avoid aggressive roots near foundations), seasonal interest (flowers, fall color, or winter bark), and maintenance requirements.</p>

<h2>Top 5 Trees for Small Yards</h2>

<h3>1. Japanese Maple (Acer palmatum)</h3>
<p><strong>Mature size:</strong> 15-25 feet tall and wide. Japanese maples are the gold standard for small-space landscaping. Varieties like \'Crimson Queen\' stay under 10 feet with stunning deep-red foliage that turns brilliant orange in fall. They thrive in partial shade and well-drained soil.</p>

<h3>2. Columnar European Hornbeam (Carpinus betulus \'Fastigiata\')</h3>
<p><strong>Mature size:</strong> 30-40 feet tall, only 10-15 feet wide. This narrow tree is perfect for creating a privacy screen or accent planting along property lines. Dense, muscle-leaf foliage provides excellent screening and turns yellow-orange in autumn.</p>

<h3>3. Serviceberry (Amelanchier arborea)</h3>
<p><strong>Mature size:</strong> 15-25 feet tall and wide. Serviceberry delivers four seasons of interest: white spring flowers, edible summer berries, spectacular fall color, and attractive gray bark in winter. It is native to eastern North America and supports pollinators.</p>

<h3>4. Dwarf Alberta Spruce (Picea glauca \'Conica\')</h3>
<p><strong>Mature size:</strong> 10-12 feet tall and wide. This slow-growing evergreen (3-6 inches per year) maintains its perfect conical shape without pruning. Ideal as a foundation plant or container specimen. Extremely cold-hardy to Zone 2.</p>

<h3>5. Crape Myrtle (Lagerstroemia indica)</h3>
<p><strong>Mature size:</strong> 15-25 feet tall and wide (dwarf varieties under 10 feet). Crape myrtles bloom for 100+ days in summer with vibrant pink, red, white, or purple flowers. They also have exfoliating bark that looks striking in winter. Best in full sun and well-drained soil.</p>

<h2>Planting Tips for Small Yards</h2>
<ul>
<li><strong>Measure twice:</strong> Account for overhead utility lines, underground utilities, and proximity to structures</li>
<li><strong>Right tree, right place:</strong> Match sun exposure and soil type to the tree\'s requirements</li>
<li><strong>Consider the canopy:</strong> A tree that grows 20 feet wide needs 10 feet of clearance from structures</li>
<li><strong>Plan for the future:</strong> What looks small now will grow — always plant based on mature size</li>
</ul>`,
    description: 'Discover the best compact trees for small yards in 2026. Top 5 picks including Japanese Maple, Serviceberry, and Crape Myrtle with planting tips.',
    type: 'tree-care',
    author: 'Mike Rodriguez',
    img: 'https://img.alicdn.com/imgextra/i3/O1CN01Y6y6y61Wy6y6y6y6y_!!6000000002717-0-tps-1200-630.jpg'
  }
];

async function main() {
  const url = process.env.MYSQL_URL;
  const u = new URL(url);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  });

  const sql = `INSERT INTO articles 
    (site, short_title, title, body, description, type, language, author, is_online, published_time, modified_time, img)
    VALUES (?, ?, ?, ?, ?, ?, 'en', ?, 'Y', NOW(), NOW(), ?)`;

  const ids = [];
  for (const a of articles) {
    const [result] = await conn.query(sql, [
      a.site, a.short_title, a.title, a.body, a.description, a.type, a.author, a.img
    ]);
    ids.push(result.insertId);
    console.log(`Published: "${a.title}" (ID: ${result.insertId}, type: ${a.type}, author: ${a.author})`);
    console.log(`  Title length: ${a.title.length} chars (limit 60)`);
    console.log(`  Desc length: ${a.description.length} chars (limit 155)`);
  }

  console.log(`\nPublished ${ids.length} articles. IDs: ${ids.join(', ')}`);
  await conn.end();
}
main().catch(e => { console.error(e.message); });
