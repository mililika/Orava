// @orava/contracts: the API's request and response bodies as zod schemas, with their inferred
// types. The server validates with the schemas; the web app types its calls with the same ones.
// One file per area of the API. ai.ts is still empty: it's exported here once section 06 adds
// the first schema.

export * from './account';
export * from './auth';
export * from './common';
export * from './transactions';
