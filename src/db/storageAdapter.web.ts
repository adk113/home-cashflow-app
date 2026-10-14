import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from './schema';
import { Category, Transaction } from '../types/transaction';

export interface DatabaseAdapter {
  init(): Promise<void>;
  getCategories(): Promise<Category[]>;
  saveCategory(cat: Category): Promise<void>;
  getTransactions(): Promise<Transaction[]>;
  insertTransaction(tx: Transaction): Promise<void>;
  updateTransaction(tx: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  clearAllData(): Promise<void>;
}

const ASYNC_STORAGE_KEYS = {
  CATEGORIES: '@cashflow_categories_v1',
  TRANSACTIONS: '@cashflow_transactions_v1',
};

export class CrossPlatformStorageAdapter implements DatabaseAdapter {
  private categories: Category[] = [];
  private transactions: Transaction[] = [];

  async init(): Promise<void> {
    try {
      const rawCats = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CATEGORIES);
      if (rawCats) {
        this.categories = JSON.parse(rawCats);
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
    } catch (e) {
      console.warn('Web storage init warning:', e);
      this.categories = [...DEFAULT_CATEGORIES];
      this.transactions = [];
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
    return [...this.transactions].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt - a.createdAt;
    });
  }

  async insertTransaction(tx: Transaction): Promise<void> {
    this.transactions.unshift(tx);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    const idx = this.transactions.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      this.transactions[idx] = tx;
      await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  async clearAllData(): Promise<void> {
    this.transactions = [];
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.TRANSACTIONS);
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  return new CrossPlatformStorageAdapter();
}
