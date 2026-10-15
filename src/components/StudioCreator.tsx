import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wand2,
  Download,
  Copy,
  Maximize2,
  RefreshCw,
  Star,
  ChevronDown,
  ChevronUp,
  Camera,
  Layers,
  Settings2,
  Info,
  Check,
  Zap,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import {
  AIModel,
  AspectRatio,
  GeneratedImage,
  GenerationOptions,
} from '../types/generator';
import {
  STYLE_PRESETS,
  AI_MODELS_INFO,
  LIGHTING_MODIFIERS,
  CAMERA_MODIFIERS,
  GENERATION_TIPS,
  RANDOM_PROMPTS,
  QUICK_PROMPT_PILLS,
  DEFAULT_STARTER_IMAGES,
} from '../data/presets';
import { downloadImage } from '../lib/canvasUpscaler';
import { clientProceduralPromptEnhance, constructDirectImageUrl } from '../lib/clientFallback';

interface StudioCreatorProps {
  onImageGenerated: (image: GeneratedImage) => void;
  onOpenLightbox: (image: GeneratedImage) => void;
  onOpenUpscaler: (image: GeneratedImage) => void;
  externalPrompt?: string;
  externalModel?: AIModel;
  externalAspectRatio?: AspectRatio;
}

export const StudioCreator: React.FC<StudioCreatorProps> = ({
  onImageGenerated,
  onOpenLightbox,
  onOpenUpscaler,
  externalPrompt,
  externalModel,
  externalAspectRatio,
}) => {
  // Generation Settings State
  const [prompt, setPrompt] = useState(
    'A cybernetic neon lotus blooming on crystalline lake under aurora borealis, bioluminescent reflections, 8k cinematic lighting'
  );
  const [negativePrompt, setNegativePrompt] = useState(
    'blurry, low quality, distorted anatomy, extra limbs, ugly, bad hands, watermark, grainy'
  );
  const [selectedModel, setSelectedModel] = useState<AIModel>('flux');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('16:9');
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [customSeed, setCustomSeed] = useState<number>(() => Math.floor(Math.random() * 9999999));
  const [batchCount, setBatchCount] = useState<1 | 2 | 4>(1);
  const [enhancePrompt, setEnhancePrompt] = useState(false);

  // UI Accordions
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Active Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [activeBatch, setActiveBatch] = useState<GeneratedImage[]>([]);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external prompts from Inspiration or History
  useEffect(() => {
    if (externalPrompt) {
      setPrompt(externalPrompt);
      if (promptTextareaRef.current) {
        promptTextareaRef.current.focus();
      }
    }
    if (externalModel) setSelectedModel(externalModel);
    if (externalAspectRatio) setSelectedRatio(externalAspectRatio);
  }, [externalPrompt, externalModel, externalAspectRatio]);

  // Loading timer & tip rotator
  useEffect(() => {
    if (isGenerating) {
      setGenerationTime(0);
      timerRef.current = window.setInterval(() => {
        setGenerationTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);

      const tipInterval = window.setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % GENERATION_TIPS.length);
      }, 3500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        clearInterval(tipInterval);
      };
    }
  }, [isGenerating]);

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating && prompt.trim()) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, isGenerating, selectedModel, selectedRatio, selectedStyle, useRandomSeed, customSeed, batchCount, negativePrompt, enhancePrompt]);

  // AI Prompt Enhancer via server API
  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: selectedStyle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhancedPrompt) {
          setPrompt(data.enhancedPrompt);
          return;
        }
      }
      // If serverless endpoint returned error or 404, use client-side enhancement
      const fallbackEnhanced = clientProceduralPromptEnhance(prompt, selectedStyle);
      setPrompt(fallbackEnhanced);
    } catch {
      const fallbackEnhanced = clientProceduralPromptEnhance(prompt, selectedStyle);
      setPrompt(fallbackEnhanced);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Random prompt
  const handleSurpriseMe = () => {
    const nextPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(nextPrompt);
  };

  // Append modifier chip to prompt
  const handleAppendModifier = (text: string) => {
    if (!prompt.includes(text)) {
      setPrompt((prev) => (prev.trim() ? `${prev.trim()}, ${text}` : text));
    }
  };

  // Single or Batch Generation Execution
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);

    const count = batchCount;
    const baseSeed = useRandomSeed ? Math.floor(Math.random() * 2147483647) : customSeed;
    const generatedImages: GeneratedImage[] = [];

    try {
      // Execute requests in parallel for batches
      const promises = Array.from({ length: count }).map(async (_, idx) => {
        const itemSeed = baseSeed + idx * 7919;
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              negativePrompt,
              aspectRatio: selectedRatio,
              model: selectedModel,
              seed: itemSeed,
              style: selectedStyle,
              enhance: enhancePrompt,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const imgObj: GeneratedImage = {
              id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
              prompt: data.prompt || prompt,
              negativePrompt,
              imageUrl: data.imageUrl || data.directUrl,
              directUrl: data.directUrl,
              aspectRatio: selectedRatio,
              model: data.model || selectedModel,
              seed: data.seed || itemSeed,
              width: data.width || 1024,
              height: data.height || 1024,
              timestamp: data.timestamp || Date.now(),
              style: selectedStyle,
            };
            return imgObj;
          }
        } catch (fetchErr) {
          console.warn('API route unavailable, using direct client-side generation:', fetchErr);
        }

        // Direct client fallback for Netlify static or offline environments
        const directUrl = constructDirectImageUrl(
          prompt,
          selectedModel,
          selectedRatio,
          itemSeed,
          negativePrompt,
          enhancePrompt
        );

        const imgObj: GeneratedImage = {
          id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          prompt,
          negativePrompt,
          imageUrl: directUrl,
          directUrl,
          aspectRatio: selectedRatio,
          model: selectedModel,
          seed: itemSeed,
          width: 1024,
          height: 1024,
          timestamp: Date.now(),
          style: selectedStyle,
        };
        return imgObj;
      });

      const results = await Promise.all(promises);
      results.forEach((img) => {
        generatedImages.push(img);
        onImageGenerated(img);
      });

      setActiveBatch(generatedImages);
      setSelectedBatchIndex(0);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err.message || 'Image generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy helper
  const handleCopy = async (type: 'prompt' | 'seed') => {
    const activeImage = activeBatch[selectedBatchIndex];
    if (!activeImage) return;

    if (type === 'prompt') {
      await navigator.clipboard.writeText(activeImage.prompt);
    } else if (type === 'seed') {
      await navigator.clipboard.writeText(activeImage.seed.toString());
    }

    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const currentImage = activeBatch[selectedBatchIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* LEFT COLUMN: Controls & Prompt Studio (5 cols on lg) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Prompt Input Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Prompt Studio
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSurpriseMe}
                className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                🎲 Random
              </button>
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Quick Idea Starters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPT_PILLS.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setPrompt(pill.prompt)}
                className="rounded-lg border border-white/5 bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-violet-500/40 hover:text-white whitespace-nowrap transition-all"
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              ref={promptTextareaRef}
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate in detail... (e.g., A cybernetic samurai standing in rain-slicked Neo Tokyo, neon reflections, 8k resolution)"
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>{prompt.length} characters</span>
              <span className="hidden sm:inline">Press Ctrl+Enter to generate</span>
            </div>
          </div>

          {/* AI Enhance & Presets Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || !prompt.trim()}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all disabled:opacity-50"
            >
              <Wand2 className={`h-3.5 w-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
              <span>{isEnhancing ? 'Enhancing with AI...' : '✨ AI Enhance'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAppendModifier('8k raw photo, highly detailed')}
              className="rounded-lg border border-white/5 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
            >
              + 8K Detail
            </button>
            <button
              type="button"
              onClick={() => handleAppendModifier('cinematic lighting, 35mm film')}
              className="rounded-lg border border-white/5 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
            >
              + Cinematic
            </button>
            <button
              type="button"
              onClick={() => handleAppendModifier('octane render, Unreal Engine 5')}
              className="rounded-lg border border-white/5 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
            >
              + 3D Octane
            </button>
          </div>
        </div>

        {/* Model Selector Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              AI Model Engine
            </label>
            <span className="text-[11px] text-emerald-400 font-medium">Free & Unlimited</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(AI_MODELS_INFO) as AIModel[]).map((mKey) => {
              const info = AI_MODELS_INFO[mKey];
              const isSelected = selectedModel === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => setSelectedModel(mKey)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-600/15 shadow-md shadow-violet-500/10'
                      : 'border-white/5 bg-slate-950/60 hover:border-white/20 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{info.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-violet-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{info.tag}</span>
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">{info.speed}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl shadow-xl flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
            Aspect Ratio
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { ratio: '1:1', label: 'Square', desc: '1024x1024', icon: 'w-4 h-4 rounded-sm' },
              { ratio: '16:9', label: 'Landscape', desc: '1280x720', icon: 'w-6 h-3.5 rounded-sm' },
              { ratio: '9:16', label: 'Portrait', desc: '720x1280', icon: 'w-3.5 h-6 rounded-sm' },
              { ratio: '4:3', label: 'Standard', desc: '1024x768', icon: 'w-5 h-4 rounded-sm' },
              { ratio: '3:4', label: 'Tall', desc: '768x1024', icon: 'w-4 h-5 rounded-sm' },
              { ratio: '21:9', label: 'Cinema', desc: '1344x576', icon: 'w-7 h-3 rounded-sm' },
            ].map((item) => {
              const isSelected = selectedRatio === item.ratio;
              return (
                <button
                  key={item.ratio}
                  type="button"
                  onClick={() => setSelectedRatio(item.ratio as AspectRatio)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-md shadow-cyan-500/10'
                      : 'border-white/5 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div
                    className={`border border-current mb-1.5 flex items-center justify-center ${item.icon}`}
                  />
                  <span className="text-[11px] font-semibold">{item.ratio}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Style Presets Grid */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-pink-400" />
              Artistic Style
            </label>
            {selectedStyle && (
              <button
                type="button"
                onClick={() => setSelectedStyle('')}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLE_PRESETS.map((preset) => {
              const isSelected = selectedStyle === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedStyle(isSelected ? '' : preset.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-pink-500 bg-pink-500/10 shadow-sm shadow-pink-500/20'
                      : 'border-white/5 bg-slate-950/60 hover:border-white/20'
                  }`}
                >
                  <div
                    className={`h-6 w-6 shrink-0 rounded-lg bg-gradient-to-tr ${preset.accentColor} flex items-center justify-center text-[10px] text-white font-bold`}
                  >
                    ✦
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-white truncate">{preset.name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{preset.badge || 'Preset'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Accordion (Negative Prompt, Seed, Batch, Modifiers) */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl shadow-xl flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-indigo-400" />
              Advanced Generation Options
            </span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-4 pt-3 border-t border-white/5">
              {/* Negative Prompt */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Negative Prompt (Things to exclude)
                </label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="e.g., blurry, low quality, distorted anatomy, text..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Seed Control */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block">Seed Control</label>
                  <p className="text-[10px] text-slate-500">Lock seed for consistent variations</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseRandomSeed(!useRandomSeed)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      useRandomSeed
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {useRandomSeed ? '🎲 Random Seed' : '🔒 Fixed Seed'}
                  </button>
                  {!useRandomSeed && (
                    <input
                      type="number"
                      value={customSeed}
                      onChange={(e) => setCustomSeed(Number(e.target.value))}
                      className="w-24 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Batch Count */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block">Batch Generation</label>
                  <p className="text-[10px] text-slate-500">Generate multiple variations simultaneously</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1">
                  {([1, 2, 4] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setBatchCount(count)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        batchCount === count
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {count}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Modifiers Tags (Lighting & Camera) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Lighting & Camera Modifiers
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LIGHTING_MODIFIERS.slice(0, 4).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleAppendModifier(m)}
                      className="text-[10px] rounded-md border border-white/5 bg-slate-800/80 px-2 py-1 text-slate-300 hover:bg-violet-600/30 hover:border-violet-500/50 transition-all"
                    >
                      💡 {m}
                    </button>
                  ))}
                  {CAMERA_MODIFIERS.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleAppendModifier(c)}
                      className="text-[10px] rounded-md border border-white/5 bg-slate-800/80 px-2 py-1 text-slate-300 hover:bg-cyan-600/30 hover:border-cyan-500/50 transition-all"
                    >
                      📷 {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Big Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="relative group w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-xl shadow-violet-600/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 rounded-[15px] bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 px-6 py-4 text-sm font-bold text-white transition-all group-hover:bg-opacity-90">
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>
                  Generating {batchCount > 1 ? `${batchCount} Images` : 'Image'} with {AI_MODELS_INFO[selectedModel].name}...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-cyan-200 animate-pulse" />
                <span>
                  Generate {batchCount > 1 ? `${batchCount} Images` : 'Free Image'} (Unlimited)
                </span>
                <span className="hidden sm:inline text-xs font-normal text-white/70">
                  [Ctrl + Enter]
                </span>
              </>
            )}
          </div>
        </button>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Output Canvas / Showcase (7 cols on lg) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl min-h-[520px] flex flex-col">
          {/* Header Bar of Canvas */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                {isGenerating
                  ? `Rendering... ${generationTime}s`
                  : currentImage
                  ? `Output: ${currentImage.width}×${currentImage.height}`
                  : 'Ready for Creation'}
              </span>
              {currentImage && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {currentImage.model}
                </span>
              )}
            </div>

            {/* Quick Actions for Current Image */}
            {currentImage && !isGenerating && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadImage(currentImage.imageUrl, currentImage.prompt)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-all"
                  title="Download Image (PNG)"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Save</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenUpscaler(currentImage)}
                  className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-300 hover:bg-violet-500/20 transition-all"
                  title="Upscale to 4K & Adjust"
                >
                  <Sliders className="h-3.5 w-3.5 text-violet-400" />
                  <span className="hidden sm:inline">4K Upscale</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenLightbox(currentImage)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/80 p-1.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-all"
                  title="Fullscreen Lightbox"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Canvas Display Viewport */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl bg-slate-950/70 border border-white/5">
            {isGenerating ? (
              /* Loading State Card */
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full border-4 border-violet-500/20 border-t-cyan-400 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  Synthesizing High-Res Visuals...
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  Elapsed: <span className="text-cyan-400 font-semibold">{generationTime}s</span> • Model: {AI_MODELS_INFO[selectedModel].name}
                </p>

                {/* Rotating tip card */}
                <div className="rounded-xl border border-white/5 bg-slate-900/80 p-3 text-xs text-slate-400 shadow-inner">
                  <p className="italic transition-all duration-500">
                    "{GENERATION_TIPS[currentTipIndex]}"
                  </p>
                </div>
              </div>
            ) : currentImage ? (
              /* Generated Image Viewport */
              <div className="relative group w-full h-full flex items-center justify-center p-2">
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-[500px] w-auto max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                />

                {/* Overlay hover actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5 rounded-2xl pointer-events-none">
                  <div className="pointer-events-auto flex items-center justify-between">
                    <div className="max-w-[70%]">
                      <p className="text-xs font-semibold text-white line-clamp-2">
                        {currentImage.prompt}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        Seed: {currentImage.seed} • {currentImage.aspectRatio}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy('prompt')}
                        className="rounded-lg bg-slate-800/90 hover:bg-slate-700 p-2 text-white text-xs border border-white/10"
                        title="Copy Prompt"
                      >
                        {copiedType === 'prompt' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenLightbox(currentImage)}
                        className="rounded-lg bg-violet-600 hover:bg-violet-500 p-2 text-white text-xs shadow-md"
                        title="Expand"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Starter Artwork Showcase View */
              <div className="relative group w-full h-full flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                  <img
                    src={DEFAULT_STARTER_IMAGES[0].imageUrl}
                    alt={DEFAULT_STARTER_IMAGES[0].prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-[420px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent flex flex-col justify-end p-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/80 px-2.5 py-0.5 text-[10px] font-semibold text-white w-fit mb-2">
                      ✦ Featured Creation (Flux.1 Schnell)
                    </span>
                    <p className="text-xs text-white line-clamp-2 font-medium">
                      "{DEFAULT_STARTER_IMAGES[0].prompt}"
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(DEFAULT_STARTER_IMAGES[0].prompt);
                          setSelectedRatio(DEFAULT_STARTER_IMAGES[0].aspectRatio);
                          setSelectedModel(DEFAULT_STARTER_IMAGES[0].model as AIModel);
                        }}
                        className="rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-md"
                      >
                        Remix This Prompt
                      </button>
                      <button
                        type="button"
                        onClick={handleSurpriseMe}
                        className="rounded-xl border border-white/20 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-all"
                      >
                        🎲 Surprise Prompt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Batch Selector Strip (if more than 1 image generated in batch) */}
          {activeBatch.length > 1 && (
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <span className="text-xs font-semibold text-slate-400">Batch Variations:</span>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {activeBatch.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedBatchIndex(idx)}
                    className={`relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedBatchIndex === idx
                        ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/30'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={`Batch variation ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-mono text-white">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Details Footer */}
          {currentImage && (
            <div className="mt-auto pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-500">Seed:</span>
                <span className="font-mono text-slate-300">{currentImage.seed}</span>
                <button
                  type="button"
                  onClick={() => handleCopy('seed')}
                  className="text-slate-500 hover:text-white"
                  title="Copy Seed"
                >
                  {copiedType === 'seed' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(currentImage.prompt);
                    setSelectedModel(currentImage.model as AIModel);
                    setSelectedRatio(currentImage.aspectRatio);
                  }}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Remix Prompt</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
