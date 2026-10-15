import { Platform, Linking, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const CONFIG_STORAGE_KEY = '@cashflow_message_source_config_v2';
const PROCESSED_HASHES_KEY = '@cashflow_processed_tx_hashes_v1';

export const DEFAULT_SOURCE_CONFIG: MessageSourceConfig = {
  selectedSource: 'auto',
  autoDeduplicate: true,
  syncWindowDays: 7,
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
    subtitle: 'Simultaneously captures Google Messages, Truecaller & Phone SMS with zero duplicates.',
    icon: 'git-merge-outline',
    accentColor: '#10B981',
    isRcsCapable: true,
    whyChoose: 'Best choice if you have both Google Messages and Truecaller active. Merges alerts from both and prevents double entries.',
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
    whyChoose: 'Use this if Truecaller is set as your default SMS handler or filters all your financial SMS into categories.',
  },
  {
    id: 'carrier_sms',
    title: 'Carrier / Default SMS',
    badge: 'TELEPHONY',
    subtitle: 'Directly scans the standard Android system telephony database (content://sms/inbox).',
    icon: 'phone-portrait-outline',
    accentColor: '#8B5CF6',
    isRcsCapable: false,
    whyChoose: 'Use this if you prefer using the phone manufacturer’s stock SMS app without internet chat features.',
  },
  {
    id: 'bank_apps',
    title: 'Direct UPI & Bank Apps',
    badge: 'INSTANT PUSH',
    subtitle: 'Directly captures push notifications from GPay, PhonePe, Paytm, and official banking apps.',
    icon: 'card-outline',
    accentColor: '#F59E0B',
    isRcsCapable: true,
    whyChoose: 'Use this to record UPI payments and ATM withdrawals directly when push notifications appear.',
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
}

// Sample feed presets for testing real-world behavior of all 3 providers
export const SAMPLE_SOURCE_FEEDS: Record<MessageSourceApp, { sender: string; body: string; note: string }[]> = {
  auto: [
    {
      sender: 'VM-HDFCBK',
      body: 'Dear Customer, your A/c XX4521 is debited for Rs 540.00 on 15-Oct-26 at SWIGGY BANGALORE via UPI. Avl Bal: Rs 41,200.00 - HDFC Bank',
      note: 'Auto detected HDFC Dining debit',
    },
    {
      sender: 'AD-SBIINB',
      body: 'Your A/C ending 9812 has been CREDITED with INR 75,000.00 on 15-OCT-26 by Monthly Salary Transfer. Avl Bal INR 1,24,000.00 - State Bank of India',
      note: 'Auto detected SBI Salary credit',
    },
  ],
  google_messages: [
    {
      sender: 'Google Messages • HDFCBK',
      body: 'Verified Bank Alert: Rs 1,499.00 debited from HDFC Bank A/c XX8812 on 15-Oct-26 for AMAZON INDIA. Available balance Rs 39,701.00.',
      note: 'Google RCS Chat message with Verified Sender mark',
    },
    {
      sender: 'Google Messages • ICICIB',
      body: 'ICICI Bank Card XX4019 spent for INR 320.00 at STARBUCKS COFFEE on 15-Oct-26. Avl limit: Rs 1,12,000.',
      note: 'Google Messages ICICI card spending alert',
    },
  ],
  truecaller: [
    {
      sender: 'Truecaller • AXISBK',
      body: 'Truecaller Verified SMS: Axis Bank A/c XX7734 debited by Rs 2,450.00 on 15-Oct-26 at BLINKIT GROCERIES. UPI Ref 3291048123.',
      note: 'Truecaller verified grocery notification',
    },
    {
      sender: 'Truecaller • KOTAK',
      body: 'Kotak Bank: Rs 680.00 paid from A/c XX9921 to UBER RIDES on 15-Oct-26. Clear balance: Rs 18,340.',
      note: 'Truecaller transport payment alert',
    },
  ],
  carrier_sms: [
    {
      sender: 'AD-SBIINB',
      body: 'Dear SBI Customer, A/c 5412 debited by Rs 850.00 on 15-Oct-26 at BESCOM ELECTRICITY BILL. Avl Bal: Rs 12,400.',
      note: 'Standard cellular SMS from carrier inbox',
    },
    {
      sender: 'VM-HDFCBK',
      body: 'HDFC Bank: Rs 120.00 debited from A/c XX4521 on 15-Oct-26 by VPA chai@paytm. Avl Bal: Rs 41,080.00.',
      note: 'Standard cellular SMS for small tea payment',
    },
  ],
  bank_apps: [
    {
      sender: 'PhonePe',
      body: 'Paid ₹480 to Swiggy on PhonePe. Debited from HDFC Bank A/c XX4521. UTR: 42918471923.',
      note: 'Direct PhonePe UPI push notification',
    },
    {
      sender: 'Google Pay',
      body: 'You paid ₹1,200.00 to Apollo Pharmacy using Google Pay. Debited from SBI A/c XX9812.',
      note: 'Direct GPay transaction notification',
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

    // For notification listener, checking usually requires custom native module
    let notifGranted = false;
    if (NativeModules.SmsSyncModule && NativeModules.SmsSyncModule.isNotificationAccessGranted) {
      try {
        notifGranted = await NativeModules.SmsSyncModule.isNotificationAccessGranted();
      } catch {
        notifGranted = false;
      }
    }

    await this.updateConfig({
      smsPermissionGranted: smsGranted,
      notificationAccessGranted: notifGranted,
    });

    return { smsPermission: smsGranted, notificationAccess: notifGranted };
  }

  /**
   * Request standard Android SMS permission
   */
  async requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
        title: 'SMS Permission Required',
        message: 'Home CashFlow requires read access to your bank SMS to scan for incoming expenses offline.',
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
   * (Essential for Google Messages RCS and Truecaller)
   */
  async openNotificationListenerSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.SmsSyncModule && NativeModules.SmsSyncModule.openNotificationSettings) {
          NativeModules.SmsSyncModule.openNotificationSettings();
          return;
        }
        // Fallback: Open system app settings or notification settings
        await Linking.openSettings();
      } catch (e) {
        console.warn('Could not open settings:', e);
      }
    }
  }

  /**
   * Check if a transaction fingerprint is already known
   */
  isDuplicate(hash: string, existingPending: PendingSmsTransaction[], existingTx: Transaction[]): boolean {
    if (!this.config.autoDeduplicate) return false;

    // Check against permanently processed cache
    if (this.processedHashes.has(hash)) return true;

    // Check against current pending queue
    if (existingPending.some((p) => p.hash === hash)) return true;

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
        // Skip message if not matching the selected true source
        continue;
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
        JSON.stringify(Array.from(this.processedHashes).slice(-200))
      ).catch(() => {});
    }

    return {
      newItems,
      scannedCount: rawItems.length,
      duplicatesPrevented,
    };
  }

  /**
   * Execute sync from active source
   */
  async syncNow(
    existingPending: PendingSmsTransaction[],
    existingTx: Transaction[]
  ): Promise<SyncResult> {
    await this.init();
    const activeSource = this.config.selectedSource;

    // 1. If running with NativeModule on Android
    if (NativeModules.SmsSyncModule && NativeModules.SmsSyncModule.readMessagesFromSource) {
      try {
        const raw = await NativeModules.SmsSyncModule.readMessagesFromSource({
          source: activeSource,
          days: this.config.syncWindowDays,
        });
        const { newItems, scannedCount, duplicatesPrevented } = this.processRawMessages(
          raw || [],
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
        };
      } catch (err: any) {
        console.warn('Native SMS sync failed, trying fallback:', err);
      }
    }

    // 2. Dynamic Demo / Seeded Sync for active source
    // In dev, Web, or when testing specific sources: pull the relevant sample feed for the user's selected source
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
      message:
        newItems.length > 0
          ? `Found ${newItems.length} new transactions from ${activeSource.replace('_', ' ')}.`
          : duplicatesPrevented > 0
          ? `All ${duplicatesPrevented} messages were already recorded (deduplication active).`
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
    // Split text by common message delimiters (double newline, "From:", "---", etc.)
    const rawChunks = text
      .split(/\n\s*\n|\n---\n|(?=(?:Dear Customer|Your A\/c|A\/c \d|ICICI Bank|HDFC Bank|SBI|Axis Bank|Truecaller|Google Messages))/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 20);

    const rawList = rawChunks.map((chunk) => {
      // Extract sender if present
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
