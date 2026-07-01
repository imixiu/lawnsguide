/**
 * Postbuild script: inject CF Cache API into OpenNext worker.js
 * Caches GET 200 responses for content pages (10 years).
 * Skips sitemap, _next, api, and non-200 responses.
 *
 * Usage:
 *   cp this-file scripts/postbuild-cache.mjs
 *   npx @opennextjs/cloudflare build
 *   node scripts/postbuild-cache.mjs
 *   npx wrangler deploy
 */
import { readFileSync, writeFileSync } from "fs";

const WORKER_PATH = ".open-next/worker.js";
const worker = readFileSync(WORKER_PATH, "utf-8");

// 1. Cache helpers
const cacheHelpers = `
            // --- CF Cache API ---
            function shouldCache(url) {
                const p = new URL(url).pathname;
                if (p.startsWith("/sitemap/") || p.startsWith("/_next/") || p.startsWith("/api/")) return false;
                if (/\\.[a-z]{2,5}$/.test(p) && !p.endsWith(".html")) return false;
                return true;
            }
            async function cacheGet(url) {
                try {
                    const key = new Request(url, { method: "GET", headers: {} });
                    const hit = await caches.default.match(key);
                    if (hit) {
                        const r = new Response(hit.body, hit);
                        r.headers.set("x-cache", "HIT");
                        return r;
                    }
                } catch(e) {}
                return null;
            }
            async function cachePut(url, resp) {
                if (resp.status !== 200) {
                    resp.headers.set("x-cache", "SKIP-" + resp.status);
                    return resp;
                }
                try {
                    const body = await resp.arrayBuffer();
                    const key = new Request(url, { method: "GET", headers: {} });
                    const h = new Headers(resp.headers);
                    h.delete("vary");
                    h.set("cache-control", "public, max-age=315360000, s-maxage=315360000");
                    await caches.default.put(key, new Response(body, { status: 200, headers: h }));
                    const rh = new Headers(resp.headers);
                    rh.set("cache-control", "public, max-age=315360000, s-maxage=315360000");
                    rh.set("x-cache", "MISS");
                    return new Response(body, { status: 200, headers: rh });
                } catch(e) {
                    resp.headers.set("x-cache", "ERR");
                    return resp;
                }
            }`;

// Inject after skew protection check
let patched = worker.replace(
    "const url = new URL(request.url);",
    cacheHelpers + "\n            const url = new URL(request.url);"
);

// 2. Bot block + cache lookup before middleware
// Bot blocking MUST happen before cache lookup, otherwise bots get cached 200 responses
const lastHelperLine = cacheHelpers.split("\n").pop().trim();
patched = patched.replace(
    lastHelperLine + "\n            const url = new URL(request.url);",
    lastHelperLine + `
            // Bot block before cache
            const botUa = (request.headers.get("user-agent") || "").toLowerCase();
            if (botUa.includes("semrush") || botUa.includes("ahrefsbot") || botUa.includes("ahrefs")) {
                return new Response("Forbidden", { status: 403 });
            }
            if (request.method === "GET" && shouldCache(request.url)) {
                const hit = await cacheGet(request.url);
                if (hit) return hit;
            }
            const url = new URL(request.url);`
);

// 3. Intercept middleware Response return
patched = patched.replace(
    `            if (reqOrResp instanceof Response) {
                return reqOrResp;
            }`,
    `            if (reqOrResp instanceof Response) {
                if (request.method === "GET" && shouldCache(request.url)) {
                    return await cachePut(request.url, reqOrResp);
                }
                return reqOrResp;
            }`
);

// 4. Intercept handler return
patched = patched.replace(
    `            return handler(reqOrResp, env, ctx, request.signal);`,
    `            const resp = await handler(reqOrResp, env, ctx, request.signal);
            if (request.method === "GET" && shouldCache(request.url)) {
                return await cachePut(request.url, resp);
            }
            return resp;`
);

// 5. Add bot check before the SECOND cacheGet injection point (handler-level)
// The worker.js may have TWO separate `if (request.method === "GET" && shouldCache` blocks.
// Step 2 only adds bot check before the first one. If there's a second, add it here.
const cacheLookupLine = 'if (request.method === "GET" && shouldCache(request.url)) {\n                const hit = await cacheGet(request.url);';
const botBlockForSecond = `const _botUa = (request.headers.get("user-agent") || "").toLowerCase();
            if (_botUa.includes("semrush") || _botUa.includes("ahrefsbot") || _botUa.includes("ahrefs")) {
                return new Response("Forbidden", { status: 403 });
            }
            `;
const occurrences = patched.split(cacheLookupLine).length - 1;
if (occurrences > 1) {
    let firstDone = false;
    patched = patched.replace(
        new RegExp(cacheLookupLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        (match) => {
            if (!firstDone) { firstDone = true; return match; }
            return botBlockForSecond + match;
        }
    );
}

writeFileSync(WORKER_PATH, patched);
console.log("✓ Injected CF Cache API (URL+status-based, middleware+handler)");

// Verify bot blocking is in ALL cache paths
const botCount = (patched.match(/semrush/g) || []).length;
if (botCount < 2) {
  console.log("⚠️ Bot check found in only " + botCount + " location(s) — expected ≥2.");
  console.log("   Manually add bot UA check before ALL 'if (request.method === \"GET\" && shouldCache' blocks.");
}

// Delete static index.html from assets so route handler takes over
import { unlinkSync } from "fs";
try {
  unlinkSync(".open-next/assets/index.html");
  console.log("✓ Deleted .open-next/assets/index.html");
} catch(e) {
  console.log("(no static index.html to delete)");
}
