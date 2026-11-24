import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

import type * as schema from './schema.js';

export const DB = Symbol('DB');

export type Db = PostgresJsDatabase<typeof schema> & { $client: Sql };
