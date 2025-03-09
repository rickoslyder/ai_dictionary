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
        chatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const chatUrl = chrome.runtime.getURL('chat.html');
            chrome.tabs.create({ url: chatUrl });
        });
    }
}


/***/ }),

/***/ "./src/shared/types.ts":
/*!*****************************!*\
  !*** ./src/shared/types.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


// Type definitions for the extension
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageType = exports.DEFAULT_SETTINGS = void 0;
// Default settings
exports.DEFAULT_SETTINGS = {
    apiKey: "",
    perplexityApiKey: "",
    theme: "auto",
    maxTokens: 1000,
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
};
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
exports.isValidText = exports.generateCacheKey = exports.clearExpiredCache = exports.getCacheItem = exports.setCacheItem = exports.saveSettings = exports.getSettings = exports.getTheme = exports.getSystemTheme = void 0;
exports.debounce = debounce;
/// <reference types="chrome" />
const types_1 = __webpack_require__(/*! ./types */ "./src/shared/types.ts");
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
// Set an item in the cache
const setCacheItem = (key, data, expiryHours) => __awaiter(void 0, void 0, void 0, function* () {
    const cacheItem = {
        data,
        timestamp: Date.now() + expiryHours * 60 * 60 * 1000,
    };
    yield chrome.storage.local.set({ [key]: cacheItem });
});
exports.setCacheItem = setCacheItem;
// Get an item from the cache
const getCacheItem = (key) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            const cacheItem = result[key];
            // If no cache or expired
            if (!cacheItem || Date.now() > cacheItem.timestamp) {
                resolve(null);
                return;
            }
            resolve(cacheItem.data);
        });
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