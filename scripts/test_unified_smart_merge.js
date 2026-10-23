// test_unified_smart_merge.js
// Verification suite for Smart Merge: Unified Auto-Detection Engine,
// Intent Filtering, Universal 5-Second Deduplication, and Uncategorized Ledger Fallback.

const assert = require('assert');

// 1. Intent Filtering Definitions
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

const DEFINITIVE_ACTION_PATTERNS = [
  /\b(?:has been debited|is debited|debited by|debited for|debited with|debited)\b/i,
  /\b(?:has been credited|is credited|credited with|credited to|credited by|credited)\b/i,
  /\b(?:successful|successfully sent|transferred|withdrawn|spent|paid to|paid rs|paid inr|paid ₹|sent rs|sent inr|sent ₹|charged)\b/i,
  /\b(?:received rs|received inr|received ₹|deposited)\b/i,
  /\b(?:refunded|cashback received)\b/i,
];

function normalizeSenderHandle(sender) {
  let clean = (sender || '').trim();
  clean = clean.replace(/^(?:google messages|truecaller|messages|carrier)\s*[•\-|:]\s*/i, '');
  clean = clean.replace(/^[a-zA-Z]{2}-/i, '');
  clean = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean || 'BANK';
}

function generateCompositeDeduplicationKey(sender, amount, timestampMs) {
  const normSender = normalizeSenderHandle(sender);
  const formattedAmount = amount.toFixed(2);
  const timeBucket = Math.floor(timestampMs / 5000);
  const exactKey = `${normSender}_${formattedAmount}_b${timeBucket}`;
  return { exactKey, normSender, formattedAmount, timeBucket };
}

function isDuplicateTransaction(incoming, existingList, windowMs = 5000) {
  const normIncomingSender = normalizeSenderHandle(incoming.sender);
  const incomingAmtStr = incoming.amount.toFixed(2);
  const incomingTs = incoming.timestamp || Date.now();

  for (const ex of existingList) {
    const exAmtStr = ex.amount.toFixed(2);
    if (incomingAmtStr !== exAmtStr) continue;

    const exSender = ex.sender ? normalizeSenderHandle(ex.sender) : '';
    const senderMatches =
      !exSender ||
      normIncomingSender === exSender ||
      normIncomingSender.includes(exSender) ||
      exSender.includes(normIncomingSender);

    if (!senderMatches) continue;

    const exTs = ex.timestamp || ex.createdAt || 0;
    if (exTs > 0 && Math.abs(incomingTs - exTs) <= windowMs) {
      return true;
    }
  }

  return false;
}

const CATEGORY_KEYWORDS = [
  { keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'starbucks', 'dominos'], categoryId: 'cat_dining', activity: 'operating' },
  { keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'grocery', 'supermarket', 'dmart'], categoryId: 'cat_groceries', activity: 'operating' },
  { keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'metro', 'fastag'], categoryId: 'cat_transport', activity: 'operating' },
  { keywords: ['electricity', 'bescom', 'water', 'gas', 'billdesk', 'broadband'], categoryId: 'cat_utilities', activity: 'operating' },
  { keywords: ['pharmacy', 'apollo', 'medplus', '1mg', 'hospital'], categoryId: 'cat_healthcare', activity: 'operating' },
  { keywords: ['salary', 'payroll', 'stipend', 'wages'], categoryId: 'cat_salary', activity: 'operating' },
  { keywords: ['dividend', 'mutual fund', 'zerodha', 'groww', 'sip'], categoryId: 'cat_invest_return', activity: 'investing' },
  { keywords: ['emi', 'loan', 'mortgage', 'credit card payment'], categoryId: 'cat_mortgage_paydown', activity: 'financing' },
];

function parseBankingSms(sender, body) {
  if (!body || body.trim().length < 8) return null;
  const cleanBody = body.replace(/[\r\n]+/g, ' ').trim();
  const lowerBody = cleanBody.toLowerCase();

  // 1. Intent Filtering: Predictive / Auth / OTP
  for (const pattern of PREDICTIVE_OR_AUTH_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return null;
    }
  }

  // 2. Intent Filtering: Definitive Action
  const hasDefinitiveAction = DEFINITIVE_ACTION_PATTERNS.some((p) => p.test(cleanBody));
  const hasCurrencyTrigger = /(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)/i.test(cleanBody);
  const hasBalanceTrigger = /(?:avl bal|clear bal|available bal|balance)/i.test(lowerBody);

  if (!hasDefinitiveAction && !(hasCurrencyTrigger && hasBalanceTrigger)) {
    return null;
  }

  // 3. Extract Amount
  const amountRegex = /(?:(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent|transferred|charged|refund(?:ed)?)\s*(?:by|of|for|with)?\s*(?:rs\.?|inr|₹|\$|usd|eur|€|gbp|£)?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i;
  const match = cleanBody.match(amountRegex);
  if (!match) return null;
  const rawAmt = (match[1] || match[2] || '').replace(/,/g, '');
  const amount = parseFloat(rawAmt);
  if (isNaN(amount) || amount <= 0) return null;

  // 4. Type
  let type = 'expense';
  if (/(?:credited|received|deposited|refunded|refund|cashback|salary credited)/i.test(lowerBody)) {
    type = 'income';
  }

  // 5. Category matching (with fallback to cat_uncategorized)
  let suggestedCategoryId = 'cat_uncategorized';
  let activity = 'operating';
  let matched = false;

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.keywords.some((k) => lowerBody.includes(k))) {
      suggestedCategoryId = catRule.categoryId;
      activity = catRule.activity;
      matched = true;
      break;
    }
  }

  if (!matched) {
    suggestedCategoryId = type === 'income' ? 'cat_salary' : 'cat_uncategorized';
    activity = 'operating';
  }

  const normSender = normalizeSenderHandle(sender);
  const composite = generateCompositeDeduplicationKey(normSender, amount, Date.now());

  return {
    isBankSms: true,
    amount,
    type,
    activity,
    suggestedCategoryId,
    rawBody: body.trim(),
    normSender,
    hash: composite.exactKey,
  };
}

console.log('🧪 RUNNING UNIFIED SMART MERGE ENGINE TEST SUITE...\n');

// TEST 1: Predictive & Authorization Alerts (MUST BE IGNORED)
console.log('--- TEST 1: INTENT FILTERING (PREDICTIVE & AUTH ALERTS) ---');
const predictiveAlerts = [
  { sender: 'HDFCBK', text: 'Dear Customer, your A/c XX4521 will be debited for Rs 1,485.00 on 20-Oct-26.' },
  { sender: 'SBIINB', text: 'Your auto debit is scheduled for Rs 4,500.00 on 25-Oct-26 for Car Loan EMI.' },
  { sender: 'ICICIB', text: 'OTP for your ICICI transaction of INR 2,999.00 is 492819. Do not share.' },
  { sender: 'AXISBK', text: 'User aditya@upi requested to pay Rs 850.00. Approve in your UPI app.' },
  { sender: 'HDFCBK', text: 'Your e-mandate for Netflix of Rs 649.00 has been registered.' },
  { sender: 'KOTAKB', text: 'Credit card bill due on 22-Oct-26: Total amount due Rs 14,200.00.' },
  { sender: 'SBI', text: 'Congratulations! You are pre-approved for personal loan of Rs 5,00,000. Apply now.' },
];

for (const alert of predictiveAlerts) {
  const result = parseBankingSms(alert.sender, alert.text);
  assert.strictEqual(result, null, `Expected alert to be filtered out: "${alert.text}"`);
  console.log(`  ✅ Correctly IGNORED non-definitive alert: "${alert.text.slice(0, 50)}..."`);
}

// TEST 2: Definitive Financial Actions (MUST BE PROCESSED)
console.log('\n--- TEST 2: DEFINITIVE FINANCIAL ACTIONS (CROSS-PLATFORM PARSING) ---');
const definitiveAlerts = [
  {
    sender: 'VM-HDFCBK',
    text: 'Dear Customer, your A/c XX4521 is debited for Rs 1,485.00 on 15-Oct-26 at SWIGGY BANGALORE via UPI/cred@axis. Avl Bal: Rs 41,200.00 - HDFC Bank',
    expectedAmount: 1485.0,
    expectedType: 'expense',
    expectedCategory: 'cat_dining',
    expectedActivity: 'operating',
  },
  {
    sender: 'PhonePe',
    text: 'Paid ₹480 to Swiggy on PhonePe. Debited from HDFC Bank A/c XX4521. UTR: 42918471923.',
    expectedAmount: 480.0,
    expectedType: 'expense',
    expectedCategory: 'cat_dining',
    expectedActivity: 'operating',
  },
  {
    sender: 'Google Pay',
    text: 'You paid ₹1,200.00 to Apollo Pharmacy using Google Pay. Debited from SBI A/c XX9812.',
    expectedAmount: 1200.0,
    expectedType: 'expense',
    expectedCategory: 'cat_healthcare',
    expectedActivity: 'operating',
  },
  {
    sender: 'AD-SBIINB',
    text: 'Your A/C ending 9812 has been CREDITED with INR 75,000.00 on 15-OCT-26 by Monthly Salary Transfer. Avl Bal INR 1,24,000.00 - State Bank of India',
    expectedAmount: 75000.0,
    expectedType: 'income',
    expectedCategory: 'cat_salary',
    expectedActivity: 'operating',
  },
  {
    sender: 'AX-AXISBK',
    text: 'Axis Bank Card XX8812 spent for INR 850.00 at STARBUCKS via CRED on 15-Oct-26. Available limit: Rs 1,40,000.',
    expectedAmount: 850.0,
    expectedType: 'expense',
    expectedCategory: 'cat_dining',
    expectedActivity: 'operating',
  },
  {
    sender: 'HDFC MobileBanking',
    text: 'Rs 5,000.00 withdrawn from ATM at INDIRANAGAR from A/c XX4521 on 15-Oct-26. Avl Bal: Rs 36,200.',
    expectedAmount: 5000.0,
    expectedType: 'expense',
    expectedCategory: 'cat_uncategorized', // Low confidence ATM withdrawal -> Uncategorized bucket!
    expectedActivity: 'operating',
  },
];

for (const alert of definitiveAlerts) {
  const result = parseBankingSms(alert.sender, alert.text);
  assert.ok(result !== null, `Failed to parse: ${alert.text}`);
  assert.strictEqual(result.amount, alert.expectedAmount, 'Amount mismatch');
  assert.strictEqual(result.type, alert.expectedType, 'Type mismatch');
  assert.strictEqual(result.suggestedCategoryId, alert.expectedCategory, 'Category mismatch');
  assert.strictEqual(result.activity, alert.expectedActivity, 'Activity mismatch');
  assert.strictEqual(result.rawBody, alert.text.trim(), 'Raw body string must be preserved');
  console.log(`  ✅ Correctly parsed: ₹${result.amount} [${result.type.toUpperCase()}] -> ${result.suggestedCategoryId} (${result.activity})`);
}

// TEST 3: Universal Deduplication (5-Second Composite Key)
console.log('\n--- TEST 3: UNIVERSAL 5-SECOND COMPOSITE KEY DEDUPLICATION ---');
const baseTime = 1729680000000; // t0 ms

const existingList = [
  {
    sender: 'VM-HDFCBK',
    amount: 1485.0,
    timestamp: baseTime,
  },
];

// Message arriving from Google Messages 2.5 seconds later with same sender handle & amount:
const incomingDupGoogle = {
  sender: 'Google Messages • HDFCBK',
  amount: 1485.0,
  timestamp: baseTime + 2500, // +2.5s (within 5-second window)
};
const isDupe1 = isDuplicateTransaction(incomingDupGoogle, existingList, 5000);
assert.strictEqual(isDupe1, true, 'Google Messages duplicate alert within 2.5s must be detected as duplicate');
console.log('  ✅ Successfully detected cross-app duplicate from Google Messages within 2.5s');

// Message arriving from Truecaller 4.9 seconds later:
const incomingDupTruecaller = {
  sender: 'Truecaller • HDFCBK',
  amount: 1485.0,
  timestamp: baseTime + 4900, // +4.9s (within 5-second window)
};
const isDupe2 = isDuplicateTransaction(incomingDupTruecaller, existingList, 5000);
assert.strictEqual(isDupe2, true, 'Truecaller duplicate alert within 4.9s must be detected as duplicate');
console.log('  ✅ Successfully detected cross-app duplicate from Truecaller within 4.9s');

// Distinct message arriving 20 seconds later (different transaction):
const distinctLaterTx = {
  sender: 'VM-HDFCBK',
  amount: 1485.0,
  timestamp: baseTime + 20000, // +20s (outside 5-second window)
};
const isDupe3 = isDuplicateTransaction(distinctLaterTx, existingList, 5000);
assert.strictEqual(isDupe3, false, 'Transaction 20 seconds later must be treated as distinct');
console.log('  ✅ Distinct transaction after 20s correctly allowed');

// Distinct message with different amount within same second:
const distinctDiffAmount = {
  sender: 'VM-HDFCBK',
  amount: 1486.0,
  timestamp: baseTime + 500,
};
const isDupe4 = isDuplicateTransaction(distinctDiffAmount, existingList, 5000);
assert.strictEqual(isDupe4, false, 'Transaction with different amount must be treated as distinct');
console.log('  ✅ Distinct transaction with different amount correctly allowed');

console.log('\n🎉 ALL 18 VERIFICATION CHECKS PASSED WITH 100% ACCURACY!');
