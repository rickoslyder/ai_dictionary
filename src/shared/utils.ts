/// <reference types="chrome" />
import {
  CacheItem,
  Settings,
  DEFAULT_SETTINGS,
  HistoryLog,
  HistoryLogEntry,
} from "./types";
import { addHistoryEntry, getHistoryEntry, clearOldHistoryEntries } from "./db";

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

// History log functions
export const HISTORY_LOG_KEY = "explanation_history";

// Get the history log
export const getHistoryLog = async (): Promise<HistoryLog> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(HISTORY_LOG_KEY, (result) => {
      const historyLog = result[HISTORY_LOG_KEY] as HistoryLog;
      if (!historyLog) {
        // Initialize empty history log if it doesn't exist
        const emptyLog: HistoryLog = {
          entries: [],
          lastUpdated: Date.now(),
        };
        resolve(emptyLog);
      } else {
        resolve(historyLog);
      }
    });
  });
};

// Add an entry to the history log
export const addHistoryLogEntry = async (
  entry: Omit<HistoryLogEntry, "id" | "timestamp">
): Promise<string> => {
  // Generate a unique ID
  const id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create the full entry
  const fullEntry: HistoryLogEntry = {
    ...entry,
    id,
    timestamp: Date.now(),
  };

  // Add to IndexedDB
  await addHistoryEntry(fullEntry);

  return id;
};

// Get a history log entry by ID
export const getHistoryLogEntry = async (
  id: string
): Promise<HistoryLogEntry | null> => {
  return getHistoryEntry(id);
};

// Clear entries based on retention settings
export const cleanupHistoryEntries = async (
  settings: Settings
): Promise<void> => {
  // If retention is set to 'forever', don't clean up
  if (settings.historyRetention === "forever") {
    return;
  }

  // Calculate cutoff time based on retention days
  const cutoffTime =
    Date.now() - settings.historyRetention * 24 * 60 * 60 * 1000;

  // Clear old entries
  await clearOldHistoryEntries(cutoffTime);
};

// Set an item in the cache with history log reference
export const setCacheItem = async <T>(
  key: string,
  data: T,
  expiryHours: number,
  historyLogId?: string
): Promise<void> => {
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now() + expiryHours * 60 * 60 * 1000,
    historyLogId,
  };

  await chrome.storage.local.set({ [key]: cacheItem });
};

// Get an item from the cache and its history log entry if available
export const getCacheItem = async <T>(
  key: string
): Promise<{ data: T | null; historyEntry: HistoryLogEntry | null }> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      key,
      async (result: Record<string, CacheItem<T>>) => {
        const cacheItem = result[key];

        // If no cache or expired
        if (!cacheItem || Date.now() > cacheItem.timestamp) {
          resolve({ data: null, historyEntry: null });
          return;
        }

        // Get history entry if available
        let historyEntry = null;
        if (cacheItem.historyLogId) {
          historyEntry = await getHistoryLogEntry(cacheItem.historyLogId);
        }

        resolve({ data: cacheItem.data, historyEntry });
      }
    );
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
