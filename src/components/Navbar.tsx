import React from 'react';
import { Sparkles, Image, Compass, Sliders, Zap, History } from 'lucide-react';

interface NavbarProps {
  activeTab: 'creator' | 'gallery' | 'explore' | 'tools';
  setActiveTab: (tab: 'creator' | 'gallery' | 'explore' | 'tools') => void;
  savedCount: number;
  lifetimeCount: number;
  onSurpriseMe: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  lifetimeCount,
  onSurpriseMe,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                OmniGen Studio
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Free & Unlimited
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Flux.1 • SDXL • Gemini Vision • Zero Limits
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1">
          <button
            onClick={() => setActiveTab('creator')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'creator'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'gallery'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Gallery</span>
            {savedCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] text-white">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'explore'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Inspiration</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'tools'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden md:inline">4K Upscaler</span>
          </button>
        </nav>

        {/* Right Action & Stats */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Created:</span>
            <span className="font-semibold text-white">{lifetimeCount}</span>
          </div>

          <button
            onClick={onSurpriseMe}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            title="Generate a randomized aesthetic prompt"
          >
            <span>🎲</span>
            <span className="hidden sm:inline">Surprise Me</span>
          </button>
        </div>
      </div>
    </header>
  );
};
