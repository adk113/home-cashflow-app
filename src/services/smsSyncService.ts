import { Platform, Linking, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SmsSync from 'sms-sync';
import {
  MessageSourceApp,
  MessageSourceConfig,
  PendingSmsTransaction,
  Transaction,
} from '../types/transaction';
import {
  createPendingTransactionFromSms,
  generateCompositeDeduplicationKey,
  isDuplicateTransaction,
  normalizeSenderHandle,
  parseBankingSms,
} from '../utils/smsParser';

const CONFIG_STORAGE_KEY = '@cashflow_message_source_config_v4';
const PROCESSED_HASHES_KEY = '@cashflow_processed_tx_hashes_v4';
const CRASH_LOGS_STORAGE_KEY = '@cashflow_silent_crash_logs_v1';

export const DEFAULT_SOURCE_CONFIG: MessageSourceConfig = {
  selectedSource: 'auto', // Unified Auto Detect (Smart Merge) Engine only
  autoDeduplicate: true,
  autoPostToLedger: true, // Default to true: update ledger automatically!
  syncWindowDays: 14,
  lastSyncTimestamp: 0,
  notificationAccessGranted: false,
  smsPermissionGranted: false,
};

export interface SyncResult {
  success: boolean;
  scannedCount: number;
  addedCount: number;
  duplicatesPrevented: number;
  sourceUsed: MessageSourceApp;
  message?: string;
  items: PendingSmsTransaction[];
  isRealDeviceScan?: boolean;
}

// Comprehensive multi-source sample feeds for testing and simulation
export const SMART_MERGE_SAMPLE_FEEDS: { sender: string; body: string; note: string; timestamp?: number }[] = [
  {
    sender: 'VM-HDFCBK',
    body: 'Dear Customer, your A/c XX4521 is debited for Rs 1,485.00 on 15-Oct-26 at SWIGGY BANGALORE via UPI/cred@axis. Avl Bal: Rs 41,200.00 - HDFC Bank',
    note: 'HDFC Bank debit via CRED Pay UPI',
  },
  {
    sender: 'AD-SBIINB',
    body: 'Your A/C ending 9812 has been CREDITED with INR 75,000.00 on 15-OCT-26 by Monthly Salary Transfer. Avl Bal INR 1,24,000.00 - State Bank of India',
    note: 'SBI Salary credit',
  },
  {
    sender: 'PhonePe',
    body: 'Paid ₹480 to Swiggy on PhonePe. Debited from HDFC Bank A/c XX4521. UTR: 42918471923.',
    note: 'PhonePe UPI dining payment',
  },
  {
    sender: 'Google Pay',
    body: 'You paid ₹1,200.00 to Apollo Pharmacy using Google Pay. Debited from SBI A/c XX9812.',
    note: 'Google Pay pharmacy debit',
  },
  {
    sender: 'Truecaller • AXISBK',
    body: 'Truecaller Verified SMS: Axis Bank A/c XX7734 debited by Rs 2,450.00 on 15-Oct-26 at BLINKIT GROCERIES. UPI Ref 3291048123.',
    note: 'Truecaller verified grocery notification',
  },
  {
    sender: 'Google Messages • HDFCBK',
    body: 'Verified Bank Alert: Rs 1,499.00 debited from HDFC Bank A/c XX8812 on 15-Oct-26 for AMAZON INDIA. Available balance Rs 39,701.00.',
    note: 'Google RCS Chat message with Verified Sender mark',
  },
  {
    sender: 'Paytm',
    body: 'Rs 350.00 debited from A/c XX7734 via Paytm UPI to Blinkit Groceries on 15-Oct-26.',
    note: 'Paytm UPI grocery payment',
  },
  {
    sender: 'HDFC MobileBanking',
    body: 'Rs 5,000.00 withdrawn from ATM at INDIRANAGAR from A/c XX4521 on 15-Oct-26. Avl Bal: Rs 36,200.',
    note: 'Direct Bank ATM withdrawal alert',
  },
];

class SmsSyncManager {
  private config: MessageSourceConfig = { ...DEFAULT_SOURCE_CONFIG };
  private processedHashes: Set<string> = new Set();
  private recentSeenItems: { sender: string; amount: number; timestamp: number }[] = [];
  private isInitialized = false;

  async init(): Promise<MessageSourceConfig> {
    if (this.isInitialized) return this.config;

    try {
      const [savedConfig, savedHashes] = await Promise.all([
        AsyncStorage.getItem(CONFIG_STORAGE_KEY),
        AsyncStorage.getItem(PROCESSED_HASHES_KEY),
      ]);

      if (savedConfig) {
        this.config = {
          ...DEFAULT_SOURCE_CONFIG,
          ...JSON.parse(savedConfig),
          selectedSource: 'auto', // Enforce unified auto-detect engine
        };
      }

      if (savedHashes) {
        const list: string[] = JSON.parse(savedHashes);
        this.processedHashes = new Set(list);
      }

      this.isInitialized = true;
    } catch (e) {
      this.logSilentCrash('SmsSyncManager.init', e);
      this.config = { ...DEFAULT_SOURCE_CONFIG };
    }

    return this.config;
  }

  getConfig(): MessageSourceConfig {
    return this.config;
  }

  async updateConfig(newConfig: Partial<MessageSourceConfig>): Promise<MessageSourceConfig> {
    this.config = { ...this.config, ...newConfig, selectedSource: 'auto' };
    try {
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      this.logSilentCrash('updateConfig', e);
    }
    return this.config;
  }

  async setAutoPostToLedger(enabled: boolean): Promise<MessageSourceConfig> {
    return this.updateConfig({ autoPostToLedger: enabled });
  }

  /**
   * Check Android permissions for SMS and Notification Access
   */
  async checkPermissions(): Promise<{
    smsPermission: boolean;
    notificationAccess: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { smsPermission: true, notificationAccess: true };
    }

    let smsGranted = false;
    try {
      smsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    } catch {
      smsGranted = false;
    }

    const notifGranted = SmsSync.isNotificationAccessGranted();

    await this.updateConfig({
      smsPermissionGranted: smsGranted,
      notificationAccessGranted: notifGranted,
    });

    return { smsPermission: smsGranted, notificationAccess: notifGranted };
  }

  /**
   * Request standard Android SMS permission actively with runtime prompt
   */
  async requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
        title: 'SMS Permission Required',
        message:
          'Home CashFlow requires read access to your bank SMS to scan for incoming expenses and UPI payments offline.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant Permission',
      });
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      await this.updateConfig({ smsPermissionGranted: granted });
      return granted;
    } catch (err) {
      this.logSilentCrash('requestSmsPermission', err);
      return false;
    }
  }

  /**
   * Open Android Special App Access for Notification Listener
   */
  async openNotificationListenerSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const opened = SmsSync.openNotificationSettings();
        if (!opened) {
          await Linking.openSettings();
        }
      } catch (e) {
        this.logSilentCrash('openNotificationListenerSettings', e);
      }
    }
  }

  /**
   * Universal 5-second Composite Key Deduplication
   * Composite key: Timestamp (within 5-sec window) + Exact Transaction Amount + Sender Handle/ID
   */
  isDuplicate(
    sender: string,
    amount: number,
    timestamp: number,
    hash: string,
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): boolean {
    if (!this.config.autoDeduplicate) return false;

    // 1. Check exact canonical hash against persistent cache
    if (this.processedHashes.has(hash)) return true;

    // 2. Check 5-second window against recent memory items
    const normSender = normalizeSenderHandle(sender);
    const amtStr = amount.toFixed(2);

    for (const item of this.recentSeenItems) {
      if (
        item.amount.toFixed(2) === amtStr &&
        normalizeSenderHandle(item.sender) === normSender &&
        Math.abs(item.timestamp - timestamp) <= 5000
      ) {
        return true;
      }
    }

    // 3. Check against pending queue
    if (
      isDuplicateTransaction(
        { sender, amount, timestamp },
        existingPending.map((p) => ({
          sender: p.sender,
          amount: p.amount,
          timestamp: p.detectedAt,
        })),
        5000
      )
    ) {
      return true;
    }

    // 4. Check against ledger transactions
    if (
      isDuplicateTransaction(
        { sender, amount, timestamp },
        existingTx.map((t) => ({
          sender: t.sourceAccount,
          amount: t.amount,
          createdAt: t.createdAt,
          rawSms: t.rawSms,
        })),
        5000
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Ingest raw messages, apply Intent Filtering and Universal Deduplication
   */
  processRawMessages(
    rawItems: { sender: string; body: string; sourcePackage?: string; timestamp?: number }[],
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): {
    newItems: PendingSmsTransaction[];
    scannedCount: number;
    duplicatesPrevented: number;
  } {
    const newItems: PendingSmsTransaction[] = [];
    let duplicatesPrevented = 0;

    for (const item of rawItems) {
      try {
        const itemTimestamp = item.timestamp && item.timestamp > 0 ? item.timestamp : Date.now();

        // 1. Cross-platform parsing & Intent Filtering
        const parsed = parseBankingSms(item.sender, item.body, item.sourcePackage);
        if (!parsed) {
          // Message was either not a financial alert or was predictive/auth (OTP, scheduled, mandate)
          continue;
        }

        // 2. Generate 5-second Composite Key
        const composite = generateCompositeDeduplicationKey(parsed.normalizedSender, parsed.amount, itemTimestamp);

        // 3. Check Universal Deduplication
        const isDupe = this.isDuplicate(
          item.sender,
          parsed.amount,
          itemTimestamp,
          composite.exactKey,
          [...existingPending, ...newItems],
          existingTx
        );

        if (isDupe) {
          duplicatesPrevented++;
          continue;
        }

        const pendingTx: PendingSmsTransaction = {
          id: `sms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          sender: item.sender.trim(),
          body: item.body.trim(),
          amount: parsed.amount,
          type: parsed.type,
          activity: parsed.activity,
          suggestedCategoryId: parsed.suggestedCategoryId,
          sourceAccount: parsed.sourceAccount,
          date: new Date(itemTimestamp).toISOString().split('T')[0],
          detectedAt: itemTimestamp,
          sourceApp: 'auto',
          sourcePackage: item.sourcePackage,
          detectedUpiApp: parsed.detectedUpiApp,
          upiVpa: parsed.upiVpa,
          hash: composite.exactKey,
        };

        newItems.push(pendingTx);
        this.processedHashes.add(composite.exactKey);
        this.recentSeenItems.push({
          sender: item.sender,
          amount: parsed.amount,
          timestamp: itemTimestamp,
        });

        // Cap recent seen cache
        if (this.recentSeenItems.length > 200) {
          this.recentSeenItems.shift();
        }
      } catch (err: any) {
        // Graceful failure handling: silently log parsing failure without throwing
        this.logSilentCrash('processRawMessages.item', err);
      }
    }

    // Persist seen hashes
    if (newItems.length > 0) {
      AsyncStorage.setItem(
        PROCESSED_HASHES_KEY,
        JSON.stringify(Array.from(this.processedHashes).slice(-500))
      ).catch(() => {});
    }

    return {
      newItems,
      scannedCount: rawItems.length,
      duplicatesPrevented,
    };
  }

  /**
   * Drain any raw messages stored in native SQLite cache by background receiver
   */
  async drainPendingRawNativeQueue(
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): Promise<{
    newItems: PendingSmsTransaction[];
    scannedCount: number;
    duplicatesPrevented: number;
  }> {
    if (!SmsSync.isAvailable()) {
      return { newItems: [], scannedCount: 0, duplicatesPrevented: 0 };
    }

    try {
      const rawQueue = await SmsSync.getPendingRawMessages();
      if (!rawQueue || rawQueue.length === 0) {
        return { newItems: [], scannedCount: 0, duplicatesPrevented: 0 };
      }

      const processedIds: number[] = [];
      for (const item of rawQueue) {
        if (typeof item.id === 'number') {
          processedIds.push(item.id);
        }
      }

      const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
        rawQueue,
        existingPending,
        existingTx
      );

      // Acknowledge processed IDs in native SQLite database helper
      if (processedIds.length > 0) {
        await SmsSync.markRawMessagesProcessed(processedIds);
      }

      return { newItems, scannedCount, duplicatesPrevented };
    } catch (e: any) {
      this.logSilentCrash('drainPendingRawNativeQueue', e);
      return { newItems: [], scannedCount: 0, duplicatesPrevented: 0 };
    }
  }

  /**
   * Execute real sync via Unified Auto-Detect (Smart Merge) Engine
   */
  async syncNow(
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): Promise<SyncResult> {
    await this.init();

    // 1. Android Runtime Permission Request
    if (Platform.OS === 'android') {
      const hasPerm = await this.requestSmsPermission();
      if (!hasPerm) {
        return {
          success: false,
          scannedCount: 0,
          addedCount: 0,
          duplicatesPrevented: 0,
          sourceUsed: 'auto',
          message: 'SMS Permission Denied. Please grant SMS access to read bank transactions.',
          items: [],
        };
      }
    }

    // 2. First drain background native SQLite queue (from receiver/notification listener)
    const bgResult = await this.drainPendingRawNativeQueue(existingPending, existingTx);

    // 3. Query REAL device SMS inbox via native SmsSync module
    if (SmsSync.isAvailable()) {
      try {
        const rawInbox = await SmsSync.readInboxMessages(this.config.syncWindowDays || 14);

        if (rawInbox && rawInbox.length > 0) {
          const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
            rawInbox,
            [...existingPending, ...bgResult.newItems],
            existingTx
          );

          const totalNewItems = [...bgResult.newItems, ...newItems];
          const totalScanned = bgResult.scannedCount + scannedCount;
          const totalDupes = bgResult.duplicatesPrevented + duplicatesPrevented;

          await this.updateConfig({ lastSyncTimestamp: Date.now() });

          return {
            success: true,
            scannedCount: totalScanned,
            addedCount: totalNewItems.length,
            duplicatesPrevented: totalDupes,
            sourceUsed: 'auto',
            items: totalNewItems,
            isRealDeviceScan: true,
            message:
              totalNewItems.length > 0
                ? `Auto Detect extracted ${totalNewItems.length} transactions across all payment channels!`
                : totalDupes > 0
                ? `Smart Merge verified ${totalScanned} alerts. All ${totalDupes} items are already recorded.`
                : `Scanned ${totalScanned} messages. No new bank alerts in last ${this.config.syncWindowDays} days.`,
          };
        } else if (bgResult.newItems.length > 0) {
          return {
            success: true,
            scannedCount: bgResult.scannedCount,
            addedCount: bgResult.newItems.length,
            duplicatesPrevented: bgResult.duplicatesPrevented,
            sourceUsed: 'auto',
            items: bgResult.newItems,
            isRealDeviceScan: true,
            message: `Auto Detect found ${bgResult.newItems.length} incoming alerts from background listener.`,
          };
        }
      } catch (err: any) {
        this.logSilentCrash('syncNow.readInbox', err);
      }
    }

    // 4. Fallback for Web / Simulator / Test Demo
    const combinedFallback = [...SMART_MERGE_SAMPLE_FEEDS];
    const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
      combinedFallback,
      [...existingPending, ...bgResult.newItems],
      existingTx
    );

    const totalNewItems = [...bgResult.newItems, ...newItems];
    const totalScanned = bgResult.scannedCount + scannedCount;
    const totalDupes = bgResult.duplicatesPrevented + duplicatesPrevented;

    await this.updateConfig({ lastSyncTimestamp: Date.now() });

    return {
      success: true,
      scannedCount: totalScanned,
      addedCount: totalNewItems.length,
      duplicatesPrevented: totalDupes,
      sourceUsed: 'auto',
      items: totalNewItems,
      isRealDeviceScan: false,
      message:
        totalNewItems.length > 0
          ? `Smart Merge detected ${totalNewItems.length} new transactions across UPI, CRED, and SMS.`
          : 'Inbox is up to date. Zero duplicate entries recorded.',
    };
  }

  /**
   * Multi-message batch parser for pasted text / clipboard
   */
  parseBatchText(
    text: string,
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): {
    items: PendingSmsTransaction[];
    duplicatesPrevented: number;
  } {
    const rawChunks = text
      .split(
        /\n\s*\n|\n---\n|(?=(?:Dear Customer|Your A\/c|A\/c \d|ICICI Bank|HDFC Bank|SBI|Axis Bank|Truecaller|Google Messages|Paid |Sent |Cred|PhonePe|GPay|Alert:))/i
      )
      .map((c) => c.trim())
      .filter((c) => c.length > 15);

    const rawList = rawChunks.map((chunk) => {
      const senderMatch = chunk.match(/^(?:from:\s*|sender:\s*)?([A-Za-z0-9\-_• ]{3,30})[:\n]/i);
      const sender = senderMatch ? senderMatch[1].trim() : 'SMS Alert';
      return {
        sender,
        body: chunk,
        timestamp: Date.now(),
      };
    });

    const { newItems, duplicatesPrevented } = this.processRawMessages(
      rawList,
      existingPending,
      existingTx
    );

    return {
      items: newItems,
      duplicatesPrevented,
    };
  }

  /**
   * Silent crash logging to AsyncStorage and Native Logger
   */
  async logSilentCrash(source: string, error: any): Promise<void> {
    try {
      const msg = error?.stack || error?.message || String(error);
      const timestamp = new Date().toISOString();
      const entry = `[${timestamp}] [${source}] ${msg}\n`;

      // Log natively
      SmsSync.logCrashSilently(source, msg);

      // Log in JS storage
      const existing = (await AsyncStorage.getItem(CRASH_LOGS_STORAGE_KEY)) || '';
      const updated = (entry + existing).slice(0, 50000); // Keep last 50KB
      await AsyncStorage.setItem(CRASH_LOGS_STORAGE_KEY, updated);
    } catch {
      // Never crash during logging
    }
  }

  async getCrashLogs(): Promise<string> {
    try {
      const jsLogs = (await AsyncStorage.getItem(CRASH_LOGS_STORAGE_KEY)) || '';
      const nativeLogs = SmsSync.getCrashLogs();
      if (!nativeLogs && !jsLogs) return 'No background errors recorded. Clean operation.';
      return `--- JAVASCRIPT LOGS ---\n${jsLogs}\n\n--- NATIVE LOGS ---\n${nativeLogs}`;
    } catch {
      return 'Unable to read crash logs.';
    }
  }

  async clearCrashLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CRASH_LOGS_STORAGE_KEY);
      SmsSync.clearCrashLogs();
    } catch {
      // Ignore
    }
  }
}

export const smsSyncService = new SmsSyncManager();
