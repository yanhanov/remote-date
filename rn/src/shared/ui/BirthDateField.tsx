import { createElement, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { CalendarBlank, X } from 'phosphor-react-native';
import {
  computeAge,
  isValidBirthDate,
  toDateInputValue,
} from '@/shared/lib/birth-date';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors } from '@/shared/theme/colors';

const MIN_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

interface BirthDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BirthDateField({ value, onChange, disabled }: BirthDateFieldProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseValue(value));

  const age = computeAge(value);
  const hasText = value.length > 0;
  const incomplete = hasText && value.length < 10;
  const invalid = hasText && value.length >= 10 && !isValidBirthDate(value);

  function openPicker() {
    if (disabled) return;
    setDraft(parseValue(value));
    setOpen(true);
  }

  function commit(date: Date) {
    onChange(toIsoDate(date));
    setOpen(false);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  function onTextChange(text: string) {
    onChange(maskDateInput(text));
  }

  function onNativeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(toIsoDate(date));
      return;
    }
    if (date) setDraft(date);
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          disabled && styles.fieldDisabled,
          (invalid || incomplete) && styles.fieldWarn,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onTextChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={10}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
          accessibilityLabel="Birth date"
        />

        {hasText ? (
          <Pressable
            onPress={clear}
            hitSlop={8}
            disabled={disabled}
            accessibilityLabel="Clear birth date"
            style={styles.iconBtn}
          >
            <X size={14} color={colors.muted} weight="bold" />
          </Pressable>
        ) : null}

        <Pressable
          onPress={openPicker}
          disabled={disabled}
          hitSlop={6}
          accessibilityLabel="Open calendar"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <CalendarBlank size={18} color={colors.primary} weight="duotone" />
        </Pressable>
      </View>

      {age != null ? (
        <Text style={styles.hint}>{age} years old</Text>
      ) : incomplete ? (
        <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
      ) : invalid ? (
        <Text style={styles.hintError}>Enter a valid date</Text>
      ) : (
        <Text style={styles.hint}>Type a date or pick from calendar</Text>
      )}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={MIN_DATE}
          onChange={onNativeChange}
        />
      ) : null}

      {(Platform.OS === 'ios' || Platform.OS === 'web') && (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
            <View style={[styles.sheet, Platform.OS === 'web' && styles.sheetWeb]}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Text style={styles.sheetAction}>Cancel</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>Birth date</Text>
                <Pressable
                  onPress={() => {
                    if (Platform.OS === 'ios') commit(draft);
                    else setOpen(false);
                  }}
                  hitSlop={8}
                >
                  <Text style={[styles.sheetAction, styles.sheetActionPrimary]}>
                    {Platform.OS === 'ios' ? 'Done' : 'Close'}
                  </Text>
                </Pressable>
              </View>

              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="spinner"
                  themeVariant={isDark ? 'dark' : 'light'}
                  maximumDate={new Date()}
                  minimumDate={MIN_DATE}
                  onChange={onNativeChange}
                  style={styles.iosPicker}
                />
              ) : (
                <View style={styles.webInputWrap}>
                  {createElement('input', {
                    type: 'date',
                    value: isValidBirthDate(value) ? value : toIsoDate(draft),
                    max: toIsoDate(new Date()),
                    min: '1900-01-01',
                    onChange: (e: { currentTarget: { value: string } }) => {
                      const next = e.currentTarget.value;
                      if (!next) {
                        clear();
                        return;
                      }
                      onChange(next);
                      setDraft(parseValue(next));
                    },
                    style: {
                      width: '100%',
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.foreground,
                      padding: '0 12px',
                      fontSize: 15,
                      boxSizing: 'border-box',
                    },
                  })}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/** Keep only digits and insert dashes: YYYY-MM-DD */
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function parseValue(value: string): Date {
  const iso = toDateInputValue(value);
  if (!iso || !isValidBirthDate(iso)) return DEFAULT_DATE;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    field: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingLeft: 14,
      paddingRight: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    fieldWarn: {
      borderColor: colors.warning,
    },
    fieldDisabled: {
      opacity: 0.6,
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnPressed: {
      backgroundColor: colors.mutedBg,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
    },
    hintError: {
      fontSize: 12,
      color: colors.destructive,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
      padding: Platform.OS === 'web' ? 24 : 0,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetWeb: {
      borderRadius: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
      paddingBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    sheetAction: {
      fontSize: 15,
      color: colors.muted,
      minWidth: 64,
    },
    sheetActionPrimary: {
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'right',
    },
    iosPicker: {
      alignSelf: 'center',
    },
    webInputWrap: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });
}
