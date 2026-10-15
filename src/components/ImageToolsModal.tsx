import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sliders,
  Download,
  Sparkles,
  Palette,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Upload,
} from 'lucide-react';
import { GeneratedImage } from '../types/generator';
import {
  upscaleAndEnhanceImage,
  DEFAULT_ADJUSTMENTS,
  ImageAdjustments,
  downloadImage,
  extractPaletteFromImage,
} from '../lib/canvasUpscaler';

interface ImageToolsModalProps {
  image: GeneratedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToStudio: (prompt: string) => void;
}

export const ImageToolsModal: React.FC<ImageToolsModalProps> = ({
  image,
  isOpen,
  onClose,
  onSendToStudio,
}) => {
  const [activeImageSrc, setActiveImageSrc] = useState<string>('');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [scaleFactor, setScaleFactor] = useState<2 | 4>(2);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  // Palette & Vision
  const [palette, setPalette] = useState<string[]>([]);
  const [isDescribing, setIsDescribing] = useState(false);
  const [describedPrompt, setDescribedPrompt] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [comparePosition, setComparePosition] = useState<number>(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (image) {
      setActiveImageSrc(image.imageUrl);
      setActivePrompt(image.prompt);
      setProcessedUrl(null);
      setDescribedPrompt(null);
      extractPaletteFromImage(image.imageUrl).then(setPalette);
    }
  }, [image]);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setActiveImageSrc(src);
        setActivePrompt(file.name.replace(/\.[^/.]+$/, ''));
        setProcessedUrl(null);
        setDescribedPrompt(null);
        extractPaletteFromImage(src).then(setPalette);
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform canvas upscale & enhancement
  const handleProcessUpscale = async () => {
    if (!activeImageSrc) return;
    setIsProcessing(true);
    try {
      const result = await upscaleAndEnhanceImage(activeImageSrc, scaleFactor, adjustments);
      setProcessedUrl(result);
    } catch (err) {
      console.error('Upscale failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Describe image with AI
  const handleDescribeImage = async () => {
    if (!activeImageSrc) return;
    setIsDescribing(true);
    try {
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: activeImageSrc }),
      });
      const data = await res.json();
      if (data.prompt) {
        setDescribedPrompt(data.prompt);
      }
    } catch (err) {
      console.error('Describe failed:', err);
    } finally {
      setIsDescribing(false);
    }
  };

  const copyHex = async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600/20 border border-violet-500/30 p-2 text-violet-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">4K Canvas Upscaler & Image Studio</h2>
              <p className="text-xs text-slate-400">
                Sharpen details, export in Ultra-HD 2K/4K, extract color palettes, and reverse-engineer prompts with AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Custom</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Image Viewport with interactive split comparison */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative flex min-h-[380px] max-h-[480px] items-center justify-center rounded-2xl bg-slate-950 p-3 border border-white/5 overflow-hidden select-none">
              {processedUrl ? (
                /* Comparison Split View: Original vs 4K Upscaled */
                <div className="relative w-full h-[440px] flex items-center justify-center overflow-hidden rounded-xl">
                  {/* Background: Original */}
                  <img
                    src={activeImageSrc}
                    alt="Original Version"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  />
                  {/* Foreground: Upscaled with clip-path */}
                  <div
                    className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
                  >
                    <img
                      src={processedUrl}
                      alt="4K Upscaled Version"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* Vertical divider line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
                    style={{ left: `${comparePosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center text-xs shadow-2xl">
                      ⇔
                    </div>
                  </div>

                  {/* Slider Input overlay */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={comparePosition}
                    onChange={(e) => setComparePosition(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
                    title="Slide to compare Original vs 4K Upscaled"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 rounded bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white pointer-events-none z-10">
                    Original
                  </div>
                  <div className="absolute top-3 right-3 rounded bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white pointer-events-none z-10">
                    {scaleFactor}x Upscaled
                  </div>
                </div>
              ) : activeImageSrc ? (
                <img
                  src={activeImageSrc}
                  alt="Processing View"
                  referrerPolicy="no-referrer"
                  className="max-h-[440px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs">No image selected</div>
              )}

              {processedUrl && (
                <div className="absolute top-4 left-4 rounded-lg bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                  ✓ {scaleFactor}x Super-Res Enhanced
                </div>
              )}
            </div>

            {/* Dominant Color Palette */}
            {palette.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-pink-400" />
                  Color Palette:
                </span>
                <div className="flex items-center gap-2">
                  {palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => copyHex(hex)}
                      className="group relative flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-mono text-slate-300 hover:border-white/30"
                      title={`Copy ${hex}`}
                    >
                      <span className="h-3 w-3 rounded-full border border-black/30" style={{ backgroundColor: hex }} />
                      <span>{copiedHex === hex ? 'Copied!' : hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Controls & Filters */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Resolution Upscale Selector */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
                Super-Resolution Scale
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScaleFactor(2)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    scaleFactor === 2
                      ? 'border-violet-500 bg-violet-600/15 text-white shadow-md shadow-violet-500/10'
                      : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base font-extrabold">2x HD</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">2048px (Recommended)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScaleFactor(4)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    scaleFactor === 4
                      ? 'border-violet-500 bg-violet-600/15 text-white shadow-md shadow-violet-500/10'
                      : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base font-extrabold">4x Ultra-4K</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">4096px High Clarity</span>
                </button>
              </div>
            </div>

            {/* Adjustment Sliders */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Image Adjustments
                </label>
                <button
                  type="button"
                  onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Reset
                </button>
              </div>

              {/* Sharpness */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Sharpness / Clarity</span>
                  <span>{adjustments.sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.sharpness}
                  onChange={(e) => setAdjustments({ ...adjustments, sharpness: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Contrast</span>
                  <span>{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={adjustments.contrast}
                  onChange={(e) => setAdjustments({ ...adjustments, contrast: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Vibrance / Saturation</span>
                  <span>{adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={adjustments.saturation}
                  onChange={(e) => setAdjustments({ ...adjustments, saturation: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Vignette */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Vignette Atmosphere</span>
                  <span>{adjustments.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.vignette}
                  onChange={(e) => setAdjustments({ ...adjustments, vignette: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Apply Upscale Button */}
              <button
                type="button"
                onClick={handleProcessUpscale}
                disabled={isProcessing || !activeImageSrc}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-violet-600/30 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Upscaling to {scaleFactor}x Resolution...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Apply {scaleFactor}x Canvas Upscale</span>
                  </>
                )}
              </button>

              {processedUrl && (
                <button
                  type="button"
                  onClick={() => downloadImage(processedUrl, `${activePrompt}-upscaled-${scaleFactor}x`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Upscaled PNG</span>
                </button>
              )}
            </div>

            {/* Reverse Image to Prompt (Multimodal AI) */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Reverse Prompt with AI
                </label>
                <button
                  type="button"
                  onClick={handleDescribeImage}
                  disabled={isDescribing || !activeImageSrc}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold disabled:opacity-50"
                >
                  {isDescribing ? 'Analyzing...' : 'Describe Image'}
                </button>
              </div>

              {describedPrompt ? (
                <div className="flex flex-col gap-2">
                  <p className="rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-slate-300 italic leading-relaxed">
                    "{describedPrompt}"
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onSendToStudio(describedPrompt);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition-all"
                  >
                    <span>Send to Studio Creator</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Let Gemini vision analyze this image and generate an exact prompt to remix or recreate it.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
