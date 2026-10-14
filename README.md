# Home CashFlow: Household Expenses & Cash Flow Tracker

A modern personal finance and household accounting mobile app built with **React Native (Expo)**, **TypeScript**, and **SQLite**. It bridges daily consumer expense tracking with standard corporate **Statement of Cash Flows** accounting principles.

---

## 🌟 Key Features

1. **Expense & Income Entry**:
   - Record transactions with Amount, Category, Date, and optional Vendor Notes.
   - Dual-flow support: **Inflow (Income)** and **Outflow (Expense)**.
   - Automatic classification into proper accounting activities.

2. **Dashboard Balances & Dynamic Period Toggles**:
   - Instant calculation of Net Balances across 4 dynamic time frames:
     - **Daily**: Today's inflows, outflows, and net.
     - **Weekly**: Rolling 7-day view.
     - **Monthly**: Current calendar month.
     - **Annually**: Current calendar year.

3. **Household Cash Flow Statement (Corporate Standard)**:
   - **Operating Activities (CFO)**: Regular income (salary, freelance) minus non-discretionary & discretionary daily living expenses (groceries, utilities, fuel, medical).
   - **Investing Activities (CFI)**: Long-term asset allocations, home remodeling, renovations, and transfers to brokerage/emergency savings.
   - **Financing Activities (CFF)**: Debt servicing, mortgage principal & interest, auto loans, and accelerated credit card payoffs.
   - **Bottom-Line Reconciliation**:
     $$\text{Net Household Cash Flow} = \text{Net CFO} + \text{Net CFI} + \text{Net CFF}$$

4. **Visual Reports & Category Breakdown**:
   - Macro Inflows vs. Outflows comparative bar chart.
   - Household Outflow Distribution (Operating living vs. Investing growth vs. Financing debt).
   - Category progress bars displaying individual percentage share of total spending.

5. **Universal SQLite Persistence**:
   - Structured local SQL tables with indexes on `date` and `activity`.
   - Native SQLite via `expo-sqlite` on iOS/Android with cross-platform persistence on Web.
   - Pre-loaded with realistic household demo data.

---

## 🏛️ Database Structure (SQLite)

```sql
-- Categories lookup table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  activity TEXT CHECK(activity IN ('operating', 'investing', 'financing')) NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default INTEGER DEFAULT 1
);

-- Core transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
  activity TEXT CHECK(activity IN ('operating', 'investing', 'financing')) NOT NULL,
  category_id TEXT NOT NULL,
  date TEXT NOT NULL,          -- ISO 8601 'YYYY-MM-DD'
  notes TEXT,
  created_at INTEGER NOT NULL, -- Milliseconds timestamp
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

-- Aggregation and range performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(activity);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
```

### Pre-configured Category Taxonomy

| Activity | Flow Type | Categories |
| :--- | :--- | :--- |
| **Operating (CFO)** | Inflow (+) | Salary & Wages, Freelance & Side Gig, Rental Income |
| **Operating (CFO)** | Outflow (-) | Groceries & Food, Utilities, Dining, Transit & Fuel, Healthcare, Subscriptions |
| **Investing (CFI)** | Inflow (+) | Dividends & Capital Gains |
| **Investing (CFI)** | Outflow (-) | Home Renovations, Emergency Fund / Brokerage, Real Estate |
| **Financing (CFF)** | Inflow (+) | Loan Inflow / Refinance Proceeds |
| **Financing (CFF)** | Outflow (-) | Mortgage Payments, Car Loans, Credit Card Debt Paydowns |

---

## 📁 Project Directory Structure

```text
home_cashflow_app/
├── App.tsx                           # Main entry point with Navigation & State Provider
├── app.json                          # Expo configuration
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # Strict TypeScript configuration
├── scripts/
│   └── test_engine.js                # Accounting engine verification script
└── src/
    ├── types/
    │   └── transaction.ts            # Data models, DTOs, and Cash Flow interfaces
    ├── theme/
    │   └── colors.ts                 # Fintech dark theme color tokens
    ├── db/
    │   ├── schema.ts                 # SQLite DDL & default categories
    │   ├── storageAdapter.ts         # Universal mobile SQLite & cross-platform storage adapter
    │   ├── transactionDao.ts         # CRUD DAO and transaction queries
    │   └── seedData.ts               # Sample household transaction generator
    ├── utils/
    │   ├── accounting.ts             # Cash Flow Statement & aggregation mathematical engine
    │   ├── dateFilters.ts            # Period calculators (Daily, Weekly, Monthly, Annually)
    │   └── formatters.ts             # Currency, dates, and activity labels
    └── components/
        ├── PeriodSelector.tsx        # Toggle pill for Daily / Weekly / Monthly / Annually
        ├── NetBalanceHero.tsx        # Hero card showing Net Balance & Inflow/Outflow
        ├── CashFlowStatementView.tsx # Corporate standard Statement of Cash Flows
        ├── VisualReportsView.tsx     # Inflow/outflow bar chart & category meters
        ├── TransactionList.tsx       # Searchable & filterable ledger
        └── TransactionModal.tsx      # Add transaction modal with category picker
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
- **Web Browser (Instant Preview)**:
  ```bash
  npm run web
  ```
- **iOS Simulator / Device**:
  ```bash
  npm run ios
  ```
- **Android Emulator / Device**:
  ```bash
  npm run android
  ```

---

## 🔗 Linking to GitHub

To link this repository to your GitHub account:

1. Create a new empty repository on [GitHub](https://github.com/new) (e.g. `home-cashflow-app`).
2. Run the following commands in the `home_cashflow_app` directory:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```
