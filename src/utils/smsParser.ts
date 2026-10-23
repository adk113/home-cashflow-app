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
  rawBody: string;
  normalizedSender: string;
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

// UPI Registry supporting Indian UPI providers
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
    sourceAppType: 'auto',
    keywords: ['cred pay', 'cred club', 'credpay', 'dreamplug', 'via cred', 'to cred'],
    vpaHandles: ['@cred', 'cred.club', '@axisb', '@yescred'],
    packageNames: ['com.dreamplug.androidapp'],
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    sourceAppType: 'auto',
    keywords: ['phonepe', 'phone pe', 'via phonepe'],
    vpaHandles: ['@ybl', '@ibl', '@axl'],
    packageNames: ['com.phonepe.app'],
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    sourceAppType: 'auto',
    keywords: ['google pay', 'gpay', 'googlepay', 'via google pay'],
    vpaHandles: ['@okaxis', '@okhdfcbank', '@okicici', '@oksbi'],
    packageNames: ['com.google.android.apps.nbu.paisa.user'],
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    sourceAppType: 'auto',
    keywords: ['paytm upi', 'via paytm', 'paytm wallet'],
    vpaHandles: ['@paytm'],
    packageNames: ['net.one97.paytm'],
  },
  {
    id: 'amazon_pay',
    name: 'Amazon Pay',
    sourceAppType: 'auto',
    keywords: ['amazon pay', 'amazonpay', 'via amazon pay'],
    vpaHandles: ['@apl', '@rapl'],
    packageNames: ['in.amazon.mShop.android.shopping'],
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    sourceAppType: 'auto',
    keywords: ['bhim', 'bhim upi', 'npci'],
    vpaHandles: ['@upi'],
    packageNames: ['in.org.npci.upiapp'],
  },
  {
    id: 'navi',
    name: 'Navi UPI',
    sourceAppType: 'auto',
    keywords: ['navi upi', 'navi payment'],
    vpaHandles: ['@navi'],
    packageNames: ['com.naviapp'],
  },
  {
    id: 'slice',
    name: 'Slice UPI',
    sourceAppType: 'auto',
    keywords: ['slice', 'slice card', 'slice upi'],
    vpaHandles: ['@slice'],
    packageNames: ['indwin.c3.shareapp'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter Money',
    sourceAppType: 'auto',
    keywords: ['jupiter money', 'jupiter'],
    vpaHandles: ['@jupiteraxis'],
    packageNames: ['money.jupiter'],
  },
  {
    id: 'fi_money',
    name: 'Fi Money',
    sourceAppType: 'auto',
    keywords: ['fi money', 'epifi'],
    vpaHandles: ['@fibank'],
    packageNames: ['com.epifi.fi'],
  },
  {
    id: 'mobikwik',
    name: 'MobiKwik',
    sourceAppType: 'auto',
    keywords: ['mobikwik', 'mobi kwik'],
    vpaHandles: ['@ikwik'],
    packageNames: ['com.mobikwik_new'],
  },
  {
    id: 'whatsapp_pay',
    name: 'WhatsApp Pay',
    sourceAppType: 'auto',
    keywords: ['whatsapp pay', 'whatsapp payment'],
    vpaHandles: ['@waicici', '@wahdfcbank', '@wasbi'],
    packageNames: ['com.whatsapp'],
  },
  {
    id: 'tata_neu',
    name: 'Tata Neu',
    sourceAppType: 'auto',
    keywords: ['tata neu', 'tataneu'],
    vpaHandles: ['@tataneu'],
    packageNames: ['com.tatadigital.tcp'],
  },
];

// Android Package Names mapping
export const PACKAGE_TO_SOURCE_MAP: Record<string, MessageSourceApp> = {
  'com.google.android.apps.messaging': 'auto',
  'com.truecaller': 'auto',
  'com.android.mms': 'auto',
  'com.samsung.android.messaging': 'auto',
  'com.motorola.messaging': 'auto',
  'com.dreamplug.androidapp': 'auto',
  'com.phonepe.app': 'auto',
  'com.google.android.apps.nbu.paisa.user': 'auto',
  'net.one97.paytm': 'auto',
  'in.amazon.mShop.android.shopping': 'auto',
  'in.org.npci.upiapp': 'auto',
  'com.snapwork.hdfc': 'auto',
  'com.csam.icici.bank.imobile': 'auto',
  'com.sbi.lotusintouch': 'auto',
  'com.axis.mobile': 'auto',
};

// Categorization heuristics based on merchant keywords
const CATEGORY_KEYWORDS: { keywords: string[]; categoryId: string; activity: AccountingActivity }[] = [
  {
    keywords: [
      'swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks',
      'dominos', 'burger', 'dine', 'food', 'eats', 'pizza', 'haldiram', 'subway',
      'chai point', 'barbeque nation', 'sweet', 'bakery', 'coffee'
    ],
    categoryId: 'cat_dining',
    activity: 'operating',
  },
  {
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'grocery', 'supermarket',
      'dmart', 'nature basket', 'reliance fresh', 'food hall', 'kirana', 'spencer',
      'more retail', 'milk', 'vegetables', 'meat', 'fresh'
    ],
    categoryId: 'cat_groceries',
    activity: 'operating',
  },
  {
    keywords: [
      'uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl', 'iocl',
      'metro', 'fastag', 'toll', 'parking', 'shell', 'irctc', 'indigo', 'air india',
      'flight', 'railway', 'train', 'bus'
    ],
    categoryId: 'cat_transport',
    activity: 'operating',
  },
  {
    keywords: [
      'electricity', 'bescom', 'tneb', 'mseb', 'water', 'gas', 'billdesk',
      'recharge', 'broadband', 'wifi', 'jio fiber', 'airtel broadband', 'tataplay',
      'dth', 'adani electricity', 'piped gas', 'cylinders'
    ],
    categoryId: 'cat_utilities',
    activity: 'operating',
  },
  {
    keywords: [
      'pharmacy', 'apollo', 'medplus', '1mg', 'netmeds', 'hospital', 'clinic',
      'diagnostic', 'doctor', 'healthcare', 'pharmeasy', 'pathology', 'dental', 'chemist'
    ],
    categoryId: 'cat_healthcare',
    activity: 'operating',
  },
  {
    keywords: [
      'netflix', 'spotify', 'prime video', 'youtube', 'disney', 'hotstar',
      'apple.com/bill', 'google play', 'subscription', 'audible', 'chatgpt', 'openai'
    ],
    categoryId: 'cat_subscriptions',
    activity: 'operating',
  },
  {
    keywords: [
      'salary', 'payroll', 'stipend', 'wages', 'bonus', 'commission',
      'remuneration', 'credited towards salary', 'monthly salary'
    ],
    categoryId: 'cat_salary',
    activity: 'operating',
  },
  {
    keywords: [
      'freelance', 'client payment', 'consulting', 'upwork', 'fiverr', 'stripe transfer'
    ],
    categoryId: 'cat_freelance',
    activity: 'operating',
  },
  {
    keywords: [
      'dividend', 'interest credited', 'mutual fund', 'zerodha', 'groww',
      'upstox', 'sip', 'shares', 'stocks', 'coin', 'kuvera', 'etmoney', 'sebi', 'nav'
    ],
    categoryId: 'cat_invest_return',
    activity: 'investing',
  },
  {
    keywords: [
      'home renovation', 'interior', 'ikea', 'urban ladder', 'pepperfry',
      'hardware', 'construction', 'remodel', 'paint', 'asian paints'
    ],
    categoryId: 'cat_home_improvement',
    activity: 'investing',
  },
  {
    keywords: [
      'emi', 'loan', 'mortgage', 'home loan', 'car loan', 'personal loan',
      'credit card payment', 'auto debit for loan', 'bajaj finance', 'hdfc credila'
    ],
    categoryId: 'cat_mortgage_paydown',
    activity: 'financing',
  },
];

/**
 * Normalizes a sender ID/Handle to clean core alphanumeric string
 * E.g. "Google Messages • HDFCBK" -> "HDFCBK"
 * E.g. "VM-HDFCBK" -> "HDFCBK"
 * E.g. "AD-SBIINB" -> "SBIINB"
 * E.g. "Truecaller • AXISBK" -> "AXISBK"
 */
export function normalizeSenderHandle(sender: string): string {
  let clean = (sender || '').trim();
  // Strip app wrappers like "Google Messages • " or "Truecaller • "
  clean = clean.replace(/^(?:google messages|truecaller|messages|carrier)\s*[•\-|:]\s*/i, '');
  // Strip cellular carrier routing prefixes like "VM-", "AD-", "VK-", "AX-", "BP-", "DM-", "IM-", "BZ-"
  clean = clean.replace(/^[a-zA-Z]{2}-/i, '');
  // Extract alphanumeric core
  clean = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean || 'BANK';
}

/**
 * Generate a 5-second window composite deduplication key:
 * Timestamp (within 5-sec window) + Exact Transaction Amount + Sender Handle/ID
 */
export function generateCompositeDeduplicationKey(
  sender: string,
  amount: number,
  timestampMs: number = Date.now()
): {
  exactKey: string;
  normSender: string;
  formattedAmount: string;
  timeBucket: number;
} {
  const normSender = normalizeSenderHandle(sender);
  const formattedAmount = amount.toFixed(2);
  const timeBucket = Math.floor(timestampMs / 5000); // 5-second bucket window
  const exactKey = `${normSender}_${formattedAmount}_b${timeBucket}`;
  return { exactKey, normSender, formattedAmount, timeBucket };
}

/**
 * Universal Deduplication Check across multiple message feeds.
 * Matches: Timestamp within 5000ms + Exact Amount + Matching Sender Handle
 */
export function isDuplicateTransaction(
  incoming: { sender: string; amount: number; timestamp?: number; rawBody?: string },
  existingList: { sender?: string; amount: number; timestamp?: number; createdAt?: number; date?: string; rawSms?: string; hash?: string }[],
  windowMs: number = 5000
): boolean {
  const normIncomingSender = normalizeSenderHandle(incoming.sender);
  const incomingAmtStr = incoming.amount.toFixed(2);
  const incomingTs = incoming.timestamp || Date.now();

  for (const ex of existingList) {
    const exAmtStr = ex.amount.toFixed(2);
    if (incomingAmtStr !== exAmtStr) continue;

    const exSender = ex.sender ? normalizeSenderHandle(ex.sender) : '';
    // If sender handles match or either is contained in the other
    const senderMatches =
      !exSender ||
      normIncomingSender === exSender ||
      normIncomingSender.includes(exSender) ||
      exSender.includes(normIncomingSender);

    if (!senderMatches) continue;

    const exTs = ex.timestamp || ex.createdAt || 0;
    if (exTs > 0) {
      if (Math.abs(incomingTs - exTs) <= windowMs) {
        return true; // Within 5-second window duplicate!
      }
    }
  }

  return false;
}

/**
 * Predictive, scheduled, authorization or non-definitive alert patterns that MUST be IGNORED
 */
const PREDICTIVE_OR_AUTH_PATTERNS = [
  /\b(?:will be debited|is scheduled|scheduled for|scheduled on)\b/i,
  /\b(?:request to pay|requested to pay|requested you to pay|collect request|payment request)\b/i,
  /\b(?:otp|one time password|verification code|secret code|security code|do not share)\b/i,
  /\b(?:e-mandate|autopay mandate|mandate registered|mandate created)\b/i,
  /\b(?:payment due|bill due|due date|minimum amount due|total amount due)\b/i,
  /\b(?:pre-approved|eligible for|apply for loan|instant personal loan)\b/i,
  /\b(?:congratulations|claim your reward|scratch card|reward points|spin the wheel)\b/i,
  /\b(?:statement generated|e-statement|account statement)\b/i,
  /\b(?:login alert|logged in to your account|new device)\b/i,
];

/**
 * Definitive financial action indicators that MUST be verified
 */
const DEFINITIVE_ACTION_PATTERNS = [
  /\b(?:has been debited|is debited|debited by|debited for|debited with|debited)\b/i,
  /\b(?:has been credited|is credited|credited with|credited to|credited by|credited)\b/i,
  /\b(?:successful|successfully sent|transferred|withdrawn|spent|paid to|paid rs|paid inr|paid ₹|sent rs|sent inr|sent ₹|charged)\b/i,
  /\b(?:received rs|received inr|received ₹|deposited)\b/i,
  /\b(?:refunded|cashback received)\b/i,
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
        return { detectedUpiApp: upi.name, matchedSourceApp: 'auto' };
      }
    }
  }

  // 2. Extract UPI VPA Handle if present
  let upiVpa = '';
  const vpaMatch = body.match(
    /(?:to|vpa|at|info[:\s]+UPI\/P2[MP]\/|info[:\s]+)(?:UPI\/)?([A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+)/i
  );
  if (vpaMatch && vpaMatch[1]) {
    upiVpa = vpaMatch[1].trim();
  }

  // 3. Match against UPI Registry
  for (const upi of UPI_REGISTRY) {
    const keywordMatch = upi.keywords.some((k) => lowerBody.includes(k) || lowerSender.includes(k));
    const vpaMatchFound = upiVpa && upi.vpaHandles.some((h) => upiVpa.toLowerCase().includes(h));

    if (keywordMatch || vpaMatchFound) {
      return {
        detectedUpiApp: upi.name,
        upiVpa: upiVpa || undefined,
        matchedSourceApp: 'auto',
      };
    }
  }

  // 4. Universal UPI fallback
  if (/(?:via upi|upi ref|by upi|vpa|p2m|p2p|utr[:\s])/i.test(lowerBody)) {
    return {
      detectedUpiApp: 'UPI Payment',
      upiVpa: upiVpa || undefined,
      matchedSourceApp: 'auto',
    };
  }

  return { upiVpa: upiVpa || undefined };
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
  if (!body || body.trim().length < 8) {
    return null;
  }

  const cleanBody = body.replace(/[\r\n]+/g, ' ').trim();
  const lowerBody = cleanBody.toLowerCase();

  // =========================================================================
  // 1. INTENT FILTERING: Reject predictive or authorization alerts immediately
  // =========================================================================
  for (const pattern of PREDICTIVE_OR_AUTH_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return null; // IGNORE predictive or authorization alerts
    }
  }

  // =========================================================================
  // 2. INTENT FILTERING: Require definitive financial actions or explicit debit/credit
  // =========================================================================
  const hasDefinitiveAction = DEFINITIVE_ACTION_PATTERNS.some((p) => p.test(cleanBody));
  const hasCurrencyTrigger = /(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)/i.test(cleanBody);
  const hasBalanceTrigger = /(?:avl bal|clear bal|available bal|balance)/i.test(lowerBody);

  if (!hasDefinitiveAction && !(hasCurrencyTrigger && hasBalanceTrigger)) {
    return null;
  }

  // =========================================================================
  // 3. AMOUNT EXTRACTION
  // Matches: "Rs. 450", "INR 1,200.50", "₹ 500", "debited for Rs 1,485.00", "paid ₹480", etc.
  // =========================================================================
  const amountRegex =
    /(?:(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent|transferred|charged|refund(?:ed)?)\s*(?:by|of|for|with)?\s*(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const amountMatch = cleanBody.match(amountRegex);

  let rawAmount = '';
  if (amountMatch) {
    rawAmount = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // =========================================================================
  // 4. TRANSACTION TYPE: Inflow (Income) vs Outflow (Expense)
  // =========================================================================
  let type: TransactionType = 'expense';
  if (/(?:credited|received|deposited|refunded|refund|cashback|salary credited)/i.test(lowerBody)) {
    type = 'income';
  } else if (/(?:debited|spent|paid|withdrawn|sent|deducted|charged|transferred to|purchase)/i.test(lowerBody)) {
    type = 'expense';
  }

  // =========================================================================
  // 5. ACCOUNT / CARD EXTRACTION
  // =========================================================================
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

  // =========================================================================
  // 6. BANK / PROVIDER IDENTIFICATION
  // =========================================================================
  let bankName = 'Bank Account';
  const cleanSender = sender.toUpperCase().replace(/[^A-Z]/g, '');

  for (const [key, name] of Object.entries(BANK_MAPPINGS)) {
    if (cleanSender.includes(key) || cleanBody.toUpperCase().includes(key)) {
      bankName = name;
      break;
    }
  }

  // Detect UPI Provider & VPA
  const { detectedUpiApp, upiVpa } = identifyUpiApp(sender, cleanBody, sourcePackage);

  if (bankName === 'Bank Account' && detectedUpiApp) {
    bankName = detectedUpiApp;
  }

  const sourceAccount = accountSuffix ? `${bankName} (${accountSuffix})` : bankName;

  // =========================================================================
  // 7. CATEGORY & ACTIVITY CLASSIFICATION
  // High confidence keywords -> Specific Category
  // Low confidence -> Dump to "Uncategorized" bucket
  // =========================================================================
  let suggestedCategoryId = 'cat_uncategorized';
  let activity: AccountingActivity = 'operating';
  let matchedKeyword = false;

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.keywords.some((k) => lowerBody.includes(k))) {
      suggestedCategoryId = catRule.categoryId;
      activity = catRule.activity;
      matchedKeyword = true;
      break;
    }
  }

  // If no category matched, provide sensible low-confidence default
  if (!matchedKeyword) {
    suggestedCategoryId = type === 'income' ? 'cat_salary' : 'cat_uncategorized';
    activity = 'operating';
  }

  // =========================================================================
  // 8. VENDOR OR TRANSACTION SUMMARY
  // =========================================================================
  let vendorOrNotes = '';
  const vpaMatch = cleanBody.match(
    /(?:to|at|vpa|info|paid to|sent to)\s+([A-Za-z0-9.\-_@ ]{3,30})(?:\s+on|\s+ref|\s+avl|\.|$)/i
  );
  if (vpaMatch && vpaMatch[1]) {
    vendorOrNotes = vpaMatch[1].trim();
  } else if (detectedUpiApp) {
    vendorOrNotes = `${type === 'income' ? 'Received via' : 'Paid via'} ${detectedUpiApp}`;
  } else {
    vendorOrNotes = `${type === 'income' ? 'Received into' : 'Paid via'} ${sourceAccount}`;
  }

  // =========================================================================
  // 9. NORMALIZED SENDER & DEDUPLICATION FINGERPRINT
  // Composite Key: Sender Handle + Exact Amount + 5-second bucket
  // =========================================================================
  const normalizedSender = normalizeSenderHandle(sender);
  const compositeKeyInfo = generateCompositeDeduplicationKey(normalizedSender, amount, Date.now());

  return {
    isBankSms: true,
    amount,
    type,
    activity,
    suggestedCategoryId,
    sourceAccount,
    vendorOrNotes,
    detectedSourceApp: 'auto',
    sourcePackage,
    detectedUpiApp,
    upiVpa,
    hash: compositeKeyInfo.exactKey,
    rawBody: body.trim(),
    normalizedSender,
  };
}

/**
 * Creates a PendingSmsTransaction object from raw text and sender metadata
 */
export function createPendingTransactionFromSms(
  sender: string,
  body: string,
  sourcePackage?: string,
  timestampMs: number = Date.now()
): PendingSmsTransaction | null {
  const parsed = parseBankingSms(sender, body, sourcePackage);
  if (!parsed) return null;

  const keyInfo = generateCompositeDeduplicationKey(sender, parsed.amount, timestampMs);

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
    detectedAt: timestampMs,
    sourceApp: 'auto',
    sourcePackage: parsed.sourcePackage,
    detectedUpiApp: parsed.detectedUpiApp,
    upiVpa: parsed.upiVpa,
    hash: keyInfo.exactKey,
  };
}
