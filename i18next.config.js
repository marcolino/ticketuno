const path = require('path');
const { defineConfig } = require('i18next-cli');

const projectRoot = path.resolve(__dirname, '.');

module.exports = defineConfig({
  locales: ['en', 'it', 'fr', 'zh'],
  extract: {
    input: [
      // Frontend files
      path.join(projectRoot, 'frontend/src/**/*.{js,jsx,ts,tsx}'),
      '!' + path.join(projectRoot, 'frontend/src/**/*.spec.{js,jsx,ts,tsx}'),
      '!' + path.join(projectRoot, 'frontend/src/**/*.test.{js,jsx,ts,tsx}'),
      '!' + path.join(projectRoot, 'frontend/src/**/*.d.ts'),
      
      // Backend files
      path.join(projectRoot, 'backend/src/**/*.{js,ts}'),
      '!' + path.join(projectRoot, 'backend/src/**/*.spec.{js,ts}'),
      '!' + path.join(projectRoot, 'backend/src/**/*.test.{js,ts}'),
      '!' + path.join(projectRoot, 'backend/src/**/*.d.ts'),
      '!' + path.join(projectRoot, 'backend/node_modules/**'),
    ],
    output: path.join(projectRoot, 'shared/locales/{{language}}/{{namespace}}.json'),
    defaultNS: 'common',
    keySeparator: false,
    nsSeparator: false,
    contextSeparator: '_',
    functions: ['t', 'i18next.t', 'i18n.t', 'req.t'],
    trans: false,
    lngs: ['en', 'it', 'fr', 'zh'],
  },
  types: {
    input: [path.join(projectRoot, 'shared/locales/{{language}}/{{namespace}}.json')],
    output: path.join(projectRoot, 'shared/types/i18next.d.ts')
  }
});
