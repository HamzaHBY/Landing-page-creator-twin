import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/constants';

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

export function Select({ label, value, onChange, options }: Props) {
  if (Platform.OS !== 'web') {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    );
  }

  // Use a native HTML <select> on web for keyboard accessibility + grouping.
  // React Native Web doesn't expose <select> as an RN component, so we drop
  // down to React.createElement and pass through DOM attributes.
  const grouped = new Map<string, Option[]>();
  for (const o of options) {
    const key = o.group || '';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(o);
  }

  const optionEl = (o: Option) =>
    createElement('option', { key: o.value, value: o.value }, o.label);

  const children: ReactNode[] = [];
  for (const [group, items] of grouped.entries()) {
    if (group) {
      children.push(
        createElement(
          'optgroup',
          { key: group, label: group },
          items.map(optionEl),
        ),
      );
    } else {
      for (const o of items) children.push(optionEl(o));
    }
  }

  const selectEl = createElement(
    'select',
    {
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      style: {
        backgroundColor: COLORS.surfaceAlt,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: 12,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 120,
      },
    },
    children,
  );

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {selectEl}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: { color: COLORS.text, fontSize: 12 },
});
