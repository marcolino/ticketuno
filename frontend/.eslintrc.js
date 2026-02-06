module.exports = {
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
