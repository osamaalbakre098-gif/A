import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'scripts/*.cjs',
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'dev-dist',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Kernlogik: keine Systemzeit direkt, `now` kommt als Parameter.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Date.now() ist verboten – `now` als Parameter übergeben.',
        },
      ],
    },
  },
  {
    // Nur Dateien außerhalb von Tests und Zeit-Modul: Date.now bleibt verboten; Zeit-Modul darf `new Date`.
    files: ['tests/**', 'scripts/**', 'src/main.tsx', 'src/data/clock.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
