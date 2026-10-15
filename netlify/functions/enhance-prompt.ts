import { GoogleGenAI } from '@google/genai';

function proceduralPromptEnhancer(prompt: string, style?: string): string {
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

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const body = await req.json();
    const { prompt, style } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const systemInstruction = `You are an elite prompt engineer for AI image generators (Flux, Midjourney, SDXL).
Given a user's basic concept, expand it into a vivid, descriptive prompt that yields breathtaking visuals.
Incorporate photographic or artistic camera angles, specific lighting, textures, colors, mood, and compositional details.
Do NOT output conversational filler. Output ONLY the improved prompt text directly in 1 to 3 rich sentences.`;

        const styleInstruction = style ? ` The target aesthetic is "${style}".` : '';
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Enhance this prompt for image generation:${styleInstruction} "${prompt}"`,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 250,
          },
        });

        const enhanced = response.text?.trim();
        if (enhanced && enhanced.length > 10) {
          return new Response(JSON.stringify({ enhancedPrompt: enhanced }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini enhancement fallback used on Netlify:', geminiErr);
      }
    }

    // Procedural fallback
    const enhanced = proceduralPromptEnhancer(prompt, style);
    return new Response(JSON.stringify({ enhancedPrompt: enhanced }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to enhance prompt', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
