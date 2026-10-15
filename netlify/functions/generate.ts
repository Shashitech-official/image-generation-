const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
  '21:9': { width: 1344, height: 576 },
};

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
    const {
      prompt,
      negativePrompt,
      aspectRatio = '1:1',
      model = 'flux',
      seed = Math.floor(Math.random() * 2147483647),
      enhance = false,
      style = '',
    } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let finalPrompt = prompt.trim();
    if (style && !finalPrompt.toLowerCase().includes(style.toLowerCase())) {
      finalPrompt = `${finalPrompt}, ${style} style`;
    }

    const dims = ASPECT_RATIO_MAP[aspectRatio] || { width: 1024, height: 1024 };

    // Support Gemini Imagen if key exists in Netlify environment variables
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (model === 'gemini-imagen' && geminiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts: [{ text: finalPrompt }] },
        });

        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              return new Response(
                JSON.stringify({
                  success: true,
                  imageUrl,
                  model: 'gemini-imagen',
                  seed,
                  prompt: finalPrompt,
                  aspectRatio,
                  width: dims.width,
                  height: dims.height,
                  timestamp: Date.now(),
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                }
              );
            }
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini Imagen Netlify error, falling back to flux:', geminiErr.message);
      }
    }

    let pollinationsModel = 'flux';
    if (model === 'flux-realism') pollinationsModel = 'flux-realism';
    else if (model === 'flux-anime') pollinationsModel = 'flux-anime';
    else if (model === 'flux-3d') pollinationsModel = 'flux-3d';
    else if (model === 'turbo') pollinationsModel = 'turbo';
    else pollinationsModel = 'flux';

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

    // Serverless fetch with 25s timeout (Netlify free functions timeout at 26s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OmniGen-Studio/1.0',
          Accept: 'image/jpeg,image/png,image/webp,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const dataUri = `data:${contentType};base64,${base64Data}`;

      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    } catch {
      clearTimeout(timeoutId);
      // Fallback directly returning targetUrl so the browser loads image directly
      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Generation failed', details: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
};
