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
  const snap = await getDocs(investmentsCol(uid));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return filterRecordsByMonth(records, month);
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
  const snap = await getDocs(expensesCol(uid));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return filterRecordsByMonth(records, month);
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
  const snap = await getDocs(spendingCol(uid));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return filterRecordsByMonth(records, month);
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
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
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
