/**
 * Postbuild — cache: none variant (showroom sites) — canonical v2 (2026-09-15)
 * 1) rename public/index.html → _index.html.bak (防下次 build 再进 assets 被 ASSETS 直出)
 * 2) 删除 .open-next/assets/index.html
 * 3) 屏蔽 /_next/image (404)
 * 4) ⭐ handler 返回的所有 text/html 响应强制 cache-control: no-store
 *    (覆盖 OpenNext 给静态预渲染页自带的 s-maxage=31536000 — 源码层修不掉)
 * 幂等: 对已 patch 的 worker.js 重复运行安全。锚点不匹配时报错退出(不静默失败)。
 */
import { readFileSync, writeFileSync, unlinkSync, renameSync, existsSync, readdirSync } from "fs";

// 搜索引擎验证文件白名单（内容对所有人一致，无泄露风险，必须保持可访问）
const VERIFY_RE = /^(google|yandex|bing|baidu|msn)[a-z0-9_\-]*\.html$/i;

// 1) rename 所有 public/*.html（ASSETS html_handling 会把 /about 映射到 about.html，
//    绕过 worker/middleware 直出并被 CDN 缓存 → 泄露。验证文件除外）
try {
  for (const fn of readdirSync("public")) {
    if (fn.endsWith(".html") && !VERIFY_RE.test(fn) && !fn.startsWith("_")) {
      renameSync(`public/${fn}`, `public/_${fn}.bak`);
      console.log(`✓ Renamed public/${fn} → _${fn}.bak`);
    }
  }
} catch (e) {
  console.log("(no public dir)");
}

// 2) 删除 assets 中对应副本（同样白名单验证文件）
try {
  for (const fn of readdirSync(".open-next/assets")) {
    if (fn.endsWith(".html") && !VERIFY_RE.test(fn)) {
      unlinkSync(`.open-next/assets/${fn}`);
      console.log(`✓ Deleted assets/${fn}`);
    }
  }
} catch (e) {
  console.log("(no assets dir)");
}

// 3) + 4) patch worker.js
const WORKER_PATH = ".open-next/worker.js";
let worker = readFileSync(WORKER_PATH, "utf-8");

if (!worker.includes('url.pathname === "/_next/image"')) {
  const anchor1 = `            const url = new URL(request.url);`;
  if (!worker.includes(anchor1)) {
    console.error("✗ ANCHOR1 not found (const url = new URL(request.url);) — worker.js 结构变了, 需人工适配");
    process.exit(1);
  }
  worker = worker.replace(
    anchor1,
    `            const url = new URL(request.url);
            if (url.pathname === "/_next/image") {
                return new Response("Not Found", {
                    status: 404,
                    headers: { "Cache-Control": "public, max-age=86400" }
                });
            }`
  );
  console.log("✓ Blocked /_next/image");
} else {
  console.log("✓ /_next/image already blocked");
}

if (!worker.includes("_noStoreHtml")) {
  const anchor2 = `            return handler(reqOrResp, env, ctx, request.signal);`;
  if (!worker.includes(anchor2)) {
    console.error("✗ ANCHOR2 not found (return handler(...)) — worker.js 结构变了, 需人工适配");
    process.exit(1);
  }
  worker = worker.replace(
    anchor2,
    `            const _resp = await handler(reqOrResp, env, ctx, request.signal); // _noStoreHtml
            try {
                const _ct = _resp.headers.get("content-type") || "";
                if (_ct.includes("text/html")) {
                    const _h = new Headers(_resp.headers);
                    _h.set("cache-control", "no-store");
                    return new Response(_resp.body, { status: _resp.status, statusText: _resp.statusText, headers: _h });
                }
            } catch (_) {}
            return _resp;`
  );
  console.log("✓ Enforced no-store on all HTML responses");
} else {
  console.log("✓ no-store enforcement already present");
}

writeFileSync(WORKER_PATH, worker);
console.log("[postbuild] Done (cache: none, html no-store enforced)");
