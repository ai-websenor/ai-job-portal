module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  extends: [
    // 'plugin:@typescript-eslint/recommended', // enable later if needed
    'plugin:prettier/recommended',
  ],
  rules: {
    // ---------- formatting ----------
    'prettier/prettier': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],

    // ---------- unused code ----------
    'no-unused-vars': 'off', // disable JS rule
    '@typescript-eslint/no-unused-vars': [
      'error', // 🔴 RED line now
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
        varsIgnorePattern: '^_', // allow _ignoredVar
        argsIgnorePattern: '^_', // allow _unusedParam
      },
    ],
  },
};
