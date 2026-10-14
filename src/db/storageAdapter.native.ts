import * as SQLite from 'expo-sqlite';
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
  deleteTransactions(ids: string[]): Promise<void>;
  clearAllTransactions(): Promise<void>;
  clearAllData(): Promise<void>;
}

export class NativeSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  async init(): Promise<void> {
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

  async deleteTransactions(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    this.db.runSync(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
  }

  async clearAllTransactions(): Promise<void> {
    this.db.runSync('DELETE FROM transactions');
  }

  async clearAllData(): Promise<void> {
    this.db.runSync('DELETE FROM transactions');
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  return new NativeSQLiteAdapter();
}
