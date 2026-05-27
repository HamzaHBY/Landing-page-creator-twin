import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../lib/constants';
import type { SectionTemplate } from '../lib/types';
import templatesData from '../data/templates.json';
import categoriesData from '../data/categories.json';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

interface Props {
  onPick: (template: SectionTemplate) => void;
  addBlankZone: () => void;
  onAutoGenerate?: () => void;
  onClear?: () => void;
}

const CATEGORY_COUNTS = (() => {
  const m = new Map<string, number>();
  for (const t of TEMPLATES) m.set(t.category, (m.get(t.category) || 0) + 1);
  return m;
})();

const CATEGORIES = (categoriesData as { name: string }[]).map((c) => c.name);

export function SectionLibrary({ onPick, addBlankZone, onAutoGenerate, onClear }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Hero Section');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (t.category !== activeCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sections</Text>
        <Text style={styles.subtitle}>{TEMPLATES.length} pre-made templates</Text>
      </View>

      {onAutoGenerate ? (
        <Pressable onPress={onAutoGenerate} style={styles.autoBtn}>
          <Text style={styles.autoBtnText}>⚡ Auto-generate sections</Text>
        </Pressable>
      ) : null}

      <View style={styles.utilityRow}>
        <Pressable onPress={addBlankZone} style={[styles.utilityBtn, { flex: 1 }]}>
          <Text style={styles.utilityBtnText}>＋ Blank zone</Text>
        </Pressable>
        {onClear ? (
          <Pressable onPress={onClear} style={[styles.utilityBtn, { flex: 1 }]}>
            <Text style={styles.utilityBtnText}>✕ Clear canvas</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        placeholder="Search templates…"
        placeholderTextColor={COLORS.textFaint}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {cat} · {CATEGORY_COUNTS.get(cat) ?? 0}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPick(item)} style={styles.card}>
            {item.inspiration_image_url ? (
              <Image
                source={{ uri: item.inspiration_image_url }}
                style={styles.thumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.name}
              </Text>
              <Text numberOfLines={2} style={styles.cardDesc}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No templates match "{search}"</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 340,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 12,
    paddingTop: 14,
    flex: 1,
  },
  header: { marginBottom: 10 },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  subtitle: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  autoBtn: {
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  autoBtnText: { color: '#001518', fontSize: 13, fontWeight: '800' },
  utilityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  utilityBtn: {
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  utilityBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  search: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12,
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceAlt,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 10 },
  tabTextActive: { color: '#001518', fontWeight: '700' },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: { width: 80, height: 80, backgroundColor: COLORS.border },
  thumbPlaceholder: { backgroundColor: COLORS.surfaceAlt },
  cardBody: { flex: 1, padding: 8, justifyContent: 'center' },
  cardTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  cardDesc: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  empty: { color: COLORS.textFaint, textAlign: 'center', padding: 24 },
});
