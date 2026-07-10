import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BELET_ORIGINS } from '@/shared/lib/belet-origins';

const STORAGE_KEY = 'belet-session-cookies-v1';
const useWebKit = Platform.OS === 'ios';

type Cookie = {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  version?: string;
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
};

type Cookies = Record<string, Cookie>;

type CookieManagerModule = {
  get: (url: string, useWebKit?: boolean) => Promise<Cookies>;
  set: (url: string, cookie: Cookie, useWebKit?: boolean) => Promise<boolean>;
  clearByName: (url: string, name: string, useWebKit?: boolean) => Promise<boolean>;
  flush: () => Promise<void>;
};

function hasNativeCookieManager(): boolean {
  return Boolean(
    NativeModules.RNCookieManagerAndroid || NativeModules.RNCookieManagerIOS,
  );
}

function getCookieManager(): CookieManagerModule | null {
  if (!hasNativeCookieManager()) {
    return null;
  }

  try {
    // Native-only module — missing in Expo Go; available after `expo run:android/ios`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-cookies/cookies').default as CookieManagerModule;
  } catch {
    return null;
  }
}

export async function restoreBeletCookies(): Promise<void> {
  const CookieManager = getCookieManager();
  if (!CookieManager) return;

  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const stored = JSON.parse(raw) as Record<string, Cookies>;
    for (const [origin, cookies] of Object.entries(stored)) {
      for (const cookie of Object.values(cookies)) {
        await CookieManager.set(origin, cookie, useWebKit);
      }
    }
  } catch {
    // ignore corrupt storage
  }
}

export async function saveBeletCookies(): Promise<void> {
  const CookieManager = getCookieManager();
  if (!CookieManager) return;

  const byOrigin: Record<string, Cookies> = {};

  for (const origin of BELET_ORIGINS) {
    try {
      const cookies = await CookieManager.get(origin, useWebKit);
      if (Object.keys(cookies).length > 0) {
        byOrigin[origin] = cookies;
      }
    } catch {
      // ignore per-origin failures
    }
  }

  if (Object.keys(byOrigin).length === 0) {
    return;
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(byOrigin));
  } catch {
    // storage unavailable (e.g. mismatched native module)
  }
}

export async function clearBeletSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  const CookieManager = getCookieManager();
  if (!CookieManager) return;

  for (const origin of BELET_ORIGINS) {
    try {
      const cookies = await CookieManager.get(origin, useWebKit);
      for (const cookie of Object.values(cookies)) {
        if (Platform.OS === 'ios') {
          await CookieManager.clearByName(origin, cookie.name, useWebKit);
        } else {
          await CookieManager.set(
            origin,
            { ...cookie, value: '', expires: 'Thu, 01 Jan 1970 00:00:00 GMT' },
            useWebKit,
          );
        }
      }
    } catch {
      // ignore
    }
  }

  if (Platform.OS === 'android') {
    await CookieManager.flush();
  }
}

export type { Cookie, Cookies };
