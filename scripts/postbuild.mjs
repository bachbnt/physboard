// Firebase serves /404.html for unknown URLs. Reusing the client-side shell lets the app's own
// "not found" page (and the right language) render instead of a bare error.
import { copyFileSync, existsSync } from 'node:fs';

const dir = 'dist/physboard/browser';
if (!existsSync(`${dir}/index.csr.html`)) throw new Error('Run the build first: dist/physboard/browser/index.csr.html is missing.');
copyFileSync(`${dir}/index.csr.html`, `${dir}/404.html`);
console.log('Wrote 404.html');
