import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { SITE_FILES } from './site-files.mjs';

const base = '/share-video-embeds/';
const files = new Set(SITE_FILES);
const types = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  svg: 'image/svg+xml',
  webmanifest: 'application/manifest+json; charset=utf-8',
  png: 'image/png',
};

http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let url;
  try { url = new URL(request.url, 'http://localhost'); }
  catch { response.writeHead(400).end(); return; }
  if (url.pathname === '/' || url.pathname === base.slice(0, -1)) {
    response.writeHead(302, { Location: base + url.search }).end();
    return;
  }
  const file = url.pathname.startsWith(base) ? url.pathname.slice(base.length) || 'index.html' : '';
  if (!files.has(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL('../dist/' + file, import.meta.url));
    const type = types[file.split('.').at(-1)] || 'text/plain';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(request.method === 'GET' ? body : undefined);
  } catch {
    response.writeHead(500).end('Run npm run build first.');
  }
}).listen(5188, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:5188' + base));
