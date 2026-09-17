import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Prevent recursion: package.json "build" itself calls opennext build, and
// opennext's default buildCommand is `npm run build` → infinite loop.
// Pin the internal build to plain next build. (opennext 1.19.11 — trap confirmed.)
const config = defineCloudflareConfig({});
config.buildCommand = "NEXT_PRIVATE_TURBOPACK=0 npx next build";

export default config;
