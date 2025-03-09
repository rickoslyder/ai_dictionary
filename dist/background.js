/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background/index.ts":
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
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
// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
    // Clear any existing context menu items first
    chrome.contextMenus.removeAll(() => {
        // Create our context menu item
        chrome.contextMenus.create({
            id: "explainText",
            title: "Explain with AI Dictionary+",
            contexts: ["selection"],
        });
    });
    // Clear expired cache items on startup
    (0, utils_1.clearExpiredCache)();
});
// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu clicked:", info, tab);
    if (info.menuItemId === "explainText" && info.selectionText && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        console.log("Sending message to tab", tab.id, "with text:", info.selectionText);
        // Send a message to the content script to show the tooltip
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: types_1.MessageType.EXPLAIN_TEXT,
                payload: {
                    text: info.selectionText,
                },
            }, (response) => {
                console.log("Response from content script:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                }
            });
        }
        catch (error) {
            console.error("Error in context menu handler:", error);
        }
    }
});
// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a, _b, _c;
    console.log("Background received message:", message, "from", sender);
    const { type, payload } = message;
    switch (type) {
        case types_1.MessageType.EXPLAIN_TEXT:
            console.log("Background handling EXPLAIN_TEXT request");
            handleExplainText(payload, (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id)
                .then((result) => {
                console.log("Sending explanation result:", result);
                sendResponse(result);
            })
                .catch((error) => {
                console.error("Error in handleExplainText:", error);
                sendResponse({
                    explanation: "An error occurred while processing your request.",
                    originalText: payload.text,
                    error: error instanceof Error ? error.message : String(error),
                    conversationHistory: [],
                });
            });
            return true; // Keep the messaging channel open for the async response
        case types_1.MessageType.FOLLOW_UP_QUESTION:
            console.log("Background handling FOLLOW_UP_QUESTION request");
            handleFollowUpQuestion(payload, (_b = sender.tab) === null || _b === void 0 ? void 0 : _b.id)
                .then(sendResponse)
                .catch((error) => {
                console.error("Error in handleFollowUpQuestion:", error);
                sendResponse({
                    explanation: "An error occurred while processing your follow-up question.",
                    originalText: payload.originalText,
                    error: error instanceof Error ? error.message : String(error),
                    conversationHistory: payload.conversationHistory || [],
                });
            });
            return true;
        case types_1.MessageType.WEB_SEARCH:
            console.log("Background handling WEB_SEARCH request");
            handleWebSearch(payload, (_c = sender.tab) === null || _c === void 0 ? void 0 : _c.id)
                .then(sendResponse)
                .catch((error) => {
                console.error("Error in handleWebSearch:", error);
                sendResponse({
                    explanation: payload.originalExplanation,
                    originalText: payload.text,
                    error: error instanceof Error ? error.message : String(error),
                    conversationHistory: [],
                    webSearched: false,
                });
            });
            return true;
        case types_1.MessageType.GET_SETTINGS:
            (0, utils_1.getSettings)().then(sendResponse);
            return true;
        case types_1.MessageType.SAVE_SETTINGS:
            (0, utils_1.saveSettings)(payload)
                .then(() => {
                sendResponse({ success: true });
                // Notify any open tabs about the settings change
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        if (tab.id) {
                            chrome.tabs
                                .sendMessage(tab.id, {
                                type: types_1.MessageType.SETTINGS_UPDATED,
                                payload,
                            })
                                .catch(() => {
                                // Ignore errors - tab might not have a content script
                            });
                        }
                    });
                });
            })
                .catch((error) => {
                console.error("Error saving settings:", error);
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
            return true;
        case types_1.MessageType.OPEN_CHAT:
            console.log("Handling chat open request with data:", payload);
            sendResponse({ success: true });
            return true;
        default:
            console.log("Unknown message type:", type);
            return false;
    }
});
// Handle explain text requests
function handleExplainText(request, tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield (0, utils_1.getSettings)();
            if (!settings.apiKey) {
                return {
                    explanation: "Please set your API key in the extension options",
                    originalText: request.text,
                    error: "No API key",
                    conversationHistory: [],
                };
            }
            // Check cache if enabled
            if (settings.cacheEnabled) {
                const cacheKey = (0, utils_1.generateCacheKey)(request.text);
                const cachedResult = yield (0, utils_1.getCacheItem)(cacheKey);
                if (cachedResult) {
                    return cachedResult;
                }
            }
            // Generate conversation history
            const conversationHistory = [
                {
                    role: "user",
                    content: `Explain this clearly and concisely: "${request.text}"${request.contextText ? ` Context: ${request.contextText}` : ""}`,
                },
            ];
            // Call Gemini API
            const explanation = yield callGeminiAPI(conversationHistory, settings);
            // Create result
            const result = {
                explanation,
                originalText: request.text,
                conversationHistory: [
                    conversationHistory[0],
                    {
                        role: "assistant",
                        content: explanation,
                    },
                ],
            };
            // Cache result if enabled
            if (settings.cacheEnabled) {
                const cacheKey = (0, utils_1.generateCacheKey)(request.text);
                yield (0, utils_1.setCacheItem)(cacheKey, result, settings.cacheExpiry);
            }
            return result;
        }
        catch (error) {
            console.error("Error explaining text:", error);
            return {
                explanation: "An error occurred while getting the explanation.",
                originalText: request.text,
                error: error instanceof Error ? error.message : String(error),
                conversationHistory: [],
            };
        }
    });
}
// Handle follow-up questions
function handleFollowUpQuestion(request, tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield (0, utils_1.getSettings)();
            if (!settings.apiKey) {
                return {
                    explanation: "Please set your API key in the extension options",
                    originalText: request.originalText,
                    error: "No API key",
                    conversationHistory: [],
                };
            }
            // Prepare conversation history
            const conversationHistory = [
                ...request.conversationHistory,
                {
                    role: "user",
                    content: request.question,
                },
            ];
            // Call Gemini API
            const explanation = yield callGeminiAPI(conversationHistory, settings);
            // Create result
            const result = {
                explanation,
                originalText: request.originalText,
                conversationHistory: [
                    ...conversationHistory,
                    {
                        role: "assistant",
                        content: explanation,
                    },
                ],
            };
            return result;
        }
        catch (error) {
            console.error("Error with follow-up question:", error);
            return {
                explanation: "An error occurred while getting the explanation.",
                originalText: request.originalText,
                error: error instanceof Error ? error.message : String(error),
                conversationHistory: request.conversationHistory,
            };
        }
    });
}
// Call Gemini API
function callGeminiAPI(conversationHistory, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`;
        // Format the conversation for Gemini
        const contents = conversationHistory.map((message) => ({
            parts: [
                {
                    text: message.content,
                },
            ],
            role: message.role === "user" ? "user" : "model",
        }));
        const payload = {
            contents,
            generationConfig: {
                maxOutputTokens: settings.maxTokens,
                temperature: 0.2,
            },
        };
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = yield response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        const data = yield response.json();
        // Extract text from response
        if (data.candidates &&
            ((_b = (_a = data.candidates[0]) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.parts) &&
            ((_c = data.candidates[0].content.parts[0]) === null || _c === void 0 ? void 0 : _c.text)) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error("Unexpected API response format");
    });
}
// Handle web search requests
function handleWebSearch(request, tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield (0, utils_1.getSettings)();
            if (!settings.perplexityApiKey) {
                return {
                    explanation: request.originalExplanation,
                    originalText: request.text,
                    error: "Please set your Perplexity API key in the extension options",
                    conversationHistory: [],
                    webSearched: false,
                };
            }
            // Call Perplexity API to get enhanced explanation and citations
            const { explanation, citations } = yield callPerplexityAPI(request.text, request.originalExplanation, settings);
            console.log("Web search result:", { explanation, citations });
            // Create result
            const result = {
                explanation,
                originalText: request.text,
                conversationHistory: [
                    {
                        role: "user",
                        content: `Please explain: "${request.text}"`,
                    },
                    {
                        role: "assistant",
                        content: explanation,
                    },
                ],
                webSearched: true,
                citations,
            };
            return result;
        }
        catch (error) {
            console.error("Error in web search:", error);
            return {
                explanation: request.originalExplanation,
                originalText: request.text,
                error: error instanceof Error ? error.message : String(error),
                conversationHistory: [],
                webSearched: false,
            };
        }
    });
}
// Call Perplexity API with the sonar model
function callPerplexityAPI(query, originalExplanation, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const url = "https://api.perplexity.ai/chat/completions";
        const systemPrompt = `You are an AI assistant that provides enhanced explanations by searching the web for accurate and up-to-date information. You are given a query and an initial explanation. Your task is to:
1. Enhance the explanation with additional facts, context, and details from the web.
2. Maintain a clear, educational tone.
3. Add citation references like [1], [2], etc. at relevant points in your response.
4. Format your response using Markdown for better readability.
5. Keep your response concise and focused on the topic.`;
        const payload = {
            model: "sonar",
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `I need an enhanced explanation of: "${query}"\n\nHere's the initial explanation to improve upon:\n${originalExplanation}\n\nPlease enhance this with web search results and add citations.`,
                },
            ],
            max_tokens: settings.maxTokens,
            temperature: 0.2,
        };
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.perplexityApiKey}`,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = yield response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
        }
        const data = yield response.json();
        console.log("Perplexity API response:", data);
        // Extract response text
        if (data.choices && ((_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content)) {
            const explanation = data.choices[0].message.content;
            // Extract citations directly from the API response
            const citations = data.citations || [];
            return { explanation, citations };
        }
        throw new Error("Unexpected API response format from Perplexity");
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
/******/ 	var __webpack_exports__ = __webpack_require__("./src/background/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=background.js.map