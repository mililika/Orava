# 05 · Transactions

**Goal:** the account (transactions and balance) is loaded from the server, and transactions the
user adds or deletes are saved, so they're still there after a reload.

**Depends on:** 03, 04.

## Decisions

- **"Today" stays tied to the data.** The dataset and the demo account end in Sept 2026, so the app
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
| POST | `/api/transactions` | `{ category, merchant, amount }` | 201 `{ tx, balance }` |
| DELETE | `/api/transactions/:id` | none | 200 `{ balance }` · 404 if not this user's |

Validation: `category` must be a known category from `@orava/core`; `merchant` 1–80 chars,
trimmed; `amount` non-zero, at most ±1,000,000, two decimals. Expense vs income follows the sign,
as in `AddTransactionScreen`.

Transaction ids go to the client as strings (as now), so `@orava/core` doesn't change.

## Tasks

### Contracts (first)

- [ ] `packages/contracts/src/account.ts` and `transactions.ts`: `AccountResponse`,
      `CreateTransactionRequest` (with the validation rules above), `CreateTransactionResponse`,
      `DeleteTransactionResponse`, and `TransactionIdParam`. Reuse `TransactionDto` and the
      category enum from section 01.

### Server (`TransactionsModule`)

- [ ] Repository: `add`, `softDelete` (only where `user_id` matches).
- [ ] `AccountController` and `TransactionsController`: the three routes, validated with the
      contracts schemas, typed with the contracts response types, user from `@CurrentUser()`
      (the global `SessionGuard` already requires a session).
- [ ] Limit per user: at most 500 `user` transactions (stops a guest from filling the DB);
      return 409 with a readable message beyond that.

### Web app

- [ ] Add `getAccount`, `createTransaction`, `deleteTransaction` to `lib/api.ts`, typed from
      `@orava/contracts`. `AddTransactionScreen`'s `NewTx` becomes `CreateTransactionRequest`.

- [ ] After login (and on reload via `/api/me`), load `/api/account`. Remove the client-side
      `demoAccount()` call and the TODO from section 04.
- [ ] `MainScreen.tsx`: `save` and `remove` call the API. Keep the screen responsive: update the
      list right away, then reconcile with the server's response (replace the temporary id with the
      real one, use the returned balance). On failure, undo the change and show the error in the
      existing toast.
- [ ] Delete the in-memory `added` / `removed` bookkeeping that becomes unnecessary.

## Acceptance criteria

- Add an expense as `demo`, reload: it's still there; balance and Money health reflect it.
- Delete a seeded transaction, reload: still gone.
- With the server stopped, adding a transaction shows an error toast and the list goes back to how
  it was.
- User A can't delete user B's transaction (404).
- Money health for a freshly seeded `demo` user is identical to before this section.

## Notes

<!-- Anything that turned out different from this plan. -->
