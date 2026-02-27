import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      // TypeScript handles unused vars via noUnusedLocals; disable JS rule
      // to avoid false positives on type-only imports and overloads.
      'no-unused-vars': 'off',
      // Allow empty catch blocks (common in defensive error handling)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Redeclare is normal in TS (interface merging, overloads)
      'no-redeclare': 'off',
      // TypeScript uses `const enum` etc. which triggers this
      'no-shadow': 'off',
      // typeof checks are valid in TS
      'no-undef': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js', '**/*.d.ts'],
  },
];
