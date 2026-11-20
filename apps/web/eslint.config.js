// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Turns off ESLint rules that would fight with Prettier's formatting.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);
