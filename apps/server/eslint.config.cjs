// Same rules as the other workspaces (Expo's config: TypeScript, import order), minus anything React.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { rules: { '@typescript-eslint/no-redeclare': 'off' } },
  { ignores: ['dist/*'] },
]);
