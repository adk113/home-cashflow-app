import { createDatabaseAdapter, DatabaseAdapter } from './storageAdapter';
import { Category, Transaction } from '../types/transaction';
import { generateSeedTransactions } from './seedData';

let adapterInstance: DatabaseAdapter | null = null;

function getAdapter(): DatabaseAdapter {
  if (!adapterInstance) {
    adapterInstance = createDatabaseAdapter();
  }
  return adapterInstance;
}

export const TransactionDao = {
  async init(): Promise<void> {
    const adapter = getAdapter();
    await adapter.init();
    // Do not seed transactions. Start fresh with clean 0 balance.
  },

  async clearAllTransactions(): Promise<void> {
    const adapter = getAdapter();
    await adapter.clearAllTransactions();
  },

  async getCategories(): Promise<Category[]> {
    const adapter = getAdapter();
    return adapter.getCategories();
  },

  async saveCategory(cat: Category): Promise<void> {
    const adapter = getAdapter();
    return adapter.saveCategory(cat);
  },

  async getTransactions(): Promise<Transaction[]> {
    const adapter = getAdapter();
    return adapter.getTransactions();
  },

  async addTransaction(tx: Transaction): Promise<void> {
    const adapter = getAdapter();
    return adapter.insertTransaction(tx);
  },

  async updateTransaction(tx: Transaction): Promise<void> {
    const adapter = getAdapter();
    return adapter.updateTransaction(tx);
  },

  async deleteTransaction(id: string): Promise<void> {
    const adapter = getAdapter();
    return adapter.deleteTransaction(id);
  },

  async deleteTransactions(ids: string[]): Promise<void> {
    const adapter = getAdapter();
    return adapter.deleteTransactions(ids);
  },
};
