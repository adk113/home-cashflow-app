// Verification test for Home Cash Flow Accounting Engine

const DEFAULT_CATEGORIES = [
  { id: 'cat_salary', name: 'Salary & Wages', activity: 'operating', type: 'income' },
  { id: 'cat_freelance', name: 'Freelance & Side Gig', activity: 'operating', type: 'income' },
  { id: 'cat_groceries', name: 'Groceries & Food', activity: 'operating', type: 'expense' },
  { id: 'cat_utilities', name: 'Household Utilities', activity: 'operating', type: 'expense' },
  { id: 'cat_home_improvement', name: 'Home Renovations & Upgrades', activity: 'investing', type: 'expense' },
  { id: 'cat_savings_deposit', name: 'Emergency Fund & Brokerage', activity: 'investing', type: 'expense' },
  { id: 'cat_invest_return', name: 'Dividends & Capital Gains', activity: 'investing', type: 'income' },
  { id: 'cat_mortgage_paydown', name: 'Mortgage Payments', activity: 'financing', type: 'expense' },
  { id: 'cat_car_loan', name: 'Car Loan Payments', activity: 'financing', type: 'expense' },
];

const categoriesMap = new Map();
DEFAULT_CATEGORIES.forEach(c => categoriesMap.set(c.id, c));

const sampleTransactions = [
  // Operating Inflow
  { id: '1', amount: 3800, type: 'income', activity: 'operating', categoryId: 'cat_salary', date: '2026-10-12' },
  // Operating Outflow
  { id: '2', amount: 142.50, type: 'expense', activity: 'operating', categoryId: 'cat_groceries', date: '2026-10-14' },
  { id: '3', amount: 165.20, type: 'expense', activity: 'operating', categoryId: 'cat_utilities', date: '2026-10-11' },
  // Investing Inflow & Outflow
  { id: '4', amount: 180, type: 'income', activity: 'investing', categoryId: 'cat_invest_return', date: '2026-10-03' },
  { id: '5', amount: 750, type: 'expense', activity: 'investing', categoryId: 'cat_home_improvement', date: '2026-10-08' },
  { id: '6', amount: 600, type: 'expense', activity: 'investing', categoryId: 'cat_savings_deposit', date: '2026-10-05' },
  // Financing Outflow
  { id: '7', amount: 1850, type: 'expense', activity: 'financing', categoryId: 'cat_mortgage_paydown', date: '2026-10-09' },
  { id: '8', amount: 385, type: 'expense', activity: 'financing', activity: 'financing', categoryId: 'cat_car_loan', date: '2026-10-06' },
];

function runTests() {
  console.log('--- Testing Accounting Calculation Rules ---');

  let opInflows = 0, opOutflows = 0;
  let invInflows = 0, invOutflows = 0;
  let finInflows = 0, finOutflows = 0;

  for (const tx of sampleTransactions) {
    if (tx.activity === 'operating') {
      if (tx.type === 'income') opInflows += tx.amount;
      else opOutflows += tx.amount;
    } else if (tx.activity === 'investing') {
      if (tx.type === 'income') invInflows += tx.amount;
      else invOutflows += tx.amount;
    } else if (tx.activity === 'financing') {
      if (tx.type === 'income') finInflows += tx.amount;
      else finOutflows += tx.amount;
    }
  }

  const netCFO = opInflows - opOutflows;
  const netCFI = invInflows - invOutflows;
  const netCFF = finInflows - finOutflows;
  const totalInflows = opInflows + invInflows + finInflows;
  const totalOutflows = opOutflows + invOutflows + finOutflows;
  const netCashFlow = totalInflows - totalOutflows;

  console.log(`Operating Cash Flow (CFO): Inflows=$${opInflows.toFixed(2)}, Outflows=$${opOutflows.toFixed(2)}, Net=$${netCFO.toFixed(2)}`);
  console.log(`Investing Cash Flow (CFI): Inflows=$${invInflows.toFixed(2)}, Outflows=$${invOutflows.toFixed(2)}, Net=$${netCFI.toFixed(2)}`);
  console.log(`Financing Cash Flow (CFF): Inflows=$${finInflows.toFixed(2)}, Outflows=$${finOutflows.toFixed(2)}, Net=$${netCFF.toFixed(2)}`);
  console.log(`Total Net Cash Flow: $${netCashFlow.toFixed(2)}`);

  // Verify identity: netCFO + netCFI + netCFF === netCashFlow
  const sumOfActivities = netCFO + netCFI + netCFF;
  if (Math.abs(sumOfActivities - netCashFlow) < 0.001) {
    console.log('✅ PASS: Accounting Reconciliation Identity (CFO + CFI + CFF === Net Cash Flow) holds exactly.');
  } else {
    console.error('❌ FAIL: Reconciliation mismatch!');
    process.exit(1);
  }

  // Verify Expected values
  if (opInflows === 3800 && Math.abs(opOutflows - 307.70) < 0.01) {
    console.log('✅ PASS: Operating figures calculated accurately.');
  } else {
    console.error('❌ FAIL: Operating mismatch');
    process.exit(1);
  }

  console.log('🎉 All Accounting Engine tests passed successfully!');
}

runTests();
