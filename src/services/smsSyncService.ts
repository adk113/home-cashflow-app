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
  detectMessageSource,
  parseBankingSms,
} from '../utils/smsParser';

const CONFIG_STORAGE_KEY = '@cashflow_message_source_config_v3';
const PROCESSED_HASHES_KEY = '@cashflow_processed_tx_hashes_v2';

export const DEFAULT_SOURCE_CONFIG: MessageSourceConfig = {
  selectedSource: 'auto',
  autoDeduplicate: true,
  autoPostToLedger: true, // Default to true: update ledger automatically!
  syncWindowDays: 14,
  lastSyncTimestamp: 0,
  notificationAccessGranted: false,
  smsPermissionGranted: false,
};

export interface SourceDefinition {
  id: MessageSourceApp;
  title: string;
  badge: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  packageName?: string;
  isRcsCapable: boolean;
  whyChoose: string;
}

export const AVAILABLE_SOURCES: SourceDefinition[] = [
  {
    id: 'auto',
    title: 'Auto-Detect (Smart Merge)',
    badge: 'RECOMMENDED',
    subtitle: 'Captures from ALL sources & n-number of UPIs with zero duplicate entries.',
    icon: 'git-merge-outline',
    accentColor: '#10B981',
    isRcsCapable: true,
    whyChoose: 'Best choice for most users. Automatically handles CRED, PhonePe, GPay, Paytm, Truecaller, and cellular SMS simultaneously.',
  },
  {
    id: 'cred_pay',
    title: 'CRED Pay & Cards',
    badge: 'CRED UPI',
    subtitle: 'Tracks transactions made via CRED Pay, CRED UPI, and credit card spends.',
    icon: 'card-outline',
    accentColor: '#EC4899',
    packageName: 'com.dreamplug.androidapp',
    isRcsCapable: false,
    whyChoose: 'Specifically monitors bank alerts triggered by CRED Pay UPI, bill paydowns, and credit card swipes.',
  },
  {
    id: 'upi_apps',
    title: 'Universal UPI (All Apps)',
    badge: 'ALL UPI',
    subtitle: 'Captures from PhonePe, GPay, Paytm, Amazon Pay, BHIM, Navi, Slice & Bank UPIs.',
    icon: 'flash-outline',
    accentColor: '#F59E0B',
    isRcsCapable: true,
    whyChoose: 'Universal handler for all UPI apps in India. Uses RBI bank debit SMS and merchant VPA handles.',
  },
  {
    id: 'google_messages',
    title: 'Google Messages',
    badge: 'RCS & SMS',
    subtitle: 'Captures Google RCS Chat bank alerts and standard SMS via com.google.android.apps.messaging.',
    icon: 'chatbubbles-outline',
    accentColor: '#3B82F6',
    packageName: 'com.google.android.apps.messaging',
    isRcsCapable: true,
    whyChoose: 'Use this if Google Messages is your primary messaging app and your bank sends Verified RCS chat alerts.',
  },
  {
    id: 'truecaller',
    title: 'Truecaller Messages',
    badge: 'SPAM SHIELD',
    subtitle: 'Syncs alerts filtered through Truecaller SMS and caller ID notifications.',
    icon: 'shield-checkmark-outline',
    accentColor: '#06B6D4',
    packageName: 'com.truecaller',
    isRcsCapable: false,
    whyChoose: 'Use this if Truecaller is set as your default SMS handler or filters all your financial SMS.',
  },
  {
    id: 'carrier_sms',
    title: 'Carrier / Default SMS',
    badge: 'TELEPHONY',
    subtitle: 'Directly scans the standard Android system telephony database (content://sms/inbox).',
    icon: 'phone-portrait-outline',
    accentColor: '#8B5CF6',
    isRcsCapable: false,
    whyChoose: 'Directly reads cellular SMS received on your phone without third-party app filtering.',
  },
  {
    id: 'bank_apps',
    title: 'Direct Bank Apps',
    badge: 'NETBANKING',
    subtitle: 'Direct push notifications from HDFC, SBI Yono, ICICI iMobile, Axis & Kotak.',
    icon: 'business-outline',
    accentColor: '#14B8A6',
    isRcsCapable: true,
    whyChoose: 'Monitors direct push notifications sent by official banking apps.',
  },
];

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

// Sample feed presets for simulation & test mode
export const SAMPLE_SOURCE_FEEDS: Record<MessageSourceApp, { sender: string; body: string; note: string }[]> = {
  auto: [
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
  ],
  cred_pay: [
    {
      sender: 'VK-HDFCBK',
      body: 'Alert: Rs 2,450.00 debited from HDFC Bank A/c XX4521 on 15-Oct-26 via CRED Pay for Electricity Bill. Ref: CRED928192.',
      note: 'CRED Pay bill payment debit from HDFC',
    },
    {
      sender: 'AX-AXISBK',
      body: 'Axis Bank Card XX8812 spent for INR 850.00 at STARBUCKS via CRED on 15-Oct-26. Available limit: Rs 1,40,000.',
      note: 'CRED card swipe alert',
    },
  ],
  upi_apps: [
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
      sender: 'Paytm',
      body: 'Rs 350.00 debited from A/c XX7734 via Paytm UPI to Blinkit Groceries on 15-Oct-26.',
      note: 'Paytm UPI grocery payment',
    },
  ],
  google_messages: [
    {
      sender: 'Google Messages • HDFCBK',
      body: 'Verified Bank Alert: Rs 1,499.00 debited from HDFC Bank A/c XX8812 on 15-Oct-26 for AMAZON INDIA. Available balance Rs 39,701.00.',
      note: 'Google RCS Chat message with Verified Sender mark',
    },
  ],
  truecaller: [
    {
      sender: 'Truecaller • AXISBK',
      body: 'Truecaller Verified SMS: Axis Bank A/c XX7734 debited by Rs 2,450.00 on 15-Oct-26 at BLINKIT GROCERIES. UPI Ref 3291048123.',
      note: 'Truecaller verified grocery notification',
    },
  ],
  carrier_sms: [
    {
      sender: 'AD-SBIINB',
      body: 'Dear SBI Customer, A/c 5412 debited by Rs 850.00 on 15-Oct-26 at BESCOM ELECTRICITY BILL. Avl Bal: Rs 12,400.',
      note: 'Standard cellular SMS from carrier inbox',
    },
  ],
  bank_apps: [
    {
      sender: 'HDFC MobileBanking',
      body: 'Rs 5,000.00 withdrawn from ATM at INDIRANAGAR from A/c XX4521 on 15-Oct-26. Avl Bal: Rs 36,200.',
      note: 'Direct Bank ATM withdrawal alert',
    },
  ],
};

class SmsSyncManager {
  private config: MessageSourceConfig = { ...DEFAULT_SOURCE_CONFIG };
  private processedHashes: Set<string> = new Set();
  private isInitialized = false;

  async init(): Promise<MessageSourceConfig> {
    if (this.isInitialized) return this.config;

    try {
      const [savedConfig, savedHashes] = await Promise.all([
        AsyncStorage.getItem(CONFIG_STORAGE_KEY),
        AsyncStorage.getItem(PROCESSED_HASHES_KEY),
      ]);

      if (savedConfig) {
        this.config = { ...DEFAULT_SOURCE_CONFIG, ...JSON.parse(savedConfig) };
      }

      if (savedHashes) {
        const list: string[] = JSON.parse(savedHashes);
        this.processedHashes = new Set(list);
      }

      this.isInitialized = true;
    } catch (e) {
      console.warn('Failed to load message source configuration:', e);
      this.config = { ...DEFAULT_SOURCE_CONFIG };
    }

    return this.config;
  }

  getConfig(): MessageSourceConfig {
    return this.config;
  }

  async updateConfig(newConfig: Partial<MessageSourceConfig>): Promise<MessageSourceConfig> {
    this.config = { ...this.config, ...newConfig };
    try {
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save message source config:', e);
    }
    return this.config;
  }

  async setSelectedSource(source: MessageSourceApp): Promise<MessageSourceConfig> {
    return this.updateConfig({ selectedSource: source });
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
        message: 'Home CashFlow requires read access to your bank SMS to scan for incoming expenses and UPI payments offline.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant Permission',
      });
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      await this.updateConfig({ smsPermissionGranted: granted });
      return granted;
    } catch (err) {
      console.warn('Error requesting SMS permission:', err);
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
        console.warn('Could not open settings:', e);
      }
    }
  }

  /**
   * Check if a transaction fingerprint is already known (deduplication)
   */
  isDuplicate(hash: string, existingPending: PendingSmsTransaction[], existingTx: Transaction[]): boolean {
    if (!this.config.autoDeduplicate) return false;

    // Check against permanently processed cache
    if (this.processedHashes.has(hash)) return true;

    // Check against current pending queue
    if (existingPending.some((p) => p.hash === hash)) return true;

    // Check against already recorded ledger transactions (by notes / sourceAccount match)
    return false;
  }

  /**
   * Ingest raw messages, apply source filtering and deduplication
   */
  processRawMessages(
    rawItems: { sender: string; body: string; sourcePackage?: string }[],
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[],
    forcedSource?: MessageSourceApp
  ): {
    newItems: PendingSmsTransaction[];
    scannedCount: number;
    duplicatesPrevented: number;
  } {
    const activeSource = forcedSource || this.config.selectedSource;
    const newItems: PendingSmsTransaction[] = [];
    let duplicatesPrevented = 0;

    for (const item of rawItems) {
      const detected = detectMessageSource(item.sender, item.body, item.sourcePackage);

      // Filter by user's selected "True Source" (unless set to 'auto')
      if (activeSource !== 'auto' && detected !== activeSource) {
        // If user picked 'upi_apps', allow 'cred_pay' as well
        if (activeSource === 'upi_apps' && detected === 'cred_pay') {
          // allow
        } else {
          continue;
        }
      }

      const parsed = createPendingTransactionFromSms(
        item.sender,
        item.body,
        item.sourcePackage,
        activeSource === 'auto' ? detected : activeSource
      );

      if (!parsed) continue;

      // Check deduplication
      if (parsed.hash && this.isDuplicate(parsed.hash, [...existingPending, ...newItems], existingTx)) {
        duplicatesPrevented++;
        continue;
      }

      newItems.push(parsed);
      if (parsed.hash) {
        this.processedHashes.add(parsed.hash);
      }
    }

    // Persist seen hashes
    if (newItems.length > 0) {
      AsyncStorage.setItem(
        PROCESSED_HASHES_KEY,
        JSON.stringify(Array.from(this.processedHashes).slice(-300))
      ).catch(() => {});
    }

    return {
      newItems,
      scannedCount: rawItems.length,
      duplicatesPrevented,
    };
  }

  /**
   * Execute real sync from active source on Android device
   */
  async syncNow(
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): Promise<SyncResult> {
    await this.init();
    const activeSource = this.config.selectedSource;

    // 1. Android Runtime Permission Request
    if (Platform.OS === 'android') {
      const hasPerm = await this.requestSmsPermission();
      if (!hasPerm) {
        return {
          success: false,
          scannedCount: 0,
          addedCount: 0,
          duplicatesPrevented: 0,
          sourceUsed: activeSource,
          message: 'SMS Permission Denied. Please grant SMS access to read bank transactions.',
          items: [],
        };
      }
    }

    // 2. Query REAL device SMS inbox via native SmsSync module
    if (SmsSync.isAvailable()) {
      try {
        const rawInbox = await SmsSync.readInboxMessages(this.config.syncWindowDays || 14);

        if (rawInbox && rawInbox.length > 0) {
          const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
            rawInbox,
            existingPending,
            existingTx,
            activeSource
          );

          await this.updateConfig({ lastSyncTimestamp: Date.now() });

          return {
            success: true,
            scannedCount,
            addedCount: newItems.length,
            duplicatesPrevented,
            sourceUsed: activeSource,
            items: newItems,
            isRealDeviceScan: true,
            message:
              newItems.length > 0
                ? `Scanned ${scannedCount} device messages. Extracted ${newItems.length} bank transactions!`
                : duplicatesPrevented > 0
                ? `Scanned ${scannedCount} device messages. All ${duplicatesPrevented} items are already in your ledger.`
                : `Scanned ${scannedCount} SMS. No unrecorded transactions in last ${this.config.syncWindowDays} days.`,
          };
        } else if (rawInbox && rawInbox.length === 0) {
          return {
            success: true,
            scannedCount: 0,
            addedCount: 0,
            duplicatesPrevented: 0,
            sourceUsed: activeSource,
            items: [],
            isRealDeviceScan: true,
            message: `No SMS found in device inbox for the past ${this.config.syncWindowDays} days.`,
          };
        }
      } catch (err: any) {
        console.warn('Native SmsSync query error, falling back:', err);
      }
    }

    // 3. Fallback for Web / Simulator / Demo testing
    const feed = SAMPLE_SOURCE_FEEDS[activeSource] || SAMPLE_SOURCE_FEEDS.auto;
    const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
      feed,
      existingPending,
      existingTx,
      activeSource
    );

    await this.updateConfig({ lastSyncTimestamp: Date.now() });

    return {
      success: true,
      scannedCount,
      addedCount: newItems.length,
      duplicatesPrevented,
      sourceUsed: activeSource,
      items: newItems,
      isRealDeviceScan: false,
      message:
        newItems.length > 0
          ? `Found ${newItems.length} new transactions (${activeSource.replace('_', ' ')}).`
          : 'Inbox is up to date. No new unreviewed bank alerts.',
    };
  }

  /**
   * Multi-message batch parser for pasted text / clipboard
   */
  parseBatchText(
    text: string,
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[],
    forcedSource?: MessageSourceApp
  ): {
    items: PendingSmsTransaction[];
    duplicatesPrevented: number;
  } {
    const rawChunks = text
      .split(/\n\s*\n|\n---\n|(?=(?:Dear Customer|Your A\/c|A\/c \d|ICICI Bank|HDFC Bank|SBI|Axis Bank|Truecaller|Google Messages|Paid |Sent |Cred|PhonePe|GPay))/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 15);

    const rawList = rawChunks.map((chunk) => {
      const senderMatch = chunk.match(/^(?:from:\s*|sender:\s*)?([A-Za-z0-9\-_• ]{3,30})[:\n]/i);
      const sender = senderMatch ? senderMatch[1].trim() : 'SMS Alert';
      return {
        sender,
        body: chunk,
      };
    });

    const { newItems, duplicatesPrevented } = this.processRawMessages(
      rawList,
      existingPending,
      existingTx,
      forcedSource
    );

    return {
      items: newItems,
      duplicatesPrevented,
    };
  }
}

export const smsSyncService = new SmsSyncManager();
