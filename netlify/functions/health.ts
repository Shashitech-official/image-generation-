export default async (req: Request) => {
  return new Response(
    JSON.stringify({
      status: 'online',
      environment: 'netlify-functions',
      unlimited: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      supportedModels: ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo'],
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
