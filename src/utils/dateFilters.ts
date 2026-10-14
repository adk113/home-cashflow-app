import { PeriodFilter, Transaction } from '../types/transaction';

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDateRangeForPeriod(period: PeriodFilter): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const endDate = getTodayIso();

  switch (period) {
    case 'daily': {
      const label = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return { startDate: endDate, endDate, label: `Today, ${label}` };
    }
    case 'weekly': {
      // 7 days rolling period up to today
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      const startDate = start.toISOString().split('T')[0];
      const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        startDate,
        endDate,
        label: `Week (${startLabel} – ${endLabel})`,
      };
    }
    case 'monthly': {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return {
        startDate,
        endDate,
        label,
      };
    }
    case 'annually': {
      const year = now.getFullYear();
      const startDate = `${year}-01-01`;
      return {
        startDate,
        endDate,
        label: `Year ${year}`,
      };
    }
  }
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: PeriodFilter
): { filtered: Transaction[]; label: string; startDate: string; endDate: string } {
  const { startDate, endDate, label } = getDateRangeForPeriod(period);
  const filtered = transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
  return { filtered, label, startDate, endDate };
}
