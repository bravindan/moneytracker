# Plan: Accounts & Credit Tracking (Cash / Mobile Money / Card)

## Problem

The current model assumes all money is a single consolidated pool:

- A monthly record has `income` split into allocations (`expenses`, `investments`, custom categories, `balance` for unallocated/savings).
- Every spending record is just `{ category, amount, totalSpending, ... }` — there's **no notion of which account/payment method** (cash, mobile money, card) it came from.
- Spending **cannot exceed** a category's allocation: MonthlyRecordScreen blocks `totalAllocated > totalIncome`, DashboardScreen blocks unallocated spending `> balance`, and the old credit feature (removed in `30eca4e`) only patched overspend by covering it from savings/credit at record time — it did **not** track real cash/mobile/card balances or a borrow/repay ledger.

The user wants:
1. Separate balances for **cash, mobile banking/card** — not one pool.
2. **Credit** as a real ledger: borrowed amount, spend against it, repayments.
3. **Overspend allowed** — warn, but let the user record spending beyond a category allocation (e.g., paid by credit).

## Design overview (one opinionated approach)

Add a **`wallets`** subcollection (`users/{uid}/wallets`) with fixed built-in accounts plus user-created credit accounts, and a **`payments`** field on every spending/investment/expense record pointing at the wallet that funded it. Balance changes are computed **on read** from the spending/investment/credit ledgers — no counter documents that can drift out of sync.

- Built-in wallets seeded per user: **Cash**, **Mobile Money**, **Card** (type `'asset'`).
- Credit accounts: type `'credit'` with `limit`, `used`, `remaining` maintained via `useCreditAmount`/`repayCredit` (reuse the removed feature's exact functions from `30eca4e^`).
- Each spending record gets `walletId` + `walletType` (`'asset'` | `'credit'`). Asset spending reduces that wallet's balance; credit spending increases that credit account's `used`.

## Data model changes

### `users/{uid}/wallets/{walletId}` (new subcollection)
```
{
  name: "Cash" | "Mobile Money" | "Card" | <user credit name>,
  type: "asset" | "credit",
  isDefault: boolean,          // seeded built-ins
  createdAt: serverTimestamp(),
  // credit-only:
  limit?: number,              // total borrowed capacity
  used?: number,               // sum of credit-funded spending, not yet repaid
  remaining?: number,          // limit - used
  // optional
  description?: string,
}
```

### `users/{uid}/spending/{id}` (add fields)
```
walletId: string,
walletType: "asset" | "credit",
```
Existing fields (`category`, `amount`, `transactionCosts`, `totalSpending`, `itemName`, `description`, `date`, `month`) unchanged.

### `users/{uid}/investments/{id}` (add fields, same shape)
```
walletId: string,
walletType: "asset" | "credit",
```

## Firestore service changes (`src/services/firestoreService.js`)

Add:
- `ensureDefaultWallets(uid)` — creates Cash/Mobile Money/Card if missing (idempotent; call on app load + profile fetch).
- `getWallets(uid)` → `[{ id, ... }]` ordered by `createdAt`.
- `getCreditWallets(uid)` → wallets where `type === 'credit'`.
- `addWallet(uid, { name, type, limit })` (credit creation only; assets are fixed).
- `updateWallet(uid, walletId, updates)`.
- `deleteWallet(uid, walletId)`.
- `useCreditAmount(uid, walletId, amount)` and `repayCredit(uid, walletId, amount)` — port the exact logic from `30eca4e^` (get doc, adjust `used`/`remaining`, write back), but scoped to the wallet doc instead of a credit record.
- `getWalletTotals(uid)` — on-read aggregation: for each wallet, sum `spending` where `walletId === id` (asset: balance = income-side credit? **No** — see note below), plus credit `used`/`remaining`.

**Important design decision — wallet balances are NOT income-derived.** Because the app tracks monthly income separately, there are two coherent meanings for "cash balance":

- **(A) Accounting balance**: cash in hand = money you hold (external to the app's monthly income model).
- **(B) Allocated balance**: the share of this month's income that remains in cash/mobile/card after spending.

**Recommendation: (B) — keep it month-scoped and derived from allocations, so it composes with the existing dashboard.** The user sets per-wallet **funding** in the Monthly Record screen: how the month's income is split into Cash / Mobile Money / Card (a new allocation row type `wallet`). Then:
- Wallet `balance = wallet.funding - Σ spending(in that wallet, that month, type asset)`.
- Credit is separate: `used/remaining` on the wallet doc.
- This requires **no new income source**; it only re-shapes where allocations land.

The dashboard's `financialData` gets a new `wallets` section computed from `getWallets` + `getSpending(month)` + `getInvestments(month)`:
```
wallets: {
  cash:    { funded, spent, balance },
  mobile:  { funded, spent, balance },
  card:    { funded, spent, balance },
  credit:  { limit, used, remaining, spent },
}
```

## UI changes

### 1. MonthlyRecordScreen — wallet funding
Add a **"Where does the money go?"** wallet-funding row set (like allocations): three rows for Cash / Mobile Money / Card, each with an amount or % of income. `walletFunding` saved on the monthly summary:
```
walletFunding: [{ walletId, name, amount, percent }]
```
Keep `balance = income − all allocations` (existing semantics) — wallet funding does **not** change `income`, it only describes distribution. Default = 100% to Cash if the user doesn't touch it (so existing flows keep working).

### 2. New `WalletsScreen` (Settings → "Accounts")
- Lists Cash / Mobile Money / Card with current month balance (`funded − spent`) and total spent.
- Lists credit accounts with `limit / used / remaining` and a progress bar.
- **Add credit account**: name + limit.
- **Repay credit**: amount input → `repayCredit`.
- (Spend against credit happens from the spending form; see below.)
- Register in `App.js` `AppStack` + a menu item in `SettingsMenuScreen` ("Accounts" under the Wallet icon).

### 3. Spending entry (SpendingDetailsScreen + Dashboard unallocated modal)
Add a **"Paid from"** picker (Cash / Mobile Money / Card / each credit account with remaining shown). On save:
- Validate: asset wallet can't go negative (spending > funded remaining → warn, block or allow? see overspend below). Credit wallet caps at `remaining` (with a "you'll exceed your credit limit" warning if forced).
- Persist `walletId`/`walletType` on the record; for credit, call `useCreditAmount`.

### 4. Overspend (Warn but allow — user's choice)
Remove the hard blocks:
- MonthlyRecordScreen: change `totalAllocated > totalIncome` block to a **warning** (confirm to save anyway). 
- Dashboard unallocated modal: `amount > balance` becomes a **warning** + confirm.
- Category cards: when `spent > allocated`, show the card in red with "Over budget by X" and a "funded by credit" indicator if any overspend used a credit wallet. The `expenses.spent`/`remaining` math stays as-is (it already goes negative naturally via `remaining = allocated − spent`).

### 5. Dashboard — new "Accounts / Wallets" card
A compact card (below Savings/Unallocated) showing each wallet's `balance` and credit `used/remaining`, tap → WalletsScreen. Respects the existing `theme.colors` and the `fmt` currency formatter.

## Migration & backward compatibility

- All new fields are optional (`walletId`/`walletType` absent on old records). Old spending records default to `walletId: null` → treated as **Cash** for aggregation, so existing data still sums correctly.
- `ensureDefaultWallets` seeds the three built-ins on first load; existing users get them automatically.
- No destructive writes; `monthlySummaries` shape is additive (`walletFunding` optional).

## Files to modify / create

- `src/services/firestoreService.js` — add wallet + credit functions, `ensureDefaultWallets`, `getWalletTotals`.
- `src/screens/MonthlyRecordScreen.js` — wallet funding rows, relax overspend block to warning.
- `src/screens/SpendingDetailsScreen.js` — "Paid from" picker + credit spend handling.
- `src/screens/DashboardScreen.js` — wallet card, overspend warnings, unallocated modal "Paid from".
- `src/screens/WalletsScreen.js` (new) — accounts list, add credit, repay credit.
- `src/screens/SettingsMenuScreen.js` — "Accounts" menu item.
- `App.js` — register `WalletsScreen`.

## Verification

- `node --check` on all changed files.
- Manual: create a monthly record with wallet funding → spend from Cash and Card → confirm wallet balances decrement correctly.
- Credit: add a credit account with limit → spend against it beyond a category allocation → confirm warning shows, credit `used` increases, `remaining` decreases; repay → `used` decreases.
- Old data: load a month with pre-existing spending (no walletId) → defaults to Cash, totals unchanged.
- Dark mode: new screens/cards use `theme.colors` only.
