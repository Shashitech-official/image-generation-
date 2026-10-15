import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Trash2,
  Download,
  Sliders,
  Maximize2,
  RefreshCw,
  FolderDown,
  Check,
  AlertTriangle,
  History,
} from 'lucide-react';
import { GeneratedImage, AIModel, AspectRatio } from '../types/generator';
import { downloadImage } from '../lib/canvasUpscaler';

interface GalleryHistoryProps {
  images: GeneratedImage[];
  onDeleteImage: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onSelectForRemix: (image: GeneratedImage) => void;
  onOpenLightbox: (image: GeneratedImage) => void;
  onOpenUpscaler: (image: GeneratedImage) => void;
  onGoToStudio: () => void;
}

export const GalleryHistory: React.FC<GalleryHistoryProps> = ({
  images,
  onDeleteImage,
  onToggleFavorite,
  onClearAll,
  onSelectForRemix,
  onOpenLightbox,
  onOpenUpscaler,
  onGoToStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterRatio, setFilterRatio] = useState<string>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filter images based on search query and filter criteria
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (filterFavorites && !img.favorite) return false;
      if (filterModel !== 'all' && img.model !== filterModel) return false;
      if (filterRatio !== 'all' && img.aspectRatio !== filterRatio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          img.prompt.toLowerCase().includes(q) ||
          img.seed.toString().includes(q) ||
          (img.model && img.model.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [images, searchQuery, filterFavorites, filterModel, filterRatio]);

  // Export metadata as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(images, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `omnigen-studio-history-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 flex flex-col gap-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-violet-400" />
              Creation Gallery & History
            </h2>
            <span className="rounded-full bg-violet-600/20 border border-violet-500/30 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
              {images.length} Saved
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            All generated art is automatically saved in your browser's private database.
          </p>
        </div>

        {/* Global actions: Export JSON, Clear */}
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-all"
                title="Export gallery metadata backup as JSON"
              >
                <FolderDown className="h-4 w-4 text-cyan-400" />
                <span className="hidden sm:inline">Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-all"
                title="Clear all stored creations"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onGoToStudio}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-all shadow-md shadow-violet-600/30"
          >
            <span>+ Create New</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts, seeds, models..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              filterFavorites
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${filterFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Models</option>
            <option value="flux">Flux.1 Schnell</option>
            <option value="flux-realism">Flux Realism</option>
            <option value="flux-anime">Flux Anime</option>
            <option value="flux-3d">Flux 3D</option>
            <option value="turbo">SDXL Turbo</option>
          </select>

          <select
            value={filterRatio}
            onChange={(e) => setFilterRatio(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">All Ratios</option>
            <option value="1:1">1:1 Square</option>
            <option value="16:9">16:9 Landscape</option>
            <option value="9:16">9:16 Portrait</option>
            <option value="4:3">4:3 Standard</option>
            <option value="3:4">3:4 Poster</option>
            <option value="21:9">21:9 Cinema</option>
          </select>
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Clear All History?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6">
              This will remove all {images.length} saved images from your browser storage. This action cannot be undone. You can export a JSON metadata backup first.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClearOpen(false);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4 text-violet-400">
            <History className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {images.length === 0 ? 'No Creations Yet' : 'No Matching Images Found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            {images.length === 0
              ? 'Jump into the Studio Creator to synthesize your first free AI images with Flux or SDXL!'
              : 'Try clearing your search query or adjusting your filters to see more creations.'}
          </p>
          <button
            type="button"
            onClick={onGoToStudio}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 transition-all"
          >
            Create an Image Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden backdrop-blur-md shadow-lg transition-all duration-300 hover:border-violet-500/50 hover:shadow-violet-500/10 hover:-translate-y-1"
            >
              {/* Image Viewport */}
              <div
                className="relative aspect-square w-full overflow-hidden bg-slate-950 cursor-pointer"
                onClick={() => onOpenLightbox(image)}
              >
                <img
                  src={image.imageUrl}
                  alt={image.prompt}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Favorite Star Button (Top Right) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(image.id);
                  }}
                  className="absolute top-2.5 right-2.5 rounded-full bg-slate-950/70 backdrop-blur-md p-1.5 text-white hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-4 w-4 ${
                      image.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>

                {/* Aspect ratio & Model Badge (Top Left) */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white">
                    {image.aspectRatio}
                  </span>
                  <span className="rounded-md bg-violet-600/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {image.model}
                  </span>
                </div>

                {/* Hover overlay with action icons */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image.imageUrl, image.prompt);
                      }}
                      className="rounded-lg bg-slate-800/90 hover:bg-slate-700 p-2 text-white text-xs border border-white/10"
                      title="Download Image"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUpscaler(image);
                      }}
                      className="rounded-lg bg-slate-800/90 hover:bg-slate-700 p-2 text-white text-xs border border-white/10"
                      title="4K Upscale"
                    >
                      <Sliders className="h-3.5 w-3.5 text-violet-400" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForRemix(image);
                      }}
                      className="rounded-lg bg-slate-800/90 hover:bg-slate-700 p-2 text-white text-xs border border-white/10"
                      title="Remix in Studio"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-pink-400" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(image.id);
                    }}
                    className="rounded-lg bg-rose-600/80 hover:bg-rose-500 p-2 text-white text-xs"
                    title="Delete Image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer Details */}
              <div className="flex flex-col p-3">
                <p className="text-xs text-slate-200 line-clamp-2 font-medium" title={image.prompt}>
                  {image.prompt}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-mono">
                  <span>Seed: {image.seed}</span>
                  <span>{new Date(image.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
