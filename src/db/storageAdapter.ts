import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEMA_SQL, DEFAULT_CATEGORIES } from './schema';
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

// Mobile SQLite Adapter using modern expo-sqlite
class NativeSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  async init(): Promise<void> {
    try {
      const SQLite = require('expo-sqlite');
      this.db = SQLite.openDatabaseSync('cashflow.db');
      
      // Execute schema
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          activity TEXT NOT NULL,
          type TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          is_default INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          activity TEXT NOT NULL,
          category_id TEXT NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(activity);
      `);

      // Seed categories if empty
      const existing = this.db.getAllSync('SELECT COUNT(*) as count FROM categories');
      if (!existing || existing[0]?.count === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          this.db.runSync(
            'INSERT INTO categories (id, name, activity, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cat.id, cat.name, cat.activity, cat.type, cat.icon, cat.color, 1]
          );
        }
      }
    } catch (err) {
      console.warn('Native SQLite init encountered fallback:', err);
      throw err;
    }
  }

  async getCategories(): Promise<Category[]> {
    const rows = this.db.getAllSync('SELECT * FROM categories ORDER BY name ASC');
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      activity: r.activity,
      type: r.type,
      icon: r.icon,
      color: r.color,
      isDefault: Boolean(r.is_default),
    }));
  }

  async saveCategory(cat: Category): Promise<void> {
    this.db.runSync(
      'INSERT OR REPLACE INTO categories (id, name, activity, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.activity, cat.type, cat.icon, cat.color, cat.isDefault ? 1 : 0]
    );
  }

  async getTransactions(): Promise<Transaction[]> {
    const rows = this.db.getAllSync('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    return rows.map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      type: r.type,
      activity: r.activity,
      categoryId: r.category_id,
      date: r.date,
      notes: r.notes || '',
      createdAt: Number(r.created_at),
    }));
  }

  async insertTransaction(tx: Transaction): Promise<void> {
    this.db.runSync(
      'INSERT INTO transactions (id, amount, type, activity, category_id, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [tx.id, tx.amount, tx.type, tx.activity, tx.categoryId, tx.date, tx.notes || null, tx.createdAt]
    );
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    this.db.runSync(
      'UPDATE transactions SET amount = ?, type = ?, activity = ?, category_id = ?, date = ?, notes = ? WHERE id = ?',
      [tx.amount, tx.type, tx.activity, tx.categoryId, tx.date, tx.notes || null, tx.id]
    );
  }

  async deleteTransaction(id: string): Promise<void> {
    this.db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async clearAllData(): Promise<void> {
    this.db.runSync('DELETE FROM transactions');
  }
}

// High-speed Web & Cross-Platform Structured Adapter
const ASYNC_STORAGE_KEYS = {
  CATEGORIES: '@cashflow_categories_v1',
  TRANSACTIONS: '@cashflow_transactions_v1',
};

class CrossPlatformStorageAdapter implements DatabaseAdapter {
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
      console.warn('CrossPlatformStorageAdapter init error:', e);
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
    // Sort descending by date and creation
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

// Universal Factory: automatically instantiates native SQLite on mobile, or cross-platform storage adapter on web/fallback
export function createDatabaseAdapter(): DatabaseAdapter {
  if (Platform.OS !== 'web') {
    try {
      return new NativeSQLiteAdapter();
    } catch (e) {
      console.warn('Failed to load NativeSQLiteAdapter, falling back to CrossPlatform adapter', e);
      return new CrossPlatformStorageAdapter();
    }
  }
  return new CrossPlatformStorageAdapter();
}
