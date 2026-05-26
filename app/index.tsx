import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CanvasArea } from '../src/components/CanvasArea';
import { ResultModal } from '../src/components/ResultModal';
import { RightPanel } from '../src/components/RightPanel';
import { SectionLibrary } from '../src/components/SectionLibrary';
import { TopBar } from '../src/components/TopBar';
import { COLORS, ZONE_COLORS } from '../src/lib/constants';
import { renderSketchDataUrl } from '../src/lib/renderSketch';
import { uploadImageFile } from '../src/lib/uploadImage';
import templatesData from '../src/data/templates.json';
import type {
  AspectRatio,
  BrandBrief,
  GenerateResponse,
  OutputFormat,
  ProductImage,
  Quality,
  Resolution,
  SectionTemplate,
  Zone,
} from '../src/lib/types';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

function nextId() {
  return `z-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CanvasBuilder() {
  const [quality, setQuality] = useState<Quality>('ultimate');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('portrait_1_3');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [resolution, setResolution] = useState<Resolution>('1K');

  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [globalInstruction, setGlobalInstruction] = useState('');
  const [brief, setBrief] = useState<BrandBrief>({});
  const [briefOpen, setBriefOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultImage, setResultImage] = useState<string | undefined>();
  const [resultImageUrl, setResultImageUrl] = useState<string | undefined>();
  const [resultPrompt, setResultPrompt] = useState<string | undefined>();
  const [resultError, setResultError] = useState<string | undefined>();

  // ─── ZONE HELPERS ─────────────────────────────────────────────────────────
  const addZoneFromTemplate = useCallback((tpl: SectionTemplate) => {
    setZones((prev) => {
      const number = prev.length + 1;
      const color = ZONE_COLORS[(number - 1) % ZONE_COLORS.length];
      const z: Zone = {
        id: nextId(),
        number,
        label: tpl.name,
        height: tpl.height || 0.25,
        sectionId: tpl.id,
        color,
      };
      return [...prev, z];
    });
  }, []);

  const addBlankZone = useCallback(() => {
    setZones((prev) => {
      const number = prev.length + 1;
      const color = ZONE_COLORS[(number - 1) % ZONE_COLORS.length];
      return [
        ...prev,
        {
          id: nextId(),
          number,
          label: `Zone ${number}`,
          height: 0.2,
          color,
        },
      ];
    });
  }, []);

  const removeZone = useCallback((id: string) => {
    setZones((prev) =>
      prev
        .filter((z) => z.id !== id)
        .map((z, i) => ({ ...z, number: i + 1, color: ZONE_COLORS[i % ZONE_COLORS.length] })),
    );
    setSelectedZoneId((cur) => (cur === id ? null : cur));
  }, []);

  const resizeZone = useCallback((id: string, delta: number) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, height: Math.max(0.05, z.height + delta) } : z)),
    );
  }, []);

  const moveZone = useCallback((id: string, direction: -1 | 1) => {
    setZones((prev) => {
      const idx = prev.findIndex((z) => z.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((z, i) => ({ ...z, number: i + 1, color: ZONE_COLORS[i % ZONE_COLORS.length] }));
    });
  }, []);

  const updateZone = useCallback((id: string, patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }, []);

  const attachInspiration = useCallback(async (id: string, file: File) => {
    const url = await uploadImageFile(file);
    updateZone(id, { inspirationImageUrl: url });
  }, [updateZone]);

  const attachContent = useCallback(async (id: string, file: File) => {
    const url = await uploadImageFile(file);
    updateZone(id, { contentImageUrl: url });
  }, [updateZone]);

  const addProductImage = useCallback(async (file: File) => {
    const url = await uploadImageFile(file);
    setProductImages((prev) => [
      ...prev,
      { id: nextId(), url, name: file.name || 'product' },
    ]);
  }, []);

  // ─── GENERATE ─────────────────────────────────────────────────────────────
  const onGenerate = useCallback(async () => {
    if (zones.length === 0) {
      window.alert('Add at least one zone to the canvas before generating.');
      return;
    }
    setGenerating(true);
    setResultError(undefined);
    setResultImage(undefined);
    setResultImageUrl(undefined);
    setResultPrompt(undefined);
    setResultOpen(true);

    try {
      const sketchDataUrl = renderSketchDataUrl({
        zones,
        aspectRatio,
        templates: TEMPLATES,
        width: 1024,
      });
      const body = {
        sketchDataUrl,
        productImageUrls: productImages.map((p) => p.url),
        zones,
        brief,
        country,
        language,
        globalInstruction,
        quality,
        aspectRatio,
        resolution,
        outputFormat,
      };
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as GenerateResponse;
      setResultPrompt(j.prompt);
      if (j.error) {
        setResultError(j.error);
      } else {
        setResultImage(j.imageBase64);
        setResultImageUrl(j.imageUrl);
      }
    } catch (e) {
      setResultError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [
    zones,
    aspectRatio,
    productImages,
    brief,
    country,
    language,
    globalInstruction,
    quality,
    resolution,
    outputFormat,
  ]);

  const onDownload = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const src = resultImage || resultImageUrl;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `landing-page.${outputFormat}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [resultImage, resultImageUrl, outputFormat]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <View style={styles.root}>
      <TopBar
        quality={quality}
        onQualityChange={setQuality}
        aspectRatio={aspectRatio}
        onAspectChange={setAspectRatio}
        outputFormat={outputFormat}
        onOutputFormatChange={setOutputFormat}
        resolution={resolution}
        onResolutionChange={setResolution}
        onGenerate={onGenerate}
        generating={generating}
      />
      <View style={styles.body}>
        <SectionLibrary onPick={addZoneFromTemplate} addBlankZone={addBlankZone} />
        <CanvasArea
          zones={zones}
          aspectRatio={aspectRatio}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
          onRemoveZone={removeZone}
          onResize={resizeZone}
          onMoveUp={(id) => moveZone(id, -1)}
          onMoveDown={(id) => moveZone(id, 1)}
        />
        <RightPanel
          selectedZone={selectedZone}
          onUpdateZone={updateZone}
          onClearTemplate={(id) => updateZone(id, { sectionId: undefined })}
          onAttachInspiration={attachInspiration}
          onClearInspiration={(id) => updateZone(id, { inspirationImageUrl: undefined })}
          onAttachContent={attachContent}
          onClearContent={(id) => updateZone(id, { contentImageUrl: undefined })}
          productImages={productImages}
          onAddProductImage={addProductImage}
          onRemoveProductImage={(id) =>
            setProductImages((p) => p.filter((x) => x.id !== id))
          }
          country={country}
          language={language}
          globalInstruction={globalInstruction}
          onChangeCountry={setCountry}
          onChangeLanguage={setLanguage}
          onChangeGlobalInstruction={setGlobalInstruction}
          brief={brief}
          onChangeBrief={setBrief}
          briefOpen={briefOpen}
          setBriefOpen={setBriefOpen}
        />
      </View>

      <ResultModal
        visible={resultOpen}
        imageBase64={resultImage}
        imageUrl={resultImageUrl}
        prompt={resultPrompt}
        error={resultError}
        onClose={() => setResultOpen(false)}
        onDownload={onDownload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1, flexDirection: 'row' },
});
