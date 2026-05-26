import { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, GPT_IMAGE_SIZES } from '../lib/constants';
import type { AspectRatio, SectionTemplate, Zone } from '../lib/types';
import templatesData from '../data/templates.json';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

interface Props {
  zones: Zone[];
  aspectRatio: AspectRatio;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  onRemoveZone: (id: string) => void;
  onResize: (id: string, delta: number) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function CanvasArea(props: Props) {
  const target = GPT_IMAGE_SIZES[props.aspectRatio];
  const isPortrait = target.height >= target.width;

  // canvas display dims — fit a 720px max height/width
  const canvasW = isPortrait ? 420 : 880;
  const canvasH = Math.round((canvasW * target.height) / target.width);

  const totalHeight = useMemo(
    () => props.zones.reduce((a, z) => a + z.height, 0) || 1,
    [props.zones],
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Canvas</Text>
        <Text style={styles.subtitle}>
          {props.zones.length} zones · {target.label}
        </Text>
      </View>

      <View
        style={[
          styles.canvas,
          { width: canvasW, height: canvasH },
        ]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={() => props.onSelectZone(null)}
      >
        {props.zones.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Empty canvas</Text>
            <Text style={styles.emptySub}>
              Pick a section from the sidebar or add a blank zone.
            </Text>
          </View>
        ) : (
          props.zones.map((zone, idx) => {
            const heightPct = (zone.height / totalHeight) * 100;
            const tpl = zone.sectionId
              ? TEMPLATES.find((t) => t.id === zone.sectionId)
              : undefined;
            const isSelected = props.selectedZoneId === zone.id;

            return (
              <Pressable
                key={zone.id}
                onPress={(e) => {
                  const native = (e as unknown as { stopPropagation?: () => void }).stopPropagation;
                  if (typeof native === 'function') native.call(e);
                  props.onSelectZone(zone.id);
                }}
                style={[
                  styles.zone,
                  {
                    backgroundColor: zone.color,
                    height: `${heightPct}%`,
                  },
                  isSelected && styles.zoneSelected,
                ]}
              >
                <View style={styles.zoneHeader}>
                  <Text style={styles.zoneNum}>Zone {zone.number}</Text>
                  <Text style={styles.zoneTitle} numberOfLines={1}>
                    {tpl ? tpl.name : zone.label}
                  </Text>
                </View>

                {zone.userText ? (
                  <Text style={styles.zoneText} numberOfLines={3}>
                    {zone.userText}
                  </Text>
                ) : null}

                {zone.inspirationImageUrl ? (
                  <Image
                    source={{ uri: zone.inspirationImageUrl }}
                    style={styles.zoneInspThumb}
                    resizeMode="cover"
                  />
                ) : null}

                {isSelected ? (
                  <View style={styles.zoneActions}>
                    <ZoneAction
                      label="↑"
                      disabled={idx === 0}
                      onPress={() => props.onMoveUp(zone.id)}
                    />
                    <ZoneAction
                      label="↓"
                      disabled={idx === props.zones.length - 1}
                      onPress={() => props.onMoveDown(zone.id)}
                    />
                    <ZoneAction label="−" onPress={() => props.onResize(zone.id, -0.05)} />
                    <ZoneAction label="+" onPress={() => props.onResize(zone.id, 0.05)} />
                    <ZoneAction
                      label="✕"
                      destructive
                      onPress={() => props.onRemoveZone(zone.id)}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function ZoneAction({
  label,
  onPress,
  destructive,
  disabled,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.zoneActionBtn,
        destructive && styles.zoneActionDestructive,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.zoneActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 32, alignItems: 'center' },
  header: { marginBottom: 16, alignItems: 'center' },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 18 },
  subtitle: { color: COLORS.textFaint, fontSize: 11, marginTop: 4 },
  canvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyTitle: { color: '#666', fontSize: 16, fontWeight: '700' },
  emptySub: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  zone: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF66',
    justifyContent: 'flex-start',
  },
  zoneSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 11,
  },
  zoneHeader: { gap: 2 },
  zoneNum: { color: '#111', fontSize: 14, fontWeight: '800' },
  zoneTitle: { color: '#111', fontSize: 12, fontWeight: '600' },
  zoneText: {
    color: '#1a1a1a',
    fontSize: 11,
    marginTop: 4,
    backgroundColor: '#FFFFFF99',
    padding: 4,
    borderRadius: 4,
  },
  zoneInspThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#00000033',
  },
  zoneActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  zoneActionBtn: {
    backgroundColor: '#000000CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  zoneActionDestructive: { backgroundColor: '#7C0F0FCC' },
  zoneActionLabel: { color: '#FFF', fontWeight: '700', fontSize: 11 },
});
