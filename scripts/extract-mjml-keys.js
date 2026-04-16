#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const projectRoot = path.resolve(__dirname, '..');
const mjmlFiles = glob.sync(
  path.join(projectRoot, 'backend/src/**/*.mjml')
);

const outputFile = path.join(
  projectRoot,
  'backend/src/i18n/__generated_mjml_keys__.ts'
);

const regexes = [
  /\{\{\s*t\s+["'`]([^"'`]+)["'`]\s*\}\}/g, // {{t "key"}}
  /\{\{\s*t\s*\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\}\}/g // {{t("key")}}
];

const foundKeys = new Set();

for (const file of mjmlFiles) {
  const content = fs.readFileSync(file, 'utf8');

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      foundKeys.add(match[1]);
    }
  }
}

const lines = [
  '// AUTO-GENERATED FILE. DO NOT EDIT.',
  '// Generated from MJML templates for i18next extraction.',
  'import { t } from \'i18next\';',
  ''
];

for (const key of [...foundKeys].sort()) {
  lines.push(`t(${JSON.stringify(key)});`);
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, lines.join('\n'));

//console.log(`Generated ${foundKeys.size} MJML translation keys.`);
