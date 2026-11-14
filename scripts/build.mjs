import { mkdir, copyFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const files = ['index.html','app.mjs','youtube.mjs','player.mjs','settings.mjs','i18n.mjs','styles.css','favicon.svg','.nojekyll'];
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
for (const file of files) {
  await copyFile(new URL('../docs/' + file, import.meta.url), new URL('../dist/' + file, import.meta.url));
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.match(html, /type="module" src=".\/app.mjs"/);
assert.match(html, /strict-origin-when-cross-origin/);
console.log('Built ' + files.length + ' static files in dist/. No backend or dependencies.');
