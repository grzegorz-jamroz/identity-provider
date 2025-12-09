import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import nodePlugin from 'eslint-plugin-n';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default [
  // 1. Global Ignores
  { ignores: ['node_modules', 'dist', 'coverage'] },

  // 2. Base Configuration
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-module'], // Optimized for "type": "module"

  // 3. Prettier (Must be last)
  eslintConfigPrettier,

  // 4. Main Configuration
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node, // Adds 'process', 'console', 'Buffer' etc.
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylistic,
    },
    rules: {
      // --- Code Quality ---
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none', ignoreRestSiblings: true },
      ], // Consistent with your React app
      'no-console': ['warn', { allow: ['info', 'error'] }], // Allow logs, but warn so you don't spam prod

      // --- Node Specifics (plugin-n) ---
      'n/no-process-exit': 'error', // Don't use process.exit() in code, throw errors instead
      'n/exports-style': ['error', 'module.exports'],

      // --- Import Sorting ---
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Node.js built-in modules (prefixed with node: or not)
            ['^node:', '^(fs|path|os|http)(/|$)'],
            // 2. External packages (express, sharp, etc)
            ['^@?\\w'],
            // 3. Internal packages (if you use aliases)
            ['^@/'],
            // 4. Parent imports
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // 5. Relative imports
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ],
        },
      ],

      // Force { } on all if/else/for statements - curly + @stylistic/brace-style
      curly: ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],

      '@stylistic/padding-line-between-statements': [
        'error',
        // 1. Space BEFORE any 'block' (if, try, for, switch, while) OR a 'return'
        { blankLine: 'always', prev: '*', next: ['block-like', 'return'] },

        // 2. Space AFTER any 'block' (if, try, for, switch, while)
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
    },
  },

  // 5. Overrides for Test Files
  // In Flat Config, this is just another object in the array.
  // Since it comes AFTER block #4, it will override rules for these specific files.
  {
    files: ['eslint.config.js', '**/*.test.js', 'tests/helper.js', '**/*.spec.js'],
    rules: {
      // allow dev dependencies in test files
      'n/no-unpublished-import': 'off',
      'n/no-extraneous-import': 'off',
      'no-undef': 'off',
    },
  },
];
