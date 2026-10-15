import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  RefreshCw,
  Check,
} from 'lucide-react';
import { GeneratedImage } from '../types/generator';
import { downloadImage } from '../lib/canvasUpscaler';

interface LightboxModalProps {
  image: GeneratedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUpscaler: (image: GeneratedImage) => void;
  onRemix: (image: GeneratedImage) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  image,
  isOpen,
  onClose,
  onOpenUpscaler,
  onRemix,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setZoomLevel(1);
  }, [image, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-xl p-4 sm:p-6 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-violet-600/40 border border-violet-500/50 px-2.5 py-1 text-xs font-semibold">
            {image.model}
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {image.width} × {image.height} • Seed: {image.seed}
          </span>
        </div>

        {/* Zoom Controls & Close */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display Viewport with smooth zoom */}
      <div className="relative flex-1 flex items-center justify-center overflow-auto my-2">
        <div
          className="transition-transform duration-200 ease-out max-h-full max-w-full flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={image.imageUrl}
            alt={image.prompt}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      </div>

      {/* Bottom Bar: Prompt & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-2xl z-10">
        <div className="max-w-2xl">
          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-normal">
            "{image.prompt}"
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
            title="Copy Prompt"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied' : 'Prompt'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRemix(image);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-all"
            title="Remix in Studio"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Remix</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenUpscaler(image);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            title="4K Upscale"
          >
            <Sliders className="h-4 w-4" />
            <span>4K Upscale</span>
          </button>

          <button
            type="button"
            onClick={() => downloadImage(image.imageUrl, image.prompt)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
