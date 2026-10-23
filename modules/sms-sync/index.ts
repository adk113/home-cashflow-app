import { requireNativeModule } from 'expo-modules-core';

export interface RawInboxSms {
  id?: number;
  sender: string;
  body: string;
  timestamp: number;
  sourcePackage?: string;
  createdAt?: number;
}

let nativeModule: any = null;

try {
  nativeModule = requireNativeModule('SmsSyncModule');
} catch {
  nativeModule = null;
}

export function isAvailable(): boolean {
  if (!nativeModule) return false;
  try {
    return !!nativeModule.isAvailable();
  } catch {
    return false;
  }
}

export async function readInboxMessages(days: number = 14): Promise<RawInboxSms[]> {
  if (!nativeModule || !nativeModule.readInboxMessages) {
    return [];
  }
  try {
    return await nativeModule.readInboxMessages(days);
  } catch {
    return [];
  }
}

export async function getPendingRawMessages(): Promise<RawInboxSms[]> {
  if (!nativeModule || !nativeModule.getPendingRawMessages) {
    return [];
  }
  try {
    return await nativeModule.getPendingRawMessages();
  } catch {
    return [];
  }
}

export async function markRawMessagesProcessed(ids: number[]): Promise<boolean> {
  if (!nativeModule || !nativeModule.markRawMessagesProcessed || ids.length === 0) {
    return false;
  }
  try {
    return await nativeModule.markRawMessagesProcessed(ids);
  } catch {
    return false;
  }
}

export function isNotificationAccessGranted(): boolean {
  if (!nativeModule || !nativeModule.isNotificationAccessGranted) {
    return false;
  }
  try {
    return !!nativeModule.isNotificationAccessGranted();
  } catch {
    return false;
  }
}

export function openNotificationSettings(): boolean {
  if (!nativeModule || !nativeModule.openNotificationSettings) {
    return false;
  }
  try {
    return !!nativeModule.openNotificationSettings();
  } catch {
    return false;
  }
}

export function getCrashLogs(): string {
  if (!nativeModule || !nativeModule.getCrashLogs) {
    return '';
  }
  try {
    return nativeModule.getCrashLogs() || '';
  } catch {
    return '';
  }
}

export function clearCrashLogs(): boolean {
  if (!nativeModule || !nativeModule.clearCrashLogs) {
    return false;
  }
  try {
    return !!nativeModule.clearCrashLogs();
  } catch {
    return false;
  }
}

export function logCrashSilently(source: String, message: String): boolean {
  if (!nativeModule || !nativeModule.logCrash) {
    return false;
  }
  try {
    return !!nativeModule.logCrash(source, message);
  } catch {
    return false;
  }
}
