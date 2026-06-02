#!/usr/bin/env python3
"""Generate articles for lawnsguide and insert into Neon DB."""

import os, re, time, random, asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
import psycopg2

load_dotenv("/root/vercel-projects/lawnsguide/.env.local")
DATABASE_URL = os.environ["DATABASE_URL"]

SITE = "lawnsguide"
START_DATE = datetime(2025, 5, 26)
CONCURRENCY = 5
SCORE_THRESHOLD = 80  # max score is 90 after removing HTML structure check

AUTHORS = [
    "james-miller", "sarah-chen", "mike-rodriguez", "emily-watson",
    "david-park", "lisa-thompson", "robert-hayes", "anna-kowalski"
]

IDEAS = [
    ("lawn-care", "how-often-should-you-water-your-lawn-in-summer"),
    ("lawn-care", "best-time-to-fertilize-lawn-spring-vs-fall"),
    ("lawn-care", "why-your-grass-turns-yellow-and-how-to-fix-it"),
    ("lawn-care", "mowing-height-guide-for-different-grass-types"),
    ("landscaping", "low-maintenance-front-yard-landscaping-ideas"),
    ("landscaping", "how-to-build-a-garden-path-with-stepping-stones"),
    ("landscaping", "backyard-privacy-landscaping-plants-and-fences"),
    ("landscaping", "drought-tolerant-landscaping-ideas-for-dry-climates"),
    ("pest-control", "how-to-get-rid-of-grubs-in-your-lawn-naturally"),
    ("pest-control", "common-lawn-weeds-and-how-to-remove-them"),
    ("pest-control", "signs-of-lawn-fungus-and-treatment-options"),
    ("tree-care", "when-and-how-to-prune-trees-for-healthy-growth"),
    ("tree-care", "best-shade-trees-for-small-backyards"),
    ("tree-care", "how-to-plant-a-tree-correctly-step-by-step"),
    ("gardening", "beginner-vegetable-garden-layout-and-planting-guide"),
    ("gardening", "companion-planting-combinations-that-actually-work"),
    ("gardening", "how-to-start-a-raised-bed-garden-from-scratch"),
    ("home-garden", "essential-lawn-and-garden-tools-every-homeowner-needs"),
    ("home-garden", "outdoor-living-space-ideas-for-small-backyards"),
    ("home-garden", "how-to-compost-at-home-for-a-healthier-garden"),
]

TOPIC_PROMPTS = {
    "lawn-care": "Focus on specific mowing schedules, watering frequencies (gallons/week), fertilizer NPK ratios, and seasonal timing. Include real product names and university extension research citations.",
    "landscaping": "Include specific plant species with Latin names, cost estimates in USD, square footage calculations, and real project examples from specific US regions.",
    "pest-control": "Include pest identification with scientific names, infestation thresholds (insects per sq ft), specific pesticide active ingredients, and integrated pest management (IPM) data.",
    "tree-care": "Include tree species with growth rates (ft/year), pruning timing by USDA hardiness zone, root spread ratios, and arborist certification references (ISA standards).",
    "gardening": "Include planting dates by zone, spacing in inches, yield estimates (lbs per plant), soil pH requirements, and companion planting research citations.",
    "home-garden": "Include tool specifications (blade width, weight), ergonomic ratings, price ranges, maintenance schedules, and real brand comparisons.",
}

FORBIDDEN_TITLES = [
    "About ", "Why ", "Types and Variants", "Key Features", "Pros and Cons",
    "How to Choose", "Conclusion", "FAQs", "The Bottom Line", "In Summary"
]
FORBIDDEN_PHRASES = [
    "In conclusion", "Comprehensive guide", "Ultimate guide", "Delve into",
    "Navigating the world", "Unveil the secrets", "In today's fast-paced",
    "Look no further", "Whether you're a beginner", "Dive deep into",
    "Tapestry", "Testament to", "Embark on a journey"
]

def get_existing(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT short_title FROM articles WHERE site=%s", (SITE,))
        return {r[0] for r in cur.fetchall()}

def score_article(html: str, title: str) -> int:
    score = 90  # max is 90 (HTML structure check removed)
    text = re.sub(r'<[^>]+>', '', html)

    # Forbidden titles (15pts) — only check h2/h3 headings, not full text
    headings = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', html, re.I | re.S)
    heading_text = ' '.join(re.sub(r'<[^>]+>', '', h) for h in headings)
    for f in FORBIDDEN_TITLES:
        if f.lower() in heading_text.lower():
            score -= 15
            break

    # Forbidden phrases (15pts)
    for f in FORBIDDEN_PHRASES:
        if f.lower() in html.lower():
            score -= 15
            break

    # Text length (10pts)
    if len(text) < 3000:
        score -= 10

    # Element counts (10pts)
    h2 = len(re.findall(r'<h2', html))
    h3 = len(re.findall(r'<h3', html))
    p  = len(re.findall(r'<p',  html))
    ul = len(re.findall(r'<ul|<ol', html))
    tbl = len(re.findall(r'<table', html))
    bq  = len(re.findall(r'<blockquote', html))
    if not (h2>=5 and h3>=3 and p>=15 and ul>=2 and (tbl>=1 or bq>=1)):
        score -= 10

    # Data points (10pts) — any number with context
    nums = re.findall(r'\b\d+\.?\d*\s*(?:%|degrees?|inches?|feet|foot|lbs?|pounds?|gallons?|sq\.?\s*ft|mph|psi|weeks?|days?|months?|years?|°[FC]|times?|hours?|minutes?|per\s+\w+)', text, re.I)
    # Also count standalone numbers >= 2 digits as data points
    standalone = re.findall(r'\b\d{2,}\b', text)
    if len(nums) + len(standalone) < 5:
        score -= 10

    # Citations (10pts)
    citations = re.findall(r'(?:University|Institute|USDA|EPA|ISA|Journal|Study|Research|according to)[^.]{0,80}\d{4}', text, re.I)
    if len(citations) < 2:
        score -= 10

    # Real cases (10pts) — named institutions/locations
    named = re.findall(r'\b[A-Z][a-zA-Z&\s\.]+(?:University|College|Institute|Extension|State|County|City|Farm|Garden|Park|Department|Association|Foundation)\b', text)
    if len(named) < 3:
        score -= 10

    # Writing quality (10pts) — basic check: sentence variety
    sentences = re.split(r'[.!?]', text)
    lengths = [len(s.split()) for s in sentences if len(s.split()) > 3]
    if lengths:
        avg = sum(lengths)/len(lengths)
        variance = sum((l-avg)**2 for l in lengths)/len(lengths)
        if variance < 10:
            score -= 10

    return max(0, score)

def load_hermes_env():
    hermes_env = {}
    with open('/root/.hermes/profiles/theme-site-worker/.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                hermes_env[k] = v
    return hermes_env

def generate_article_html(type_: str, short_title: str, title: str) -> str:
    """Call Anthropic claude-opus-4-6 to generate article body HTML (no title/author/date)."""
    import anthropic
    hermes_env = load_hermes_env()
    client = anthropic.Anthropic(
        api_key=hermes_env['ANTHROPIC_API_KEY'],
        base_url=hermes_env.get('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
    )

    topic_hint = TOPIC_PROMPTS.get(type_, "")
    prompt = f"""Write a high-quality blog article body for a lawn and garden website.

Title: {title}
Category: {type_}

Topic guidance: {topic_hint}

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

Output ONLY the HTML body content, no markdown fences, no wrapper article tags."""

    resp = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
        timeout=300,
    )
    html = resp.content[0].text.strip()
    html = re.sub(r'^```html?\s*', '', html)
    html = re.sub(r'\s*```$', '', html)
    return html

def generate_cover_image(short_title: str, type_: str, description: str) -> str:
    """Generate cover image via DashScope, upload to Vercel Blob, return permanent URL."""
    import urllib.request, json, subprocess

    # Read keys from .env.local
    env = {}
    with open(f'/root/vercel-projects/{SITE}/.env.local') as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k] = v.strip('"')

    api_key = env.get('DASHSCOPE_API_KEY', '')
    blob_token = env.get('BLOB_READ_WRITE_TOKEN', '')

    type_context = TOPIC_PROMPTS.get(type_, 'lawn and garden')
    title_readable = short_title.replace('-', ' ').title()
    prompt = f"Professional blog cover photo for an article about {title_readable}. {type_context}. Clean editorial style, natural lighting, no text overlay."

    data = json.dumps({
        "model": "qwen-image-plus",
        "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
        "parameters": {"size": "1024*576"}
    }).encode()

    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
        data=data,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
    oss_url = result["output"]["choices"][0]["message"]["content"][0]["image"]

    # Download
    tmp_path = f"/tmp/lawnsguide-{short_title}.png"
    urllib.request.urlretrieve(oss_url, tmp_path)
    if os.path.getsize(tmp_path) < 1024:
        return "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1024&h=576&fit=crop"

    if not blob_token:
        return "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1024&h=576&fit=crop"

    # Upload to Vercel Blob
    result = subprocess.run(
        ["npx", "vercel", "blob", "put", tmp_path,
         "--pathname", f"covers/lawnsguide/{short_title}.png",
         "--access", "public", "--allow-overwrite", "true", "--rw-token", blob_token],
        cwd=f"/root/vercel-projects/{SITE}",
        capture_output=True, text=True, timeout=60
    )
    os.remove(tmp_path)
    if result.returncode != 0:
        return oss_url
    for line in (result.stdout + result.stderr).splitlines():
        if line.startswith("> Success!"):
            return line.split("> Success! ", 1)[1].strip()
    return "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1024&h=576&fit=crop"

def insert_article(data: dict):
    """Open a fresh connection per insert to avoid SSL timeout."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO articles (site, type, short_title, language, published_time, modified_time,
                    author, img, title, description, url, body, tag, is_online)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, (data['site'], data['type'], data['short_title'], data['language'],
                  data['published_time'], data['modified_time'], data['author'],
                  data['img'], data['title'], data['description'],
                  data['url'], data['body'], data['tag'], data['is_online']))
        conn.commit()
    finally:
        conn.close()

def assign_dates(ideas, start_date):
    """Assign published_time: go backwards from start_date, 2-3 articles/author/day, weekdays only."""
    assignments = []
    date = start_date
    author_idx = 0
    i = 0
    while i < len(ideas):
        if date.weekday() < 5:  # Mon-Fri
            slots = min(3, len(ideas) - i)
            for _ in range(slots):
                # Random time HH:MM:SS during working hours
                pub_dt = date.replace(
                    hour=random.randint(8, 20),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )
                assignments.append((ideas[i], AUTHORS[author_idx % len(AUTHORS)], pub_dt))
                author_idx += 1
                i += 1
        date -= timedelta(days=1)
    return assignments

def slug_from_short_title(short_title: str) -> str:
    return short_title.lower().replace(' ', '-')

def title_from_short_title(short_title: str) -> str:
    return short_title.replace('-', ' ').title()

def process_one(args):
    idx, total, type_, short_title, author, pub_date = args
    title = title_from_short_title(short_title)
    print(f"[{idx}/{total}] Generating: {short_title} ...", end=" ", flush=True)

    html = None
    for attempt in range(3):
        try:
            html = generate_article_html(type_, short_title, title)
            sc = score_article(html, title)
            print(f"score={sc}", end=" ", flush=True)
            if sc >= SCORE_THRESHOLD:
                break
            print(f"(retry {attempt+1})", end=" ", flush=True)
            html = None
        except Exception as e:
            print(f"ERROR:{e}", end=" ", flush=True)
            html = None

    if not html:
        print("FAIL", flush=True)
        return False

    description = f"Learn about {title.lower()} with expert tips and data-backed advice."
    img_url = ''
    try:
        print("img...", end=" ", flush=True)
        img_url = generate_cover_image(short_title, type_, description)
        print("img OK", end=" ", flush=True)
    except Exception as e:
        print(f"img FAIL({e})", end=" ", flush=True)

    url = f"/{type_}/{short_title}"
    now = datetime.now()
    mod_date = now + timedelta(days=random.randint(1, 30))
    insert_article({
        'site': SITE, 'type': type_, 'short_title': short_title, 'language': 'en',
        'published_time': now, 'modified_time': mod_date,
        'author': author, 'img': img_url,
        'title': title, 'description': description,
        'url': url, 'body': html, 'tag': type_, 'is_online': '1'
    })
    print(f"DB OK", flush=True)
    return True

def main():
    from concurrent.futures import ThreadPoolExecutor, as_completed

    conn = psycopg2.connect(DATABASE_URL)
    existing = get_existing(conn)
    conn.close()
    print(f"Existing articles in DB: {len(existing)}", flush=True)

    assignments = assign_dates(IDEAS, START_DATE)
    total = len(IDEAS)

    tasks = []
    for idx, ((type_, short_title), author, pub_date) in enumerate(assignments, 1):
        if short_title in existing:
            print(f"[{idx}/{total}] SKIP (exists): {short_title}", flush=True)
            continue
        tasks.append((idx, total, type_, short_title, author, pub_date))

    written = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_one, t): t for t in tasks}
        for f in as_completed(futures):
            if f.result():
                written += 1
            else:
                failed += 1

    rate = round((written / (written + failed)) * 100) if (written + failed) > 0 else 0
    print(f"""
Articles Done!

Site: {SITE}
Topics: 6 topics
Articles written: {written}/{total}
Quality pass rate: {rate}%
DB: Neon (ep-fancy-leaf-a4zukau9)
""")

if __name__ == "__main__":
    main()
