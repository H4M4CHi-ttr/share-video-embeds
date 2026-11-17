import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GENERATED_FILES, SHELL_FILES, SITE_FILES } from './site-files.mjs';
import { renderHtml } from './render-html.mjs';

const source = new URL('../docs/', import.meta.url);
const target = new URL('../dist/', import.meta.url);
const content = new Map(await Promise.all(SITE_FILES.filter(file => !GENERATED_FILES.includes(file)).map(async file => {
  const fileUrl = file === 'LICENSE' ? new URL('../LICENSE', import.meta.url) : new URL(file, source);
  return [file, await readFile(fileUrl)];
})));
const previewTest = process.argv.includes('--preview-test');
const html = content.get('index.html').toString('utf8');
for (const [language, file] of [['ja', 'index.html'], ['en', 'en.html']]) {
  let rendered = renderHtml(html, language);
  if (previewTest) {
    rendered = rendered.replace('<html lang="' + language + '">', '<html lang="' + language + '" data-preview-test="true">')
      .replace(/\s*<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->/u, '');
  }
  content.set(file, Buffer.from(rendered));
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
