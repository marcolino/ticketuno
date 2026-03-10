#!/usr/bin/env node

/**
 * translate.js
 *
 * Automatically translates missing entries in per-language i18n JSON files
 * using the Gemini API (free tier).
 *
 * Folder convention:
 *   shared/locales/en/translation.json: source (English keys + empty values)
 *   shared/locales/it/translation.json: Italian translations (may be partial)
 *   shared/locales/fr/translation.json: French translations (may be partial)
 *
 * Run:
 *   ./translate.js
 *
 * First-time setup:
 *   # edit .env with your GEMINI_API_KEY
 *   npm install
 *   node translate.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

loadDotEnv();

// ─── Configuration ───────────────────────────────────────────────────────────

// Source file path
const SOURCE_FILE = 'shared/locales/en/translation.json';

// Target locales
const TARGET_LOCALES = 'it,fr'
  .split(',').map(s => s.trim()).filter(Boolean);

/** Gemini model. gemini-2.0-flash is free-tier eligible */
const GEMINI_MODEL = 'gemini-2.0-flash';

/** Max tokens to request from Gemini per call */
const MAX_OUTPUT_TOKENS = 8192;

/** Gemini temperature — low for consistent, accurate translations */
const TEMPERATURE = 0.2;

/**
 * Maps locale codes to full language names for the translation prompt
 * Extend as needed
 */
const LOCALE_NAMES = {
  it: 'Italian',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  nb: 'Norwegian Bokmål',
};

// Read required env vars
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const SOURCE_FILE    = process.env.SOURCE_FILE    || 'shared/locales/en/translation.json';
// const TARGET_LOCALES = (process.env.TARGET_LOCALES || 'it,fr')
//   .split(',').map(s => s.trim()).filter(Boolean);

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Tiny .env loader (no dotenv package needed) */
function loadDotEnv() {
  const envPath = path.join(process.cwd(), './backend/.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    })
  ;
}

/** Return current timestamp as YYYY-MM-DD.HH-MM-SS */
const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', '.').replace(/:/g, '-');

/** Read + parse a JSON file. Returns {} if the file doesn't exist yet */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Write a JSON file, sorting keys descending-alphabetically
 * (matching the project convention for the source file)
 */
function writeJSON(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => b.localeCompare(a))
  );
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

/**
 * Back up a file by inserting a full timestamp before the final extension.
 * e.g.  translation.json  →  translation.2025-03-10.14-32-07.json
 * Timestamp granularity makes collisions impossible even when running
 * the script multiple times within the same day
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return; // nothing to back up
  const dir    = path.dirname(filePath);
  const base   = path.basename(filePath, '.json');
  const backup = path.join(dir, `${base}.${timestamp()}.json`);
  fs.copyFileSync(filePath, backup);
  console.log(`    🗄️  Backed up → ${backup}`);
}

/** Find keys present in source but missing or empty in the target object */
function findMissing(source, target) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !target[key])
  );
}

// ─── Semantic hints ──────────────────────────────────────────────────────────
//
// Add domain-specific translation guidance here.  These are injected into the
// prompt as additional instructions the AI must follow
//
// Structure:
//   Key   = locale code (must match one in LOCALE_NAMES), OR '*' for all languages.
//   Value = array of hint strings, written as natural-language rules.
//
// Examples:
//   'it': ['Translate "layout" as "planimetria".',
//           'Translate "unit" as "unità abitativa", not "appartamento".'],
//   'fr': ['Translate "layout" as "plan".'],
//   '*':  ['This is a real-estate app. Prefer formal, professional register.'],
//
const SEMANTIC_HINTS = {
  '*':  ['This is a theater booking app. Prefer a formal, professional register.'],
  'it': [
    'Translate "layout" as "planimetria"',
  ],
  'fr': [
    'Translate "layout" as "agencement du théâtre"'],
};

/**
 * Build the semantic-hints block for a given locale list.
 * Returns an empty string if no hints are defined.
 */
function buildHintsBlock(locales) {
  const lines = [];

  const globalHints = SEMANTIC_HINTS['*'] || [];
  if (globalHints.length) {
    lines.push('DOMAIN HINTS (apply to all languages):');
    globalHints.forEach(h => lines.push(`  - ${h}`));
  }

  const perLang = locales
    .map(locale => {
      const hints    = SEMANTIC_HINTS[locale] || [];
      const langName = LOCALE_NAMES[locale]   || locale;
      return hints.length ? { langName, hints } : null;
    })
    .filter(Boolean);

  if (perLang.length) {
    lines.push('LANGUAGE-SPECIFIC HINTS (override general translation choices):');
    perLang.forEach(({ langName, hints }) => {
      lines.push(`  ${langName}:`);
      hints.forEach(h => lines.push(`    - ${h}`));
    });
  }

  return lines.length ? '\n' + lines.join('\n') + '\n' : '';
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(missingByLocale) {
  // Build a list of "translate into X" targets
  const targets = Object.entries(missingByLocale)
    .map(([locale, entries]) => {
      const langName = LOCALE_NAMES[locale] || locale;
      const count    = Object.keys(entries).length;
      return `  - ${langName} (${count} strings, header: // === ${langName} ===)`;
    })
    .join('\n');

  // Collect the union of all keys that need translation across all locales
  // (avoids repeating the source block per language when sets overlap)
  const allKeys = [...new Set(
    Object.values(missingByLocale).flatMap(e => Object.keys(e))
  )];
  const sourceSubset = Object.fromEntries(
    allKeys.map(k => [k, Object.values(missingByLocale).find(e => e[k])?.[k] ?? ''])
  );

  // If locales have different missing sets, note that per language
  const perLangNote = Object.entries(missingByLocale).map(([locale, entries]) => {
    const langName = LOCALE_NAMES[locale] || locale;
    const keys = Object.keys(entries);
    return `  ${langName}: translate only these ${keys.length} key(s): ${JSON.stringify(keys)}`;
  }).join('\n');

  return `
You are a professional software localisation translator.

Translate the JSON strings below into the following languages:
${targets}

TRANSLATION RULES — follow exactly:
1. Translate ONLY the values (which are English source strings). Never alter the keys.
2. Preserve ALL template tags like {{TAG_NAME}} exactly as-is, including their case and double braces.
3. Keys ending in "_one" are singular form, "_two" are dual form, "_many" are plural form — translate accordingly into the grammatically correct form for each language.
4. Keep the same flat JSON structure: one object per language.
5. Each language block must be preceded by its header comment, e.g.:
       // === Italian ===
       { ... }
       // === French ===
       { ... }
6. Each language should only include keys listed for it below (some languages may already have some keys translated):
${perLangNote}
7. Output ONLY the language headers and JSON objects. No explanation, no preamble, no markdown fences.
${buildHintsBlock(Object.keys(missingByLocale))}
SOURCE STRINGS:
${JSON.stringify(sourceSubset, null, 2)}
`;
}

// ─── Gemini API call ─────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS },
  });

  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Response parser ─────────────────────────────────────────────────────────

/**
 * Parse Gemini's multi-language response.
 * Expects blocks like:
 *   // === Italian ===
 *   { ... }
 *   // === French ===
 *   { ... }
 * Returns { Italian: {...}, French: {...} }
 */
function parseGeminiResponse(raw) {
  const result   = {};
  const headerRe = /\/\/\s*===\s*([A-Za-z ()]+?)\s*===\s*\n([\s\S]*?)(?=\/\/\s*===|$)/g;
  let match;

  while ((match = headerRe.exec(raw)) !== null) {
    const langLabel = match[1].trim();
    let   chunk     = match[2].trim();

    // Strip accidental markdown fences
    chunk = chunk.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();

    try {
      result[langLabel] = JSON.parse(chunk);
    } catch {
      console.warn(`    ⚠️  Could not parse JSON block for "${langLabel}" — skipping.`);
    }
  }

  return result;
}

/** Map a full language name back to its locale code */
function langNameToLocale(langName) {
  return Object.entries(LOCALE_NAMES).find(([, name]) => name === langName)?.[0] ?? null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── Validate config ───────────────────────────────────────────────────────
  if (!GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY is not set.');
    console.error('    Copy .env.example → .env and add your key.');
    console.error('    Get a free key here: https://aistudio.google.com');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌  Source file not found: ${SOURCE_FILE}`);
    console.error('    Set SOURCE_FILE in .env to the correct path.');
    process.exit(1);
  }

  const unknownLocales = TARGET_LOCALES.filter(l => !LOCALE_NAMES[l]);
  if (unknownLocales.length > 0) {
    console.error(`❌  Unknown locale code(s): ${unknownLocales.join(', ')}`);
    console.error('    Add them to the LOCALE_NAMES map in translate.js, or fix TARGET_LOCALES in .env.');
    process.exit(1);
  }

  // ── Load source ───────────────────────────────────────────────────────────
  const source      = readJSON(SOURCE_FILE);
  const sourceCount = Object.keys(source).length;
  console.log(`📂  Source: ${SOURCE_FILE}  (${sourceCount} keys)`);

  // ── Determine what needs translating per locale ───────────────────────────
  const localeFiles = {}; // locale → file path
  const localeExisting = {}; // locale → existing translations object
  const missingByLocale = {}; // locale → { key: englishValue, ... }

  for (const locale of TARGET_LOCALES) {
    const langName = LOCALE_NAMES[locale];
    const filePath = path.join(path.dirname(path.dirname(SOURCE_FILE)), locale, 'translation.json');
    localeFiles[locale] = filePath;
    localeExisting[locale] = readJSON(filePath);

    const missing = findMissing(source, localeExisting[locale]);
    const count   = Object.keys(missing).length;
    console.log(`    ${langName} (${locale}): ${count} missing / ${sourceCount} total`);

    if (count > 0) missingByLocale[locale] = missing;
  }

  const totalMissing = Object.values(missingByLocale).reduce((n, e) => n + Object.keys(e).length, 0);

  if (totalMissing === 0) {
    console.log('\n✅  All translations are up to date. Nothing to do.');
    return;
  }

  // ── Call Gemini ───────────────────────────────────────────────────────────
  console.log(`\n🤖  Sending ${Object.keys(missingByLocale).length} language(s) / ${totalMissing} string(s) to Gemini…`);
  const prompt = buildPrompt(missingByLocale);

  let rawResponse;
  try {
    rawResponse = await callGemini(prompt);
  } catch (err) {
    console.error('\n❌  Gemini API call failed:', err.message);
    process.exit(1);
  }

  if (!rawResponse.trim()) {
    console.error('\n❌  Gemini returned an empty response.');
    process.exit(1);
  }

  // ── Parse response ────────────────────────────────────────────────────────
  const translationsByLang = parseGeminiResponse(rawResponse);
  const parsedLangs = Object.keys(translationsByLang);

  if (parsedLangs.length === 0) {
    // Dump raw response to disk for debugging
    const dumpPath = 'gemini-response-debug.txt';
    fs.writeFileSync(dumpPath, rawResponse, 'utf8');
    console.error(`\n❌  Could not parse Gemini response. Raw output saved to: ${dumpPath}`);
    process.exit(1);
  }

  // ── Merge & write ─────────────────────────────────────────────────────────
  console.log('\n💾  Writing updated translation files…');

  for (const langName of parsedLangs) {
    const locale = langNameToLocale(langName);
    if (!locale) {
      console.warn(`    ⚠️  Received translations for unknown language "${langName}" — skipping.`);
      continue;
    }
    if (!missingByLocale[locale]) {
      console.warn(`    ⚠️  Received unrequested translations for "${langName}" — skipping.`);
      continue;
    }

    const newTranslations = translationsByLang[langName];
    const filePath        = localeFiles[locale];
    const merged          = { ...localeExisting[locale], ...newTranslations };

    backupFile(filePath);
    writeJSON(filePath, merged);

    const added = Object.keys(newTranslations).length;
    console.log(`    ✅  ${langName} (${locale}): +${added} string(s) → ${filePath}`);
  }

  // Warn about any requested locale that wasn't in the response
  for (const locale of Object.keys(missingByLocale)) {
    const langName = LOCALE_NAMES[locale];
    if (!parsedLangs.includes(langName)) {
      console.warn(`    ⚠️  No translations received for ${langName} (${locale}). Re-run to retry.`);
    }
  }

  console.log('\n✅  Done.');
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
