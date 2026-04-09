#!/usr/bin/env node
'use strict';
/**
 * Generates PWA icon assets from dev/logo.svg (preferred) or dev/logo.png.
 * Run: node scripts/generate-pwa-assets.js
 * Requires: sharp  (added to root devDependencies)
 */

const sharp = require('sharp');
const { mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const DEV_DIR = join(ROOT, 'dev');
const ICONS_OUT = join(ROOT, 'frontend', 'public', 'icons');
//const PUBLIC_OUT = join(ROOT, 'frontend', 'public');

// Source: prefer SVG (scales losslessly), fall back to PNG
const SRC = existsSync(join(DEV_DIR, 'images', 'logo.svg'))
  ? join(DEV_DIR, 'images', 'logo.svg')
  : join(DEV_DIR, 'images', 'logo.png');

if (!existsSync(SRC)) {
  console.error(`❌ No source logo image found. Place logo.svg or logo.png in dev/images`, SRC);
  process.exit(1);
}

console.log(`📐 Source: ${SRC}`);
mkdirSync(ICONS_OUT, { recursive: true });

// Standard icon sizes required by various platforms
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Maskable icon sizes (safe-zone padding: 10% per side)
const MASKABLE_SIZES = [192, 512];

(async () => {
  // ── Standard icons ───────────────────────────────────────────────────────
  for (const size of ICON_SIZES) {
    const out = join(ICONS_OUT, `icon-${size}x${size}.png`);
    await sharp(SRC)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out);
    console.log(`  ✅ icon-${size}x${size}.png`);
  }

  // ── Maskable icons (logo shrunk to 80%, padded with brand color) ─────────
  // Read maskable background color from dev/pwa.json
  const pwaConfig = JSON.parse(
    require('fs').readFileSync(join(DEV_DIR, 'pwa.json'), 'utf8')
  );
  const bgHex = pwaConfig.maskableBackgroundColor || '#ffffff';
  const bg = hexToRgb(bgHex);

  for (const size of MASKABLE_SIZES) {
    const padding = Math.round(size * 0.1); // 10% safe zone per side
    const innerSize = size - padding * 2;
    const out = join(ICONS_OUT, `icon-${size}x${size}-maskable.png`);

    await sharp(SRC)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: padding, bottom: padding, left: padding, right: padding,
        background: { ...bg, alpha: 1 },
      })
      .flatten({ background: bg }) // remove alpha, composite on solid bg
      .png()
      .toFile(out);
    console.log(`  ✅ icon-${size}x${size}-maskable.png`);
  }

  // ── Apple Touch Icon (180×180, no alpha — required by iOS) ───────────────
  await sharp(SRC)
    .resize(180, 180, { fit: 'contain', background: { ...bg, alpha: 1 } })
    .flatten({ background: bg })
    .png()
    .toFile(join(ICONS_OUT, 'apple-touch-icon.png'));
  console.log('  ✅ apple-touch-icon.png');

  // ── Favicon PNGs (modern browsers accept PNG; skip .ico) ─────────────────
  for (const size of [16, 32]) {
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(ICONS_OUT, `favicon-${size}x${size}.png`));
    console.log(`  ✅ favicon-${size}x${size}.png`);
  }

  // ── OG / social image (1200×630) ─────────────────────────────────────────
  await sharp(SRC)
    .resize(630, 630, { fit: 'contain', background: { ...bg, alpha: 1 } })
    .extend({ left: 285, right: 285, background: bg })
    .flatten({ background: bg })
    .png()
    .toFile(join(ICONS_OUT, 'og-image.png'));
  console.log('  ✅ og-image.png (1200×630)');

  console.log(`\n🎉 All PWA assets written to frontend/public/`);
})().catch((err) => {
  console.error('❌ Asset generation failed:', err.message);
  process.exit(1);
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}
