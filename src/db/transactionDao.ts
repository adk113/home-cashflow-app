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
    await this.seedIfEmpty();
  },

  async seedIfEmpty(): Promise<void> {
    const adapter = getAdapter();
    const existing = await adapter.getTransactions();
    if (existing.length === 0) {
      const seedTxs = generateSeedTransactions();
      for (const tx of seedTxs) {
        await adapter.insertTransaction(tx);
      }
    }
  },

  async resetToSeedData(): Promise<void> {
    const adapter = getAdapter();
    await adapter.clearAllData();
    const seedTxs = generateSeedTransactions();
    for (const tx of seedTxs) {
      await adapter.insertTransaction(tx);
    }
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
};
