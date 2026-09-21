import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

const usersCol = () => collection(db, "users");
const transactionsCol = (uid) => collection(db, "users", uid, "transactions");
const budgetsCol = (uid) => collection(db, "users", uid, "budgets");
const investmentsCol = (uid) => collection(db, "users", uid, "investments");
const expensesCol = (uid) => collection(db, "users", uid, "expenses");
const spendingCol = (uid) => collection(db, "users", uid, "spending");
const walletsCol = (uid) => collection(db, "users", uid, "wallets");

const getMonthKeyFromValue = (value) => {
  if (!value) return null;

  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 7);
};

const getRecordMonth = (record) =>
  record?.month ||
  getMonthKeyFromValue(record?.date) ||
  getMonthKeyFromValue(record?.createdAt);

const filterRecordsByMonth = (records, month) => {
  if (!month) return records;
  return records.filter((record) => getRecordMonth(record) === month);
};

const resolveWriteMonth = (data = {}) =>
  data.month ||
  getMonthKeyFromValue(data.date) ||
  getMonthKeyFromValue(data.createdAt) ||
  new Date().toISOString().slice(0, 7);

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

/**
 * Create or overwrite a user document (called after registration).
 * @param {string} uid
 * @param {{ displayName: string, email: string, username?: string, phone?: string, authProvider?: string }} data
 */
export const createUserProfile = (uid, data) =>
  setDoc(doc(usersCol(), uid), { ...data, createdAt: serverTimestamp() });

/**
 * Fetch a user profile document.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(usersCol(), uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/**
 * Update a user profile document.
 * @param {string} uid
 * @param {object} updates - fields to update (e.g., { username: 'new', displayName: '...' })
 * @returns {Promise<void>}
 */
export const updateUserProfile = (uid, updates) =>
  updateDoc(doc(usersCol(), uid), { ...updates, updatedAt: serverTimestamp() });

/**
 * Find a user profile by phone number.
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
export const getUserByPhone = async (phone) => {
  const q = query(usersCol(), where("phone", "==", phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Check if an email is already registered.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export const isEmailTaken = async (email) => {
  const q = query(usersCol(), where("email", "==", email));
  const snap = await getDocs(q);
  return !snap.empty;
};

/**
 * Delete all data for a user (profile + subcollections).
 * @param {string} uid
 * @returns {Promise<void>}
 */
export const deleteAllUserData = async (uid) => {
  const subcollections = [
    transactionsCol(uid),
    budgetsCol(uid),
    investmentsCol(uid),
    expensesCol(uid),
    spendingCol(uid),
    walletsCol(uid),
  ];

  // Delete all documents in each subcollection
  for (const col of subcollections) {
    const snap = await getDocs(col);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }

  // Delete the user profile document
  await deleteDoc(doc(usersCol(), uid));
};

// ---------------------------------------------------------------------------
// Transactions (income / expenses)
// ---------------------------------------------------------------------------

/**
 * Add a transaction for a user.
 * @param {string} uid
 * @param {{ type: 'income'|'expense', amount: number, category: string, note?: string, date?: Date }} data
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export const addTransaction = (uid, data) =>
  addDoc(transactionsCol(uid), { ...data, createdAt: serverTimestamp() });

/**
 * Fetch all transactions for a user ordered by date descending.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getTransactions = async (uid) => {
  const q = query(transactionsCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Fetch transactions filtered by type ('income' | 'expense').
 * @param {string} uid
 * @param {'income'|'expense'} type
 * @returns {Promise<object[]>}
 */
export const getTransactionsByType = async (uid, type) => {
  const q = query(
    transactionsCol(uid),
    where("type", "==", type),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update a transaction document.
 * @param {string} uid
 * @param {string} transactionId
 * @param {object} updates
 */
export const updateTransaction = (uid, transactionId, updates) =>
  updateDoc(doc(transactionsCol(uid), transactionId), updates);

/**
 * Delete a transaction document.
 * @param {string} uid
 * @param {string} transactionId
 */
export const deleteTransaction = (uid, transactionId) =>
  deleteDoc(doc(transactionsCol(uid), transactionId));

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

/**
 * Set (create or overwrite) a budget entry.
 * @param {string} uid
 * @param {string} category  e.g. 'Rent', 'Food'
 * @param {{ allocated: number, month: string }} data
 */
export const setBudget = (uid, category, data) =>
  setDoc(doc(budgetsCol(uid), category), {
    ...data,
    updatedAt: serverTimestamp(),
  });

/**
 * Fetch all budgets for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getBudgets = async (uid) => {
  const snap = await getDocs(budgetsCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

/**
 * Add an investment record.
 * @param {string} uid
 * @param {{ platform: string, amount: number, category: string, description?: string }} data
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export const addInvestment = (uid, data) =>
  addDoc(investmentsCol(uid), {
    ...data,
    month: resolveWriteMonth(data),
    createdAt: serverTimestamp(),
  });

/**
 * Fetch all investments for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getInvestments = async (uid, month) => {
  if (month) {
    const q = query(investmentsCol(uid), where("month", "==", month));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const snap = await getDocs(investmentsCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update an investment record.
 * @param {string} uid
 * @param {string} investmentId
 * @param {object} updates
 */
export const updateInvestment = (uid, investmentId, updates) =>
  updateDoc(doc(investmentsCol(uid), investmentId), updates);

/**
 * Delete an investment record.
 * @param {string} uid
 * @param {string} investmentId
 */
export const deleteInvestment = (uid, investmentId) =>
  deleteDoc(doc(investmentsCol(uid), investmentId));

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/**
 * Add an expense record.
 * @param {string} uid
 * @param {{ category: string, amount: number, allocation: number, description?: string }} data
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export const addExpense = (uid, data) =>
  addDoc(expensesCol(uid), {
    ...data,
    month: resolveWriteMonth(data),
    createdAt: serverTimestamp(),
  });

/**
 * Fetch all expenses for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getExpenses = async (uid, month) => {
  if (month) {
    const q = query(expensesCol(uid), where("month", "==", month));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const snap = await getDocs(expensesCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update an expense record.
 * @param {string} uid
 * @param {string} expenseId
 * @param {object} updates
 */
export const updateExpense = (uid, expenseId, updates) =>
  updateDoc(doc(expensesCol(uid), expenseId), updates);

/**
 * Delete an expense record.
 * @param {string} uid
 * @param {string} expenseId
 */
export const deleteExpense = (uid, expenseId) =>
  deleteDoc(doc(expensesCol(uid), expenseId));

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

/**
 * Add a spending record for a specific expense category.
 * @param {string} uid
 * @param {{ category: string, amount: number, description?: string, date: Date, itemName?: string }} data
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export const addSpending = (uid, data) =>
  addDoc(spendingCol(uid), {
    ...data,
    month: resolveWriteMonth(data),
    createdAt: serverTimestamp(),
  });

/**
 * Delete a spending record.
 * @param {string} uid
 * @param {string} spendingId
 */
export const deleteSpending = (uid, spendingId) =>
  deleteDoc(doc(spendingCol(uid), spendingId));

/**
 * Update a spending record.
 * @param {string} uid
 * @param {string} spendingId
 * @param {object} updates
 */
export const updateSpending = (uid, spendingId, updates) =>
  updateDoc(doc(spendingCol(uid), spendingId), updates);

/**
 * Fetch all spending records for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getSpending = async (uid, month) => {
  if (month) {
    const q = query(spendingCol(uid), where("month", "==", month));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const snap = await getDocs(spendingCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Fetch spending records for a specific category.
 * @param {string} uid
 * @param {string} category
 * @returns {Promise<object[]>}
 */
export const getSpendingByCategory = async (uid, category, month) => {
  const allSpending = await getSpending(uid, month);
  const filteredSpending = allSpending.filter(
    (spending) => spending.category === category,
  );

  return filteredSpending.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || a.date || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.date || 0);
    return dateB - dateA;
  });
};

// ---------------------------------------------------------------------------
// Monthly summaries
// ---------------------------------------------------------------------------

const monthlySummariesCol = (uid) =>
  collection(db, "users", uid, "monthlySummaries");

/**
 * Create or overwrite a monthly summary for a specific month.
 * @param {string} uid
 * @param {string} month - Format "YYYY-MM"
 * @param {object} data - { income, savingsPercent, investmentPercent, expensesPercent, savingsAmount, investmentAmount, expensesAmount, balance }
 * @returns {Promise<void>}
 */
export const setMonthlySummary = (uid, month, data) =>
  setDoc(doc(monthlySummariesCol(uid), month), {
    ...data,
    updatedAt: serverTimestamp(),
  });

/**
 * Fetch all monthly summaries for a user, ordered by month descending.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getMonthlySummaries = async (uid) => {
  const q = query(monthlySummariesCol(uid), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Fetch a monthly summary for a specific month.
 * @param {string} uid
 * @param {string} month - Format "YYYY-MM"
 * @returns {Promise<object|null>}
 */
export const getMonthlySummary = async (uid, month) => {
  const snap = await getDoc(doc(monthlySummariesCol(uid), month));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addUnallocatedSpending = async (uid, data) => {
  const payload = {
    ...data,
    category: "Unallocated",
    isUnallocated: true,
    month: resolveWriteMonth(data),
    createdAt: serverTimestamp(),
  };
  return addDoc(spendingCol(uid), payload);
};

/**
 * Update a monthly summary document.
 * @param {string} uid
 * @param {string} month
 * @param {object} updates
 * @returns {Promise<void>}
 */
export const updateMonthlySummary = (uid, month, updates) =>
  updateDoc(doc(monthlySummariesCol(uid), month), updates);

/**
 * Delete a monthly summary document.
 * @param {string} uid
 * @param {string} month
 * @returns {Promise<void>}
 */
export const deleteMonthlySummary = (uid, month) =>
  deleteDoc(doc(monthlySummariesCol(uid), month));

/**
 * Delete a monthly record and everything tied to that month:
 * the summary doc, plus all spending, expenses, and investments
 * recorded for that month.
 * @param {string} uid
 * @param {string} month - Format "YYYY-MM"
 * @returns {Promise<void>}
 */
export const deleteMonthlyRecord = async (uid, month) => {
  const cols = [
    spendingCol(uid),
    expensesCol(uid),
    investmentsCol(uid),
  ];
  // Delete all docs in each collection that belong to this month.
  await Promise.all(
    cols.map(async (col) => {
      const q = query(col, where("month", "==", month));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }),
  );
  await deleteDoc(doc(monthlySummariesCol(uid), month));
};

// ---------------------------------------------------------------------------
// Wallets (Cash / Mobile Money / Card) and Credit accounts
// ---------------------------------------------------------------------------

const DEFAULT_WALLETS = [
  { id: "cash", name: "Cash", type: "asset", isDefault: true },
  { id: "mobile-money", name: "Mobile Money", type: "asset", isDefault: true },
];

const normalizeWalletName = (name) => (name || "").trim().toLowerCase();

const toMillis = (value) =>
  value?.toMillis ? value.toMillis() : new Date(value || 0).getTime() || 0;

/**
 * Merge asset wallets that share a name. Older versions of
 * ensureDefaultWallets used generated ids, so two concurrent calls (several
 * screens call it on load) could each seed a "Cash" / "Mobile Money" document.
 * Funding entries, spending and investments pointing at a duplicate are
 * re-pointed at the surviving wallet before the duplicates are deleted.
 * @param {string} uid
 * @param {object[]} [knownWallets] - wallets the caller already fetched
 * @returns {Promise<boolean>} whether anything was merged
 */
export const reconcileDuplicateWallets = async (uid, knownWallets) => {
  const wallets = knownWallets || (await getWallets(uid));
  const groups = new Map();
  wallets
    .filter((w) => (w.type || "asset") === "asset")
    .forEach((w) => {
      const key = normalizeWalletName(w.name);
      if (!key) return;
      groups.set(key, [...(groups.get(key) || []), w]);
    });

  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  if (!duplicates.length) return false;

  const [summariesSnap, spendingSnap, investmentsSnap] = await Promise.all([
    getDocs(monthlySummariesCol(uid)),
    getDocs(spendingCol(uid)),
    getDocs(investmentsCol(uid)),
  ]);

  const fundingCount = {};
  const recordCount = {};
  summariesSnap.docs.forEach((d) => {
    (d.data().walletFunding || []).forEach((f) => {
      if (f.walletId) {
        fundingCount[f.walletId] = (fundingCount[f.walletId] || 0) + 1;
      }
    });
  });
  [spendingSnap, investmentsSnap].forEach((snap) => {
    snap.docs.forEach((d) => {
      const { walletId } = d.data();
      if (walletId) recordCount[walletId] = (recordCount[walletId] || 0) + 1;
    });
  });

  // Keep the wallet that holds the month funding, then the one with the most
  // records, then the oldest — so the surviving account keeps the real balance.
  const canonicalFor = {};
  const duplicateIds = [];
  duplicates.forEach((group) => {
    const ranked = [...group].sort((a, b) => {
      const funding = (fundingCount[b.id] || 0) - (fundingCount[a.id] || 0);
      if (funding) return funding;
      const records = (recordCount[b.id] || 0) - (recordCount[a.id] || 0);
      if (records) return records;
      return toMillis(a.createdAt) - toMillis(b.createdAt);
    });
    ranked.slice(1).forEach((w) => {
      canonicalFor[w.id] = ranked[0];
      duplicateIds.push(w.id);
    });
  });

  const summaryWrites = [];
  summariesSnap.docs.forEach((d) => {
    const funding = d.data().walletFunding;
    if (!Array.isArray(funding) || !funding.length) return;
    let changed = false;
    const merged = [];
    const byKey = {};
    funding.forEach((f) => {
      const target = f.walletId ? canonicalFor[f.walletId] : null;
      const walletId = target ? target.id : f.walletId;
      const name = target ? target.name : f.name;
      if (walletId !== f.walletId) changed = true;
      const key = walletId || `custom:${normalizeWalletName(name)}`;
      if (byKey[key]) {
        byKey[key].amount = (byKey[key].amount || 0) + (f.amount || 0);
        byKey[key].percent = (byKey[key].percent || 0) + (f.percent || 0);
        changed = true;
      } else {
        byKey[key] = { ...f, walletId, name };
        merged.push(byKey[key]);
      }
    });
    if (changed) summaryWrites.push(updateDoc(d.ref, { walletFunding: merged }));
  });

  const recordWrites = [];
  [spendingSnap, investmentsSnap].forEach((snap) => {
    snap.docs.forEach((d) => {
      const target = canonicalFor[d.data().walletId];
      if (target) recordWrites.push(updateDoc(d.ref, { walletId: target.id }));
    });
  });

  await Promise.all([...summaryWrites, ...recordWrites]);
  await Promise.all(duplicateIds.map((id) => deleteDoc(doc(walletsCol(uid), id))));
  return true;
};

/**
 * Create the default asset wallets (Cash / Mobile Money) if they
 * don't exist. Idempotent — safe to call on every app load.
 * @param {string} uid
 * @returns {Promise<void>}
 */
export const ensureDefaultWallets = async (uid) => {
  const snap = await getDocs(walletsCol(uid));
  const existing = new Set(
    snap.docs.map((d) => normalizeWalletName(d.data().name)),
  );
  const existingIds = new Set(snap.docs.map((d) => d.id));
  const missing = DEFAULT_WALLETS.filter(
    (w) => !existing.has(normalizeWalletName(w.name)),
  );
  // Fixed document ids: concurrent calls can no longer create a second "Cash".
  await Promise.all(
    missing.map(({ id, ...w }) =>
      existingIds.has(id)
        ? null
        : setDoc(doc(walletsCol(uid), id), {
            ...w,
            createdAt: serverTimestamp(),
          }),
    ),
  );
  await reconcileDuplicateWallets(
    uid,
    snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  );
};

/**
 * Fetch all wallets for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getWallets = async (uid) => {
  const snap = await getDocs(walletsCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Fetch only credit-type wallets.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getCreditWallets = async (uid) => {
  const wallets = await getWallets(uid);
  return wallets.filter((w) => w.type === "credit");
};

/**
 * Add a new credit wallet (the built-in asset wallets are fixed).
 * @param {string} uid
 * @param {{ name: string, limit: number, description?: string }} data
 * @returns {Promise<import('firebase/firestore').DocumentReference>}
 */
export const addWallet = (uid, data) =>
  addDoc(walletsCol(uid), {
    name: data.name,
    type: "credit",
    limit: data.limit || 0,
    used: 0,
    remaining: data.limit || 0,
    description: data.description || "",
    createdAt: serverTimestamp(),
  });

/**
 * Update a wallet document.
 * @param {string} uid
 * @param {string} walletId
 * @param {object} updates
 */
export const updateWallet = (uid, walletId, updates) =>
  updateDoc(doc(walletsCol(uid), walletId), updates);

/**
 * Delete a wallet document.
 * @param {string} uid
 * @param {string} walletId
 */
export const deleteWallet = (uid, walletId) =>
  deleteDoc(doc(walletsCol(uid), walletId));

/**
 * Spend against a credit wallet: increase used, decrease remaining.
 * @param {string} uid
 * @param {string} walletId
 * @param {number} amount
 */
export const useCreditAmount = async (uid, walletId, amount) => {
  const snap = await getDoc(doc(walletsCol(uid), walletId));
  if (!snap.exists()) throw new Error("Credit wallet not found");
  const wallet = snap.data();
  if (wallet.type !== "credit") throw new Error("Not a credit wallet");
  const newUsed = (wallet.used || 0) + amount;
  const newRemaining = (wallet.limit || 0) - newUsed;
  await updateDoc(doc(walletsCol(uid), walletId), {
    used: newUsed,
    remaining: Math.max(0, newRemaining),
  });
};

/**
 * Repay a credit wallet: decrease used, increase remaining.
 * @param {string} uid
 * @param {string} walletId
 * @param {number} amount
 */
export const repayCredit = async (uid, walletId, amount) => {
  const snap = await getDoc(doc(walletsCol(uid), walletId));
  if (!snap.exists()) throw new Error("Credit wallet not found");
  const wallet = snap.data();
  if (wallet.type !== "credit") throw new Error("Not a credit wallet");
  const newUsed = Math.max(0, (wallet.used || 0) - amount);
  const newRemaining = Math.min(
    wallet.limit || 0,
    (wallet.remaining || 0) + amount,
  );
  await updateDoc(doc(walletsCol(uid), walletId), {
    used: newUsed,
    remaining: newRemaining,
  });
};

/**
 * Spending and investment records that aren't tied to any account, across
 * all months — typically recorded before accounts existed.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getUnassignedRecords = async (uid) => {
  const [spendingSnap, investmentsSnap] = await Promise.all([
    getDocs(spendingCol(uid)),
    getDocs(investmentsCol(uid)),
  ]);
  return [
    ...spendingSnap.docs
      .filter((d) => !d.data().walletId)
      .map((d) => ({ id: d.id, recordType: "spending", ...d.data() })),
    ...investmentsSnap.docs
      .filter((d) => !d.data().walletId)
      .map((d) => ({ id: d.id, recordType: "investment", ...d.data() })),
  ].sort(
    (a, b) => toMillis(b.date || b.createdAt) - toMillis(a.date || a.createdAt),
  );
};

/**
 * Point unassigned records at an account so they count toward its balance.
 * Legacy records without a month get one derived from their date, otherwise
 * the month views would never pick them up.
 * @param {string} uid
 * @param {object[]} records - rows from getUnassignedRecords
 * @param {{ id: string, type: string }} wallet
 * @returns {Promise<void>}
 */
export const assignWalletToRecords = async (uid, records, wallet) => {
  await Promise.all(
    records.map((record) => {
      const col =
        record.recordType === "investment"
          ? investmentsCol(uid)
          : spendingCol(uid);
      const updates = { walletId: wallet.id, walletType: wallet.type };
      if (!record.month) updates.month = resolveWriteMonth(record);
      return updateDoc(doc(col, record.id), updates);
    }),
  );
  if (wallet.type === "credit") {
    const total = records.reduce(
      (sum, r) => sum + (r.totalSpending ?? r.totalInvestment ?? r.amount ?? 0),
      0,
    );
    if (total > 0) await useCreditAmount(uid, wallet.id, total);
  }
};

/**
 * Delete an expense category and everything tied to it:
 * - the expense doc itself
 * - all spending records under that category for the month
 * - reverts credit usage for any credit-funded spending in that category
 * @param {string} uid
 * @param {string} expenseId
 * @param {string} category - the expense category name
 * @param {string} month - Format "YYYY-MM"
 * @returns {Promise<void>}
 */
export const deleteExpenseCategory = async (uid, expenseId, category, month) => {
  // Delete all spending records in this category for the month,
  // and reverse credit usage for credit-funded ones.
  const q = query(
    spendingCol(uid),
    where("category", "==", category),
    where("month", "==", month),
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      if (data.walletType === "credit" && data.walletId) {
        try {
          await repayCredit(uid, data.walletId, data.totalSpending || data.amount || 0);
        } catch (error) {
          console.error("Failed to reverse credit usage:", error);
        }
      }
      await deleteDoc(d.ref);
    }),
  );

  // Delete the expense category doc itself.
  if (expenseId) {
    await deleteDoc(doc(expensesCol(uid), expenseId));
  }
};

