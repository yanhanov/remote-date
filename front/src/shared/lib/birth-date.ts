/** Normalize API datetime to `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ''
}
