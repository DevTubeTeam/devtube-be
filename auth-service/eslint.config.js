import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: ['dist', 'node_modules'],
  files: ['**/*.ts'],
  plugins: {
    '@typescript-eslint': await import('@typescript-eslint/eslint-plugin'),
    'simple-import-sort': await import('eslint-plugin-simple-import-sort'),
    'eslint-plugin-prettier': await import('eslint-plugin-prettier'),
    'eslint-plugin-import': await import('eslint-plugin-import'),
  },
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
  extends: [eslintPluginPrettierRecommended],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json', //
      },
    },
  },
});
