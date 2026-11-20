import { defineConfig } from 'tsup';

// Compiled to JS so both sides can load it: ESM for Metro (the web app), CJS for NestJS (the
// server), with .d.ts files. In watch mode dist/ isn't wiped first, so Metro never sees it empty.
export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // tsup 8's .d.ts build sets `baseUrl`, which TypeScript 6 deprecates.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: !options.watch,
  sourcemap: true,
  target: 'es2022',
}));
