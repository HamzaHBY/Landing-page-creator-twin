import { createElement } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../lib/constants';
import type {
  BrandBrief,
  ProductImage,
  SectionTemplate,
  Zone,
} from '../lib/types';
import templatesData from '../data/templates.json';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

interface Props {
  selectedZone: Zone | undefined;
  onUpdateZone: (id: string, patch: Partial<Zone>) => void;
  onClearTemplate: (id: string) => void;
  onAttachInspiration: (id: string, file: File) => void;
  onClearInspiration: (id: string) => void;
  onAttachContent: (id: string, file: File) => void;
  onClearContent: (id: string) => void;

  productImages: ProductImage[];
  onAddProductImage: (file: File) => void;
  onRemoveProductImage: (id: string) => void;

  country: string;
  language: string;
  globalInstruction: string;
  onChangeCountry: (v: string) => void;
  onChangeLanguage: (v: string) => void;
  onChangeGlobalInstruction: (v: string) => void;

  brief: BrandBrief;
  onChangeBrief: (b: BrandBrief) => void;
  briefOpen: boolean;
  setBriefOpen: (v: boolean) => void;
}

export function RightPanel(props: Props) {
  const tpl = props.selectedZone?.sectionId
    ? TEMPLATES.find((t) => t.id === props.selectedZone!.sectionId)
    : undefined;

  return (
    <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* PRODUCT IMAGES — Twin Studio's "Product Images" uploader */}
      <Section title="Product Images" subtitle="AI extracts brand colors, style & product identity">
        <View style={styles.thumbRow}>
          {props.productImages.map((p) => (
            <View key={p.id} style={styles.productThumb}>
              <Image source={{ uri: p.url }} style={styles.productThumbImg} />
              <Pressable
                onPress={() => props.onRemoveProductImage(p.id)}
                style={styles.thumbRemoveBtn}
              >
                <Text style={styles.thumbRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <FileButton
            label="＋"
            accept="image/*"
            multiple
            onFile={(file) => props.onAddProductImage(file)}
            style={styles.productAdd}
          />
        </View>
      </Section>

      {/* CONTEXT */}
      <Section title="Context" subtitle="Target market & language passed verbatim to the master prompt">
        <Field label="Country">
          <TextInput
            value={props.country}
            onChangeText={props.onChangeCountry}
            placeholder="e.g. Morocco"
            placeholderTextColor={COLORS.textFaint}
            style={styles.input}
          />
        </Field>
        <Field label="Language">
          <TextInput
            value={props.language}
            onChangeText={props.onChangeLanguage}
            placeholder="e.g. French"
            placeholderTextColor={COLORS.textFaint}
            style={styles.input}
          />
        </Field>
        <Field label="Global instruction (optional)">
          <TextInput
            value={props.globalInstruction}
            onChangeText={props.onChangeGlobalInstruction}
            placeholder="Any extra direction that applies to the whole page"
            placeholderTextColor={COLORS.textFaint}
            style={[styles.input, { height: 60 }]}
            multiline
          />
        </Field>
      </Section>

      {/* BRAND BRIEF */}
      <Section
        title="Brand Brief"
        subtitle="MANDATORY PARAMETERS block — highest priority in the prompt"
      >
        <Pressable
          style={styles.briefToggle}
          onPress={() => props.setBriefOpen(!props.briefOpen)}
        >
          <Text style={styles.briefToggleText}>
            {props.briefOpen ? '▾ Hide brief' : '▸ Edit brief'}
          </Text>
        </Pressable>
        {props.briefOpen ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <BriefField field="productName" label="Product name" {...props} />
            <BriefField field="valueProp" label="Value proposition" {...props} />
            <BriefField field="audienceAvatar" label="Audience avatar" {...props} />
            <BriefField field="painPoint" label="Pain point" {...props} />
            <BriefField field="deepDesire" label="Deep desire" {...props} />
            <BriefField field="visualStyle" label="Visual style" {...props} />
            <BriefField field="benefit1" label="Benefit 1" {...props} />
            <BriefField field="benefit2" label="Benefit 2" {...props} />
            <BriefField field="benefit3" label="Benefit 3" {...props} />
            <BriefField field="anchorPrice" label="Anchor price" {...props} />
            <BriefField field="actualPrice" label="Actual price" {...props} />
            <BriefField field="offerFormat" label="Offer format" {...props} />
            <BriefField field="urgency" label="Urgency" {...props} />
          </View>
        ) : null}
      </Section>

      {/* SELECTED ZONE */}
      <Section
        title={props.selectedZone ? `Zone ${props.selectedZone.number}` : 'Selected zone'}
        subtitle={
          props.selectedZone
            ? 'Edit this zone — overrides the template default prompt'
            : 'Click a zone in the canvas to edit it'
        }
      >
        {props.selectedZone ? (
          <View style={{ gap: 8 }}>
            <Field label="Label">
              <TextInput
                value={props.selectedZone.label}
                onChangeText={(v) =>
                  props.onUpdateZone(props.selectedZone!.id, { label: v })
                }
                style={styles.input}
              />
            </Field>

            {tpl ? (
              <View style={styles.templateBadge}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tplCategory}>{tpl.category}</Text>
                  <Text style={styles.tplName}>{tpl.name}</Text>
                </View>
                <Pressable
                  onPress={() => props.onClearTemplate(props.selectedZone!.id)}
                  style={styles.clearTplBtn}
                >
                  <Text style={styles.clearTplText}>Clear</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.empty}>
                No template applied — pick one from the left sidebar.
              </Text>
            )}

            <Field label="Free-text override (🔴 USER PRIORITY)">
              <TextInput
                value={props.selectedZone.zoneInstruction || ''}
                onChangeText={(v) =>
                  props.onUpdateZone(props.selectedZone!.id, { zoneInstruction: v })
                }
                placeholder="Beats the template default prompt"
                placeholderTextColor={COLORS.textFaint}
                style={[styles.input, { height: 80 }]}
                multiline
              />
            </Field>

            <Field label="Canvas text (rendered into the sketch)">
              <TextInput
                value={props.selectedZone.userText || ''}
                onChangeText={(v) =>
                  props.onUpdateZone(props.selectedZone!.id, { userText: v })
                }
                placeholder="Short copy / text annotation"
                placeholderTextColor={COLORS.textFaint}
                style={[styles.input, { height: 60 }]}
                multiline
              />
            </Field>

            <Field label="Inspiration image (layout only)">
              {props.selectedZone.inspirationImageUrl ? (
                <View style={styles.row}>
                  <Image
                    source={{ uri: props.selectedZone.inspirationImageUrl }}
                    style={styles.refThumb}
                  />
                  <Pressable
                    onPress={() => props.onClearInspiration(props.selectedZone!.id)}
                    style={styles.clearTplBtn}
                  >
                    <Text style={styles.clearTplText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <FileButton
                  label="＋ Upload inspiration"
                  accept="image/*"
                  onFile={(f) => props.onAttachInspiration(props.selectedZone!.id, f)}
                  style={styles.uploadInline}
                />
              )}
            </Field>

            <Field label="Content image (rendered inside this zone)">
              {props.selectedZone.contentImageUrl ? (
                <View style={styles.row}>
                  <Image
                    source={{ uri: props.selectedZone.contentImageUrl }}
                    style={styles.refThumb}
                  />
                  <Pressable
                    onPress={() => props.onClearContent(props.selectedZone!.id)}
                    style={styles.clearTplBtn}
                  >
                    <Text style={styles.clearTplText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <FileButton
                  label="＋ Upload content image"
                  accept="image/*"
                  onFile={(f) => props.onAttachContent(props.selectedZone!.id, f)}
                  style={styles.uploadInline}
                />
              )}
            </Field>
          </View>
        ) : (
          <Text style={styles.empty}>No zone selected.</Text>
        )}
      </Section>
    </ScrollView>
  );
}

function BriefField({
  field,
  label,
  brief,
  onChangeBrief,
}: {
  field: keyof BrandBrief;
  label: string;
  brief: BrandBrief;
  onChangeBrief: (b: BrandBrief) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        value={brief[field] || ''}
        onChangeText={(v) => onChangeBrief({ ...brief, [field]: v })}
        style={styles.input}
        placeholder={`Optional`}
        placeholderTextColor={COLORS.textFaint}
      />
    </Field>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface FileButtonProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  onFile: (file: File) => void;
  style?: any;
}

function FileButton({ label, accept = 'image/*', multiple, onFile, style }: FileButtonProps) {
  const id = `file-${label.replace(/\W/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
  const input = createElement('input', {
    id,
    type: 'file',
    accept,
    multiple,
    onChange: (e: { target: { files: FileList | null; value: string } }) => {
      const files = e.target.files;
      if (files) for (let i = 0; i < files.length; i++) onFile(files[i]);
      e.target.value = '';
    },
    style: { display: 'none' },
  });
  const button = (
    <View style={styles.fileBtn}>
      <Text style={styles.fileBtnText}>{label}</Text>
    </View>
  );
  const labelEl = createElement(
    'label',
    { htmlFor: id, style: { cursor: 'pointer', display: 'block' } },
    input,
    button,
  );
  return <View style={style}>{labelEl}</View>;
}

const styles = StyleSheet.create({
  panel: {
    width: 360,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  section: {
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  sectionSubtitle: { color: COLORS.textFaint, fontSize: 10, marginTop: 2 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productThumb: {
    width: 76,
    height: 76,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
    position: 'relative',
  },
  productThumbImg: { width: 76, height: 76 },
  thumbRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#000000DD',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  productAdd: {
    width: 76,
    height: 76,
  },
  fileBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: '100%',
    minHeight: 36,
  },
  fileBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  uploadInline: { width: '100%' },
  fieldLabel: {
    color: COLORS.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12,
  },
  briefToggle: { paddingVertical: 4 },
  briefToggleText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  templateBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tplCategory: { color: COLORS.textFaint, fontSize: 10, textTransform: 'uppercase' },
  tplName: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  clearTplBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  clearTplText: { color: COLORS.text, fontSize: 10 },
  empty: { color: COLORS.textFaint, fontSize: 11, fontStyle: 'italic', padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refThumb: { width: 60, height: 60, borderRadius: 4, backgroundColor: COLORS.border },
});
