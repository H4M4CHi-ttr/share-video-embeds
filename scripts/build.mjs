import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { SHELL_FILES, SITE_FILES } from './site-files.mjs';

const source = new URL('../docs/', import.meta.url);
const target = new URL('../dist/', import.meta.url);
const content = new Map(await Promise.all(SITE_FILES.map(async file =>
  [file, await readFile(new URL(file, source))]
)));
const previewTest = process.argv.includes('--preview-test');
const html = content.get('index.html').toString('utf8');
if (previewTest) {
  content.set('index.html', Buffer.from(html.replace('<html lang="ja">', '<html lang="ja" data-preview-test="true">')));
}
assert.match(html, /type="module" src="\.\/app.mjs"/);
assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
assert.match(html, /content="strict-origin"/);

const hash = createHash('sha256');
for (const [file, bytes] of content) {
  hash.update(file).update('\0').update(String(bytes.length) + ':').update(bytes);
}
const version = hash.digest('hex').slice(0, 16);

for (const [file, bytes] of content) {
  if (file === 'sw.js') continue;
  await mkdir(new URL('./', new URL(file, target)), { recursive: true });
  await writeFile(new URL(file, target), bytes);
}
const configuration = 'const CACHE_VERSION = ' + JSON.stringify(version) + ';\n'
  + 'const SHELL_FILES = ' + JSON.stringify(SHELL_FILES) + ';\n\n';
await writeFile(new URL('sw.js', target), configuration + content.get('sw.js'));
console.log('Built ' + SITE_FILES.length + ' static files in dist/ (' + (previewTest ? 'local preview test' : 'link converter') + ').');
