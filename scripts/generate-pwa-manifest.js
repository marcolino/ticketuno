#!/usr/bin/env node
'use strict';
/**
 * Generates frontend/public/manifest.json from:
 *   - dev/pwa.json          (PWA-specific config, source of truth)
 *   - package.json          (description)
 *   - frontend/package.json (version)
 *
 * Run: node scripts/generate-pwa-manifest.js
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');

const pwa = JSON.parse(readFileSync(join(ROOT, 'dev', 'pwa.json'), 'utf8'));
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const fePkg = JSON.parse(readFileSync(join(ROOT, 'frontend', 'package.json'), 'utf8'));

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const manifest = {
  name: pwa.name,
  short_name: pwa.shortName,
  description: rootPkg.description,
  version: fePkg.version,
  lang: pwa.lang,
  start_url: pwa.startUrl  || '/',
  scope: pwa.scope || '/',
  display: pwa.display   || 'standalone',
  orientation: pwa.orientation || 'portrait-primary',
  theme_color: pwa.themeColor,
  background_color: pwa.backgroundColor,
  categories: pwa.categories || [],

  icons: [
    // Standard icons (any purpose)
    ...ICON_SIZES.map((size) => ({
      src: `/icons/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    })),
    // Maskable icons (Android adaptive icons)
    ...[192, 512].map((size) => ({
      src: `/icons/icon-${size}x${size}-maskable.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'maskable',
    })),
  ],

  shortcuts: pwa.shortcuts || [],
  screenshots: pwa.screenshots || [],
};

const OUT = join(ROOT, 'frontend', 'public', 'manifest.json');
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✅ manifest.json → ${OUT}`);
console.log(`   name: ${manifest.name} v${manifest.version}`);
console.log(`   display: ${manifest.display} lang: ${manifest.lang}`);
