/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudioCreator } from './components/StudioCreator';
import { GalleryHistory } from './components/GalleryHistory';
import { ExploreInspiration } from './components/ExploreInspiration';
import { ImageToolsModal } from './components/ImageToolsModal';
import { LightboxModal } from './components/LightboxModal';
import {
  GeneratedImage,
  AIModel,
  AspectRatio,
} from './types/generator';
import {
  getAllImagesFromStorage,
  saveImageToStorage,
  deleteImageFromStorage,
  toggleFavoriteInStorage,
  clearAllImagesStorage,
  getLifetimeGenerationsCount,
  incrementLifetimeGenerationsCount,
} from './lib/storage';
import { RANDOM_PROMPTS } from './data/presets';
import { Sparkles, Zap, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'creator' | 'gallery' | 'explore' | 'tools'>('creator');
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [lifetimeCount, setLifetimeCount] = useState<number>(0);

  // Active items for modals
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [toolsImage, setToolsImage] = useState<GeneratedImage | null>(null);

  // External parameters to feed into Studio Creator
  const [externalPrompt, setExternalPrompt] = useState<string>('');
  const [externalModel, setExternalModel] = useState<AIModel | undefined>(undefined);
  const [externalAspectRatio, setExternalAspectRatio] = useState<AspectRatio | undefined>(undefined);

  // Load saved images from IndexedDB on initial mount
  useEffect(() => {
    async function initStorage() {
      try {
        const stored = await getAllImagesFromStorage();
        setSavedImages(stored);
        setLifetimeCount(getLifetimeGenerationsCount());
      } catch (err) {
        console.error('Storage initialization failed:', err);
      }
    }
    initStorage();
  }, []);

  // When a new image is generated in StudioCreator
  const handleImageGenerated = async (newImage: GeneratedImage) => {
    setSavedImages((prev) => [newImage, ...prev]);
    const updatedCount = incrementLifetimeGenerationsCount(1);
    setLifetimeCount(updatedCount);
    await saveImageToStorage(newImage);
  };

  // Delete an image
  const handleDeleteImage = async (id: string) => {
    setSavedImages((prev) => prev.filter((img) => img.id !== id));
    await deleteImageFromStorage(id);
    if (lightboxImage?.id === id) setLightboxImage(null);
    if (toolsImage?.id === id) setToolsImage(null);
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const isFav = await toggleFavoriteInStorage(id);
    setSavedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, favorite: isFav } : img))
    );
  };

  // Clear all history
  const handleClearAll = async () => {
    await clearAllImagesStorage();
    setSavedImages([]);
  };

  // Load prompt for remixing in Studio Creator
  const handleSelectForRemix = (image: GeneratedImage) => {
    setExternalPrompt(image.prompt);
    setExternalModel(image.model as AIModel);
    setExternalAspectRatio(image.aspectRatio);
    setActiveTab('creator');
  };

  // Use inspiration prompt
  const handleSelectInspiration = (prompt: string, model: AIModel, ratio: AspectRatio) => {
    setExternalPrompt(prompt);
    setExternalModel(model);
    setExternalAspectRatio(ratio);
    setActiveTab('creator');
  };

  // Surprise me random button
  const handleSurpriseMe = () => {
    const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setExternalPrompt(random);
    setActiveTab('creator');
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedImages.length}
        lifetimeCount={lifetimeCount}
        onSurpriseMe={handleSurpriseMe}
      />

      {/* Main Content Sections */}
      <main className="flex-1 pb-16">
        {activeTab === 'creator' && (
          <StudioCreator
            onImageGenerated={handleImageGenerated}
            onOpenLightbox={(img) => setLightboxImage(img)}
            onOpenUpscaler={(img) => setToolsImage(img)}
            externalPrompt={externalPrompt}
            externalModel={externalModel}
            externalAspectRatio={externalAspectRatio}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryHistory
            images={savedImages}
            onDeleteImage={handleDeleteImage}
            onToggleFavorite={handleToggleFavorite}
            onClearAll={handleClearAll}
            onSelectForRemix={handleSelectForRemix}
            onOpenLightbox={(img) => setLightboxImage(img)}
            onOpenUpscaler={(img) => setToolsImage(img)}
            onGoToStudio={() => setActiveTab('creator')}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreInspiration onSelectPrompt={handleSelectInspiration} />
        )}

        {activeTab === 'tools' && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Standalone Image Studio</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                4K Canvas Super-Resolution & Filters
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Enhance clarity, upscale to 4096px, adjust contrast & saturation, or describe any image with multimodal AI.
              </p>
              <button
                type="button"
                onClick={() => setToolsImage(savedImages[0] || null)}
                className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 transition-all"
              >
                Open 4K Image Workshop
              </button>
            </div>

            {/* Quick Gallery selector to pick an image to upscale */}
            {savedImages.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select a Generated Image to Upscale or Adjust:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {savedImages.slice(0, 12).map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setToolsImage(img)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-violet-500 transition-all hover:scale-105"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                        Upscale
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      <LightboxModal
        image={lightboxImage}
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        onOpenUpscaler={(img) => setToolsImage(img)}
        onRemix={handleSelectForRemix}
      />

      {/* 4K Upscaler & Image Tools Modal */}
      <ImageToolsModal
        image={toolsImage}
        isOpen={Boolean(toolsImage) || activeTab === 'tools'}
        onClose={() => {
          setToolsImage(null);
          if (activeTab === 'tools') setActiveTab('creator');
        }}
        onSendToStudio={(descPrompt) => {
          setExternalPrompt(descPrompt);
          setActiveTab('creator');
        }}
      />

      {/* Modern Studio Footer */}
      <footer className="border-t border-white/10 bg-slate-950/70 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">OmniGen Studio</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">100% Free & Unlimited Generations</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Flux.1 Schnell & Realism
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Private Local Database
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
