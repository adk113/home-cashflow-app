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
  detectedUpiApp?: string; // e.g. "CRED Pay", "PhonePe", "Google Pay", "Paytm", "Amazon Pay", "BHIM", "Navi", etc.
  upiVpa?: string; // e.g. "swiggy@icici", "cred.club@axis"
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
  BARODA: 'Bank of Baroda',
  CANARA: 'Canara Bank',
  UNIONB: 'Union Bank of India',
  UBI: 'Union Bank of India',
  IDFC: 'IDFC First Bank',
  IDFCFB: 'IDFC First Bank',
  INDUS: 'IndusInd Bank',
  INDUSB: 'IndusInd Bank',
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
  INDIANB: 'Indian Bank',
  IOB: 'Indian Overseas Bank',
  CENTRALB: 'Central Bank of India',
  BOI: 'Bank of India',
  UCOB: 'UCO Bank',
  AUBANK: 'AU Small Finance Bank',
  EQUITAS: 'Equitas Small Finance Bank',
  PAYTM: 'Paytm Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  JIO: 'Jio Payments Bank',
};

// UPI Registry supporting any and all Indian UPI providers
export interface UpiDetector {
  id: string;
  name: string;
  sourceAppType: MessageSourceApp;
  keywords: string[];
  vpaHandles: string[];
  packageNames: string[];
}

export const UPI_REGISTRY: UpiDetector[] = [
  {
    id: 'cred_pay',
    name: 'CRED Pay',
    sourceAppType: 'cred_pay',
    keywords: ['cred pay', 'cred club', 'credpay', 'dreamplug', 'via cred', 'to cred'],
    vpaHandles: ['@cred', 'cred.club', '@axisb', '@yescred'],
    packageNames: ['com.dreamplug.androidapp'],
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    sourceAppType: 'upi_apps',
    keywords: ['phonepe', 'phone pe', 'via phonepe'],
    vpaHandles: ['@ybl', '@ibl', '@axl'],
    packageNames: ['com.phonepe.app'],
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    sourceAppType: 'upi_apps',
    keywords: ['google pay', 'gpay', 'googlepay', 'via google pay'],
    vpaHandles: ['@okaxis', '@okhdfcbank', '@okicici', '@oksbi'],
    packageNames: ['com.google.android.apps.nbu.paisa.user'],
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    sourceAppType: 'upi_apps',
    keywords: ['paytm upi', 'via paytm', 'paytm wallet'],
    vpaHandles: ['@paytm'],
    packageNames: ['net.one97.paytm'],
  },
  {
    id: 'amazon_pay',
    name: 'Amazon Pay',
    sourceAppType: 'upi_apps',
    keywords: ['amazon pay', 'amazonpay', 'via amazon pay'],
    vpaHandles: ['@apl', '@rapl'],
    packageNames: ['in.amazon.mShop.android.shopping'],
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    sourceAppType: 'upi_apps',
    keywords: ['bhim', 'bhim upi', 'npci'],
    vpaHandles: ['@upi'],
    packageNames: ['in.org.npci.upiapp'],
  },
  {
    id: 'navi',
    name: 'Navi UPI',
    sourceAppType: 'upi_apps',
    keywords: ['navi upi', 'navi payment'],
    vpaHandles: ['@navi'],
    packageNames: ['com.naviapp'],
  },
  {
    id: 'slice',
    name: 'Slice UPI',
    sourceAppType: 'upi_apps',
    keywords: ['slice', 'slice card', 'slice upi'],
    vpaHandles: ['@slice'],
    packageNames: ['indwin.c3.shareapp'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter Money',
    sourceAppType: 'upi_apps',
    keywords: ['jupiter money', 'jupiter'],
    vpaHandles: ['@jupiteraxis'],
    packageNames: ['money.jupiter'],
  },
  {
    id: 'fi_money',
    name: 'Fi Money',
    sourceAppType: 'upi_apps',
    keywords: ['fi money', 'epifi'],
    vpaHandles: ['@fibank'],
    packageNames: ['com.epifi.fi'],
  },
  {
    id: 'mobikwik',
    name: 'MobiKwik',
    sourceAppType: 'upi_apps',
    keywords: ['mobikwik', 'mobi kwik'],
    vpaHandles: ['@ikwik'],
    packageNames: ['com.mobikwik_new'],
  },
  {
    id: 'whatsapp_pay',
    name: 'WhatsApp Pay',
    sourceAppType: 'upi_apps',
    keywords: ['whatsapp pay', 'whatsapp payment'],
    vpaHandles: ['@waicici', '@wahdfcbank', '@wasbi'],
    packageNames: ['com.whatsapp'],
  },
  {
    id: 'tata_neu',
    name: 'Tata Neu',
    sourceAppType: 'upi_apps',
    keywords: ['tata neu', 'tataneu'],
    vpaHandles: ['@tataneu'],
    packageNames: ['com.tatadigital.tcp'],
  },
];

// Android Package Names mapping
export const PACKAGE_TO_SOURCE_MAP: Record<string, MessageSourceApp> = {
  'com.google.android.apps.messaging': 'google_messages',
  'com.truecaller': 'truecaller',
  'com.android.mms': 'carrier_sms',
  'com.samsung.android.messaging': 'carrier_sms',
  'com.motorola.messaging': 'carrier_sms',
  'com.dreamplug.androidapp': 'cred_pay', // CRED Pay
  'com.phonepe.app': 'upi_apps', // PhonePe
  'com.google.android.apps.nbu.paisa.user': 'upi_apps', // Google Pay
  'net.one97.paytm': 'upi_apps', // Paytm
  'in.amazon.mShop.android.shopping': 'upi_apps', // Amazon Pay
  'in.org.npci.upiapp': 'upi_apps', // BHIM
  'com.snapwork.hdfc': 'bank_apps',
  'com.csam.icici.bank.imobile': 'bank_apps',
  'com.sbi.lotusintouch': 'bank_apps',
  'com.axis.mobile': 'bank_apps',
};

// Categorization heuristics based on merchant keywords
const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string; activity: AccountingActivity }[] = [
  {
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks', 'dominos', 'burger', 'dine', 'food', 'eats', 'pizza', 'haldiram', 'subway', 'chai point'],
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
 * Identify specific UPI app or universal UPI payment from message content
 */
export function identifyUpiApp(
  sender: string,
  body: string,
  sourcePackage?: string
): { detectedUpiApp?: string; upiVpa?: string; matchedSourceApp?: MessageSourceApp } {
  const lowerBody = body.toLowerCase();
  const lowerSender = sender.toLowerCase();

  // 1. Check Package Name
  if (sourcePackage && PACKAGE_TO_SOURCE_MAP[sourcePackage]) {
    for (const upi of UPI_REGISTRY) {
      if (upi.packageNames.includes(sourcePackage)) {
        return { detectedUpiApp: upi.name, matchedSourceApp: upi.sourceAppType };
      }
    }
  }

  // 2. Extract UPI VPA Handle if present
  let upiVpa = '';
  const vpaMatch = body.match(/(?:to|vpa|at|info[:\s]+UPI\/P2[MP]\/|info[:\s]+)(?:UPI\/)?([A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+)/i);
  if (vpaMatch && vpaMatch[1]) {
    upiVpa = vpaMatch[1].trim();
  }

  // 3. Match against UPI Registry
  for (const upi of UPI_REGISTRY) {
    // Check keywords
    const keywordMatch = upi.keywords.some((k) => lowerBody.includes(k) || lowerSender.includes(k));
    // Check VPA handles
    const vpaMatchFound = upiVpa && upi.vpaHandles.some((h) => upiVpa.toLowerCase().includes(h));

    if (keywordMatch || vpaMatchFound) {
      return {
        detectedUpiApp: upi.name,
        upiVpa: upiVpa || undefined,
        matchedSourceApp: upi.sourceAppType,
      };
    }
  }

  // 4. Universal UPI fallback: if message mentions UPI/VPA/UTR
  if (/(?:via upi|upi ref|by upi|vpa|p2m|p2p|utr[:\s])/i.test(lowerBody)) {
    return {
      detectedUpiApp: 'UPI Payment',
      upiVpa: upiVpa || undefined,
      matchedSourceApp: 'upi_apps',
    };
  }

  return { upiVpa: upiVpa || undefined };
}

/**
 * Generate a canonical transaction fingerprint for cross-app deduplication.
 */
export function generateTransactionFingerprint(
  amount: number,
  type: TransactionType,
  sourceAccount: string,
  date: string,
  rawBody?: string
): string {
  const normAccount = (sourceAccount || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const normAmount = Math.round(amount * 100);

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
 * Determines which app provided or formatted the message
 */
export function detectMessageSource(
  sender: string,
  body: string,
  sourcePackage?: string
): MessageSourceApp {
  if (sourcePackage && PACKAGE_TO_SOURCE_MAP[sourcePackage]) {
    return PACKAGE_TO_SOURCE_MAP[sourcePackage];
  }

  const combined = `${sender} ${body}`.toLowerCase();

  // Check CRED first
  if (combined.includes('cred pay') || combined.includes('cred club') || combined.includes('credpay') || combined.includes('@cred')) {
    return 'cred_pay';
  }

  // Check UPI apps
  if (
    combined.includes('phonepe') ||
    combined.includes('gpay') ||
    combined.includes('google pay') ||
    combined.includes('paytm upi') ||
    combined.includes('amazon pay') ||
    combined.includes('bhim upi') ||
    combined.includes('navi upi')
  ) {
    return 'upi_apps';
  }

  if (combined.includes('google messages') || combined.includes('rcs chat') || combined.includes('messages by google')) {
    return 'google_messages';
  }

  if (combined.includes('truecaller') || combined.includes('tc alert') || combined.includes('truecaller bank')) {
    return 'truecaller';
  }

  return 'carrier_sms';
}

/**
 * Universal banking SMS and notification parser
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

  // 1. Check for financial keywords
  const hasCurrencyTrigger = /(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)/i.test(cleanBody);
  const hasActionTrigger = /(?:debited|credited|withdrawn|spent|paid|transferred|received|deposited|refund|sent|charged|deducted|autopay|avl bal|clear bal|balance)/i.test(lowerBody);

  if (!hasCurrencyTrigger && !hasActionTrigger) {
    return null;
  }

  // 2. Extract Amount
  // Matches: "Rs. 450", "INR 1,200.50", "₹ 500", "debited by Rs 340", "paid Rs 250", etc.
  const amountRegex = /(?:(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent|transferred|charged|refund(?:ed)?)\s*(?:by|of|for|with)?\s*(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const amountMatch = cleanBody.match(amountRegex);

  let rawAmount = '';
  if (amountMatch) {
    rawAmount = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return null;
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

  // 6. Detect UPI App & VPA
  const { detectedUpiApp, upiVpa, matchedSourceApp } = identifyUpiApp(sender, cleanBody, sourcePackage);

  // If bankName is still generic and UPI is found
  if (bankName === 'Bank Account' && detectedUpiApp) {
    bankName = `${detectedUpiApp}`;
  }

  const sourceAccount = accountSuffix ? `${bankName} (${accountSuffix})` : bankName;

  // 7. Smart Category & Activity Matching
  let suggestedCategoryId = type === 'income' ? 'cat_salary' : 'cat_groceries';
  let activity: AccountingActivity = 'operating';

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.keywords.some((k) => lowerBody.includes(k))) {
      suggestedCategoryId = catRule.categoryId;
      activity = catRule.activity;
      break;
    }
  }

  // 8. Extract Vendor or Summary Notes
  let vendorOrNotes = '';
  const vpaMatch = cleanBody.match(/(?:to|at|vpa|info|paid to|sent to)\s+([A-Za-z0-9.\-_@ ]{3,30})(?:\s+on|\s+ref|\s+avl|\.|$)/i);
  if (vpaMatch && vpaMatch[1]) {
    vendorOrNotes = vpaMatch[1].trim();
  } else if (detectedUpiApp) {
    vendorOrNotes = `${type === 'income' ? 'Received via' : 'Paid via'} ${detectedUpiApp}`;
  } else {
    vendorOrNotes = `${type === 'income' ? 'Received into' : 'Paid via'} ${sourceAccount}`;
  }

  // 9. Source App Attribution
  const detectedSourceApp = forceSource || matchedSourceApp || detectMessageSource(sender, body, sourcePackage);

  // 10. Generate deduplication fingerprint hash
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
    detectedUpiApp,
    upiVpa,
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
    detectedUpiApp: parsed.detectedUpiApp,
    upiVpa: parsed.upiVpa,
    hash: parsed.hash,
  };
}
