export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
}

export function isValidBirthDate(value?: string | null): boolean {
  const dateStr = toDateInputValue(value);
  if (!dateStr) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date.getTime() <= today.getTime();
}

export function computeAge(birthDate?: string | null): number | null {
  if (!isValidBirthDate(birthDate)) return null;
  const dateStr = toDateInputValue(birthDate);

  const [year, month, day] = dateStr.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 && age < 150 ? age : null;
}

export function formatBirthDate(value?: string | null): string | null {
  if (!isValidBirthDate(value)) return null;
  const dateStr = toDateInputValue(value);

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
