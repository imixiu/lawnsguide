/**
 * Postbuild script: inject CF Cache API into OpenNext worker.js
 * Caches GET 200 responses for content pages (1 year).
 * Skips sitemap, _next, api, and non-200 responses.
 *
 * FALLBACK: If `caches` API is unavailable or non-functional,
 * relies on Cloudflare CDN caching via Cache-Control headers.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";

const WORKER_PATH = ".open-next/worker.js";

if (!existsSync(WORKER_PATH)) {
  console.log("(skipping: .open-next/worker.js not found — run after open-next build)");
  process.exit(0);
}

const worker = readFileSync(WORKER_PATH, "utf-8");

// 1. Cache helpers with runtime detection for `caches` API availability
const cacheHelpers = `
            // --- CF Cache API (with runtime detection) ---
            const _cacheAvailable = typeof caches !== "undefined" && caches && caches.default;
            function shouldCache(url) {
                const p = new URL(url).pathname;
                if (p.startsWith("/sitemap/") || p.startsWith("/_next/") || p.startsWith("/api/")) return false;
                if (/\\\\.[a-z]{2,5}$/.test(p) && !p.endsWith(".html")) return false;
                return true;
            }
            async function cacheGet(url) {
                if (!_cacheAvailable) return null;
                try {
                    const cacheUrl = new URL(url); cacheUrl.searchParams.set("_cv", "2"); const key = new Request(cacheUrl.toString(), { method: "GET", headers: {} });
                    const hit = await caches.default.match(key);
                    if (hit) {
                        const r = new Response(hit.body, hit);
                        r.headers.set("x-cache", "HIT");
                        return r;
                    }
                } catch(e) { console.error("cacheGet error:", e); }
                return null;
            }
            async function cachePut(url, resp) {
                if (resp.status !== 200) {
                    resp.headers.set("x-cache", "SKIP-" + resp.status);
                    return resp;
                }
                try {
                    const body = await resp.clone().arrayBuffer();
                    const cacheUrl2 = new URL(url); cacheUrl2.searchParams.set("_cv", "2"); const key = new Request(cacheUrl2.toString(), { method: "GET", headers: {} });
                    const h = new Headers(resp.headers);
                    h.delete("vary");
                    h.set("cache-control", "public, max-age=315360000, s-maxage=315360000");
                    if (_cacheAvailable) {
                        await caches.default.put(key, new Response(body, { status: 200, headers: h }));
                    }
                    const rh = new Headers(resp.headers);
                    rh.set("cache-control", "public, max-age=315360000, s-maxage=315360000");
                    rh.set("x-cache", _cacheAvailable ? "MISS" : "BYPASS");
                    return new Response(body, { status: 200, headers: rh });
                } catch(e) {
                    console.error("cachePut error:", e);
                    resp.headers.set("x-cache", "ERR");
                    return resp;
                }
            }`;

// Inject after skew protection check — replaces the url declaration line
let patched = worker.replace(
    "const url = new URL(request.url);",
    cacheHelpers + "\n            const url = new URL(request.url);"
);

// 2. Cache lookup before middleware (GET check + cacheGet)
patched = patched.replace(
    /const url = new URL\(request\.url\);/,
    `const url = new URL(request.url);
            // CF Cache lookup
            if (request.method === "GET" && shouldCache(request.url)) {
                const hit = await cacheGet(request.url);
                if (hit) return hit;
            }`
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
                reqOrResp.headers.set("x-cache-debug", "middleware-response");
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


// 5. Block /_next/image at Worker entry
patched = patched.replace(
    `            const url = new URL(request.url);`,
    `            const url = new URL(request.url);
            if (url.pathname === "/_next/image") {
                return new Response("Not Found", {
                    status: 404,
                    headers: { "Cache-Control": "public, max-age=86400" }
                });
            }`
);


writeFileSync(WORKER_PATH, patched);
console.log("✓ Injected CF Cache API (caches available: " + (typeof caches !== "undefined" ? "yes" : "no") + ")");

// Delete static index.html from assets so route handler takes over
import { unlinkSync } from "fs";
try {
  unlinkSync(".open-next/assets/index.html");
  console.log("✓ Deleted .open-next/assets/index.html");
} catch(e) {
  console.log("(no static index.html to delete)");
}
