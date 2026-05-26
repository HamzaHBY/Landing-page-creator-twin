import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/constants';

interface Props {
  visible: boolean;
  imageBase64?: string;
  imageUrl?: string;
  prompt?: string;
  error?: string;
  onClose: () => void;
  onDownload: () => void;
}

export function ResultModal(props: Props) {
  if (!props.visible) return null;
  const src = props.imageBase64 || props.imageUrl;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Generation result</Text>
          <Pressable onPress={props.onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          <View style={styles.imageBox}>
            {props.error ? (
              <ScrollView>
                <Text style={styles.error}>{props.error}</Text>
                {props.prompt ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subheading}>Prompt sent</Text>
                    <Text style={styles.prompt}>{props.prompt}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : src ? (
              <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                <Image source={{ uri: src }} style={styles.resultImg} resizeMode="contain" />
                <Pressable onPress={props.onDownload} style={styles.downloadBtn}>
                  <Text style={styles.downloadText}>Download</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <Text style={styles.subheading}>No image yet.</Text>
            )}
          </View>
          {props.prompt && !props.error ? (
            <View style={styles.promptBox}>
              <Text style={styles.subheading}>Master prompt (what was sent to gpt-image-1)</Text>
              <ScrollView style={styles.promptScroll}>
                <Text style={styles.prompt}>{props.prompt}</Text>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000CC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  modal: {
    width: '90%',
    height: '90%',
    maxWidth: 1200,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  closeBtn: { padding: 4 },
  closeText: { color: COLORS.text, fontSize: 16 },
  body: { flex: 1, flexDirection: 'row' },
  imageBox: {
    flex: 1.4,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  promptBox: { flex: 1, padding: 16 },
  promptScroll: { flex: 1, marginTop: 8 },
  resultImg: { width: '100%', maxWidth: 600, aspectRatio: 0.33 },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 16,
  },
  downloadText: { color: '#001518', fontWeight: '700' },
  subheading: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  prompt: { color: COLORS.text, fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
  error: { color: '#FFB4B4', fontSize: 12, lineHeight: 18 },
});
