import { put } from '@vercel/blob';
import { readFileSync } from 'fs';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^\"|\"$/g, '');
  }
  return env;
}
const siteEnv = loadEnv('/root/vercel-projects/lawnsguide/.env.local');
const hermesEnv = loadEnv('/root/.hermes/profiles/theme-site-worker/.env');

const prompt = 'Professional lawn care photo. Green grass, natural lighting.';

console.log('Calling DashScope API...');
const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
  method: 'POST',
  headers: { Authorization: `Bearer ${hermesEnv.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'qwen-image-plus', input: { messages: [{ role: 'user', content: [{ text: prompt }] }] }, parameters: { size: '1024*576' } }),
});
const data = await res.json();
console.log('Response:', JSON.stringify(data).slice(0, 300));

const ossUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image;
if (!ossUrl) {
  console.log('No image URL');
  process.exit(1);
}

console.log('OSS URL:', ossUrl.slice(0, 80));
console.log('Downloading...');
const imgBuf = Buffer.from(await (await fetch(ossUrl)).arrayBuffer());
console.log('Image size:', imgBuf.length);

console.log('Uploading to Vercel Blob...');
const blob = await put('covers/lawnsguide/test.png', imgBuf, {
  access: 'public', token: siteEnv.BLOB_READ_WRITE_TOKEN, allowOverwrite: true, contentType: 'image/png'
});
console.log('Blob URL:', blob.url);
