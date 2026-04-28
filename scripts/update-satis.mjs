#!/usr/bin/env node
/**
 * Upserts or deletes a version entry in satis.json.
 *
 * Usage:
 *   node scripts/update-satis.mjs add    <package> <version> <dist_url>
 *   node scripts/update-satis.mjs remove <package> <version>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT      = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SATIS_PATH = resolve(ROOT, 'satis.json');

const [,, action, packageName, version, distUrl] = process.argv;

// ── Validate inputs ─────────────────────────────────────────────────────────

if (!action || !packageName || !version) {
  console.error('Usage: update-satis.mjs <add|remove> <package-name> <version> [dist_url]');
  process.exit(1);
}

if (action === 'add' && !distUrl) {
  console.error('dist_url is required when action is "add".');
  process.exit(1);
}

if (!['add', 'remove'].includes(action)) {
  console.error(`Unknown action "${action}". Expected "add" or "remove".`);
  process.exit(1);
}

// ── Load satis.json ──────────────────────────────────────────────────────────

const satis = JSON.parse(readFileSync(SATIS_PATH, 'utf8'));
satis.packages ??= {};

// ── Mutate ───────────────────────────────────────────────────────────────────

if (action === 'add') {
  // Upsert: create the package bucket if it doesn't exist, then write/overwrite
  // the specific version. This is the "failsafe" — re-publishing a version
  // always wins over whatever was there before.
  satis.packages[packageName] ??= {};
  satis.packages[packageName][version] = {
    name:    packageName,
    version: version,
    dist: {
      url:  distUrl,
      type: 'zip',
    },
  };

  console.log(`✓ Upserted ${packageName}@${version}`);
  console.log(`  dist.url = ${distUrl}`);

} else {
  // Delete: remove the specific version. If the package bucket is now empty,
  // remove the package entry entirely to avoid ghost keys in packages.json.
  if (!satis.packages[packageName]?.[version]) {
    console.log(`⚠  ${packageName}@${version} not found in satis.json — nothing to remove.`);
    process.exit(0);
  }

  delete satis.packages[packageName][version];

  if (Object.keys(satis.packages[packageName]).length === 0) {
    delete satis.packages[packageName];
    console.log(`✓ Removed ${packageName}@${version} (package entry cleaned up — no versions remain)`);
  } else {
    console.log(`✓ Removed ${packageName}@${version}`);
  }
}

// ── Persist ──────────────────────────────────────────────────────────────────

writeFileSync(SATIS_PATH, JSON.stringify(satis, null, 2) + '\n');
