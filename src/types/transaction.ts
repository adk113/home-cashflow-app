export type AccountingActivity = 'operating' | 'investing' | 'financing';

export type TransactionType = 'income' | 'expense';

export type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'annually';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  pin: string;
  role?: 'primary' | 'member';
}

export interface Category {
  id: string;
  name: string;
  activity: AccountingActivity;
  type: TransactionType;
  icon: string; // Ionicons / MaterialCommunityIcons name
  color: string;
  isDefault?: boolean;
}

export type EntryMode = 'MANUAL' | 'AUTOMATED';

export interface PendingSmsTransaction {
  id: string;
  sender: string;
  body: string;
  amount: number;
  type: TransactionType;
  activity: AccountingActivity;
  suggestedCategoryId: string;
  sourceAccount: string; // e.g. "HDFC Bank XX12", "SBI UPI", "Cash"
  date: string; // ISO 'YYYY-MM-DD'
  detectedAt: number; // Unix timestamp ms
}

export interface Transaction {
  id: string;
  userId?: string;
  amount: number;
  type: TransactionType;
  activity: AccountingActivity;
  categoryId: string;
  date: string; // ISO 'YYYY-MM-DD'
  notes?: string;
  entryMode?: EntryMode; // 'MANUAL' or 'AUTOMATED'
  sourceAccount?: string; // e.g. 'Cash', 'HDFC Bank XX12', 'SBI'
  createdAt: number; // Unix timestamp ms
}

export interface CashFlowStatement {
  // Operating Activities (CFO)
  operatingInflows: number;
  operatingOutflows: number;
  netOperating: number;
  operatingItems: { categoryName: string; amount: number; type: TransactionType }[];

  // Investing Activities (CFI)
  investingInflows: number;
  investingOutflows: number;
  netInvesting: number;
  investingItems: { categoryName: string; amount: number; type: TransactionType }[];

  // Financing Activities (CFF)
  financingInflows: number;
  financingOutflows: number;
  netFinancing: number;
  financingItems: { categoryName: string; amount: number; type: TransactionType }[];

  // Bottom Line
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
}

export interface DashboardMetrics {
  totalInflows: number;
  totalOutflows: number;
  netBalance: number;
  period: PeriodFilter;
  periodLabel: string;
  cashFlow: CashFlowStatement;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  activity: AccountingActivity;
  type: TransactionType;
  icon: string;
  color: string;
  totalAmount: number;
  percentage: number; // 0 - 100
}
