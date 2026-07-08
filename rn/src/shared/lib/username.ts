export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,29}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  return USERNAME_REGEX.test(normalizeUsername(raw));
}

export const USERNAME_HINT =
  'Username must be 3-30 characters, start with a letter, and use only letters, numbers, or underscores';
