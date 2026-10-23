import { AccountingActivity, Currency } from '../types/transaction';
import { DEFAULT_CURRENCY } from './currencies';

export function formatCurrency(
  amount: number,
  currencyOrShowSign?: Currency | boolean,
  showSignIfCurrency?: boolean
): string {
  let currency: Currency = DEFAULT_CURRENCY;
  let showSign = false;

  if (typeof currencyOrShowSign === 'boolean') {
    showSign = currencyOrShowSign;
  } else if (currencyOrShowSign && typeof currencyOrShowSign === 'object') {
    currency = currencyOrShowSign;
    showSign = Boolean(showSignIfCurrency);
  }

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formattedNumber = '';
  try {
    const locale = currency.code === 'INR' ? 'en-IN' : 'en-US';
    formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
  } catch {
    formattedNumber = abs.toFixed(2);
  }

  const formattedWithSymbol = `${currency.symbol}${formattedNumber}`;

  if (showSign) {
    if (amount > 0) return `+${formattedWithSymbol}`;
    if (amount < 0) return `-${formattedWithSymbol}`;
  }
  return isNegative ? `-${formattedWithSymbol}` : formattedWithSymbol;
}

export function formatCompactCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = currency.symbol;
  if (abs >= 1000000) {
    return `${sign}${sym}${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${sym}${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}${sym}${abs.toFixed(0)}`;
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
        description: 'Daily living expenses & core income (Salary, Freelance)',
      };
    case 'investing':
      return {
        label: 'Investing',
        code: 'CFI',
        color: '#8B5CF6',
        badgeBg: 'rgba(139, 92, 246, 0.12)',
        description: 'Wealth assets, investments, stocks, mutual funds & real estate',
      };
    case 'financing':
      return {
        label: 'Financing',
        code: 'CFF',
        color: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        description: 'Liabilities, loans, mortgages & credit card debt paydowns',
      };
  }
}
