#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB  = resolve(ROOT, 'web');

const satis = JSON.parse(readFileSync(resolve(ROOT, 'satis.json'), 'utf8'));

mkdirSync(WEB, { recursive: true });

// ── packages.json ─────────────────────────────────────────────────────────
// Composer repository format: https://getcomposer.org/doc/05-repositories.md
const packagesJson = {
  packages: satis.packages ?? {},
};

writeFileSync(
  resolve(WEB, 'packages.json'),
  JSON.stringify(packagesJson, null, 2) + '\n',
);

// ── index.html ────────────────────────────────────────────────────────────
const packageCount = Object.keys(satis.packages ?? {}).length;
const packageList  = Object.entries(satis.packages ?? {})
  .map(([name, versions]) => {
    const versionList = Object.keys(versions)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map(v => `<li><code>${v}</code></li>`)
      .join('');
    return `<li><strong>${name}</strong><ul>${versionList}</ul></li>`;
  })
  .join('');

writeFileSync(resolve(WEB, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${satis.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1rem; }
    pre  { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${satis.name}</h1>
  <p>${satis.description ?? ''}</p>

  <h2>Setup</h2>
  <p>Add to your <code>composer.json</code>:</p>
  <pre><code>{
  "repositories": [
    { "type": "composer", "url": "${satis.homepage}" }
  ]
}</code></pre>

  <p>Add to your <code>auth.json</code> (your Keygen license key as Bearer token):</p>
  <pre><code>{
  "bearer": {
    "api.keygen.sh": "YOUR-LICENSE-KEY"
  }
}</code></pre>

  <h2>Packages (${packageCount})</h2>
  <ul>${packageList}</ul>
</body>
</html>
`);

console.log(`✓ Built packages.json — ${packageCount} package(s) indexed.`);
