module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2021: true
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react-router-dom'],
            importNames: ['useNavigate'],
            message: 'Use custom useNavigate from hooks/useNavigate instead',
          },
        ],
      },
    ],
  },
};
