import { AccountingActivity, MessageSourceApp, PendingSmsTransaction, TransactionType } from '../types/transaction';
import { getTodayIso } from './dateFilters';

export interface ParsedSmsResult {
  isBankSms: boolean;
  amount: number;
  type: TransactionType;
  activity: AccountingActivity;
  suggestedCategoryId: string;
  sourceAccount: string;
  vendorOrNotes: string;
  detectedSourceApp: MessageSourceApp;
  sourcePackage?: string;
  hash: string;
}

// Known bank & financial app mappings
const BANK_MAPPINGS: Record<string, string> = {
  HDFC: 'HDFC Bank',
  HDFCBK: 'HDFC Bank',
  SBI: 'State Bank of India',
  SBIINB: 'SBI Internet Banking',
  SBICRD: 'SBI Card',
  ICICI: 'ICICI Bank',
  ICICIB: 'ICICI Bank',
  IMOBILE: 'ICICI iMobile',
  AXIS: 'Axis Bank',
  AXISBK: 'Axis Bank',
  KOTAK: 'Kotak Mahindra Bank',
  KOTAKB: 'Kotak Mahindra Bank',
  PNB: 'Punjab National Bank',
  PNBSMS: 'Punjab National Bank',
  YESBNK: 'Yes Bank',
  YESB: 'Yes Bank',
  BOB: 'Bank of Baroda',
  CANARA: 'Canara Bank',
  UNIONB: 'Union Bank of India',
  IDFC: 'IDFC First Bank',
  IDFCFB: 'IDFC First Bank',
  INDUS: 'IndusInd Bank',
  FEDERAL: 'Federal Bank',
  FEDBNK: 'Federal Bank',
  RBL: 'RBL Bank',
  RBLBNK: 'RBL Bank',
  HSBC: 'HSBC Bank',
  SCB: 'Standard Chartered',
  STANCHAR: 'Standard Chartered',
  AMEX: 'American Express',
  CITI: 'Citibank',
  DBS: 'DBS Bank',
  BANDHAN: 'Bandhan Bank',
  PAYTM: 'Paytm Wallet/Bank',
  PHONEPE: 'PhonePe UPI',
  GPAY: 'Google Pay',
  GOOGLEPAY: 'Google Pay',
  CRED: 'CRED Alert',
  JUPITER: 'Jupiter Money',
  FIMONEY: 'Fi Money',
  SLICE: 'Slice Card',
  AIRTEL: 'Airtel Payments Bank',
  JIO: 'Jio Payments Bank',
};

// Known Android Package Names mapped to our MessageSourceApp
export const PACKAGE_TO_SOURCE_MAP: Record<string, MessageSourceApp> = {
  'com.google.android.apps.messaging': 'google_messages',
  'com.truecaller': 'truecaller',
  'com.android.mms': 'carrier_sms',
  'com.samsung.android.messaging': 'carrier_sms',
  'com.motorola.messaging': 'carrier_sms',
  'com.google.android.apps.nbu.paisa.user': 'bank_apps', // Google Pay
  'com.phonepe.app': 'bank_apps', // PhonePe
  'net.one97.paytm': 'bank_apps', // Paytm
  'com.snapwork.hdfc': 'bank_apps', // HDFC Bank MobileBanking
  'com.csam.icici.bank.imobile': 'bank_apps', // ICICI iMobile
  'com.sbi.lotusintouch': 'bank_apps', // SBI Yono
  'com.axis.mobile': 'bank_apps', // Axis Mobile
};

// Categorization heuristics based on SMS merchant keywords
const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string; activity: AccountingActivity }[] = [
  {
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks', 'dominos', 'burger', 'dine', 'food', 'eats', 'pizza', 'haldiram', 'subway'],
    categoryId: 'cat_dining',
    activity: 'operating',
  },
  {
    keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'grocery', 'supermarket', 'dmart', 'nature basket', 'reliance fresh', 'food hall', 'kirana', 'spencer', 'more retail'],
    categoryId: 'cat_groceries',
    activity: 'operating',
  },
  {
    keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'iocl', 'metro', 'fastag', 'toll', 'parking', 'shell', 'irctc', 'indigo', 'air india'],
    categoryId: 'cat_transport',
    activity: 'operating',
  },
  {
    keywords: ['electricity', 'bescom', 'tneb', 'mseb', 'water', 'gas', 'billdesk', 'recharge', 'broadband', 'wifi', 'jio fiber', 'airtel broadband', 'tataplay', 'dth', 'adani electricity'],
    categoryId: 'cat_utilities',
    activity: 'operating',
  },
  {
    keywords: ['pharmacy', 'apollo', 'medplus', '1mg', 'netmeds', 'hospital', 'clinic', 'diagnostic', 'doctor', 'healthcare', 'pharmeasy', 'pathology', 'dental'],
    categoryId: 'cat_healthcare',
    activity: 'operating',
  },
  {
    keywords: ['netflix', 'spotify', 'prime video', 'youtube', 'disney', 'hotstar', 'apple.com/bill', 'google play', 'subscription', 'audible'],
    categoryId: 'cat_subscriptions',
    activity: 'operating',
  },
  {
    keywords: ['salary', 'payroll', 'stipend', 'wages', 'bonus', 'commission', 'remuneration', 'credited towards salary'],
    categoryId: 'cat_salary',
    activity: 'operating',
  },
  {
    keywords: ['dividend', 'interest credited', 'mutual fund', 'zerodha', 'groww', 'upstox', 'sip', 'shares', 'stocks', 'coin', 'kuvera', 'etmoney'],
    categoryId: 'cat_invest_return',
    activity: 'investing',
  },
  {
    keywords: ['home renovation', 'interior', 'ikea', 'urban ladder', 'pepperfry', 'hardware', 'construction', 'remodel'],
    categoryId: 'cat_home_improvement',
    activity: 'investing',
  },
  {
    keywords: ['emi', 'loan', 'mortgage', 'home loan', 'car loan', 'personal loan', 'credit card payment', 'auto debit for loan', 'bajaj finance', 'hdfc credila'],
    categoryId: 'cat_mortgage_paydown',
    activity: 'financing',
  },
];

/**
 * Generate a canonical transaction fingerprint for cross-app deduplication.
 * Ensures the exact same financial event from Google Messages, Truecaller,
 * and System SMS is not added multiple times to the pending queue.
 */
export function generateTransactionFingerprint(
  amount: number,
  type: TransactionType,
  sourceAccount: string,
  date: string,
  rawBody?: string
): string {
  // Normalize account string (e.g. "HDFC Bank (A/c XX1234)" -> "hdfc_1234")
  const normAccount = (sourceAccount || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const normAmount = Math.round(amount * 100); // in cents/paise

  // Extract merchant snippet if available
  let merchantKey = '';
  if (rawBody) {
    const vpa = rawBody.match(/(?:to|at|vpa|info)\s+([A-Za-z0-9@.\-_]{3,20})/i);
    if (vpa && vpa[1]) {
      merchantKey = vpa[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }

  return `tx_${type}_${normAmount}_${normAccount.slice(0, 16)}_${date}_${merchantKey.slice(0, 8)}`;
}

/**
 * Determines which app provided or formatted the message (Google Messages, Truecaller, Carrier SMS, or Bank App)
 */
export function detectMessageSource(
  sender: string,
  body: string,
  sourcePackage?: string
): MessageSourceApp {
  // If native package identifier is directly provided
  if (sourcePackage && PACKAGE_TO_SOURCE_MAP[sourcePackage]) {
    return PACKAGE_TO_SOURCE_MAP[sourcePackage];
  }

  const combined = `${sender} ${body}`.toLowerCase();

  if (combined.includes('google messages') || combined.includes('rcs chat') || combined.includes('messages by google')) {
    return 'google_messages';
  }

  if (combined.includes('truecaller') || combined.includes('tc alert') || combined.includes('truecaller bank')) {
    return 'truecaller';
  }

  if (
    combined.includes('gpay') ||
    combined.includes('google pay') ||
    combined.includes('phonepe') ||
    combined.includes('paytm upi')
  ) {
    return 'bank_apps';
  }

  // Fallback to carrier / default SMS
  return 'carrier_sms';
}

/**
 * Parses financial notification or SMS texts from Google Messages, Truecaller,
 * Default Carrier SMS, and Bank Apps.
 */
export function parseBankingSms(
  sender: string,
  body: string,
  sourcePackage?: string,
  forceSource?: MessageSourceApp
): ParsedSmsResult | null {
  const cleanBody = body.replace(/[\r\n]+/g, ' ');
  const lowerBody = cleanBody.toLowerCase();
  const lowerSender = sender.toLowerCase();

  // 1. Check for core financial triggers
  const hasCurrencyTrigger = /(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)/i.test(cleanBody);
  const hasActionTrigger = /(?:debited|credited|withdrawn|spent|paid|transferred|received|deposited|refund|sent|charged|deducted|autopay)/i.test(lowerBody);

  if (!hasCurrencyTrigger && !hasActionTrigger) {
    return null;
  }

  // 2. Extract Amount
  // Matches "Rs. 1,234.50", "INR 500", "₹ 2,450", "debited by 450", "paid $45.00", "sent Rs 1200", etc.
  const amountRegex = /(?:(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent|transferred|charged|refund(?:ed)?)\s*(?:by|of|for)?\s*(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const amountMatch = cleanBody.match(amountRegex);

  let rawAmount = '';
  if (amountMatch) {
    rawAmount = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return null; // Could not extract valid financial amount
  }

  // 3. Determine Transaction Type (Income vs Expense)
  let type: TransactionType = 'expense';
  if (/(?:credited|received|deposited|refunded|refund|cashback|salary credited)/i.test(lowerBody)) {
    type = 'income';
  } else if (/(?:debited|spent|paid|withdrawn|sent|deducted|charged|transferred to|purchase)/i.test(lowerBody)) {
    type = 'expense';
  }

  // 4. Extract Account Info (e.g. "A/c XX1234", "Card ending 5678", "UPI Ref")
  let accountSuffix = '';
  const accountRegex = /(?:a\/c|acct|acc|account|card)\s*(?:no\.?)?\s*[*Xx]*([0-9]{3,4})/i;
  const accountMatch = cleanBody.match(accountRegex);
  if (accountMatch && accountMatch[1]) {
    accountSuffix = `A/c XX${accountMatch[1]}`;
  } else {
    // Check for UPI handle or VPA
    const upiMatch = cleanBody.match(/(?:upi\s*ref|vpa|linked to)\s*[*Xx]*([0-9]{3,4})/i);
    if (upiMatch && upiMatch[1]) {
      accountSuffix = `UPI XX${upiMatch[1]}`;
    }
  }

  // 5. Detect Bank Name from Sender ID, Package Name, or Body
  let bankName = 'Bank Account';
  const cleanSender = sender.toUpperCase().replace(/[^A-Z]/g, '');

  for (const [key, name] of Object.entries(BANK_MAPPINGS)) {
    if (cleanSender.includes(key) || cleanBody.toUpperCase().includes(key)) {
      bankName = name;
      break;
    }
  }

  // Fallback check for common apps
  if (bankName === 'Bank Account') {
    if (lowerSender.includes('phonepe') || lowerBody.includes('phonepe')) bankName = 'PhonePe UPI';
    else if (lowerSender.includes('gpay') || lowerBody.includes('google pay')) bankName = 'Google Pay';
    else if (lowerSender.includes('paytm') || lowerBody.includes('paytm')) bankName = 'Paytm Payments';
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
  const vpaMatch = cleanBody.match(/(?:to|at|vpa|info|paid to|sent to)\s+([A-Za-z0-9.\-_@ ]{3,30})(?:\s+on|\s+ref|\s+avl|\.|$)/i);
  if (vpaMatch && vpaMatch[1]) {
    vendorOrNotes = vpaMatch[1].trim();
  } else {
    vendorOrNotes = `${type === 'income' ? 'Received into' : 'Paid via'} ${sourceAccount}`;
  }

  // 8. Identify the Source App (Google Messages, Truecaller, Carrier, or Bank App)
  const detectedSourceApp = forceSource || detectMessageSource(sender, body, sourcePackage);

  // 9. Generate deduplication fingerprint hash
  const todayIso = getTodayIso();
  const hash = generateTransactionFingerprint(amount, type, sourceAccount, todayIso, cleanBody);

  return {
    isBankSms: true,
    amount,
    type,
    activity,
    suggestedCategoryId,
    sourceAccount,
    vendorOrNotes,
    detectedSourceApp,
    sourcePackage,
    hash,
  };
}

/**
 * Creates a PendingSmsTransaction object from raw text and sender metadata
 */
export function createPendingTransactionFromSms(
  sender: string,
  body: string,
  sourcePackage?: string,
  forceSource?: MessageSourceApp
): PendingSmsTransaction | null {
  const parsed = parseBankingSms(sender, body, sourcePackage, forceSource);
  if (!parsed) return null;

  return {
    id: `pending_sms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    sender: sender.trim(),
    body: body.trim(),
    amount: parsed.amount,
    type: parsed.type,
    activity: parsed.activity,
    suggestedCategoryId: parsed.suggestedCategoryId,
    sourceAccount: parsed.sourceAccount,
    date: getTodayIso(),
    detectedAt: Date.now(),
    sourceApp: parsed.detectedSourceApp,
    sourcePackage: parsed.sourcePackage,
    hash: parsed.hash,
  };
}
