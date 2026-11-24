# 05 · Transactions

**Goal:** the account (transactions and balance) is loaded from the server, and transactions the
user adds or deletes are saved, so they're still there after a reload.

**Depends on:** 03, 04.

## Decisions

- **"Today" stays tied to the data.** The challenge data ends in Sept 2026, so the app
  treats the newest `seed` transaction date as today (as `MainScreen.tsx` does now). New
  transactions get that date. The server decides the date, not the client. Put this in one
  function, `todayFor(userId)`, so switching to the real date later is a one-line change.
- **`type` is set by the server** from the category (`typeFor` in `@orava/core`).
- **Deletes are soft** (`deleted_at`), for both `seed` and `user` rows. A deleted row is gone from
  every list and from the balance.
- **The client keeps computing the health report** with `@orava/core`, exactly as now. The server
  doesn't send a report. (It computes its own in section 06, for AI context only.)

## API (all need a session)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/account` | none | `{ username, balance, txs }`: the existing `Account` shape, `txs` newest first |
| POST | `/api/transactions` | `{ category, merchant, amount }` | 201 `{ tx }` |
| DELETE | `/api/transactions/:id` | none | 204 · 404 if not this user's |

Validation: `category` must be a known category from `@orava/core`; `merchant` 1–80 chars,
trimmed; `amount` non-zero, at most ±1,000,000, two decimals. Expense vs income follows the sign,
as in `AddTransactionScreen`.

Transaction ids go to the client as strings (as now), so `@orava/core` doesn't change.

## Tasks

### Contracts (first)

- [x] `packages/contracts/src/account.ts` and `transactions.ts`: `AccountResponse`,
      `CreateTransactionRequest` (with the validation rules above), `CreateTransactionResponse`,
      `DeleteTransactionResponse`, and `TransactionIdParam`. Reuse `TransactionDto` and the
      category enum from section 01.

### Server (`TransactionsModule`)

- [x] Repository: `add`, `softDelete` (only where `user_id` matches).
- [x] `AccountController` and `TransactionsController`: the three routes, validated with the
      contracts schemas, typed with the contracts response types, user from `@CurrentUser()`
      (the global `AuthGuard` already requires a signed-in user).
- [x] Limit per user: at most 500 `user` transactions (keeps one account from filling the DB);
      return 409 with a readable message beyond that.

### Web app

- [x] Add `getAccount`, `createTransaction`, `deleteTransaction` to `lib/api.ts`, typed from
      `@orava/contracts`. `AddTransactionScreen`'s `NewTx` becomes `CreateTransactionRequest`.

- [x] After login (and on reload via `/api/me`), load `/api/account`. Remove the client-side
      `demoAccount()` call and the TODO from section 04, and delete `demoAccount.ts` (nothing uses it
      any more).
- [x] `MainScreen.tsx`: `save` and `remove` call the API. Keep the screen responsive: update the
      list right away, then reconcile with the server's response (replace the temporary id with the
      real one; the balance follows the list). On failure, undo the change and show the error in the
      existing toast.
- [x] Delete the in-memory `added` / `removed` bookkeeping that becomes unnecessary.

## Acceptance criteria

- Add an expense as `demo_solid`, reload: it's still there; balance and Money health reflect it.
- Delete a seeded transaction, reload: still gone.
- With the server stopped, adding a transaction shows an error toast and the list goes back to how
  it was.
- User A can't delete user B's transaction (404).
- Money health for `demo_solid` matches what it showed with the same data before this section.

## Notes

<!-- Anything that turned out different from this plan. -->

- **`GET /api/account` already exists (section 04):** `AccountResponse` in `contracts/account.ts`,
  `AccountController` in `apps/server/src/transactions/`, `getAccount()` in the web app's
  `lib/api.ts`, called after login and on reload. There's no `demoAccount()` call or TODO left to
  remove (it was deleted in section 01). This section adds the write side.
- **"Today" lives in `TodayService.todayFor(userId)`** (`apps/server/src/transactions/today.service.ts`):
  the newest `seed` date, deleted rows included, so deleting that transaction doesn't move "today".
- **The 500 limit counts every `user` row, deleted ones included**, so adding and deleting in a
  loop can't get around it. The count and the insert run in one DB transaction that locks the
  user's row (`addWithinLimit`), so parallel requests can't overshoot it.
- **The sign must match the category** (`CreateTransactionRequest`): income categories need a
  positive amount, the rest a negative one. The server rejects a mismatch with 400.
- **The web app works the balance out from the list** instead of storing the server's returned
  balance: opening balance (from the loaded account) + the sum of the listed transactions, in
  cents. That's the server's own definition, and it stays right while adds and deletes overlap or
  get undone, which mixing returned balances with undo-by-amount didn't. So the write routes don't
  send a balance (first planned as `{ tx, balance }` and `{ balance }`): POST returns `{ tx }`,
  DELETE returns 204, and neither runs the extra sum query.
- **Web extras:** a row that's still being saved can't be deleted yet ("Still saving"); a delete
  that comes back 404 (already deleted elsewhere) keeps the row gone instead of restoring it; the
  add form validates the rounded amount, the ±1,000,000 limit and the 80-character description.
- **Verified 2026-11-24 as `demo_solid`:** add → reload → delete (row 3332); deleting seed row 993
  survives a reload; with the server stopped, adding shows "Not saved: Cannot reach the server"
  and the list and balance go back; a delete scoped to another user matches no rows (404).
