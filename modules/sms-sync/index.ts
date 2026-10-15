import { requireNativeModule } from 'expo-modules-core';

export interface RawInboxSms {
  sender: string;
  body: string;
  timestamp: number;
  sourcePackage?: string;
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

export async function readInboxMessages(days: number = 7): Promise<RawInboxSms[]> {
  if (!nativeModule || !nativeModule.readInboxMessages) {
    return [];
  }
  return await nativeModule.readInboxMessages(days);
}

export function isNotificationAccessGranted(): boolean {
  if (!nativeModule || !nativeModule.isNotificationAccessGranted) {
    return false;
  }
  return !!nativeModule.isNotificationAccessGranted();
}

export function openNotificationSettings(): boolean {
  if (!nativeModule || !nativeModule.openNotificationSettings) {
    return false;
  }
  return !!nativeModule.openNotificationSettings();
}
