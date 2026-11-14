import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Set(['index.html','app.mjs','youtube.mjs','player.mjs','settings.mjs','i18n.mjs','styles.css','favicon.svg','.nojekyll']);
const types = {html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
http.createServer(async (request,response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (!files.has(file)) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(new URL('../dist/' + file, import.meta.url));
    response.writeHead(200, {'Content-Type':types[file.split('.').at(-1)] || 'text/plain','Cache-Control':'no-store'}).end(body);
  } catch { response.writeHead(500).end('Run npm run build first.'); }
}).listen(5188, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:5188/'));
