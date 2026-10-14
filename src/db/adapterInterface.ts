import { Category, PendingSmsTransaction, Transaction } from '../types/transaction';

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
  getPendingSms(): Promise<PendingSmsTransaction[]>;
  savePendingSms(sms: PendingSmsTransaction): Promise<void>;
  deletePendingSms(id: string): Promise<void>;
  clearAllPendingSms(): Promise<void>;
}
