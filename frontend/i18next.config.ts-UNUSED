import { defineConfig } from 'i18next-cli';

export default defineConfig({
  "locales": [
    "en",
    "it",
    "fr"
  ],
  "extract": {
    "input": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.spec.{js,jsx,ts,tsx}",
      "!src/**/*.test.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      //"!node_modules/**"
    ],
    "output": "public/locales/{{language}}/{{namespace}}.json",
    "defaultNS": "translation",
    "keySeparator": false,
    "nsSeparator": false,
    "contextSeparator": "_",
    "functions": [
      "t",
      "*.t"
    ],
    // "transComponents": [
    //   "Trans"
    // ]
  },
  "types": {
    "input": [
      "locales/{{language}}/{{namespace}}.json"
    ],
    "output": "src/types/i18next.d.ts"
  }
});