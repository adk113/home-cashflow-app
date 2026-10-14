# Google Play Store Global Publishing Guide

This guide provides step-by-step instructions to build, sign, and release **Home CashFlow Tracker** to the Google Play Store for worldwide access.

---

## 🛠️ Phase 1: Build the Production Android App Bundle (`.aab`)

Google Play requires the modern **Android App Bundle (`.aab`)** format instead of legacy `.apk` files.

### Recommended Method: Free Cloud Build via Expo EAS (No heavy local SDKs needed)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Log into your Expo Account** (free to create at [expo.dev](https://expo.dev)):
   ```bash
   eas login
   ```

3. **Configure the Project with EAS**:
   ```bash
   cd /Users/adityakumar/AntiGravityIDE/home_cashflow_app
   eas project:init
   ```

4. **Trigger the Production AAB Build**:
   ```bash
   eas build --platform android --profile production
   ```
   - When prompted to generate an Android Keystore, select **Yes** (Expo will safely generate and store your production keystore in the cloud so you can never lose it).
   - Once the build completes (~5–10 minutes), EAS will output a direct download link to your signed `.aab` file!

---

## 🏬 Phase 2: Google Play Console Setup

1. **Create Developer Account**:
   - Go to [Google Play Console](https://play.google.com/console).
   - Sign in with your Google account and complete the one-time registration ($25 USD).

2. **Create New App**:
   - Click **Create app** in the top right.
   - **App name**: `Home CashFlow Tracker`
   - **Default language**: `English (United States)` (or your preferred default)
   - **App or game**: `App`
   - **Free or paid**: `Free`
   - Check the Declarations boxes and click **Create app**.

---

## 📝 Phase 3: Store Listing Copy (Ready to Copy-Paste)

### 1. App Details
- **Title (30 chars max)**:
  ```text
  Home CashFlow Tracker
  ```
- **Short Description (80 chars max)**:
  ```text
  Household cash flow statement, daily expense tracking & multi-currency ledger.
  ```
- **Full Description (4,000 chars max)**:
  ```text
  Take control of your household finances with corporate-grade accounting simplicity. 

  Home CashFlow Tracker bridges everyday expense logging with the standard Three-Tier Statement of Cash Flows:
  
  📊 THE THREE CASH FLOW PILLARS:
  • Operating Activities (CFO): Track primary income (salary, freelance) against daily consumables and essential living expenses (groceries, utilities, health, dining).
  • Investing Activities (CFI): Monitor capital allocated toward home improvements, remodeling, and deposits into emergency funds or investment accounts.
  • Financing Activities (CFF): Keep debt service under control, including mortgage repayments, auto loans, and credit card debt paydowns.

  ✨ KEY FEATURES:
  • Dynamic Net Balance Periods: Toggle seamlessly between Daily, Weekly, Monthly, and Annual views.
  • Multi-Currency Support: Switch dynamically between USD ($), INR (₹), EUR (€), GBP (£), JPY (¥), CAD (CA$), AUD (AU$), AED, and more.
  • Visual Spending Analytics: Clear comparative charts comparing cash inflows vs. outflows, plus category-wise percentage meters.
  • 100% Private & Offline: Stored strictly on your device using a high-performance local SQLite database. No tracking, no ads, and no external servers.
  ```

---

## 🎨 Phase 4: Graphics & Assets Checklist

In Google Play Console under **Store presence** → **Main store listing**:
- **App icon**: 512 x 512 px (PNG with alpha)
- **Feature graphic**: 1024 x 500 px (PNG or JPEG)
- **Phone screenshots**: At least 2 screenshots (minimum 1080 x 1920 recommended; take screenshots while running the app on web or a device).

---

## 🛡️ Phase 5: Policy & Data Safety Questionnaire

In the Console under **Policy and programs** → **App content**:
1. **Privacy Policy**:
   - Host `PRIVACY_POLICY.md` on GitHub Pages or a public URL (e.g., `https://raw.githubusercontent.com/adk113/home-cashflow-app/main/PRIVACY_POLICY.md`).
2. **Data Safety**:
   - Does your app collect or share user data? **No**.
   - Are all collected user data handled according to data security standards? **Yes** (all data remains locally sandboxed in SQLite on the user's phone).
3. **Ads**: Select **No, my app does not contain ads**.
4. **Target Audience**: Select **18 and over**.
5. **Financial Features**:
   - Declare as a **Personal Financial Management** tool with local data entry.

---

## 🚀 Phase 6: Release & Global Rollout

1. Go to **Release** → **Production** (or **Internal testing** first).
2. Click **Create new release**.
3. Upload the `.aab` file downloaded from your EAS build.
4. Name the release (e.g., `1.0.0 (1)`).
5. Add Release Notes:
   ```text
   Initial global release of Home CashFlow Tracker:
   - Operating, Investing, and Financing Cash Flow accounting
   - Multi-currency support (USD, INR, EUR, GBP, and more)
   - Daily, Weekly, Monthly, and Annual dashboard balance toggles
   - Local-first SQLite database
   ```
6. Click **Next** → **Review Release** → **Start rollout to Production**!
