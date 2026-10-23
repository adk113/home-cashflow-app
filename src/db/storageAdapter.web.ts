import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from './schema';
import { Category, EntryMode, PendingSmsTransaction, Transaction } from '../types/transaction';
import { DatabaseAdapter } from './adapterInterface';

export { DatabaseAdapter };

const ASYNC_STORAGE_KEYS = {
  CATEGORIES: '@cashflow_categories_v2',
  TRANSACTIONS: '@cashflow_transactions_v2',
  PENDING_SMS: '@cashflow_pending_sms_v1',
};

export class CrossPlatformStorageAdapter implements DatabaseAdapter {
  private categories: Category[] = [];
  private transactions: Transaction[] = [];
  private pendingSms: PendingSmsTransaction[] = [];

  async init(): Promise<void> {
    try {
      const rawCats = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CATEGORIES);
      if (rawCats) {
        const loaded: Category[] = JSON.parse(rawCats);
        const existingIds = new Set(loaded.map((c) => c.id));
        const merged = [...loaded];
        for (const def of DEFAULT_CATEGORIES) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        this.categories = merged;
      } else {
        this.categories = [...DEFAULT_CATEGORIES];
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      }

      const rawTxs = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TRANSACTIONS);
      if (rawTxs) {
        this.transactions = JSON.parse(rawTxs);
      } else {
        this.transactions = [];
      }

      const rawSms = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PENDING_SMS);
      if (rawSms) {
        this.pendingSms = JSON.parse(rawSms);
      } else {
        this.pendingSms = [];
      }
    } catch (e) {
      console.warn('Web storage init warning:', e);
      this.categories = [...DEFAULT_CATEGORIES];
      this.transactions = [];
      this.pendingSms = [];
    }
  }

  async getCategories(): Promise<Category[]> {
    return [...this.categories];
  }

  async saveCategory(cat: Category): Promise<void> {
    const index = this.categories.findIndex((c) => c.id === cat.id);
    if (index >= 0) {
      this.categories[index] = cat;
    } else {
      this.categories.push(cat);
    }
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
  }

  async getTransactions(): Promise<Transaction[]> {
    return [...this.transactions]
      .map((t) => ({
        ...t,
        entryMode: (t.entryMode as EntryMode) || 'MANUAL',
        sourceAccount: t.sourceAccount || 'Cash',
      }))
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt - a.createdAt;
      });
  }

  async insertTransaction(tx: Transaction): Promise<void> {
    const formatted: Transaction = {
      ...tx,
      entryMode: tx.entryMode || 'MANUAL',
      sourceAccount: tx.sourceAccount || 'Cash',
    };
    this.transactions.unshift(formatted);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const idx = this.transactions.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      this.transactions[idx] = {
        ...tx,
        entryMode: tx.entryMode || 'MANUAL',
        sourceAccount: tx.sourceAccount || 'Cash',
      };
      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  async deleteTransactions(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    this.transactions = this.transactions.filter((t) => !idSet.has(t.id));
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  async clearAllTransactions(): Promise<void> {
    this.transactions = [];
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }

  async clearAllData(): Promise<void> {
    this.transactions = [];
    this.pendingSms = [];
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TRANSACTIONS);
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.PENDING_SMS);
  }

  // Pending SMS Queue
  async getPendingSms(): Promise<PendingSmsTransaction[]> {
    return [...this.pendingSms].sort((a, b) => b.detectedAt - a.detectedAt);
  }

  async savePendingSms(sms: PendingSmsTransaction): Promise<void> {
    this.pendingSms.unshift(sms);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PENDING_SMS, JSON.stringify(this.pendingSms));
  }

  async deletePendingSms(id: string): Promise<void> {
    this.pendingSms = this.pendingSms.filter((s) => s.id !== id);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PENDING_SMS, JSON.stringify(this.pendingSms));
  }

  async clearAllPendingSms(): Promise<void> {
    this.pendingSms = [];
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.PENDING_SMS);
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  return new CrossPlatformStorageAdapter();
}
