import { HistoryLogEntry, Settings } from "./types";

const DB_NAME = "ai_dictionary_plus";
const DB_VERSION = 1;
const HISTORY_STORE = "history";
const SETTINGS_STORE = "settings";

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new DatabaseError("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create history store with indexes
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, {
          keyPath: "id",
        });
        historyStore.createIndex("timestamp", "timestamp");
        historyStore.createIndex("text", "text");
        historyStore.createIndex("pageUrl", "pageUrl");
      }

      // Create settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
  });
}

// Add a history entry
export async function addHistoryEntry(entry: HistoryLogEntry): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);

    const request = store.add(entry);

    request.onerror = () => {
      reject(new DatabaseError("Failed to add history entry"));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// Get a history entry by ID
export async function getHistoryEntry(
  id: string
): Promise<HistoryLogEntry | null> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readonly");
    const store = transaction.objectStore(HISTORY_STORE);

    const request = store.get(id);

    request.onerror = () => {
      reject(new DatabaseError("Failed to get history entry"));
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

// Get all history entries
export async function getAllHistoryEntries(): Promise<HistoryLogEntry[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readonly");
    const store = transaction.objectStore(HISTORY_STORE);

    const request = store.getAll();

    request.onerror = () => {
      reject(new DatabaseError("Failed to get history entries"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

// Clear history entries older than the specified date
export async function clearOldHistoryEntries(
  cutoffTime: number
): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);
    const index = store.index("timestamp");

    // Use a cursor to iterate through old entries
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);

    request.onerror = () => {
      reject(new DatabaseError("Failed to clear old history entries"));
    };

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// Get history entries within a date range
export async function getHistoryEntriesInRange(
  startTime: number,
  endTime: number
): Promise<HistoryLogEntry[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readonly");
    const store = transaction.objectStore(HISTORY_STORE);
    const index = store.index("timestamp");

    const range = IDBKeyRange.bound(startTime, endTime);
    const request = index.getAll(range);

    request.onerror = () => {
      reject(new DatabaseError("Failed to get history entries in range"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

// Search history entries by text
export async function searchHistoryEntries(
  searchText: string
): Promise<HistoryLogEntry[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, "readonly");
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.getAll();

    request.onerror = () => {
      reject(new DatabaseError("Failed to search history entries"));
    };

    request.onsuccess = () => {
      const entries = request.result as HistoryLogEntry[];
      const searchLower = searchText.toLowerCase();
      const results = entries.filter(
        (entry) =>
          entry.text.toLowerCase().includes(searchLower) ||
          entry.explanation.toLowerCase().includes(searchLower)
      );
      resolve(results);
    };
  });
}
