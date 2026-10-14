import { AccountingActivity, PendingSmsTransaction, TransactionType } from '../types/transaction';
import { getTodayIso } from './dateFilters';

export interface ParsedSmsResult {
  isBankSms: boolean;
  amount: number;
  type: TransactionType;
  activity: AccountingActivity;
  suggestedCategoryId: string;
  sourceAccount: string;
  vendorOrNotes: string;
}

// Known bank sender header prefixes/substrings in India & International
const BANK_MAPPINGS: Record<string, string> = {
  HDFC: 'HDFC Bank',
  HDFCBK: 'HDFC Bank',
  SBI: 'SBI Bank',
  SBIINB: 'SBI Bank',
  SBICRD: 'SBI Card',
  ICICI: 'ICICI Bank',
  ICICIB: 'ICICI Bank',
  AXIS: 'Axis Bank',
  AXISBK: 'Axis Bank',
  KOTAK: 'Kotak Mahindra Bank',
  KOTAKB: 'Kotak Mahindra Bank',
  PNB: 'Punjab National Bank',
  PNBSMS: 'Punjab National Bank',
  YESBNK: 'Yes Bank',
  BOB: 'Bank of Baroda',
  CANARA: 'Canara Bank',
  UNIONB: 'Union Bank of India',
  IDFC: 'IDFC First Bank',
  IDFCFB: 'IDFC First Bank',
  INDUS: 'IndusInd Bank',
  PAYTM: 'Paytm Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  JIO: 'Jio Payments Bank',
};

// Categorization heuristics based on SMS merchant keywords
const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string; activity: AccountingActivity }[] = [
  {
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks', 'dominos', 'burger', 'dine', 'food'],
    categoryId: 'cat_dining',
    activity: 'operating',
  },
  {
    keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'grocery', 'supermarket', 'dmart', 'nature basket', 'reliance fresh', 'food hall'],
    categoryId: 'cat_groceries',
    activity: 'operating',
  },
  {
    keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'iocl', 'metro', 'fastag', 'toll', 'parking'],
    categoryId: 'cat_transport',
    activity: 'operating',
  },
  {
    keywords: ['electricity', 'bescom', 'tneb', 'mseb', 'water', 'gas', 'billdesk', 'recharge', 'broadband', 'wifi', 'jio fiber', 'airtel broadband'],
    categoryId: 'cat_utilities',
    activity: 'operating',
  },
  {
    keywords: ['pharmacy', 'apollo', 'medplus', '1mg', 'netmeds', 'hospital', 'clinic', 'diagnostic', 'doctor', 'healthcare'],
    categoryId: 'cat_healthcare',
    activity: 'operating',
  },
  {
    keywords: ['salary', 'payroll', 'stipend', 'wages', 'bonus', 'commission', 'remuneration'],
    categoryId: 'cat_salary',
    activity: 'operating',
  },
  {
    keywords: ['dividend', 'interest credited', 'mutual fund', 'zerodha', 'groww', 'upstox', 'sip', 'shares', 'stocks'],
    categoryId: 'cat_invest_return',
    activity: 'investing',
  },
  {
    keywords: ['emi', 'loan', 'mortgage', 'home loan', 'car loan', 'personal loan', 'credit card payment'],
    categoryId: 'cat_mortgage_paydown',
    activity: 'financing',
  },
];

export function parseBankingSms(sender: string, body: string): ParsedSmsResult | null {
  const cleanBody = body.replace(/[\r\n]+/g, ' ');
  const lowerBody = cleanBody.toLowerCase();

  // 1. Check for core financial triggers
  const hasCurrencyTrigger = /(?:rs\.?|inr|₹)/i.test(cleanBody);
  const hasActionTrigger = /(?:debited|credited|withdrawn|spent|paid|transferred|received|deposited|refund)/i.test(lowerBody);

  if (!hasCurrencyTrigger && !hasActionTrigger) {
    return null;
  }

  // 2. Extract Amount
  // Matches "Rs. 1,234.50", "INR 500", "₹ 2,450", "debited by 450", etc.
  const amountRegex = /(?:(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received)\s*(?:by|of|for)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const amountMatch = cleanBody.match(amountRegex);

  let rawAmount = '';
  if (amountMatch) {
    rawAmount = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return null; // Could not extract valid amount
  }

  // 3. Determine Transaction Type (Income vs Expense)
  let type: TransactionType = 'expense';
  if (/(?:credited|received|deposited|refunded|refund)/i.test(lowerBody)) {
    type = 'income';
  } else if (/(?:debited|spent|paid|withdrawn|sent|deducted)/i.test(lowerBody)) {
    type = 'expense';
  }

  // 4. Extract Account Info (e.g. "A/c XX1234", "Card ending 5678")
  let accountSuffix = '';
  const accountRegex = /(?:a\/c|acct|acc|account|card)\s*(?:no\.?)?\s*[*Xx]*([0-9]{3,4})/i;
  const accountMatch = cleanBody.match(accountRegex);
  if (accountMatch && accountMatch[1]) {
    accountSuffix = `A/c XX${accountMatch[1]}`;
  }

  // 5. Detect Bank Name from Sender ID or Body
  let bankName = 'Bank Account';
  const cleanSender = sender.toUpperCase().replace(/[^A-Z]/g, '');
  for (const [key, name] of Object.entries(BANK_MAPPINGS)) {
    if (cleanSender.includes(key) || cleanBody.toUpperCase().includes(key)) {
      bankName = name;
      break;
    }
  }

  const sourceAccount = accountSuffix ? `${bankName} (${accountSuffix})` : bankName;

  // 6. Smart Category & Activity Matching
  let suggestedCategoryId = type === 'income' ? 'cat_salary' : 'cat_groceries';
  let activity: AccountingActivity = 'operating';

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.keywords.some((k) => lowerBody.includes(k))) {
      suggestedCategoryId = catRule.categoryId;
      activity = catRule.activity;
      break;
    }
  }

  // 7. Extract Vendor or Summary Notes
  let vendorOrNotes = '';
  const vpaMatch = cleanBody.match(/(?:to|at|vpa|info)\s+([A-Za-z0-9.\-_@ ]{3,30})(?:\s+on|\s+ref|\s+avl|\.|$)/i);
  if (vpaMatch && vpaMatch[1]) {
    vendorOrNotes = vpaMatch[1].trim();
  } else {
    vendorOrNotes = `${type === 'income' ? 'Received into' : 'Paid via'} ${sourceAccount}`;
  }

  return {
    isBankSms: true,
    amount,
    type,
    activity,
    suggestedCategoryId,
    sourceAccount,
    vendorOrNotes,
  };
}

export function createPendingTransactionFromSms(
  sender: string,
  body: string
): PendingSmsTransaction | null {
  const parsed = parseBankingSms(sender, body);
  if (!parsed) return null;

  return {
    id: `pending_sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sender: sender.trim(),
    body: body.trim(),
    amount: parsed.amount,
    type: parsed.type,
    activity: parsed.activity,
    suggestedCategoryId: parsed.suggestedCategoryId,
    sourceAccount: parsed.sourceAccount,
    date: getTodayIso(),
    detectedAt: Date.now(),
  };
}
