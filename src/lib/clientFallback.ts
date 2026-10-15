import { AIModel, AspectRatio } from '../types/generator';

const ASPECT_RATIO_MAP: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
  '21:9': { width: 1344, height: 576 },
};

export function clientProceduralPromptEnhance(prompt: string, style?: string): string {
  const base = prompt.trim();
  const styleModifiers: Record<string, string> = {
    photorealistic: 'hyper-realistic photography, 8k resolution, shot on Hasselblad H6D-100c, 85mm f/1.4 lens, natural skin texture, studio lighting, subsurface scattering, raw photo',
    cinematic: 'cinematic still, 35mm film photography, Panavision anamorphic lens, dramatic volumetric lighting, cinematic color grading, shallow depth of field, IMAX quality',
    anime: 'masterpiece anime artwork by Makoto Shinkai and Studio Ghibli, vibrant cel shading, detailed eyes, atmospheric lighting, dynamic angle, 4k digital art',
    cyberpunk: 'cyberpunk aesthetics, neon volumetric fog, rain-soaked streets, holographic reflections, high-tech dystopian city, octane render, chromatic aberration',
    '3d-render': 'detailed 3D digital render, Unreal Engine 5, Octane render, ray-tracing, soft ambient occlusion, Pixar style lighting, smooth clean textures',
    fantasy: 'epic high fantasy concept art, trending on ArtStation, dynamic heroic lighting, ancient runes, magical glowing particles, intricate ornate details',
    vintage: 'vintage 1970s analog polaroid photograph, warm grainy film texture, light leaks, muted earthy tones, retro nostalgic atmosphere',
    watercolor: 'traditional fluid watercolor painting, expressive wet-on-wet brushstrokes, paper texture, vibrant pigments bleeding into paper, splash art',
    minimalist: 'minimalist modern vector art, clean sharp lines, bold composition, negative space, elegant color palette, Bauhaus influence',
  };

  const styleText = style && styleModifiers[style] ? styleModifiers[style] : 'sharp focus, ultra-detailed, masterpiece, award winning composition';
  return `${base}, ${styleText}`;
}

export function constructDirectImageUrl(
  prompt: string,
  model: AIModel,
  ratio: AspectRatio,
  seed: number,
  negativePrompt?: string,
  enhance?: boolean
): string {
  let pollinationsModel = 'flux';
  if (model === 'flux-realism') pollinationsModel = 'flux-realism';
  else if (model === 'flux-anime') pollinationsModel = 'flux-anime';
  else if (model === 'flux-3d') pollinationsModel = 'flux-3d';
  else if (model === 'turbo') pollinationsModel = 'turbo';

  const dims = ASPECT_RATIO_MAP[ratio] || { width: 1024, height: 1024 };

  const queryParams = new URLSearchParams({
    width: dims.width.toString(),
    height: dims.height.toString(),
    seed: seed.toString(),
    model: pollinationsModel,
    nologo: 'true',
    enhance: enhance ? 'true' : 'false',
  });

  if (negativePrompt && negativePrompt.trim()) {
    queryParams.set('negative_prompt', negativePrompt.trim());
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${queryParams.toString()}`;
}
