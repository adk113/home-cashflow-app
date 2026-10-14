import { AccountingActivity } from '../types/transaction';

export function formatCurrency(amount: number, showSign: boolean = false): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (showSign) {
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
}

export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getActivityConfig(activity: AccountingActivity): {
  label: string;
  code: string;
  color: string;
  badgeBg: string;
  description: string;
} {
  switch (activity) {
    case 'operating':
      return {
        label: 'Operating',
        code: 'CFO',
        color: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        description: 'Regular income & daily household living expenses',
      };
    case 'investing':
      return {
        label: 'Investing',
        code: 'CFI',
        color: '#8B5CF6',
        badgeBg: 'rgba(139, 92, 246, 0.12)',
        description: 'Home upgrades, renovations & savings transfers',
      };
    case 'financing':
      return {
        label: 'Financing',
        code: 'CFF',
        color: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        description: 'Mortgage payments, car loans & debt service',
      };
  }
}
