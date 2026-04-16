#!/usr/bin/env node

/**
 * translate.js
 *
 * Automatically translates missing entries in per-language i18n JSON files
 * using a free AI API.
 *
 * Supported namespace formats
 * ───────────────────────────
 *   flat   — key IS the English string  (e.g. shared/locales/en/translation.json)
 *             t("Hello world") in code
 *   nested — key is a structural path, value is the English text
 *             (e.g. shared/locales/en/privacy.json, terms.json)
 *             Internally flattened to dot-paths for translation, then re-nested.
 *
 * Folder convention:
 *   shared/locales/en/translation.json   ← flat source
 *   shared/locales/en/privacy.json       ← nested source
 *   shared/locales/en/terms.json         ← nested source
 *   shared/locales/it/translation.json   ← may be partial
 *   shared/locales/it/privacy.json       ← may be partial or absent
 *   …
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

// ─── Namespace configuration ──────────────────────────────────────────────────
//
// Add an entry here for every i18n file you want to keep in sync.
//
//   name   — filename without .json (must exist under shared/locales/en/)
//   nested — true  → structured JSON (arrays + nested objects); values are the
//                     English strings. Internally flattened to dot-paths for
//                     diffing and translation, then re-nested when writing.
//            false → flat JSON where key === English string (existing behaviour)
//
const NAMESPACES = [
  { name: 'common', nested: false },
  { name: 'privacy', nested: true  },
  { name: 'terms', nested: true  },
];

/** Root directory that contains the per-locale sub-folders */
const LOCALES_ROOT = 'shared/locales';

/** Target locale codes — must each have a folder under LOCALES_ROOT */
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
  '*':  ['This is a theater booking PWA. Prefer a formal, professional register.'],
  'it': [
    'Translate "layout" as "planimetria".',
    'Translate "Data Controller" as "Titolare del trattamento".',
  ],
  'fr': [
    'Translate "layout" as "agencement du théâtre".',
    'Translate "Data Controller" as "Responsable du traitement".',
  ],
};

// ─── Flat ↔ Nested utilities ──────────────────────────────────────────────────

/**
 * Recursively flatten a nested object into dot-path keys.
 * Arrays become numeric segments: sections.intro.paragraphs.0, …
 *
 * Only leaf string/number/boolean values are emitted — never sub-objects or
 * arrays themselves (we don't want to translate structural metadata).
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v])
    : Object.entries(obj);

  for (const [key, value] of entries) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[fullKey] = String(value);
    } else if (value !== null && typeof value === 'object') {
      Object.assign(result, flattenObject(value, fullKey));
    }
    // null / undefined → skip
  }
  return result;
}

/**
 * Reconstruct a nested object from dot-path keys.
 *
 * Numeric path segments → array indices.
 * A node is treated as an array iff ALL its direct children keys are integers.
 */
function unflattenObject(flat) {
  // Use a plain Map as our tree to preserve insertion order
  const root = {};

  for (const [flatKey, value] of Object.entries(flat)) {
    const parts = flatKey.split('.');
    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part     = parts[i];
      const nextPart = parts[i + 1];
      const nextNum  = /^\d+$/.test(nextPart);

      if (node[part] === undefined) {
        node[part] = nextNum ? [] : {};
      }
      node = node[part];
    }

    const last = parts[parts.length - 1];
    if (Array.isArray(node)) {
      node[parseInt(last, 10)] = value;
    } else {
      node[last] = value;
    }
  }

  return root;
}

/**
 * Deep-merge `patch` (a flat translation result, already unflattened) into
 * `base` (the existing target nested object).  Arrays are replaced wholesale
 * (never partially merged), objects are merged recursively.
 */
function deepMerge(base, patch) {
  if (typeof base !== 'object' || base === null) return patch;
  if (typeof patch !== 'object' || patch === null) return patch;
  if (Array.isArray(patch)) return patch;

  const result = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    result[key] = deepMerge(base[key], val);
  }
  return result;
}

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
 * Write a JSON file.
 * flat=true  → sort keys alphabetically (consistent with existing flat files)
 * flat=false → preserve structural order (nested files)
 */
function writeJSON(filePath, obj, flat = true) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const data = flat
    ? Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
    : obj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Back up a file by inserting a timestamp before the final extension.
 *   translation.json  →  old/translation.2025-03-10.14-32-07.json
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const dir = path.join(path.dirname(filePath), 'old');
  const base = path.basename(filePath, '.json');
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
 *
 * For nested namespaces the keys are dot-paths (e.g. "sections.intro.title");
 * for flat namespaces they are the English strings themselves. In both cases
 * the model receives { key: englishValue } and must return { key: translation }.
 */
function buildPrompt(missingByLocale, nsName) {
  const isLegal = ['privacy', 'terms'].includes(nsName);
  const nsHint  = isLegal
    ? `\nNAMESPACE: "${nsName}" — these are legal page strings (Privacy Policy / Terms of Service).\n`
    : '';

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
${nsHint}
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
      let waitSec = Math.pow(2, attempt) * 15;  // 15s → 30s → 60s → 120s
      const retryInfo = data?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
      if (retryInfo?.retryDelay) {
        const suggested = parseInt(retryInfo.retryDelay, 10);
        if (!isNaN(suggested)) waitSec = suggested + 2;
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

// ─── Per-namespace translation ────────────────────────────────────────────────

/**
 * Translate all missing strings for a single namespace across all target locales.
 *
 * For flat namespaces  → keys ARE the English strings; existing behaviour.
 * For nested namespaces → objects are flattened to dot-paths for diffing +
 *   translation, then unflattened and deep-merged back before writing.
 */
async function translateNamespace(ns, provider) {
  const { name: nsName, nested } = ns;
  const sourceFile = path.join(LOCALES_ROOT, 'en', `${nsName}.json`);

  if (!fs.existsSync(sourceFile)) {
    console.warn(`  ⚠️  Source not found, skipping: ${sourceFile}`);
    return;
  }

  const rawSource    = readJSON(sourceFile);
  // For nested files we work on the flat representation internally
  const flatSource   = nested ? flattenObject(rawSource) : rawSource;
  const sourceCount  = Object.keys(flatSource).length;

  console.log(`\n  📄  [${nsName}] — ${sourceCount} translatable string(s)`);

  // ── Determine missing strings per locale ────────────────────────────────
  const localeFiles     = {};  // locale → file path
  const localeExisting  = {};  // locale → existing raw object (nested or flat)
  const localeExistFlat = {};  // locale → existing flat object
  const missingByLocale = {};  // locale → { flatKey: englishValue, ... }

  for (const locale of TARGET_LOCALES) {
    const langName = LOCALE_NAMES[locale];
    const filePath = path.join(LOCALES_ROOT, locale, `${nsName}.json`);
    localeFiles[locale]     = filePath;
    localeExisting[locale]  = readJSON(filePath);
    localeExistFlat[locale] = nested ? flattenObject(localeExisting[locale]) : localeExisting[locale];

    const missing = findMissing(flatSource, localeExistFlat[locale]);
    const count   = Object.keys(missing).length;
    console.log(`      ${langName} (${locale}): ${count} missing / ${sourceCount} total`);
    if (count > 0) missingByLocale[locale] = missing;
  }

  if (Object.keys(missingByLocale).length === 0) {
    console.log('      ✅  All translations up to date.');
    return;
  }

  // ── Build + run batches ─────────────────────────────────────────────────
  const allMissingKeys = [...new Set(
    Object.values(missingByLocale).flatMap(e => Object.keys(e))
  )];
  const keyBatches  = chunkObject(
    Object.fromEntries(allMissingKeys.map(k => [k, flatSource[k]])),
    BATCH_SIZE
  );
  const totalBatches = keyBatches.length;

  console.log(`\n      📦  ${allMissingKeys.length} unique string(s) across ${Object.keys(missingByLocale).length} language(s), ${totalBatches} batch(es)\n`);

  // accumulated flat translations per language name, across all batches
  const accumulated = {};  // langName → { flatKey: translatedValue, ... }

  for (let i = 0; i < keyBatches.length; i++) {
    const batchKeys = Object.keys(keyBatches[i]);
    process.stdout.write(`      ⏳  Batch ${i + 1}/${totalBatches} — ${batchKeys.length} key(s)… `);

    const batchMissing = {};
    for (const [locale, missing] of Object.entries(missingByLocale)) {
      const subset = Object.fromEntries(
        batchKeys.filter(k => k in missing).map(k => [k, missing[k]])
      );
      if (Object.keys(subset).length > 0) batchMissing[locale] = subset;
    }
    if (Object.keys(batchMissing).length === 0) {
      console.log('(skipped)');
      continue;
    }

    let raw;
    try {
      raw = await callProvider(buildPrompt(batchMissing, nsName));
    } catch (err) {
      console.error(`\n      ❌  API call failed on batch ${i + 1}: ${err.message}`);
      console.error('          Aborting namespace — no files written for this namespace.');
      return;
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

    if (i < keyBatches.length - 1) await sleep(2000);
  }

  // ── Merge & write ───────────────────────────────────────────────────────
  console.log(`\n      💾  Writing files for [${nsName}]…`);

  for (const [langName, flatTranslations] of Object.entries(accumulated)) {
    const locale = langNameToLocale(langName);
    if (!locale || !missingByLocale[locale]) {
      console.warn(`      ⚠️  Unexpected language "${langName}" in response — skipping.`);
      continue;
    }

    let merged;
    if (nested) {
      // Merge the new flat translations with existing flat, then unflatten
      const mergedFlat = { ...localeExistFlat[locale], ...flatTranslations };
      const unflat     = unflattenObject(mergedFlat);
      merged           = deepMerge(localeExisting[locale], unflat);
    } else {
      merged = { ...localeExisting[locale], ...flatTranslations };
    }

    backupFile(localeFiles[locale]);
    writeJSON(localeFiles[locale], merged, /* flat sort */ !nested);
    console.log(`      ✅  ${langName} (${locale}): +${Object.keys(flatTranslations).length} string(s) → ${localeFiles[locale]}`);
  }

  for (const locale of Object.keys(missingByLocale)) {
    if (!accumulated[LOCALE_NAMES[locale]]) {
      console.warn(`      ⚠️  No translations received for ${LOCALE_NAMES[locale]} (${locale}). Re-run to retry.`);
    }
  }
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

  const unknownLocales = TARGET_LOCALES.filter(l => !LOCALE_NAMES[l]);
  if (unknownLocales.length) {
    console.error(`❌  Unknown locale code(s): ${unknownLocales.join(', ')} — add them to LOCALE_NAMES.`);
    process.exit(1);
  }

  console.log(`\n🤖  Provider: ${provider.label}`);
  console.log(`🌐  Target locales: ${TARGET_LOCALES.map(l => `${l} (${LOCALE_NAMES[l]})`).join(', ')}`);
  console.log(`📁  Namespaces: ${NAMESPACES.map(ns => `${ns.name} [${ns.nested ? 'nested' : 'flat'}]`).join(', ')}\n`);

  // Process each namespace independently
  for (const ns of NAMESPACES) {
    await translateNamespace(ns, provider);
    // Small pause between namespaces to stay clear of rate limits
    await sleep(1000);
  }

  console.log('\n✅  All namespaces processed.\n');
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
