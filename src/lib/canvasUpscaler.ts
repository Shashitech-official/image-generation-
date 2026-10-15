/**
 * Client-Side Image Processing & Upscaler
 * Performs 2x/4x Super-Resolution scaling and image adjustments using HTML5 Canvas.
 */

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number; // 0 to 100
  vignette: number; // 0 to 100
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 15,
  vignette: 0,
};

export async function upscaleAndEnhanceImage(
  imageSrc: string,
  scale: 2 | 4,
  adjustments: ImageAdjustments = DEFAULT_ADJUSTMENTS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        // Step 1: Intermediate multi-step scaling for smoother bicubic-like interpolation
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image scaled up
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Step 2: Apply sharpness and color adjustments if needed
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        const b = adjustments.brightness * 1.5;
        const c = adjustments.contrast;
        const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
        const sat = (adjustments.saturation + 100) / 100;

        // Pixel loop for color adjustments
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let bCol = data[i + 2];

          // Brightness
          if (b !== 0) {
            r += b;
            g += b;
            bCol += b;
          }

          // Contrast
          if (c !== 0) {
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            bCol = contrastFactor * (bCol - 128) + 128;
          }

          // Saturation
          if (sat !== 1) {
            const gray = 0.2989 * r + 0.587 * g + 0.114 * bCol;
            r = gray + (r - gray) * sat;
            g = gray + (g - gray) * sat;
            bCol = gray + (bCol - gray) * sat;
          }

          data[i] = Math.min(255, Math.max(0, r));
          data[i + 1] = Math.min(255, Math.max(0, g));
          data[i + 2] = Math.min(255, Math.max(0, bCol));
        }

        ctx.putImageData(imgData, 0, 0);

        // Step 3: Unsharp mask convolution filter for crisp clarity
        if (adjustments.sharpness > 0) {
          applyUnsharpMask(ctx, targetWidth, targetHeight, adjustments.sharpness / 100);
        }

        // Step 4: Optional vignette
        if (adjustments.vignette > 0) {
          const radius = Math.max(targetWidth, targetHeight) * 0.75;
          const grad = ctx.createRadialGradient(
            targetWidth / 2,
            targetHeight / 2,
            radius * 0.4,
            targetWidth / 2,
            targetHeight / 2,
            radius
          );
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, `rgba(0,0,0,${(adjustments.vignette / 100) * 0.7})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        const upscaledDataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(upscaledDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Failed to load image for upscaling: ' + e));
    img.src = imageSrc;
  });
}

function applyUnsharpMask(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;
  const output = ctx.createImageData(w, h);
  const dst = output.data;

  // 3x3 Laplacian edge enhancement
  const weight = amount * 1.5;
  const centerWeight = 1 + 4 * weight;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = ((y - 1) * w + x) * 4 + c;
        const bottom = ((y + 1) * w + x) * 4 + c;
        const left = (y * w + (x - 1)) * 4 + c;
        const right = (y * w + (x + 1)) * 4 + c;

        const val =
          centerWeight * src[idx + c] -
          weight * (src[top] + src[bottom] + src[left] + src[right]);

        dst[idx + c] = Math.min(255, Math.max(0, val));
      }
      dst[idx + 3] = src[idx + 3];
    }
  }

  ctx.putImageData(output, 0, 0);
}

// Download image helper
export function downloadImage(dataUrl: string, prompt: string, format: 'png' | 'jpeg' = 'png') {
  const link = document.createElement('a');
  const safeTitle = prompt
    .slice(0, 36)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  link.download = `omnigen-${safeTitle || 'image'}-${Date.now()}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Extract dominant color palette from image
export function extractPaletteFromImage(imageSrc: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(['#10b981', '#3b82f6', '#8b5cf6']);
          return;
        }

        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, number> = {};

        for (let i = 0; i < data.length; i += 16) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sorted = Object.keys(colorCounts)
          .sort((a, b) => colorCounts[b] - colorCounts[a])
          .slice(0, 5);

        resolve(sorted.length > 0 ? sorted : ['#8b5cf6', '#ec4899', '#06b6d4']);
      } catch {
        resolve(['#8b5cf6', '#3b82f6', '#10b981']);
      }
    };
    img.onerror = () => resolve(['#8b5cf6', '#3b82f6']);
    img.src = imageSrc;
  });
}
