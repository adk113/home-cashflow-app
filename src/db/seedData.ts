import { Transaction } from '../types/transaction';

// Helper to generate ISO date string relative to today
function getRelativeDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export function generateSeedTransactions(): Transaction[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    // Today (Daily view test)
    {
      id: 'seed-tx-1',
      amount: 142.50,
      type: 'expense',
      activity: 'operating',
      categoryId: 'cat_groceries',
      date: getRelativeDateStr(0),
      notes: 'Whole Foods organic weekly shopping',
      createdAt: now - 3600000 * 2,
    },
    {
      id: 'seed-tx-2',
      amount: 18.75,
      type: 'expense',
      activity: 'operating',
      categoryId: 'cat_dining',
      date: getRelativeDateStr(0),
      notes: 'Artisan coffee & bakery breakfast',
      createdAt: now - 3600000 * 4,
    },

    // Yesterday / Within this week (Weekly view test)
    {
      id: 'seed-tx-3',
      amount: 3800.00,
      type: 'income',
      activity: 'operating',
      categoryId: 'cat_salary',
      date: getRelativeDateStr(2),
      notes: 'Bi-weekly direct payroll deposit',
      createdAt: now - dayMs * 2,
    },
    {
      id: 'seed-tx-4',
      amount: 165.20,
      type: 'expense',
      activity: 'operating',
      categoryId: 'cat_utilities',
      date: getRelativeDateStr(3),
      notes: 'City power & water monthly billing',
      createdAt: now - dayMs * 3,
    },
    {
      id: 'seed-tx-5',
      amount: 65.00,
      type: 'expense',
      activity: 'operating',
      categoryId: 'cat_transport',
      date: getRelativeDateStr(4),
      notes: 'Commuter train pass & gas refill',
      createdAt: now - dayMs * 4,
    },

    // Financing Activities within this month
    {
      id: 'seed-tx-6',
      amount: 1850.00,
      type: 'expense',
      activity: 'financing',
      categoryId: 'cat_mortgage_paydown',
      date: getRelativeDateStr(5),
      notes: 'Monthly residential mortgage principal & interest',
      createdAt: now - dayMs * 5,
    },
    {
      id: 'seed-tx-7',
      amount: 385.00,
      type: 'expense',
      activity: 'financing',
      categoryId: 'cat_car_loan',
      date: getRelativeDateStr(8),
      notes: 'Auto financing loan installment',
      createdAt: now - dayMs * 8,
    },
    {
      id: 'seed-tx-8',
      amount: 500.00,
      type: 'expense',
      activity: 'financing',
      categoryId: 'cat_credit_card_debt',
      date: getRelativeDateStr(12),
      notes: 'Accelerated credit card balance paydown',
      createdAt: now - dayMs * 12,
    },

    // Investing Activities within this month
    {
      id: 'seed-tx-9',
      amount: 750.00,
      type: 'expense',
      activity: 'investing',
      categoryId: 'cat_home_improvement',
      date: getRelativeDateStr(6),
      notes: 'Backyard energy-efficient lighting & patio remodel',
      createdAt: now - dayMs * 6,
    },
    {
      id: 'seed-tx-10',
      amount: 600.00,
      type: 'expense',
      activity: 'investing',
      categoryId: 'cat_savings_deposit',
      date: getRelativeDateStr(9),
      notes: 'Automated transfer to High-Yield Savings & S&P ETF',
      createdAt: now - dayMs * 9,
    },
    {
      id: 'seed-tx-11',
      amount: 180.00,
      type: 'income',
      activity: 'investing',
      categoryId: 'cat_invest_return',
      date: getRelativeDateStr(11),
      notes: 'Quarterly dividend disbursement from index fund',
      createdAt: now - dayMs * 11,
    },

    // Operating Side Inflow & More living costs
    {
      id: 'seed-tx-12',
      amount: 650.00,
      type: 'income',
      activity: 'operating',
      categoryId: 'cat_freelance',
      date: getRelativeDateStr(10),
      notes: 'Design consultation client milestone payment',
      createdAt: now - dayMs * 10,
    },
    {
      id: 'seed-tx-13',
      amount: 85.00,
      type: 'expense',
      activity: 'operating',
      categoryId: 'cat_subscriptions',
      date: getRelativeDateStr(14),
      notes: 'High-speed fiber gigabit internet & streaming',
      createdAt: now - dayMs * 14,
    },

    // Historical transactions (20 - 45 days ago for Annually testing)
    {
      id: 'seed-tx-14',
      amount: 3800.00,
      type: 'income',
      activity: 'operating',
      categoryId: 'cat_salary',
      date: getRelativeDateStr(25),
      notes: 'Previous month mid payroll deposit',
      createdAt: now - dayMs * 25,
    },
    {
      id: 'seed-tx-15',
      amount: 1850.00,
      type: 'expense',
      activity: 'financing',
      categoryId: 'cat_mortgage_paydown',
      date: getRelativeDateStr(35),
      notes: 'Prior month mortgage payment',
      createdAt: now - dayMs * 35,
    },
    {
      id: 'seed-tx-16',
      amount: 1200.00,
      type: 'expense',
      activity: 'investing',
      categoryId: 'cat_home_improvement',
      date: getRelativeDateStr(42),
      notes: 'HVAC smart thermostat & duct sealing upgrade',
      createdAt: now - dayMs * 42,
    },
  ];
}
