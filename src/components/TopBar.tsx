import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ASPECT_OPTIONS,
  COLORS,
  OUTPUT_FORMATS,
  QUALITY_OPTIONS,
  RESOLUTION_OPTIONS,
} from '../lib/constants';
import type { AspectRatio, OutputFormat, Quality, Resolution } from '../lib/types';
import { Select } from './Select';

interface Props {
  quality: Quality;
  onQualityChange: (q: Quality) => void;
  aspectRatio: AspectRatio;
  onAspectChange: (a: AspectRatio) => void;
  outputFormat: OutputFormat;
  onOutputFormatChange: (f: OutputFormat) => void;
  resolution: Resolution;
  onResolutionChange: (r: Resolution) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function TopBar(props: Props) {
  const cost = props.quality === 'ultimate' ? '$0.04 – $0.19 / image' : 'variable fal.ai pricing';

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.brand}>Landing Page Creator</Text>
        <Text style={styles.subtitle}>Twin Studio clone · canvas builder</Text>
      </View>

      <View style={styles.center}>
        <Select
          label="Quality"
          value={props.quality}
          onChange={(v) => props.onQualityChange(v as Quality)}
          options={QUALITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Select
          label="Aspect"
          value={props.aspectRatio}
          onChange={(v) => props.onAspectChange(v as AspectRatio)}
          options={ASPECT_OPTIONS}
        />
        <Select
          label="Format"
          value={props.outputFormat}
          onChange={(v) => props.onOutputFormatChange(v as OutputFormat)}
          options={OUTPUT_FORMATS}
        />
        {props.quality === 'premium' ? (
          <Select
            label="Resolution"
            value={props.resolution}
            onChange={(v) => props.onResolutionChange(v as Resolution)}
            options={RESOLUTION_OPTIONS}
          />
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.cost}>{cost}</Text>
        <Pressable
          onPress={props.onGenerate}
          disabled={props.generating}
          style={({ pressed }) => [
            styles.generateBtn,
            (pressed || props.generating) && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.generateText}>
            {props.generating ? 'Generating…' : 'Generate'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 64,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  left: { gap: 0 },
  center: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  right: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  brand: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  subtitle: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  cost: { color: COLORS.textMuted, fontSize: 11 },
  generateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generateText: { color: '#001518', fontWeight: '700', fontSize: 14 },
});
