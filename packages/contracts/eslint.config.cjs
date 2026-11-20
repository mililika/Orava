// Same rules as the web app (Expo's config: TypeScript, import order), minus anything React.
// Each zod schema and its inferred type share a name (`Month` the schema, `Month` the type),
// which TypeScript allows, so no-redeclare is off here.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { rules: { '@typescript-eslint/no-redeclare': 'off' } },
  { ignores: ['dist/*'] },
]);
