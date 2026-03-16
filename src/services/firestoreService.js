import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

const usersCol = () => collection(db, 'users');
const transactionsCol = (uid) => collection(db, 'users', uid, 'transactions');
const budgetsCol = (uid) => collection(db, 'users', uid, 'budgets');
const investmentsCol = (uid) => collection(db, 'users', uid, 'investments');

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
  const q = query(transactionsCol(uid), orderBy('createdAt', 'desc'));
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
    where('type', '==', type),
    orderBy('createdAt', 'desc')
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
  setDoc(doc(budgetsCol(uid), category), { ...data, updatedAt: serverTimestamp() });

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
  addDoc(investmentsCol(uid), { ...data, createdAt: serverTimestamp() });

/**
 * Fetch all investments for a user.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getInvestments = async (uid) => {
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
// Monthly summaries
// ---------------------------------------------------------------------------

const monthlySummariesCol = (uid) => collection(db, 'users', uid, 'monthlySummaries');

/**
 * Create or overwrite a monthly summary for a specific month.
 * @param {string} uid
 * @param {string} month - Format "YYYY-MM"
 * @param {object} data - { income, savingsPercent, investmentPercent, expensesPercent, savingsAmount, investmentAmount, expensesAmount, balance }
 * @returns {Promise<void>}
 */
export const setMonthlySummary = (uid, month, data) =>
  setDoc(doc(monthlySummariesCol(uid), month), { ...data, updatedAt: serverTimestamp() });

/**
 * Fetch all monthly summaries for a user, ordered by month descending.
 * @param {string} uid
 * @returns {Promise<object[]>}
 */
export const getMonthlySummaries = async (uid) => {
  const q = query(monthlySummariesCol(uid), orderBy('updatedAt', 'desc'));
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