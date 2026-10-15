// Standalone verification script for Multi-Source SMS & Notification Sync Engine
// Tests: Google Messages (RCS), Truecaller, Carrier SMS, Bank UPI notifications, and Cross-App Deduplication

// Category keywords definition
const CATEGORY_KEYWORDS = [
  { keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks', 'dominos', 'burger', 'dine', 'food'], categoryId: 'cat_dining', activity: 'operating' },
  { keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'grocery', 'supermarket', 'dmart'], categoryId: 'cat_groceries', activity: 'operating' },
  { keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'metro', 'fastag', 'parking'], categoryId: 'cat_transport', activity: 'operating' },
  { keywords: ['electricity', 'bescom', 'water', 'gas', 'billdesk', 'wifi', 'broadband'], categoryId: 'cat_utilities', activity: 'operating' },
  { keywords: ['pharmacy', 'apollo', 'medplus', '1mg', 'hospital', 'clinic'], categoryId: 'cat_healthcare', activity: 'operating' },
  { keywords: ['salary', 'payroll', 'stipend', 'wages', 'bonus', 'commission'], categoryId: 'cat_salary', activity: 'operating' },
  { keywords: ['dividend', 'interest credited', 'mutual fund', 'zerodha', 'groww', 'sip'], categoryId: 'cat_invest_return', activity: 'investing' },
  { keywords: ['emi', 'loan', 'mortgage', 'credit card payment'], categoryId: 'cat_mortgage_paydown', activity: 'financing' },
];

const BANK_MAPPINGS = {
  HDFC: 'HDFC Bank',
  HDFCBK: 'HDFC Bank',
  SBI: 'State Bank of India',
  SBIINB: 'SBI Bank',
  SBICRD: 'SBI Card',
  ICICI: 'ICICI Bank',
  ICICIB: 'ICICI Bank',
  AXIS: 'Axis Bank',
  AXISBK: 'Axis Bank',
  KOTAK: 'Kotak Mahindra Bank',
  KOTAKB: 'Kotak Mahindra Bank',
  PNB: 'Punjab National Bank',
  YESB: 'Yes Bank',
  BOB: 'Bank of Baroda',
  PHONEPE: 'PhonePe UPI',
  GPAY: 'Google Pay',
  PAYTM: 'Paytm Wallet/Bank',
};

const PACKAGE_TO_SOURCE_MAP = {
  'com.google.android.apps.messaging': 'google_messages',
  'com.truecaller': 'truecaller',
  'com.android.mms': 'carrier_sms',
  'com.samsung.android.messaging': 'carrier_sms',
  'com.google.android.apps.nbu.paisa.user': 'bank_apps',
  'com.phonepe.app': 'bank_apps',
  'net.one97.paytm': 'bank_apps',
};

function detectMessageSource(sender, body, sourcePackage) {
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
  if (combined.includes('gpay') || combined.includes('google pay') || combined.includes('phonepe') || combined.includes('paytm upi')) {
    return 'bank_apps';
  }
  return 'carrier_sms';
}

function generateTransactionFingerprint(amount, type, sourceAccount, date, rawBody) {
  const normAccount = (sourceAccount || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

function parseBankingSms(sender, body, sourcePackage, forceSource) {
  const cleanBody = body.replace(/[\r\n]+/g, ' ');
  const lowerBody = cleanBody.toLowerCase();
  const lowerSender = sender.toLowerCase();

  const hasCurrencyTrigger = /(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)/i.test(cleanBody);
  const hasActionTrigger = /(?:debited|credited|withdrawn|spent|paid|transferred|received|deposited|refund|sent|charged|deducted|autopay)/i.test(lowerBody);

  if (!hasCurrencyTrigger && !hasActionTrigger) return null;

  const amountRegex = /(?:(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent|transferred|charged|refund(?:ed)?)\s*(?:by|of|for)?\s*(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const amountMatch = cleanBody.match(amountRegex);

  let rawAmount = '';
  if (amountMatch) {
    rawAmount = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) return null;

  let type = 'expense';
  if (/(?:credited|received|deposited|refunded|refund|cashback|salary credited)/i.test(lowerBody)) {
    type = 'income';
  } else if (/(?:debited|spent|paid|withdrawn|sent|deducted|charged|transferred to|purchase)/i.test(lowerBody)) {
    type = 'expense';
  }

  let accountSuffix = '';
  const accountRegex = /(?:a\/c|acct|acc|account|card)\s*(?:no\.?)?\s*[*Xx]*([0-9]{3,4})/i;
  const accountMatch = cleanBody.match(accountRegex);
  if (accountMatch && accountMatch[1]) {
    accountSuffix = `A/c XX${accountMatch[1]}`;
  }

  let bankName = 'Bank Account';
  const cleanSender = sender.toUpperCase().replace(/[^A-Z]/g, '');
  for (const [key, name] of Object.entries(BANK_MAPPINGS)) {
    if (cleanSender.includes(key) || cleanBody.toUpperCase().includes(key)) {
      bankName = name;
      break;
    }
  }

  const sourceAccount = accountSuffix ? `${bankName} (${accountSuffix})` : bankName;

  let suggestedCategoryId = type === 'income' ? 'cat_salary' : 'cat_groceries';
  let activity = 'operating';

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.keywords.some((k) => lowerBody.includes(k))) {
      suggestedCategoryId = catRule.categoryId;
      activity = catRule.activity;
      break;
    }
  }

  const detectedSourceApp = forceSource || detectMessageSource(sender, body, sourcePackage);
  const todayIso = new Date().toISOString().split('T')[0];
  const hash = generateTransactionFingerprint(amount, type, sourceAccount, todayIso, cleanBody);

  return {
    isBankSms: true,
    amount,
    type,
    activity,
    suggestedCategoryId,
    sourceAccount,
    detectedSourceApp,
    hash,
  };
}

const TEST_CASES = [
  {
    name: 'Google Messages RCS Debit',
    sender: 'Google Messages • HDFCBK',
    body: 'Verified Bank Alert: Rs 1,499.00 debited from HDFC Bank A/c XX8812 on 15-Oct-26 for AMAZON INDIA. Available balance Rs 39,701.00.',
    expectedSource: 'google_messages',
    expectedAmount: 1499.00,
    expectedType: 'expense',
  },
  {
    name: 'Truecaller Verified SMS',
    sender: 'Truecaller • AXISBK',
    body: 'Truecaller Verified SMS: Axis Bank A/c XX7734 debited by Rs 2,450.00 on 15-Oct-26 at BLINKIT GROCERIES. UPI Ref 3291048123.',
    expectedSource: 'truecaller',
    expectedAmount: 2450.00,
    expectedType: 'expense',
  },
  {
    name: 'Carrier Default SMS Salary Inflow',
    sender: 'AD-SBIINB',
    body: 'Your A/C ending 9812 has been CREDITED with INR 75,000.00 on 15-OCT-26 by Monthly Salary Transfer. Avl Bal INR 1,24,000.00 - State Bank of India',
    expectedSource: 'carrier_sms',
    expectedAmount: 75000.00,
    expectedType: 'income',
  },
  {
    name: 'Direct PhonePe UPI Notification',
    sender: 'PhonePe',
    body: 'Paid ₹480 to Swiggy on PhonePe. Debited from HDFC Bank A/c XX4521. UTR: 42918471923.',
    expectedSource: 'bank_apps',
    expectedAmount: 480.00,
    expectedType: 'expense',
  },
];

function runVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFYING MULTI-SOURCE SMS & NOTIFICATION ENGINE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  for (const tc of TEST_CASES) {
    total++;
    const detectedSource = detectMessageSource(tc.sender, tc.body);
    const parsed = parseBankingSms(tc.sender, tc.body);

    if (!parsed) {
      console.error(`❌ FAILED: ${tc.name} could not be parsed.`);
      continue;
    }

    const sourceMatch = detectedSource === tc.expectedSource;
    const amountMatch = Math.abs(parsed.amount - tc.expectedAmount) < 0.01;
    const typeMatch = parsed.type === tc.expectedType;

    if (sourceMatch && amountMatch && typeMatch) {
      console.log(`✅ PASS: ${tc.name}`);
      console.log(`   Source: ${parsed.detectedSourceApp} | Amount: ₹${parsed.amount} | Type: ${parsed.type} | Account: ${parsed.sourceAccount}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${tc.name}`);
      console.error(`   Got source=${detectedSource} (expected ${tc.expectedSource})`);
      console.error(`   Got amount=${parsed.amount} (expected ${tc.expectedAmount})`);
      console.error(`   Got type=${parsed.type} (expected ${tc.expectedType})`);
    }
  }

  // Cross-App Deduplication Test
  console.log('\n--- Testing Cross-App Deduplication (Google Messages vs Truecaller vs SMS) ---');
  total++;

  const googleMsgAlert = {
    sender: 'Google Messages • HDFCBK',
    body: 'HDFC Bank: Rs 540.00 debited from A/c XX4521 on 15-Oct-26 at SWIGGY BANGALORE via UPI. Avl Bal: Rs 41,200.00',
  };

  const truecallerAlert = {
    sender: 'Truecaller • Bank Alert',
    body: 'Truecaller: Rs 540.00 paid from HDFC Bank A/c XX4521 to SWIGGY BANGALORE on 15-Oct-26.',
  };

  const carrierSmsAlert = {
    sender: 'VM-HDFCBK',
    body: 'Dear Customer, your A/c XX4521 is debited for Rs 540.00 on 15-Oct-26 by VPA SWIGGY. Avl Bal: Rs 41,200.00 - HDFC Bank',
  };

  const item1 = parseBankingSms(googleMsgAlert.sender, googleMsgAlert.body);
  const item2 = parseBankingSms(truecallerAlert.sender, truecallerAlert.body);
  const item3 = parseBankingSms(carrierSmsAlert.sender, carrierSmsAlert.body);

  if (item1 && item2 && item3) {
    console.log(`   Fingerprint 1 (Google Messages): ${item1.hash}`);
    console.log(`   Fingerprint 2 (Truecaller):      ${item2.hash}`);
    console.log(`   Fingerprint 3 (Carrier SMS):     ${item3.hash}`);

    const isDeduplicated = (item1.hash === item2.hash) && (item2.hash === item3.hash);
    if (isDeduplicated) {
      console.log('✅ PASS: Cross-app transaction fingerprint matched identically across all 3 apps!');
      console.log('   Deduplication engine will safely ingest exactly 1 transaction and prevent 2 duplicates.');
      passed++;
    } else {
      console.error('❌ FAILED: Deduplication fingerprints differed across providers for same event.');
    }
  } else {
    console.error('❌ FAILED: Could not parse deduplication test fixtures.');
  }

  // True Source Selection Filtering Test
  console.log('\n--- Testing True Source Selection Filtering ---');
  total++;

  const candidateMessages = [
    { sender: 'Google Messages • HDFCBK', body: 'Rs 500 debited from A/c XX1111 on 15-Oct-26 for Uber' },
    { sender: 'Truecaller • ICICI', body: 'Rs 800 debited from A/c XX2222 on 15-Oct-26 for Zomato' },
    { sender: 'AD-SBIINB', body: 'Rs 1200 debited from A/c XX3333 on 15-Oct-26 for Groceries' },
  ];

  const onlyGoogle = candidateMessages.filter(m => detectMessageSource(m.sender, m.body) === 'google_messages');
  const onlyTruecaller = candidateMessages.filter(m => detectMessageSource(m.sender, m.body) === 'truecaller');
  const onlyCarrier = candidateMessages.filter(m => detectMessageSource(m.sender, m.body) === 'carrier_sms');

  if (onlyGoogle.length === 1 && onlyTruecaller.length === 1 && onlyCarrier.length === 1) {
    console.log('✅ PASS: Source filter accurately routes messages to user-selected True Source:');
    console.log(`   - Google Messages source picked: "${onlyGoogle[0].sender}"`);
    console.log(`   - Truecaller source picked: "${onlyTruecaller[0].sender}"`);
    console.log(`   - Carrier SMS source picked: "${onlyCarrier[0].sender}"`);
    passed++;
  } else {
    console.error('❌ FAILED: Source filtering test did not isolate sources correctly.');
  }

  console.log(`\n====================================================`);
  console.log(`📊 RESULTS: ${passed}/${total} test suites PASSED (${Math.round((passed/total)*100)}%)`);
  console.log(`====================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification();
