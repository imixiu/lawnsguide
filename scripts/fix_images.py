#!/usr/bin/env python3
"""Re-generate Vercel Blob images for articles that still have OSS temporary URLs."""

import os, re, json, urllib.request, subprocess
from dotenv import load_dotenv
import psycopg2

load_dotenv("/root/vercel-projects/lawnsguide/.env.local")
DATABASE_URL = os.environ["DATABASE_URL"]
SITE = "lawnsguide"

env = {}
with open(f"/root/vercel-projects/{SITE}/.env.local") as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip('"')

DASHSCOPE_API_KEY = env.get("DASHSCOPE_API_KEY", "")
BLOB_TOKEN = env.get("BLOB_READ_WRITE_TOKEN", "")

TOPIC_PROMPTS = {
    "lawn-care": "lawn care, grass, fertilizer, mowing",
    "landscaping": "landscaping, garden design, plants",
    "pest-control": "pest control, lawn pests, insects",
    "tree-care": "tree care, pruning, arborist",
    "gardening": "vegetable garden, planting, soil",
    "home-garden": "home garden tools, outdoor living",
}


def generate_blob_image(short_title: str, type_: str) -> str:
    title_readable = short_title.replace("-", " ").title()
    topic_hint = TOPIC_PROMPTS.get(type_, type_)
    prompt = (f"Professional blog cover photo for an article about {title_readable}. "
              f"{topic_hint}. Clean editorial style, natural lighting, no text overlay.")

    data = json.dumps({
        "model": "qwen-image-plus",
        "input": {"messages": [{"role": "user", "content": [{"text": prompt}]}]},
        "parameters": {"size": "1024*576"},
    }).encode()
    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
        data=data,
        headers={"Authorization": f"Bearer {DASHSCOPE_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        result = json.loads(r.read())
    oss_url = result["output"]["choices"][0]["message"]["content"][0]["image"]

    UNSPLASH = "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1024&h=576&fit=crop"
    tmp_path = f"/tmp/{SITE}-fix-{short_title}.png"
    try:
        urllib.request.urlretrieve(oss_url, tmp_path)
        if os.path.getsize(tmp_path) < 1024:
            return UNSPLASH
    except Exception:
        return UNSPLASH

    result = subprocess.run(
        ["npx", "vercel", "blob", "put", tmp_path,
         "--pathname", f"covers/{SITE}/{short_title}.png",
         "--access", "public", "--allow-overwrite", "true", "--rw-token", BLOB_TOKEN],
        cwd=f"/root/vercel-projects/{SITE}",
        capture_output=True, text=True, timeout=60,
    )
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
    for line in (result.stdout + result.stderr).splitlines():
        if line.startswith("> Success!"):
            return line.split("> Success! ", 1)[1].strip()
    return UNSPLASH


def main():
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT short_title, type FROM articles WHERE site=%s AND (img LIKE %s OR img LIKE %s)",
            (SITE, "%oss-cn-%", "%unsplash.com%")
        )
        rows = cur.fetchall()
    conn.close()

    print(f"Found {len(rows)} articles with OSS temporary URLs", flush=True)

    fixed = failed = 0
    for short_title, type_ in rows:
        print(f"Fixing {short_title} ...", end=" ", flush=True)
        try:
            blob_url = generate_blob_image(short_title, type_)
            conn = psycopg2.connect(DATABASE_URL)
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE articles SET img=%s WHERE site=%s AND short_title=%s",
                        (blob_url, SITE, short_title)
                    )
                conn.commit()
            finally:
                conn.close()
            print(f"OK -> {blob_url[:60]}...", flush=True)
            fixed += 1
        except Exception as e:
            print(f"FAIL: {e}", flush=True)
            failed += 1

    print(f"\nDone. Fixed: {fixed}, Failed: {failed}")


if __name__ == "__main__":
    main()
