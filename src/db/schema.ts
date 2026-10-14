import { Category } from '../types/transaction';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  activity TEXT CHECK(activity IN ('operating', 'investing', 'financing')) NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  activity TEXT CHECK(activity IN ('operating', 'investing', 'financing')) NOT NULL,
  category_id TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(activity);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
`;

export const DEFAULT_CATEGORIES: Category[] = [
  // 1. Operating Activities (Inflows)
  {
    id: 'cat_salary',
    name: 'Salary & Wages',
    activity: 'operating',
    type: 'income',
    icon: 'briefcase',
    color: '#10B981', // Emerald
    isDefault: true,
  },
  {
    id: 'cat_freelance',
    name: 'Freelance & Side Gig',
    activity: 'operating',
    type: 'income',
    icon: 'laptop-outline',
    color: '#34D399',
    isDefault: true,
  },
  {
    id: 'cat_rental_income',
    name: 'Rental Income',
    activity: 'operating',
    type: 'income',
    icon: 'business-outline',
    color: '#059669',
    isDefault: true,
  },

  // 1. Operating Activities (Outflows - Daily Living & Household Expenses)
  {
    id: 'cat_groceries',
    name: 'Groceries & Food',
    activity: 'operating',
    type: 'expense',
    icon: 'cart-outline',
    color: '#F43F5E', // Rose
    isDefault: true,
  },
  {
    id: 'cat_utilities',
    name: 'Household Utilities',
    activity: 'operating',
    type: 'expense',
    icon: 'flash-outline',
    color: '#FB7185',
    isDefault: true,
  },
  {
    id: 'cat_dining',
    name: 'Dining & Takeout',
    activity: 'operating',
    type: 'expense',
    icon: 'restaurant-outline',
    color: '#E11D48',
    isDefault: true,
  },
  {
    id: 'cat_transport',
    name: 'Transit & Fuel',
    activity: 'operating',
    type: 'expense',
    icon: 'car-sport-outline',
    color: '#FDA4AF',
    isDefault: true,
  },
  {
    id: 'cat_healthcare',
    name: 'Healthcare & Pharmacy',
    activity: 'operating',
    type: 'expense',
    icon: 'medkit-outline',
    color: '#BE123C',
    isDefault: true,
  },
  {
    id: 'cat_subscriptions',
    name: 'Internet & Subscriptions',
    activity: 'operating',
    type: 'expense',
    icon: 'tv-outline',
    color: '#F43F5E',
    isDefault: true,
  },

  // 2. Investing Activities (Inflows & Outflows - Long term assets & improvements)
  {
    id: 'cat_invest_return',
    name: 'Dividends & Capital Gains',
    activity: 'investing',
    type: 'income',
    icon: 'trending-up-outline',
    color: '#8B5CF6', // Purple
    isDefault: true,
  },
  {
    id: 'cat_home_improvement',
    name: 'Home Renovations & Upgrades',
    activity: 'investing',
    type: 'expense',
    icon: 'construct-outline',
    color: '#A78BFA',
    isDefault: true,
  },
  {
    id: 'cat_savings_deposit',
    name: 'Emergency Fund & Brokerage',
    activity: 'investing',
    type: 'expense',
    icon: 'shield-checkmark-outline',
    color: '#7C3AED',
    isDefault: true,
  },
  {
    id: 'cat_property_investment',
    name: 'Real Estate / Land Capital',
    activity: 'investing',
    type: 'expense',
    icon: 'home-outline',
    color: '#6D28D9',
    isDefault: true,
  },

  // 3. Financing Activities (Inflows & Outflows - Borrowing & Debt Service)
  {
    id: 'cat_loan_inflow',
    name: 'Loan Inflow / Refinance',
    activity: 'financing',
    type: 'income',
    icon: 'wallet-outline',
    color: '#F59E0B', // Amber
    isDefault: true,
  },
  {
    id: 'cat_mortgage_paydown',
    name: 'Mortgage Payments',
    activity: 'financing',
    type: 'expense',
    icon: 'key-outline',
    color: '#FBBF24',
    isDefault: true,
  },
  {
    id: 'cat_car_loan',
    name: 'Car Loan Payments',
    activity: 'financing',
    type: 'expense',
    icon: 'car-outline',
    color: '#D97706',
    isDefault: true,
  },
  {
    id: 'cat_credit_card_debt',
    name: 'Credit Card Debt Paydowns',
    activity: 'financing',
    type: 'expense',
    icon: 'card-outline',
    color: '#B45309',
    isDefault: true,
  },
];
