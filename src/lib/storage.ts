import { GeneratedImage } from '../types/generator';

const DB_NAME = 'omnigen_studio_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('favorite', 'favorite', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function saveImageToStorage(image: GeneratedImage): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(image);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage metadata:', err);
    try {
      const existing = getFallbackImages();
      // Only keep the most recent 20 images in localStorage to avoid quota overflow
      const updated = [image, ...existing.filter((i) => i.id !== image.id)].slice(0, 20);
      localStorage.setItem('omnigen_images_fallback', JSON.stringify(updated));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }
}

import { DEFAULT_STARTER_IMAGES } from '../data/presets';

export async function getAllImagesFromStorage(): Promise<GeneratedImage[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const req = index.openCursor(null, 'prev'); // sort descending
      const results: GeneratedImage[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          if (results.length === 0 && !localStorage.getItem('omnigen_initialized')) {
            localStorage.setItem('omnigen_initialized', 'true');
            // Seed starter images
            DEFAULT_STARTER_IMAGES.forEach((img) => saveImageToStorage(img));
            resolve(DEFAULT_STARTER_IMAGES);
            return;
          }
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, using fallback:', err);
    const fallback = getFallbackImages();
    if (fallback.length === 0 && !localStorage.getItem('omnigen_initialized')) {
      localStorage.setItem('omnigen_initialized', 'true');
      return DEFAULT_STARTER_IMAGES;
    }
    return fallback;
  }
}

export async function deleteImageFromStorage(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const existing = getFallbackImages();
    localStorage.setItem('omnigen_images_fallback', JSON.stringify(existing.filter((i) => i.id !== id)));
  }
}

export async function toggleFavoriteInStorage(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const item: GeneratedImage | undefined = req.result;
        if (!item) {
          resolve(false);
          return;
        }
        item.favorite = !item.favorite;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(!!item.favorite);
        putReq.onerror = () => reject(putReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const existing = getFallbackImages();
    let newFavState = false;
    const updated = existing.map((i) => {
      if (i.id === id) {
        newFavState = !i.favorite;
        return { ...i, favorite: newFavState };
      }
      return i;
    });
    localStorage.setItem('omnigen_images_fallback', JSON.stringify(updated));
    return newFavState;
  }
}

export async function clearAllImagesStorage(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem('omnigen_images_fallback');
  }
}

function getFallbackImages(): GeneratedImage[] {
  try {
    const raw = localStorage.getItem('omnigen_images_fallback');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Session generation counter
export function getLifetimeGenerationsCount(): number {
  try {
    return Number(localStorage.getItem('omnigen_total_count') || '0');
  } catch {
    return 0;
  }
}

export function incrementLifetimeGenerationsCount(by: number = 1): number {
  try {
    const current = getLifetimeGenerationsCount();
    const updated = current + by;
    localStorage.setItem('omnigen_total_count', updated.toString());
    return updated;
  } catch {
    return 1;
  }
}
