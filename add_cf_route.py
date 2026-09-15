#!/usr/bin/env python3
"""Add a Cloudflare Worker route for lawnsguide.com"""
import subprocess
import json
import os
import sys

# Get token from environment (available in terminal session)
token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not token:
    # Try to get from wrangler config
    result = subprocess.run(
        ["bash", "-c", "echo $CLOUDFLARE_API_TOKEN"],
        capture_output=True, text=True
    )
    token = result.stdout.strip()

if not token:
    print("ERROR: CLOUDFLARE_API_TOKEN not set")
    sys.exit(1)

account_id = "25e5887649f21af7f2869497017cb46f"
url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/routes"
payload = json.dumps({"pattern": "lawnsguide.com/*", "script": "lawnsguide"})

# Use curl directly via subprocess
cmd = [
    "curl", "-s",
    "--request", "POST",
    url,
    "--header", f"Authorization: Bearer {token}",
    "--header", "Content-Type: application/json",
    "--data", payload
]

result = subprocess.run(cmd, capture_output=True, text=True)
print("Response:", result.stdout)
if result.stderr:
    print("Stderr:", result.stderr)
