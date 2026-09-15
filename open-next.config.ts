import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';

const config = {
  // Prevent recursion: package.json "build" itself calls opennext build, and
  // opennext's default buildCommand is `npm run build` → infinite loop.
  buildCommand: "NEXT_PRIVATE_TURBOPACK=0 npx next build",
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
} satisfies OpenNextConfig;

export default config;
