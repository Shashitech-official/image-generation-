import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Gemini client if API key is present
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Map aspect ratios to dimensions optimal for Flux and SDXL models
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
  '21:9': { width: 1344, height: 576 },
};

// Fallback procedural prompt enhancer for unlimited offline usage
function proceduralPromptEnhancer(prompt: string, style?: string): string {
  const base = prompt.trim();
  const styleModifiers: Record<string, string> = {
    photorealistic: 'hyper-realistic photography, 8k resolution, shot on Hasselblad H6D-100c, 85mm f/1.4 lens, natural skin texture, studio lighting, subsurface scattering, raw photo',
    cinematic: 'cinematic still, 35mm film photography, Panavision anamorphic lens, dramatic volumetric lighting, cinematic color grading, shallow depth of field, IMAX quality',
    anime: 'masterpiece anime illustration by Makoto Shinkai and Studio Ghibli, vibrant cel shading, detailed eyes, atmospheric lighting, dynamic angle, 4k digital art',
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

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    unlimited: true,
    hasGeminiKey: Boolean(geminiApiKey),
    supportedModels: ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo', 'gemini-imagen'],
  });
});

// Prompt Enhancer endpoint powered by Gemini with procedural fallback
app.post('/api/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (ai) {
      try {
        const systemInstruction = `You are an elite prompt engineer for AI image generators (Flux, Midjourney, SDXL).
Given a user's basic concept, expand it into a vivid, descriptive prompt that yields breathtaking visuals.
Incorporate photographic or artistic camera angles, specific lighting (e.g. volumetric, chiaroscuro, golden hour), textures, colors, mood, and compositional details.
Do NOT output conversational filler or preamble. Output ONLY the improved prompt text directly in 1 to 3 rich sentences.`;

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
          res.json({ enhancedPrompt: enhanced });
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini prompt enhancement fallback used:', geminiErr);
      }
    }

    // Procedural fallback
    const enhanced = proceduralPromptEnhancer(prompt, style);
    res.json({ enhancedPrompt: enhanced });
  } catch (error: any) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({ error: 'Failed to enhance prompt', details: error.message });
  }
});

// Image reverse-engineering / description endpoint
app.post('/api/describe-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Image base64 data required' });
      return;
    }

    if (ai) {
      try {
        // Strip data:image/...;base64, prefix if present
        const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/jpeg';
        const rawBase64 = matches ? matches[2] : imageBase64;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: rawBase64,
                },
              },
              {
                text: 'Describe this image as an ultra-detailed image generation prompt for Midjourney/Flux. Focus on subjects, style, camera view, lighting, colors, and art medium. Do not include introductory text, just the prompt.',
              },
            ],
          },
        });

        const promptText = response.text?.trim() || 'A striking artistic composition with dramatic lighting and rich texture';
        res.json({ prompt: promptText });
        return;
      } catch (err: any) {
        console.warn('Image description error:', err);
      }
    }

    res.json({
      prompt: 'A stunning portrait of subject, cinematic natural lighting, soft bokeh background, highly detailed 8k photography',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to describe image' });
  }
});

// Core Image Generation Endpoint (Free & Unlimited via Pollinations / Gemini)
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      negativePrompt,
      aspectRatio = '1:1',
      model = 'flux',
      seed = Math.floor(Math.random() * 2147483647),
      enhance = false,
      style = '',
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Clean and compose prompt with style if provided
    let finalPrompt = prompt.trim();
    if (style && !finalPrompt.toLowerCase().includes(style.toLowerCase())) {
      finalPrompt = `${finalPrompt}, ${style} style`;
    }

    const dims = ASPECT_RATIO_MAP[aspectRatio] || { width: 1024, height: 1024 };

    // Native Gemini Imagen generation if selected and available
    if (model === 'gemini-imagen' && ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: finalPrompt }],
          },
        });

        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              res.json({
                success: true,
                imageUrl,
                model: 'gemini-imagen',
                seed,
                prompt: finalPrompt,
                aspectRatio,
                width: dims.width,
                height: dims.height,
                timestamp: Date.now(),
              });
              return;
            }
          }
        }
      } catch (geminiImgErr: any) {
        console.warn('Gemini image generation fallback to flux:', geminiImgErr.message);
      }
    }

    // Determine target Pollinations model
    let pollinationsModel = 'flux';
    if (model === 'flux-realism') pollinationsModel = 'flux-realism';
    else if (model === 'flux-anime') pollinationsModel = 'flux-anime';
    else if (model === 'flux-3d') pollinationsModel = 'flux-3d';
    else if (model === 'turbo') pollinationsModel = 'turbo';
    else pollinationsModel = 'flux';

    // Construct request URL
    const queryParams = new URLSearchParams({
      width: dims.width.toString(),
      height: dims.height.toString(),
      seed: seed.toString(),
      model: pollinationsModel,
      nologo: 'true',
      enhance: enhance ? 'true' : 'false',
    });

    if (negativePrompt && typeof negativePrompt === 'string' && negativePrompt.trim()) {
      queryParams.set('negative_prompt', negativePrompt.trim());
    }

    const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?${queryParams.toString()}`;

    // Server-side fetch with timeout and retries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OmniGen-Studio/1.0 (Mozilla/5.0 Free AI Image Generator)',
          Accept: 'image/jpeg,image/png,image/webp,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream provider error: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const dataUri = `data:${contentType};base64,${base64Data}`;

      res.json({
        success: true,
        imageUrl: dataUri,
        directUrl: targetUrl,
        model: pollinationsModel,
        seed,
        prompt: finalPrompt,
        aspectRatio,
        width: dims.width,
        height: dims.height,
        timestamp: Date.now(),
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.error('Fetch error during image generation:', fetchErr);

      // Return direct URL as fallback so client browser can render it directly
      res.json({
        success: true,
        imageUrl: targetUrl,
        directUrl: targetUrl,
        model: pollinationsModel,
        seed,
        prompt: finalPrompt,
        aspectRatio,
        width: dims.width,
        height: dims.height,
        timestamp: Date.now(),
        isDirectFallback: true,
      });
    }
  } catch (error: any) {
    console.error('API generation fatal error:', error);
    res.status(500).json({
      error: 'Generation failed',
      details: error.message || 'Unknown error occurred while generating image',
    });
  }
});

// Dev vs Production Setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OmniGen Studio] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
