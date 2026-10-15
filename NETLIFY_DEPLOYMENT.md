# Deploying OmniGen Studio to Netlify

This repository is pre-configured and 100% **Netlify-Ready**! It includes:
- `netlify.toml` pre-configured build & rewrite rules
- `public/_redirects` for SPA client routing and API fallbacks
- `netlify/functions/` for serverless API handling (`generate`, `enhance-prompt`, `describe-image`, `health`)
- Dual-mode architecture: Runs seamlessly both with Netlify Functions AND as a 100% static client-side app (Netlify Drop).

---

## Option 1: Connect with Git (Recommended)

1. Push your project code to **GitHub**, **GitLab**, or **Bitbucket**.
2. Log in to [Netlify](https://app.netlify.com/).
3. Click **"Add new site"** > **"Import an existing project"**.
4. Select your Git provider and repository.
5. Netlify will **automatically detect** the build settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
6. Click **"Deploy site"**. Your website will be live in ~1 minute!

---

## Option 2: Netlify Drop (Drag & Drop Zero-Setup)

You can also deploy directly from your local computer without Git:

1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Open [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the generated `dist/` folder into the upload box.
4. Your site is instantly live with free, unlimited image generation!

---

## Option 3: Netlify CLI

1. Install the Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```
2. Build and deploy:
   ```bash
   npm run build
   netlify deploy --prod
   ```

---

## (Optional) Environment Variables for Gemini AI

If you want to enable Google Gemini AI prompt enhancement & vision description on your Netlify deployment:

1. Go to your site dashboard on Netlify.
2. Navigate to **Site configuration** > **Environment variables**.
3. Add a new variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `Your_Gemini_API_Key`
4. Trigger a new deploy.

*Note: Even without a Gemini key, the website automatically falls back to the high-performance procedural prompt engine and direct Flux/SDXL models, remaining 100% free and unlimited.*
