/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/popup/index.tsx":
/*!*****************************!*\
  !*** ./src/popup/index.tsx ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/// <reference types="chrome" />
const types_1 = __webpack_require__(/*! ../shared/types */ "./src/shared/types.ts");
const utils_1 = __webpack_require__(/*! ../shared/utils */ "./src/shared/utils.ts");
// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => __awaiter(void 0, void 0, void 0, function* () {
    // Apply theme
    const settings = yield (0, utils_1.getSettings)();
    applyTheme(settings);
    // Check API key
    checkApiKey(settings.apiKey);
    // Set up event listeners
    setupEventListeners();
}));
// Apply theme based on settings
function applyTheme(settings) {
    const theme = (0, utils_1.getTheme)(settings);
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    else {
        document.body.classList.remove('dark-theme');
    }
}
// Check if API key is set
function checkApiKey(apiKey) {
    const statusElement = document.getElementById('apiKeyStatus');
    if (!statusElement)
        return;
    if (!apiKey) {
        statusElement.textContent = 'API Key is not set. Please set it in the options.';
        statusElement.classList.add('error');
    }
    else {
        statusElement.textContent = 'API Key is set ✓';
        statusElement.classList.remove('error');
    }
}
// Setup event listeners
function setupEventListeners() {
    // Options button
    const optionsBtn = document.getElementById('optionsBtn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        });
    }
    // Chat button
    const chatBtn = document.getElementById('chatBtn');
    if (chatBtn) {
        chatBtn.addEventListener('click', (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            // Get active tab info to provide context
            const tabs = yield chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                // Create chat data with context from active tab
                const chatData = {
                    originalText: activeTab.title || 'Current page',
                    conversationHistory: []
                };
                // Encode data to pass via URL
                const encodedData = encodeURIComponent(JSON.stringify(chatData));
                const chatUrl = chrome.runtime.getURL(`chat.html?data=${encodedData}`);
                // Notify background script (optional, for future use)
                chrome.runtime.sendMessage({
                    type: types_1.MessageType.OPEN_CHAT,
                    payload: chatData,
                });
                // Open chat in new tab
                chrome.tabs.create({ url: chatUrl });
            }
            else {
                // Fallback if no active tab
                const chatUrl = chrome.runtime.getURL('chat.html');
                chrome.tabs.create({ url: chatUrl });
            }
        }));
    }
    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const historyUrl = chrome.runtime.getURL('history.html');
            chrome.tabs.create({ url: historyUrl });
        });
    }
}


/***/ }),

/***/ "./src/shared/db.ts":
/*!**************************!*\
  !*** ./src/shared/db.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatabaseError = void 0;
exports.initDatabase = initDatabase;
exports.addHistoryEntry = addHistoryEntry;
exports.getHistoryEntry = getHistoryEntry;
exports.getAllHistoryEntries = getAllHistoryEntries;
exports.clearOldHistoryEntries = clearOldHistoryEntries;
exports.getHistoryEntriesInRange = getHistoryEntriesInRange;
exports.searchHistoryEntries = searchHistoryEntries;
const DB_NAME = "ai_dictionary_plus";
const DB_VERSION = 1;
const HISTORY_STORE = "history";
const SETTINGS_STORE = "settings";
class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = "DatabaseError";
    }
}
exports.DatabaseError = DatabaseError;
function initDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                reject(new DatabaseError("Failed to open database"));
            };
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
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
    });
}
// Add a history entry
function addHistoryEntry(entry) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
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
    });
}
// Get a history entry by ID
function getHistoryEntry(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
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
    });
}
// Get all history entries
function getAllHistoryEntries() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
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
    });
}
// Clear history entries older than the specified date
function clearOldHistoryEntries(cutoffTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
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
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
                else {
                    resolve();
                }
            };
        });
    });
}
// Get history entries within a date range
function getHistoryEntriesInRange(startTime, endTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
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
    });
}
// Search history entries by text
function searchHistoryEntries(searchText) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield initDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(HISTORY_STORE, "readonly");
            const store = transaction.objectStore(HISTORY_STORE);
            const request = store.getAll();
            request.onerror = () => {
                reject(new DatabaseError("Failed to search history entries"));
            };
            request.onsuccess = () => {
                const entries = request.result;
                const searchLower = searchText.toLowerCase();
                const results = entries.filter((entry) => entry.text.toLowerCase().includes(searchLower) ||
                    entry.explanation.toLowerCase().includes(searchLower));
                resolve(results);
            };
        });
    });
}


/***/ }),

/***/ "./src/shared/types.ts":
/*!*****************************!*\
  !*** ./src/shared/types.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


// Type definitions for the extension
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageType = exports.MediaType = exports.DEFAULT_SETTINGS = void 0;
// Default settings
exports.DEFAULT_SETTINGS = {
    apiKey: "",
    perplexityApiKey: "",
    theme: "auto",
    maxTokens: 2000,
    cacheEnabled: true,
    cacheExpiry: 24,
    webSearchEnabled: true,
    keyboardShortcut: {
        key: "E",
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        metaKey: true, // Cmd key on Mac
    },
    multimodalEnabled: true,
    historyRetention: 7, // Default to 7 days
};
// Media types supported by the extension
var MediaType;
(function (MediaType) {
    MediaType["TEXT"] = "text";
    MediaType["IMAGE"] = "image";
    MediaType["DOCUMENT"] = "document";
    MediaType["AUDIO"] = "audio";
    MediaType["VIDEO"] = "video";
})(MediaType || (exports.MediaType = MediaType = {}));
// Message types for communication between components
var MessageType;
(function (MessageType) {
    MessageType["EXPLAIN_TEXT"] = "EXPLAIN_TEXT";
    MessageType["EXPLANATION_RESULT"] = "EXPLANATION_RESULT";
    MessageType["FOLLOW_UP_QUESTION"] = "FOLLOW_UP_QUESTION";
    MessageType["WEB_SEARCH"] = "WEB_SEARCH";
    MessageType["WEB_SEARCH_RESULT"] = "WEB_SEARCH_RESULT";
    MessageType["OPEN_CHAT"] = "OPEN_CHAT";
    MessageType["GET_SETTINGS"] = "GET_SETTINGS";
    MessageType["SAVE_SETTINGS"] = "SAVE_SETTINGS";
    MessageType["SETTINGS_UPDATED"] = "SETTINGS_UPDATED";
    MessageType["ERROR"] = "ERROR";
    // New message types for multimedia
    MessageType["EXPLAIN_MEDIA"] = "EXPLAIN_MEDIA";
    MessageType["MEDIA_EXPLANATION_RESULT"] = "MEDIA_EXPLANATION_RESULT";
    // New message type for multimodal content (text + media combined)
    MessageType["EXPLAIN_MULTIMODAL"] = "EXPLAIN_MULTIMODAL";
})(MessageType || (exports.MessageType = MessageType = {}));


/***/ }),

/***/ "./src/shared/utils.ts":
/*!*****************************!*\
  !*** ./src/shared/utils.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isValidText = exports.generateCacheKey = exports.clearExpiredCache = exports.getCacheItem = exports.setCacheItem = exports.cleanupHistoryEntries = exports.getHistoryLogEntry = exports.addHistoryLogEntry = exports.getHistoryLog = exports.HISTORY_LOG_KEY = exports.saveSettings = exports.getSettings = exports.getTheme = exports.getSystemTheme = void 0;
exports.debounce = debounce;
/// <reference types="chrome" />
const types_1 = __webpack_require__(/*! ./types */ "./src/shared/types.ts");
const db_1 = __webpack_require__(/*! ./db */ "./src/shared/db.ts");
// Get current system theme (light or dark)
const getSystemTheme = () => {
    return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};
exports.getSystemTheme = getSystemTheme;
// Determine theme based on settings
const getTheme = (settings) => {
    if (settings.theme === "auto") {
        return (0, exports.getSystemTheme)();
    }
    return settings.theme;
};
exports.getTheme = getTheme;
// Get settings from storage
const getSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        chrome.storage.sync.get("settings", (result) => {
            // If no settings found, use defaults
            if (!result.settings) {
                resolve(Object.assign({}, types_1.DEFAULT_SETTINGS));
                return;
            }
            // Merge saved settings with defaults to ensure all properties exist
            const mergedSettings = Object.assign(Object.assign(Object.assign({}, types_1.DEFAULT_SETTINGS), result.settings), { 
                // Handle nested objects like keyboardShortcut
                keyboardShortcut: Object.assign(Object.assign({}, types_1.DEFAULT_SETTINGS.keyboardShortcut), (result.settings.keyboardShortcut || {})) });
            resolve(mergedSettings);
        });
    });
});
exports.getSettings = getSettings;
// Save settings to storage
const saveSettings = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ settings }, () => {
            resolve();
        });
    });
});
exports.saveSettings = saveSettings;
// History log functions
exports.HISTORY_LOG_KEY = "explanation_history";
// Get the history log
const getHistoryLog = () => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        chrome.storage.local.get(exports.HISTORY_LOG_KEY, (result) => {
            const historyLog = result[exports.HISTORY_LOG_KEY];
            if (!historyLog) {
                // Initialize empty history log if it doesn't exist
                const emptyLog = {
                    entries: [],
                    lastUpdated: Date.now(),
                };
                resolve(emptyLog);
            }
            else {
                resolve(historyLog);
            }
        });
    });
});
exports.getHistoryLog = getHistoryLog;
// Add an entry to the history log
const addHistoryLogEntry = (entry) => __awaiter(void 0, void 0, void 0, function* () {
    // Generate a unique ID
    const id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Create the full entry
    const fullEntry = Object.assign(Object.assign({}, entry), { id, timestamp: Date.now() });
    // Add to IndexedDB
    yield (0, db_1.addHistoryEntry)(fullEntry);
    return id;
});
exports.addHistoryLogEntry = addHistoryLogEntry;
// Get a history log entry by ID
const getHistoryLogEntry = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, db_1.getHistoryEntry)(id);
});
exports.getHistoryLogEntry = getHistoryLogEntry;
// Clear entries based on retention settings
const cleanupHistoryEntries = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    // If retention is set to 'forever', don't clean up
    if (settings.historyRetention === "forever") {
        return;
    }
    // Calculate cutoff time based on retention days
    const cutoffTime = Date.now() - settings.historyRetention * 24 * 60 * 60 * 1000;
    // Clear old entries
    yield (0, db_1.clearOldHistoryEntries)(cutoffTime);
});
exports.cleanupHistoryEntries = cleanupHistoryEntries;
// Set an item in the cache with history log reference
const setCacheItem = (key, data, expiryHours, historyLogId) => __awaiter(void 0, void 0, void 0, function* () {
    const cacheItem = {
        data,
        timestamp: Date.now() + expiryHours * 60 * 60 * 1000,
        historyLogId,
    };
    yield chrome.storage.local.set({ [key]: cacheItem });
});
exports.setCacheItem = setCacheItem;
// Get an item from the cache and its history log entry if available
const getCacheItem = (key) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => __awaiter(void 0, void 0, void 0, function* () {
            const cacheItem = result[key];
            // If no cache or expired
            if (!cacheItem || Date.now() > cacheItem.timestamp) {
                resolve({ data: null, historyEntry: null });
                return;
            }
            // Get history entry if available
            let historyEntry = null;
            if (cacheItem.historyLogId) {
                historyEntry = yield (0, exports.getHistoryLogEntry)(cacheItem.historyLogId);
            }
            resolve({ data: cacheItem.data, historyEntry });
        }));
    });
});
exports.getCacheItem = getCacheItem;
// Clear expired cache items
const clearExpiredCache = () => __awaiter(void 0, void 0, void 0, function* () {
    const allCache = (yield chrome.storage.local.get(null));
    const now = Date.now();
    const keysToRemove = [];
    for (const [key, value] of Object.entries(allCache)) {
        const cacheValue = value;
        if (key.startsWith("cache_") &&
            cacheValue.timestamp &&
            cacheValue.timestamp < now) {
            keysToRemove.push(key);
        }
    }
    if (keysToRemove.length > 0) {
        yield chrome.storage.local.remove(keysToRemove);
    }
});
exports.clearExpiredCache = clearExpiredCache;
// Generate a cache key from text
const generateCacheKey = (text) => {
    // Simple hash function for strings
    let hash = 0;
    if (text.length === 0)
        return "cache_empty";
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${hash}`;
};
exports.generateCacheKey = generateCacheKey;
// Debounce function to prevent too many API calls
function debounce(func, waitFor) {
    let timeout = null;
    return function (...args) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };
}
// Function to check if the text is valid for an explanation
const isValidText = (text) => {
    if (!text)
        return false;
    text = text.trim();
    return text.length > 0 && text.length <= 1000; // Arbitrary limit to prevent large requests
};
exports.isValidText = isValidText;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/popup/index.tsx");
/******/ 	
/******/ })()
;
//# sourceMappingURL=popup.js.map