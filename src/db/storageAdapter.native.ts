import * as SQLite from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from './schema';
import { Category, EntryMode, PendingSmsTransaction, Transaction } from '../types/transaction';
import { DatabaseAdapter } from './adapterInterface';

export { DatabaseAdapter };

export class NativeSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  async init(): Promise<void> {
    this.db = SQLite.openDatabaseSync('cashflow.db');
    
    // Execute core schema
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
        entry_mode TEXT DEFAULT 'MANUAL',
        source_account TEXT DEFAULT 'Cash',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pending_sms_queue (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        body TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        activity TEXT NOT NULL,
        suggested_category_id TEXT NOT NULL,
        source_account TEXT NOT NULL,
        date TEXT NOT NULL,
        detected_at INTEGER NOT NULL,
        source_app TEXT,
        hash TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(activity);
      CREATE INDEX IF NOT EXISTS idx_transactions_entry_mode ON transactions(entry_mode);
    `);

    // Migration helper: Ensure entry_mode, source_account, source_app, hash columns exist
    try {
      const txInfo = this.db.getAllSync('PRAGMA table_info(transactions);');
      const txCols = txInfo.map((col: any) => col.name);
      if (!txCols.includes('entry_mode')) {
        this.db.execSync("ALTER TABLE transactions ADD COLUMN entry_mode TEXT DEFAULT 'MANUAL';");
      }
      if (!txCols.includes('source_account')) {
        this.db.execSync("ALTER TABLE transactions ADD COLUMN source_account TEXT DEFAULT 'Cash';");
      }
      if (!txCols.includes('source_app')) {
        this.db.execSync('ALTER TABLE transactions ADD COLUMN source_app TEXT;');
      }

      const smsInfo = this.db.getAllSync('PRAGMA table_info(pending_sms_queue);');
      const smsCols = smsInfo.map((col: any) => col.name);
      if (!smsCols.includes('source_app')) {
        this.db.execSync('ALTER TABLE pending_sms_queue ADD COLUMN source_app TEXT;');
      }
      if (!smsCols.includes('hash')) {
        this.db.execSync('ALTER TABLE pending_sms_queue ADD COLUMN hash TEXT;');
      }
    } catch (e) {
      console.warn('SQLite migration pragma check notice:', e);
    }

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
      entryMode: (r.entry_mode as EntryMode) || 'MANUAL',
      sourceAccount: r.source_account || 'Cash',
      createdAt: Number(r.created_at),
    }));
  }

  async insertTransaction(tx: Transaction): Promise<void> {
    this.db.runSync(
      'INSERT INTO transactions (id, amount, type, activity, category_id, date, notes, entry_mode, source_account, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tx.id,
        tx.amount,
        tx.type,
        tx.activity,
        tx.categoryId,
        tx.date,
        tx.notes || null,
        tx.entryMode || 'MANUAL',
        tx.sourceAccount || 'Cash',
        tx.createdAt,
      ]
    );
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    this.db.runSync(
      'UPDATE transactions SET amount = ?, type = ?, activity = ?, category_id = ?, date = ?, notes = ?, entry_mode = ?, source_account = ? WHERE id = ?',
      [
        tx.amount,
        tx.type,
        tx.activity,
        tx.categoryId,
        tx.date,
        tx.notes || null,
        tx.entryMode || 'MANUAL',
        tx.sourceAccount || 'Cash',
        tx.id,
      ]
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
    this.db.runSync('DELETE FROM pending_sms_queue');
  }

  // Pending SMS Queue Operations
  async getPendingSms(): Promise<PendingSmsTransaction[]> {
    const rows = this.db.getAllSync('SELECT * FROM pending_sms_queue ORDER BY detected_at DESC');
    return rows.map((r: any) => ({
      id: r.id,
      sender: r.sender,
      body: r.body,
      amount: Number(r.amount),
      type: r.type,
      activity: r.activity,
      suggestedCategoryId: r.suggested_category_id,
      sourceAccount: r.source_account,
      date: r.date,
      detectedAt: Number(r.detected_at),
      sourceApp: r.source_app || undefined,
      hash: r.hash || undefined,
    }));
  }

  async savePendingSms(sms: PendingSmsTransaction): Promise<void> {
    this.db.runSync(
      'INSERT OR REPLACE INTO pending_sms_queue (id, sender, body, amount, type, activity, suggested_category_id, source_account, date, detected_at, source_app, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sms.id,
        sms.sender,
        sms.body,
        sms.amount,
        sms.type,
        sms.activity,
        sms.suggestedCategoryId,
        sms.sourceAccount,
        sms.date,
        sms.detectedAt,
        sms.sourceApp || null,
        sms.hash || null,
      ]
    );
  }

  async deletePendingSms(id: string): Promise<void> {
    this.db.runSync('DELETE FROM pending_sms_queue WHERE id = ?', [id]);
  }

  async clearAllPendingSms(): Promise<void> {
    this.db.runSync('DELETE FROM pending_sms_queue');
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  return new NativeSQLiteAdapter();
}
