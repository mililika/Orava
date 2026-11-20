import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

import type * as schema from './schema.js';

/** Injection token for the Drizzle instance: `@Inject(DB) private readonly db: Db`. */
export const DB = Symbol('DB');

export type Db = PostgresJsDatabase<typeof schema> & { $client: Sql };
