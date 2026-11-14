// Lets plain Node (with built-in TypeScript type stripping) run the app's pure .ts modules.
// The app imports files without extensions ("./logic"); Metro resolves those, Node does not.
// This hook retries a failed relative import with ".ts" added. No dependencies needed.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});
