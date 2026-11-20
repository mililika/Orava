// Compile-time checks that the API shapes and the engine's types can't drift apart.
// Nothing here runs; `npm run typecheck` fails if a check is false.

import type { Transaction } from '@orava/core';

import type { TransactionDto } from './transactions';

/** True only when A and B are exactly the same type. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type TransactionDtoMatchesCore = Expect<Equal<TransactionDto, Transaction>>;
