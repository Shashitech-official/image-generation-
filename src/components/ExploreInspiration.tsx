import React, { useState } from 'react';
import { Compass, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';
import { PromptInspiration, AIModel, AspectRatio } from '../types/generator';
import { PROMPT_INSPIRATIONS } from '../data/presets';

interface ExploreInspirationProps {
  onSelectPrompt: (prompt: string, model: AIModel, ratio: AspectRatio) => void;
}

export const ExploreInspiration: React.FC<ExploreInspirationProps> = ({ onSelectPrompt }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Cyberpunk', 'Fantasy', 'Portrait', 'Anime', '3D Art', 'Sci-Fi'];

  const filtered = selectedCategory === 'All'
    ? PROMPT_INSPIRATIONS
    : PROMPT_INSPIRATIONS.filter((item) => item.category === selectedCategory);

  const handleCopyPrompt = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 flex flex-col gap-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-950 p-6 sm:p-8 backdrop-blur-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-3">
            <Compass className="h-3.5 w-3.5" />
            <span>Master Prompt Inspiration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Curated Community Prompts & Styles
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Click any showcase prompt to instantly load its cinematic settings, aspect ratio, and model into your Studio Creator.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Showcase Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden backdrop-blur-md shadow-xl transition-all duration-300 hover:border-violet-500/50 hover:-translate-y-1"
          >
            {/* Visual Preview */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
              <img
                src={item.previewUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white">
                  {item.aspectRatio}
                </span>
                <span className="rounded-md bg-violet-600/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-5">
              <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed font-normal">
                "{item.prompt}"
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(item.id, item.prompt)}
                  className="rounded-xl border border-white/10 bg-slate-800/80 p-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Copy Prompt"
                >
                  {copiedId === item.id ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectPrompt(item.prompt, item.recommendedModel, item.aspectRatio)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:brightness-110 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Use This Prompt</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
