export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

export type AIModel =
  | 'flux'
  | 'flux-realism'
  | 'flux-anime'
  | 'flux-3d'
  | 'turbo'
  | 'gemini-imagen';

export interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl: string;
  directUrl?: string;
  aspectRatio: AspectRatio;
  model: AIModel | string;
  seed: number;
  width: number;
  height: number;
  timestamp: number;
  favorite?: boolean;
  style?: string;
  upscaled?: boolean;
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  model: AIModel;
  seed?: number;
  useRandomSeed: boolean;
  style?: string;
  enhancePrompt: boolean;
  batchCount: 1 | 2 | 4;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  promptSnippet: string;
  negativeSnippet?: string;
  badge?: string;
  accentColor: string;
}

export interface PromptInspiration {
  id: string;
  title: string;
  category: string;
  prompt: string;
  negativePrompt?: string;
  recommendedModel: AIModel;
  aspectRatio: AspectRatio;
  previewUrl: string;
  tags: string[];
}
