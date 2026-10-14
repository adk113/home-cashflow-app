import {
  Transaction,
  Category,
  CashFlowStatement,
  DashboardMetrics,
  PeriodFilter,
  CategoryBreakdownItem,
} from '../types/transaction';
import { filterTransactionsByPeriod } from './dateFilters';

export function calculateCashFlowStatement(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>
): CashFlowStatement {
  let operatingInflows = 0;
  let operatingOutflows = 0;
  let investingInflows = 0;
  let investingOutflows = 0;
  let financingInflows = 0;
  let financingOutflows = 0;

  const operatingItemsMap = new Map<string, { amount: number; type: 'income' | 'expense' }>();
  const investingItemsMap = new Map<string, { amount: number; type: 'income' | 'expense' }>();
  const financingItemsMap = new Map<string, { amount: number; type: 'income' | 'expense' }>();

  for (const tx of transactions) {
    const cat = categoriesMap.get(tx.categoryId);
    const catName = cat ? cat.name : 'Uncategorized';

    if (tx.activity === 'operating') {
      if (tx.type === 'income') {
        operatingInflows += tx.amount;
      } else {
        operatingOutflows += tx.amount;
      }
      const existing = operatingItemsMap.get(catName) || { amount: 0, type: tx.type };
      existing.amount += tx.amount;
      operatingItemsMap.set(catName, existing);
    } else if (tx.activity === 'investing') {
      if (tx.type === 'income') {
        investingInflows += tx.amount;
      } else {
        investingOutflows += tx.amount;
      }
      const existing = investingItemsMap.get(catName) || { amount: 0, type: tx.type };
      existing.amount += tx.amount;
      investingItemsMap.set(catName, existing);
    } else if (tx.activity === 'financing') {
      if (tx.type === 'income') {
        financingInflows += tx.amount;
      } else {
        financingOutflows += tx.amount;
      }
      const existing = financingItemsMap.get(catName) || { amount: 0, type: tx.type };
      existing.amount += tx.amount;
      financingItemsMap.set(catName, existing);
    }
  }

  const mapToItemList = (map: Map<string, { amount: number; type: 'income' | 'expense' }>) =>
    Array.from(map.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        amount: data.amount,
        type: data.type,
      }))
      .sort((a, b) => b.amount - a.amount);

  const netOperating = operatingInflows - operatingOutflows;
  const netInvesting = investingInflows - investingOutflows;
  const netFinancing = financingInflows - financingOutflows;

  const totalInflows = operatingInflows + investingInflows + financingInflows;
  const totalOutflows = operatingOutflows + investingOutflows + financingOutflows;
  const netCashFlow = totalInflows - totalOutflows;

  return {
    operatingInflows,
    operatingOutflows,
    netOperating,
    operatingItems: mapToItemList(operatingItemsMap),

    investingInflows,
    investingOutflows,
    netInvesting,
    investingItems: mapToItemList(investingItemsMap),

    financingInflows,
    financingOutflows,
    netFinancing,
    financingItems: mapToItemList(financingItemsMap),

    totalInflows,
    totalOutflows,
    netCashFlow,
  };
}

export function calculateDashboardMetrics(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>,
  period: PeriodFilter
): DashboardMetrics {
  const { filtered, label } = filterTransactionsByPeriod(transactions, period);
  const cashFlow = calculateCashFlowStatement(filtered, categoriesMap);

  return {
    totalInflows: cashFlow.totalInflows,
    totalOutflows: cashFlow.totalOutflows,
    netBalance: cashFlow.netCashFlow,
    period,
    periodLabel: label,
    cashFlow,
  };
}

export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>,
  type: 'expense' | 'income' = 'expense'
): CategoryBreakdownItem[] {
  const filteredTxs = transactions.filter((tx) => tx.type === type);
  const totalSum = filteredTxs.reduce((sum, tx) => sum + tx.amount, 0);

  const grouped = new Map<string, number>();
  for (const tx of filteredTxs) {
    const current = grouped.get(tx.categoryId) || 0;
    grouped.set(tx.categoryId, current + tx.amount);
  }

  const items: CategoryBreakdownItem[] = [];
  grouped.forEach((amount, catId) => {
    const cat = categoriesMap.get(catId);
    items.push({
      categoryId: catId,
      categoryName: cat?.name || 'Uncategorized',
      activity: cat?.activity || 'operating',
      type: cat?.type || type,
      icon: cat?.icon || 'pricetag-outline',
      color: cat?.color || '#94A3B8',
      totalAmount: amount,
      percentage: totalSum > 0 ? (amount / totalSum) * 100 : 0,
    });
  });

  return items.sort((a, b) => b.totalAmount - a.totalAmount);
}
