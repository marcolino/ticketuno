#!/usr/bin/env node

/**
 * translate.js
 *
 * Automatically translates missing entries in per-language i18n JSON files
 * using a free AI API.
 *
 * Folder convention:
 *   shared/locales/en/translation.json   ← source (English keys + empty values)
 *   shared/locales/it/translation.json   ← Italian translations (may be partial)
 *   shared/locales/fr/translation.json   ← French translations (may be partial)
 *
 * Supported providers (set AI_PROVIDER in backend/.env):
 *   groq       — free, fast, no region restrictions. RECOMMENDED.
 *                Free key: https://console.groq.com
 *   gemini     — free tier, but unavailable in EU/some regions.
 *                Free key: https://aistudio.google.com
 *   openrouter — several free models (those with a ":free" suffix).
 *                Free key: https://openrouter.ai
 *
 * Run:
 *   ./translate.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

loadDotEnv();

// ─── Static configuration ─────────────────────────────────────────────────────
// Edit these directly — they are project-specific and don't belong in .env.

/** Path to the English source file */
const SOURCE_FILE = 'shared/locales/en/translation.json';

/** Target locale codes — must each have a folder under shared/locales/ */
const TARGET_LOCALES = ['it', 'fr', 'zh'];

// ─── Provider configuration ───────────────────────────────────────────────────
//
// Set AI_PROVIDER in backend/.env to: groq | gemini | openrouter
// Set the matching API key in the same file:
//   GROQ_API_KEY=...        (for groq)
//   GEMINI_API_KEY=...      (for gemini)
//   OPENROUTER_API_KEY=...  (for openrouter)
//
const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();

const PROVIDERS = {
  groq: {
    label:  'Groq — llama-3.3-70b-versatile',
    url:    'https://api.groq.com/openai/v1/chat/completions',
    model:  'llama-3.3-70b-versatile',
    apiKey: process.env.GROQ_API_KEY,
    format: 'openai',
  },
  gemini: {
    label:  'Gemini — gemini-2.0-flash',
    // URL is built lazily after env is loaded
    url:    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    model:  'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY,
    format: 'gemini',
  },
  openrouter: {
    label:  'OpenRouter — llama-3.3-70b-instruct:free',
    url:    'https://openrouter.ai/api/v1/chat/completions',
    model:  'meta-llama/llama-3.3-70b-instruct:free',
    apiKey: process.env.OPENROUTER_API_KEY,
    format: 'openai',
  },
};

/**
 * Max source keys per API call.
 * Larger = fewer calls but more risk of hitting token or rate limits.
 * Tune down to 40-50 if you still see 429s.
 */
const BATCH_SIZE = 40;

/** How many times to retry a rate-limited call before giving up */
const MAX_RETRIES = 4;

/** Temperature — low for consistent, literal translations */
const TEMPERATURE = 0.2;

/** Max output tokens per call */
const MAX_OUTPUT_TOKENS = 8192;

/**
 * Maps locale codes to full language names used in prompts.
 * Extend as needed.
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

// ─── Semantic hints ───────────────────────────────────────────────────────────
//
// Domain-specific translation guidance injected into every prompt.
//
// Key = locale code (from LOCALE_NAMES), or '*' to apply to all languages.
// Value = array of instruction strings in plain English.
//
const SEMANTIC_HINTS = {
  '*':  ['This is a theater booking app. Prefer a formal, professional register.'],
  'it': [
    'Translate "layout" as "planimetria".',
  ],
  'fr': [
    'Translate "layout" as "agencement du théâtre".',
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Tiny .env loader — reads backend/.env, no npm package needed */
function loadDotEnv() {
  const envPath = path.join(process.cwd(), './backend/.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
}

/** Return current timestamp as YYYY-MM-DD.HH-MM-SS (safe for filenames) */
const timestamp = () =>
  new Date().toISOString().slice(0, 19).replace('T', '.').replace(/:/g, '-');

/** Read + parse a JSON file. Returns {} if the file doesn't exist yet */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Write a JSON file, keys sorted descending-alphabetically
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
 * Back up a file by inserting a timestamp before the final extension.
 *   translation.json  →  translation.2025-03-10.14-32-07.json
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
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

/**
 * Split an object into an array of objects, each with at most `size` entries.
 */
function chunkObject(obj, size) {
  const entries = Object.entries(obj);
  const chunks  = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return chunks;
}

/** Sleep for `ms` milliseconds */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Semantic hints builder ───────────────────────────────────────────────────

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

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build a translation prompt for a batch of keys.
 * missingByLocale: { locale: { key: englishValue, ... }, ... }
 *   — already filtered to only the keys in this batch.
 */
function buildPrompt(missingByLocale) {
  const targets = Object.entries(missingByLocale)
    .map(([locale, entries]) => {
      const langName = LOCALE_NAMES[locale] || locale;
      const count    = Object.keys(entries).length;
      return `  - ${langName} (${count} strings, header: // === ${langName} ===)`;
    })
    .join('\n');

  const allKeys = [...new Set(
    Object.values(missingByLocale).flatMap(e => Object.keys(e))
  )];
  const sourceSubset = Object.fromEntries(
    allKeys.map(k => [k, Object.values(missingByLocale).find(e => e[k])?.[k] ?? ''])
  );

  const perLangNote = Object.entries(missingByLocale)
    .map(([locale, entries]) => {
      const langName = LOCALE_NAMES[locale] || locale;
      const keys     = Object.keys(entries);
      return `  ${langName}: translate only these ${keys.length} key(s): ${JSON.stringify(keys)}`;
    })
    .join('\n');

  return `You are a professional software localisation translator.

Translate the JSON strings below into the following languages:
${targets}

TRANSLATION RULES — follow exactly:
1. Translate ONLY the values (which are English source strings). Never alter the keys.
2. Preserve ALL template tags like {{TAG_NAME}} exactly as-is, including their case and double braces.
3. Keys ending in "_one" are singular form, "_two" are dual form, "_many" are plural form. If the target language has no distinct "many" form, use the same translation as the general plural.
4. Keep the same flat JSON structure: one object per language.
5. Each language block must be preceded by its header comment, e.g.:
       // === Italian ===
       { ... }
       // === French ===
       { ... }
6. Each language should only include the keys listed for it below (some languages may already have some keys translated):
${perLangNote}
7. Output ONLY the language headers and JSON objects. No explanation, no preamble, no markdown fences.
${buildHintsBlock(Object.keys(missingByLocale))}
SOURCE STRINGS:
${JSON.stringify(sourceSubset, null, 2)}
`;
}

// ─── API call with retry ──────────────────────────────────────────────────────

/**
 * Call the configured AI provider with exponential backoff on rate limits.
 * Returns the raw text response.
 */
async function callProvider(prompt) {
  const provider = PROVIDERS[AI_PROVIDER];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let body, headers;

    if (provider.format === 'openai') {
      headers = {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      };
      body = JSON.stringify({
        model:       provider.model,
        temperature: TEMPERATURE,
        max_tokens:  MAX_OUTPUT_TOKENS,
        messages:    [{ role: 'user', content: prompt }],
      });
    } else {
      // Gemini format
      headers = { 'Content-Type': 'application/json' };
      body = JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS },
      });
    }

    const res  = await fetch(provider.url, { method: 'POST', headers, body });
    const data = await res.json();

    if (res.ok) {
      return provider.format === 'openai'
        ? data.choices?.[0]?.message?.content ?? ''
        : data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      // Use the provider-suggested delay if present (Gemini includes it), else exponential backoff
      let waitSec = Math.pow(2, attempt) * 15;  // 15s → 30s → 60s → 120s
      const retryInfo = data?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
      if (retryInfo?.retryDelay) {
        const suggested = parseInt(retryInfo.retryDelay, 10);
        if (!isNaN(suggested)) waitSec = suggested + 2;  // +2s buffer
      }
      process.stdout.write(`    ⏳  Rate limited. Waiting ${waitSec}s then retrying (${attempt}/${MAX_RETRIES - 1})… `);
      await sleep(waitSec * 1000);
      continue;
    }

    throw new Error(`${provider.label} — HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  throw new Error(`${provider.label} — gave up after ${MAX_RETRIES} retries.`);
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Parse a multi-language AI response into a plain object.
 * Expects blocks preceded by:  // === Language Name ===
 * Returns { 'Italian': { key: value, ... }, 'French': { ... } }
 */
function parseResponse(raw) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Validate provider ─────────────────────────────────────────────────────
  const provider = PROVIDERS[AI_PROVIDER];
  if (!provider) {
    console.error(`❌  Unknown AI_PROVIDER "${AI_PROVIDER}". Valid options: ${Object.keys(PROVIDERS).join(' | ')}`);
    process.exit(1);
  }
  if (!provider.apiKey) {
    const keyName = AI_PROVIDER === 'gemini' ? 'GEMINI_API_KEY'
                  : AI_PROVIDER === 'groq'   ? 'GROQ_API_KEY'
                  :                            'OPENROUTER_API_KEY';
    console.error(`❌  ${keyName} is not set. Add it to backend/.env`);
    process.exit(1);
  }

  // ── Validate source ───────────────────────────────────────────────────────
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌  Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }
  const unknownLocales = TARGET_LOCALES.filter(l => !LOCALE_NAMES[l]);
  if (unknownLocales.length) {
    console.error(`❌  Unknown locale code(s): ${unknownLocales.join(', ')} — add them to LOCALE_NAMES.`);
    process.exit(1);
  }

  // ── Load source ───────────────────────────────────────────────────────────
  const source      = readJSON(SOURCE_FILE);
  const sourceCount = Object.keys(source).length;
  console.log(`\n📂  Source: ${SOURCE_FILE}  (${sourceCount} keys)`);
  console.log(`🤖  Provider: ${provider.label}\n`);

  // ── Determine missing strings per locale ──────────────────────────────────
  const localeFiles     = {};  // locale → file path
  const localeExisting  = {};  // locale → existing translations object
  const missingByLocale = {};  // locale → { key: englishValue, ... }

  for (const locale of TARGET_LOCALES) {
    const langName = LOCALE_NAMES[locale];
    const filePath = path.join(
      path.dirname(path.dirname(SOURCE_FILE)), locale, 'translation.json'
    );
    localeFiles[locale]    = filePath;
    localeExisting[locale] = readJSON(filePath);

    const missing = findMissing(source, localeExisting[locale]);
    const count   = Object.keys(missing).length;
    console.log(`    ${langName} (${locale}): ${count} missing / ${sourceCount} total`);
    if (count > 0) missingByLocale[locale] = missing;
  }

  const totalMissing = Object.values(missingByLocale)
    .reduce((n, e) => n + Object.keys(e).length, 0);

  if (totalMissing === 0) {
    console.log('\n✅  All translations are up to date. Nothing to do.');
    return;
  }

  // ── Build batches ─────────────────────────────────────────────────────────
  //
  // We batch by the union of all missing keys across locales, so each API
  // call always translates the same keys into all target languages at once.
  // This minimises total calls while keeping prompts within token limits.
  //
  const allMissingKeys = [...new Set(
    Object.values(missingByLocale).flatMap(e => Object.keys(e))
  )];
  const keyBatches  = chunkObject(
    Object.fromEntries(allMissingKeys.map(k => [k, source[k]])),
    BATCH_SIZE
  );
  const totalBatches = keyBatches.length;

  console.log(`\n📦  ${totalMissing} string(s) across ${Object.keys(missingByLocale).length} language(s)`);
  console.log(`    Split into ${totalBatches} batch(es) of up to ${BATCH_SIZE} keys.\n`);

  // Accumulated translations per language name, merged across all batches
  const accumulated = {};  // langName → { key: translatedValue, ... }

  for (let i = 0; i < keyBatches.length; i++) {
    const batchKeys = Object.keys(keyBatches[i]);
    process.stdout.write(`  ⏳  Batch ${i + 1}/${totalBatches} — ${batchKeys.length} key(s)… `);

    // Narrow missingByLocale to only the keys in this batch
    const batchMissing = {};
    for (const [locale, missing] of Object.entries(missingByLocale)) {
      const subset = Object.fromEntries(
        batchKeys.filter(k => k in missing).map(k => [k, missing[k]])
      );
      if (Object.keys(subset).length > 0) batchMissing[locale] = subset;
    }
    if (Object.keys(batchMissing).length === 0) {
      console.log('(skipped — all keys already translated for every locale)');
      continue;
    }

    let raw;
    try {
      raw = await callProvider(buildPrompt(batchMissing));
    } catch (err) {
      console.error(`\n❌  API call failed on batch ${i + 1}: ${err.message}`);
      console.error('    Aborting — no files have been written yet.');
      process.exit(1);
    }

    if (!raw.trim()) {
      console.log('⚠️  empty response, skipping.');
      continue;
    }

    const parsed = parseResponse(raw);
    for (const [langName, translations] of Object.entries(parsed)) {
      accumulated[langName] = { ...(accumulated[langName] ?? {}), ...translations };
    }

    const summary = Object.keys(parsed)
      .map(l => `${l} +${Object.keys(parsed[l]).length}`)
      .join(', ');
    console.log(`✓  (${summary})`);

    // Small pause between batches to stay clear of per-minute rate caps
    if (i < keyBatches.length - 1) await sleep(2000);
  }

  // ── Merge & write all locale files at once ────────────────────────────────
  console.log('\n💾  Writing updated translation files…');

  for (const [langName, translations] of Object.entries(accumulated)) {
    const locale = langNameToLocale(langName);
    if (!locale || !missingByLocale[locale]) {
      console.warn(`    ⚠️  Unexpected language "${langName}" in response — skipping.`);
      continue;
    }
    const merged = { ...localeExisting[locale], ...translations };
    backupFile(localeFiles[locale]);
    writeJSON(localeFiles[locale], merged);
    console.log(`    ✅  ${langName} (${locale}): +${Object.keys(translations).length} string(s) → ${localeFiles[locale]}`);
  }

  // Warn about locales that received nothing
  for (const locale of Object.keys(missingByLocale)) {
    if (!accumulated[LOCALE_NAMES[locale]]) {
      console.warn(`    ⚠️  No translations received for ${LOCALE_NAMES[locale]} (${locale}). Re-run to retry.`);
    }
  }

  console.log('\n✅  Done.');
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
