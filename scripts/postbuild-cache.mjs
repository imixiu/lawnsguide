/**
 * Postbuild script for lawnsguide
 * cache: none — 不注入任何缓存逻辑（middleware 有 showroom 302 redirect）
 * 只删除 static index.html，让 route handler 接管首页
 */
import { unlinkSync, renameSync, existsSync, readFileSync, writeFileSync } from "fs";
try {
  unlinkSync(".open-next/assets/index.html");
  console.log("✓ Deleted .open-next/assets/index.html");
} catch(e) {
  console.log("(no static index.html in assets)");
}
// Rename public/index.html → public/_index.html.bak so wrangler deploy doesn't re-upload it
if (existsSync("public/index.html")) {
  renameSync("public/index.html", "public/_index.html.bak");
  console.log("✓ Renamed public/index.html → _index.html.bak");
}

// Block /_next/image at Worker entry
const WORKER_PATH = ".open-next/worker.js";
let patched = readFileSync(WORKER_PATH, "utf-8");

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
console.log("✓ Blocked /_next/image");
