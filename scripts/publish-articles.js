
const mysql = require('mysql2/promise');
const mysqlUrl = process.env.MYSQL_URL;
if (!mysqlUrl) { console.error('No MYSQL_URL'); process.exit(1); }

const articles = [
  {
    short_title: 'how-to-choose-right-lawn-mower-size-yard',
    title: 'How to Choose the Right Lawn Mower for Your Yard Size',
    body: `<h2>Why Lawn Mower Size Matters</h2>
<p>Choosing the wrong lawn mower can waste hours of your weekend and leave your lawn looking uneven. The right mower depends on your yard size, grass type, and terrain.</p>
<h2>Small Yards (Under 5,000 sq ft)</h2>
<p>For compact lawns, a <strong>push reel mower</strong> or <strong>cordless electric mower</strong> with a 14-16 inch deck is ideal. These are lightweight, quiet, and zero-emission. Models like the Greenworks 40V or Fiskars reel mower handle small spaces effortlessly.</p>
<h2>Medium Yards (5,000–15,000 sq ft)</h2>
<p>A <strong>self-propelled gas or battery mower</strong> with a 20-21 inch deck saves time and effort. Look for adjustable cutting heights and mulching capability. Popular choices include Honda HRX and Toro Recycler series.</p>
<h2>Large Yards (15,000+ sq ft)</h2>
<p>For expansive lawns, consider a <strong>riding mower</strong> or <strong>lawn tractor</strong>. These cut mowing time by 70% or more. Zero-turn mowers offer the best maneuverability around trees and garden beds.</p>
<h2>Key Features to Compare</h2>
<ul>
<li><strong>Cutting width</strong>: Wider decks = fewer passes = faster mowing</li>
<li><strong>Deck material</strong>: Steel is durable; aluminum won't rust</li>
<li><strong>Mulching vs bagging</strong>: Mulching returns nutrients to soil</li>
<li><strong>Adjustable height</strong>: Look for single-lever adjustment for convenience</li>
</ul>
<h2>Seasonal Mowing Tips</h2>
<p>Keep your mower blades sharp — dull blades tear grass instead of cutting it, inviting disease. Change oil and air filters each spring for gas mowers. Store batteries indoors during winter for cordless models.</p>`,
    description: 'Learn how to choose the perfect lawn mower based on yard size. Compare push, self-propelled, and riding mowers for every lawn.',
    type: 'lawn-care',
    author: 'Sarah Chen'
  },
  {
    short_title: 'best-companion-plants-vegetable-garden-2026',
    title: 'Best Companion Plants for Vegetable Gardens in 2026',
    body: `<h2>What Is Companion Planting?</h2>
<p>Companion planting grows mutually beneficial plants together. Some combinations repel pests, improve soil nutrients, or provide shade for sensitive crops.</p>
<h2>Top Companion Plant Combinations</h2>
<h3>Tomatoes + Basil + Marigolds</h3>
<p>This classic trio works because basil repels tomato hornworms and improves flavor, while marigolds deter nematodes in the soil. Plant basil 6-8 inches from tomato stems and ring beds with marigolds.</p>
<h3>Carrots + Onions</h3>
<p>Onions mask the scent of carrots, deterring carrot fly. In return, carrots loosen soil for onion root development. Alternate rows for best results.</p>
<h3>Beans + Corn + Squash (Three Sisters)</h3>
<p>This Native American method stacks crops vertically: corn provides structure, beans fix nitrogen, and squash leaves shade soil to suppress weeds.</p>
<h2>Plants to Keep Apart</h2>
<ul>
<li><strong>Tomatoes and brassicas</strong> (cabbage, broccoli): compete for nutrients</li>
<li><strong>Onions and beans</strong>: onion compounds inhibit bean growth</li>
<li><strong>Potatoes and tomatoes</strong>: both susceptible to blight</li>
</ul>
<h2>Seasonal Companion Planning</h2>
<p>Start cool-season companions (peas + lettuce) in early spring. Switch to warm-season combos (tomatoes + basil) after last frost. Plan fall plantings with kale + herbs for extended harvest.</p>`,
    description: 'Discover the best companion planting combinations for vegetable gardens. Boost yields and deter pests naturally with proven pairings.',
    type: 'gardening',
    author: 'Emily Watson'
  },
  {
    short_title: 'how-to-prevent-snow-mold-lawn-winter-prep',
    title: 'How to Prevent Snow Mold on Your Lawn Before Winter',
    body: `<h2>What Is Snow Mold?</h2>
<p>Snow mold is a fungal disease that appears under snow cover during winter. Two types affect lawns: <strong>gray snow mold</strong> (Typhula blight) damages grass blades, while <strong>pink snow mold</strong> (Microdochium patch) kills crowns and roots.</p>
<h2>Signs of Snow Mold</h2>
<p>In early spring, look for circular patches of matted, discolored grass — gray mold shows straw-colored patches; pink mold displays pinkish fungal threads at patch edges.</p>
<h2>Prevention Strategies</h2>
<h3>1. Final Mow Before Winter</h3>
<p>Cut your lawn shorter for the last mow of the season — about 1.5-2 inches. Long grass mats down under snow, creating ideal conditions for fungal growth.</p>
<h3>2. Remove Fallen Leaves</h3>
<p>Clear all leaves before the first snow. Trapped leaves hold moisture against grass blades and create perfect fungal habitats.</p>
<h3>3. Avoid Late-Season Nitrogen</h3>
<p>Stop applying high-nitrogen fertilizer 6 weeks before expected first snow. Late nitrogen promotes tender growth susceptible to disease. Switch to potassium-rich fall fertilizer instead.</p>
<h3>4. Improve Drainage</h3>
<p>Aerate compacted areas in fall. Better drainage means less standing water under snow cover.</p>
<h2>Treating Snow Mold in Spring</h2>
<ul>
<li>Rake affected patches gently to dry out matted grass</li>
<li>Apply fungicide if pink snow mold is present (it kills crowns)</li>
<li>Overseed bare spots once soil reaches 50°F</li>
<li>Most gray snow mold lawns recover naturally as grass resumes growth</li>
</ul>`,
    description: 'Learn how to prevent snow mold damage to your lawn. Follow these fall prep steps to protect grass from winter fungal disease.',
    type: 'lawn-care',
    author: 'Mike Rodriguez'
  }
];

async function run() {
  const u = new URL(mysqlUrl);
  const conn = await mysql.createConnection({
    host: u.hostname, port: parseInt(u.port||'3306'),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//,''),
  });
  
  const sql = `INSERT INTO articles (site, short_title, title, body, description, type, language, author, is_online, published_time, modified_time) VALUES ('lawnsguide', ?, ?, ?, ?, ?, 'en', ?, 'Y', NOW(), NOW())`;
  
  const ids = [];
  for (const a of articles) {
    const tlen = a.title.length;
    const dlen = a.description.length;
    if (tlen > 60) { console.error('Title too long (' + tlen + '): ' + a.title); process.exit(1); }
    if (dlen > 155) { console.error('Description too long (' + dlen + '): ' + a.description); process.exit(1); }
    const r = await conn.query(sql, [a.short_title, a.title, a.body, a.description, a.type, a.author]);
    ids.push(r[0].insertId);
  }
  console.log('Published IDs:', ids.join(', '));
  console.log('Titles:');
  articles.forEach(a => console.log('  "' + a.title + '" (' + a.title.length + ' chars)'));
  console.log('Descriptions:');
  articles.forEach(a => console.log('  "' + a.description + '" (' + a.description.length + ' chars)'));
  
  await conn.end();
}
run().catch(e => console.error(e.message));
