import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Transaction,
  Category,
  PeriodFilter,
  DashboardMetrics,
  Currency,
  EntryMode,
  PendingSmsTransaction,
  AccountingActivity,
} from '../types/transaction';
import { TransactionDao } from '../db/transactionDao';
import { calculateDashboardMetrics } from '../utils/accounting';
import { filterTransactionsByPeriod } from '../utils/dateFilters';
import { DEFAULT_CURRENCY } from '../utils/currencies';
import { createPendingTransactionFromSms } from '../utils/smsParser';

import { useAuth } from './AuthContext';

const CURRENCY_STORAGE_KEY = '@cashflow_selected_currency_v1';

interface TransactionContextType {
  transactions: Transaction[];
  categories: Category[];
  categoriesMap: Map<string, Category>;
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
  filteredTransactions: Transaction[];
  metrics: DashboardMetrics;
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  isLoading: boolean;
  addTransaction: (data: {
    amount: number;
    type: 'income' | 'expense';
    activity: 'operating' | 'investing' | 'financing';
    categoryId: string;
    date: string;
    notes?: string;
    entryMode?: EntryMode;
    sourceAccount?: string;
  }) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteTransactions: (ids: string[]) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  pendingSms: PendingSmsTransaction[];
  addPendingSms: (sms: PendingSmsTransaction) => Promise<void>;
  approvePendingSms: (id: string, overrides?: { categoryId?: string; activity?: AccountingActivity }) => Promise<void>;
  dismissPendingSms: (id: string) => Promise<void>;
  simulateIncomingSms: (sender: string, body: string) => Promise<PendingSmsTransaction | null>;
  refreshData: () => Promise<void>;
  resetToSampleData?: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingSms, setPendingSms] = useState<PendingSmsTransaction[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('monthly');
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      await TransactionDao.init();
      const [cats, txs, smsQueue, savedCurr] = await Promise.all([
        TransactionDao.getCategories(),
        TransactionDao.getTransactions(),
        TransactionDao.getPendingSms(),
        AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
      ]);
      setCategories(cats);
      setTransactions(txs);
      setPendingSms(smsQueue);
      if (savedCurr) {
        try {
          setCurrencyState(JSON.parse(savedCurr));
        } catch {
          setCurrencyState(DEFAULT_CURRENCY);
        }
      }
    } catch (err) {
      console.error('Error loading transaction data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCurrency = async (newCurr: Currency) => {
    setCurrencyState(newCurr);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurr));
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const { currentUser } = useAuth();

  const userScopedTransactions = useMemo(() => {
    if (!currentUser) return transactions;
    return transactions.filter(
      (tx) => !tx.userId || tx.userId === currentUser.id || tx.userId === 'user_family'
    );
  }, [transactions, currentUser]);

  const { filtered: filteredTransactions } = useMemo(() => {
    return filterTransactionsByPeriod(userScopedTransactions, period);
  }, [userScopedTransactions, period]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(userScopedTransactions, categoriesMap, period);
  }, [userScopedTransactions, categoriesMap, period]);

  const addTransaction = async (data: {
    amount: number;
    type: 'income' | 'expense';
    activity: 'operating' | 'investing' | 'financing';
    categoryId: string;
    date: string;
    notes?: string;
    entryMode?: EntryMode;
    sourceAccount?: string;
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: currentUser?.id,
      amount: data.amount,
      type: data.type,
      activity: data.activity,
      categoryId: data.categoryId,
      date: data.date,
      notes: data.notes || '',
      entryMode: data.entryMode || 'MANUAL',
      sourceAccount: data.sourceAccount || 'Cash',
      createdAt: Date.now(),
    };

    await TransactionDao.addTransaction(newTx);
    setTransactions((prev) => [newTx, ...prev]);
  };

  const updateTransaction = async (tx: Transaction) => {
    await TransactionDao.updateTransaction(tx);
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
  };

  const deleteTransaction = async (id: string) => {
    await TransactionDao.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteTransactions = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    await TransactionDao.deleteTransactions(ids);
    const idSet = new Set(ids);
    setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
  };

  const clearAllTransactions = async () => {
    await TransactionDao.clearAllTransactions();
    setTransactions([]);
  };

  // Pending SMS Management
  const addPendingSms = async (sms: PendingSmsTransaction) => {
    await TransactionDao.savePendingSms(sms);
    setPendingSms((prev) => [sms, ...prev]);
  };

  const dismissPendingSms = async (id: string) => {
    await TransactionDao.deletePendingSms(id);
    setPendingSms((prev) => prev.filter((s) => s.id !== id));
  };

  const approvePendingSms = async (
    id: string,
    overrides?: { categoryId?: string; activity?: AccountingActivity }
  ) => {
    const found = pendingSms.find((s) => s.id === id);
    if (!found) return;

    const chosenCategoryId = overrides?.categoryId || found.suggestedCategoryId;
    const cat = categoriesMap.get(chosenCategoryId);
    const chosenActivity = overrides?.activity || cat?.activity || found.activity;

    // Create automated transaction
    await addTransaction({
      amount: found.amount,
      type: found.type,
      activity: chosenActivity,
      categoryId: chosenCategoryId,
      date: found.date,
      notes: `${found.body.slice(0, 70)}...`,
      entryMode: 'AUTOMATED',
      sourceAccount: found.sourceAccount,
    });

    // Remove from pending queue
    await dismissPendingSms(id);
  };

  const simulateIncomingSms = async (sender: string, body: string): Promise<PendingSmsTransaction | null> => {
    const detected = createPendingTransactionFromSms(sender, body);
    if (detected) {
      await addPendingSms(detected);
      return detected;
    }
    return null;
  };

  const resetToSampleData = async () => {
    await clearAllTransactions();
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        categories,
        categoriesMap,
        period,
        setPeriod,
        filteredTransactions,
        metrics,
        currency,
        setCurrency,
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactions,
        clearAllTransactions,
        pendingSms,
        addPendingSms,
        approvePendingSms,
        dismissPendingSms,
        simulateIncomingSms,
        refreshData: loadData,
        resetToSampleData,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
