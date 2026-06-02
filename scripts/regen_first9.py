#!/usr/bin/env python3
"""Regenerate first 9 articles (fix body/img) and UPDATE in DB."""

import os, re, random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import psycopg2

load_dotenv("/root/vercel-projects/lawnsguide/.env.local")
DATABASE_URL = os.environ["DATABASE_URL"]
SITE = "lawnsguide"
SCORE_THRESHOLD = 80

TARGETS = [
    ("lawn-care", "how-often-should-you-water-your-lawn-in-summer"),
    ("lawn-care", "best-time-to-fertilize-lawn-spring-vs-fall"),
    ("lawn-care", "why-your-grass-turns-yellow-and-how-to-fix-it"),
    ("lawn-care", "mowing-height-guide-for-different-grass-types"),
    ("landscaping", "low-maintenance-front-yard-landscaping-ideas"),
    ("landscaping", "how-to-build-a-garden-path-with-stepping-stones"),
    ("landscaping", "backyard-privacy-landscaping-plants-and-fences"),
    ("landscaping", "drought-tolerant-landscaping-ideas-for-dry-climates"),
    ("pest-control", "how-to-get-rid-of-grubs-in-your-lawn-naturally"),
]

TOPIC_PROMPTS = {
    "lawn-care": "Focus on specific mowing schedules, watering frequencies (gallons/week), fertilizer NPK ratios, and seasonal timing. Include real product names and university extension research citations.",
    "landscaping": "Include specific plant species with Latin names, cost estimates in USD, square footage calculations, and real project examples from specific US regions.",
    "pest-control": "Include pest identification with scientific names, infestation thresholds (insects per sq ft), specific pesticide active ingredients, and integrated pest management (IPM) data.",
}

FORBIDDEN_TITLES = ["About ", "Why ", "Types and Variants", "Key Features", "Pros and Cons",
                    "How to Choose", "Conclusion", "FAQs", "The Bottom Line", "In Summary"]
FORBIDDEN_PHRASES = ["In conclusion", "Comprehensive guide", "Ultimate guide", "Delve into",
                     "Navigating the world", "Unveil the secrets", "In today's fast-paced",
                     "Look no further", "Whether you're a beginner", "Dive deep into",
                     "Tapestry", "Testament to", "Embark on a journey"]

def score_article(html):
    score = 90
    text = re.sub(r'<[^>]+>', '', html)
    headings = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', html, re.I | re.S)
    heading_text = ' '.join(re.sub(r'<[^>]+>', '', h) for h in headings)
    for f in FORBIDDEN_TITLES:
        if f.lower() in heading_text.lower(): score -= 15; break
    for f in FORBIDDEN_PHRASES:
        if f.lower() in html.lower(): score -= 15; break
    if len(text) < 3000: score -= 10
    h2 = len(re.findall(r'<h2', html)); h3 = len(re.findall(r'<h3', html))
    p = len(re.findall(r'<p', html)); ul = len(re.findall(r'<ul|<ol', html))
    tbl = len(re.findall(r'<table', html)); bq = len(re.findall(r'<blockquote', html))
    if not (h2>=5 and h3>=3 and p>=15 and ul>=2 and (tbl>=1 or bq>=1)): score -= 10
    nums = re.findall(r'\b\d+\.?\d*\s*(?:%|degrees?|inches?|feet|foot|lbs?|gallons?|sq\.?\s*ft|weeks?|days?|months?|years?|°[FC]|hours?|per\s+\w+)', text, re.I)
    standalone = re.findall(r'\b\d{2,}\b', text)
    if len(nums) + len(standalone) < 5: score -= 10
    citations = re.findall(r'(?:University|Institute|USDA|EPA|ISA|Journal|Study|Research|according to)[^.]{0,80}\d{4}', text, re.I)
    if len(citations) < 2: score -= 10
    named = re.findall(r'\b[A-Z][a-zA-Z&\s\.]+(?:University|College|Institute|Extension|State|County|City|Farm|Garden|Park|Department|Association|Foundation)\b', text)
    if len(named) < 3: score -= 10
    sentences = re.split(r'[.!?]', text)
    lengths = [len(s.split()) for s in sentences if len(s.split()) > 3]
    if lengths:
        avg = sum(lengths)/len(lengths)
        if sum((l-avg)**2 for l in lengths)/len(lengths) < 10: score -= 10
    return max(0, score)

def generate_article_html(type_, short_title, title):
    import anthropic
    hermes_env = {}
    with open('/root/.hermes/profiles/theme-site-worker/.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                hermes_env[k] = v
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
- 2+ citations with organization name and year
- 3+ real named locations or institutions
- Start directly with the first h2 or introductory paragraph

FORBIDDEN section headings: About [X], Why [X] Is Gaining Popularity, Types and Variants, Key Features and Benefits, Pros and Cons, How to Choose, Conclusion, FAQs, The Bottom Line, In Summary
FORBIDDEN phrases: "In conclusion", "Comprehensive guide", "Ultimate guide", "Delve into", "Navigating the world of", "Unveil the secrets", "In today's fast-paced", "Look no further", "Whether you're a beginner", "Dive deep into", "Tapestry", "Testament to", "Embark on a journey"

Output ONLY the HTML body content, no markdown fences, no wrapper article tags."""
    resp = client.messages.create(model="claude-opus-4-6", max_tokens=4096,
        messages=[{"role": "user", "content": prompt}], timeout=300)
    html = resp.content[0].text.strip()
    html = re.sub(r'^```html?\s*', '', html)
    html = re.sub(r'\s*```$', '', html)
    return html

def generate_cover_image(short_title, type_):
    import urllib.request, json, subprocess
    env = {}
    with open(f'/root/vercel-projects/{SITE}/.env.local') as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k] = v.strip('"')
    api_key = env.get('DASHSCOPE_API_KEY', '')
    blob_token = env.get('BLOB_READ_WRITE_TOKEN', '')
    title_readable = short_title.replace('-', ' ').title()
    prompt = f"Professional blog cover photo for an article about {title_readable}. {TOPIC_PROMPTS.get(type_, 'lawn and garden')}. Clean editorial style, natural lighting, no text overlay."
    data = json.dumps({"model": "qwen-image-plus",
        "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
        "parameters": {"size": "1024*576"}}).encode()
    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
        data=data, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
    oss_url = result["output"]["choices"][0]["message"]["content"][0]["image"]
    tmp_path = f"/tmp/lawnsguide-{short_title}.png"
    urllib.request.urlretrieve(oss_url, tmp_path)
    if not blob_token:
        return oss_url
    result = subprocess.run(
        ["npx", "vercel", "blob", "put", tmp_path,
         "--pathname", f"covers/lawnsguide/{short_title}.png",
         "--access", "public", "--rw-token", blob_token],
        cwd=f"/root/vercel-projects/{SITE}", capture_output=True, text=True, timeout=60)
    os.remove(tmp_path)
    if result.returncode != 0:
        return oss_url
    return json.loads(result.stdout)[0]["url"]

def update_article(short_title, body, img, pub_time):
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE articles SET body=%s, img=%s, published_time=%s, modified_time=%s WHERE site=%s AND short_title=%s",
                        (body, img, pub_time, pub_time + timedelta(days=random.randint(1,30)), SITE, short_title))
        conn.commit()
    finally:
        conn.close()

def process_one(args):
    idx, total, type_, short_title = args
    title = short_title.replace('-', ' ').title()
    print(f"[{idx}/{total}] Generating: {short_title} ...", end=" ", flush=True)
    html = None
    for attempt in range(3):
        try:
            html = generate_article_html(type_, short_title, title)
            sc = score_article(html)
            print(f"score={sc}", end=" ", flush=True)
            if sc >= SCORE_THRESHOLD: break
            print(f"(retry {attempt+1})", end=" ", flush=True)
            html = None
        except Exception as e:
            print(f"ERROR:{e}", end=" ", flush=True)
            html = None
    if not html:
        print("FAIL", flush=True)
        return False
    img_url = ''
    try:
        print("img...", end=" ", flush=True)
        img_url = generate_cover_image(short_title, type_)
        print("img OK", end=" ", flush=True)
    except Exception as e:
        print(f"img FAIL({e})", end=" ", flush=True)
    update_article(short_title, html, img_url, datetime.now())
    print("DB OK", flush=True)
    return True

def main():
    from concurrent.futures import ThreadPoolExecutor, as_completed
    total = len(TARGETS)
    tasks = [(i+1, total, t, s) for i, (t, s) in enumerate(TARGETS)]
    written = failed = 0
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_one, t): t for t in tasks}
        for f in as_completed(futures):
            if f.result(): written += 1
            else: failed += 1
    print(f"\nDone! Updated {written}/{total}, failed {failed}")

if __name__ == "__main__":
    main()
