const BELET_URL_PATTERN = /^https?:\/\/([\w-]+\.)*belet\.(tm|com\.tm)(\/|$)/i;

export const BELET_HOME_URL = 'https://belet.tm/en';

export function isBeletUrl(url: string): boolean {
  try {
    return BELET_URL_PATTERN.test(new URL(url.trim()).href);
  } catch {
    return false;
  }
}

export function normalizeBeletUrl(url: string): string {
  return new URL(url.trim()).href;
}
