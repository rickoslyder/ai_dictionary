/// <reference types="chrome" />
import { CacheItem, Settings, DEFAULT_SETTINGS } from "./types";

// Get current system theme (light or dark)
export const getSystemTheme = (): "light" | "dark" => {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Determine theme based on settings
export const getTheme = (settings: Settings): "light" | "dark" => {
  if (settings.theme === "auto") {
    return getSystemTheme();
  }
  return settings.theme;
};

// Get settings from storage
export const getSettings = async (): Promise<Settings> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get("settings", (result: { settings?: Settings }) => {
      // If no settings found, use defaults
      if (!result.settings) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }

      // Merge saved settings with defaults to ensure all properties exist
      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...result.settings,
        // Handle nested objects like keyboardShortcut
        keyboardShortcut: {
          ...DEFAULT_SETTINGS.keyboardShortcut,
          ...(result.settings.keyboardShortcut || {}),
        },
      };

      resolve(mergedSettings);
    });
  });
};

// Save settings to storage
export const saveSettings = async (settings: Settings): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, () => {
      resolve();
    });
  });
};

// Set an item in the cache
export const setCacheItem = async <T>(
  key: string,
  data: T,
  expiryHours: number
): Promise<void> => {
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now() + expiryHours * 60 * 60 * 1000,
  };

  await chrome.storage.local.set({ [key]: cacheItem });
};

// Get an item from the cache
export const getCacheItem = async <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result: Record<string, CacheItem<T>>) => {
      const cacheItem = result[key];

      // If no cache or expired
      if (!cacheItem || Date.now() > cacheItem.timestamp) {
        resolve(null);
        return;
      }

      resolve(cacheItem.data);
    });
  });
};

// Clear expired cache items
export const clearExpiredCache = async (): Promise<void> => {
  const allCache = (await chrome.storage.local.get(null)) as Record<
    string,
    unknown
  >;
  const now = Date.now();
  const keysToRemove: string[] = [];

  for (const [key, value] of Object.entries(allCache)) {
    const cacheValue = value as { timestamp?: number };
    if (
      key.startsWith("cache_") &&
      cacheValue.timestamp &&
      cacheValue.timestamp < now
    ) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
};

// Generate a cache key from text
export const generateCacheKey = (text: string): string => {
  // Simple hash function for strings
  let hash = 0;
  if (text.length === 0) return "cache_empty";

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `cache_${hash}`;
};

// Debounce function to prevent too many API calls
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

// Function to check if the text is valid for an explanation
export const isValidText = (text: string): boolean => {
  if (!text) return false;
  text = text.trim();
  return text.length > 0 && text.length <= 1000; // Arbitrary limit to prevent large requests
};
