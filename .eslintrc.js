module.exports = {
  root: true,
  // The AI engine is a Python service. The only JavaScript in it is the static
  // browser console bundled with the service, which is plain ES5-era script
  // rather than TypeScript and does not answer to these rules.
  ignorePatterns: ['jobboard-ai-engine/**'],
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
