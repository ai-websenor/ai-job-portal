module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  extends: ['plugin:prettier/recommended'],
  rules: {
    // ---------- formatting ----------
    'prettier/prettier': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],

    // 🔥 IMPORTANT FIX (bracket spacing)
    'object-curly-spacing': ['error', 'always'],

    // ---------- unused code ----------
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
  },
};
