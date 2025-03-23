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
const utils_1 = __webpack_require__(/*! ../shared/utils */ "./src/shared/utils.ts");
const types_1 = __webpack_require__(/*! ../shared/types */ "./src/shared/types.ts");
const db_1 = __webpack_require__(/*! ../shared/db */ "./src/shared/db.ts");
// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
    // Clear any existing context menu items first
    chrome.contextMenus.removeAll(() => {
        // Create our context menu items
        chrome.contextMenus.create({
            id: "explainText",
            title: "Explain with AI Dictionary+",
            contexts: ["selection"],
        });
        // Add context menu items for media elements
        chrome.contextMenus.create({
            id: "explainImage",
            title: "Explain this image",
            contexts: ["image"],
        });
        chrome.contextMenus.create({
            id: "explainVideo",
            title: "Explain this video",
            contexts: ["video"],
        });
        chrome.contextMenus.create({
            id: "explainAudio",
            title: "Explain this audio",
            contexts: ["audio"],
        });
        // For documents (links to PDFs, etc.)
        chrome.contextMenus.create({
            id: "explainDocument",
            title: "Explain this document",
            contexts: ["link"],
            targetUrlPatterns: ["*.pdf", "*.doc", "*.docx", "*.txt"],
        });
    });
    // Clear expired cache items on startup
    (0, utils_1.clearExpiredCache)();
});
// Keep service worker alive
let keepAliveInterval;
function startKeepAlive() {
    // Clear any existing interval
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    // Ping every 20 seconds to keep the service worker alive
    keepAliveInterval = setInterval(() => {
        console.log("Service worker ping");
    }, 20000);
}
function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
}
// Start keep-alive when service worker starts
startKeepAlive();
// Handle service worker lifecycle
chrome.runtime.onSuspend.addListener(() => {
    console.log("Service worker suspending");
    stopKeepAlive();
});
chrome.runtime.onConnect.addListener((port) => {
    console.log("Port connected:", port.name);
    port.onDisconnect.addListener(() => {
        console.log("Port disconnected:", port.name);
        if (chrome.runtime.lastError) {
            console.error("Port error:", chrome.runtime.lastError);
        }
    });
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
    else if (info.menuItemId === "explainImage" && info.srcUrl && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        // Handle image explanation request
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: "CONTEXT_MENU_CLICKED",
                payload: {
                    mediaType: types_1.MediaType.IMAGE,
                    mediaUrl: info.srcUrl,
                    pageUrl: info.pageUrl,
                },
            }, (response) => {
                console.log("Response from content script for image:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                }
            });
        }
        catch (error) {
            console.error("Error in image context menu handler:", error);
        }
    }
    else if (info.menuItemId === "explainVideo" && info.srcUrl && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        // Handle video explanation request
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: "CONTEXT_MENU_CLICKED",
                payload: {
                    mediaType: types_1.MediaType.VIDEO,
                    mediaUrl: info.srcUrl,
                    pageUrl: info.pageUrl,
                },
            }, (response) => {
                console.log("Response from content script for video:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                }
            });
        }
        catch (error) {
            console.error("Error in video context menu handler:", error);
        }
    }
    else if (info.menuItemId === "explainAudio" && info.srcUrl && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        // Handle audio explanation request
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: "CONTEXT_MENU_CLICKED",
                payload: {
                    mediaType: types_1.MediaType.AUDIO,
                    mediaUrl: info.srcUrl,
                    pageUrl: info.pageUrl,
                },
            }, (response) => {
                console.log("Response from content script for audio:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                }
            });
        }
        catch (error) {
            console.error("Error in audio context menu handler:", error);
        }
    }
    else if (info.menuItemId === "explainDocument" && info.linkUrl && (tab === null || tab === void 0 ? void 0 : tab.id)) {
        // Handle document explanation request
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: "CONTEXT_MENU_CLICKED",
                payload: {
                    mediaType: types_1.MediaType.DOCUMENT,
                    mediaUrl: info.linkUrl,
                    pageUrl: info.pageUrl,
                },
            }, (response) => {
                console.log("Response from content script for document:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                }
            });
        }
        catch (error) {
            console.error("Error in document context menu handler:", error);
        }
    }
});
// Message listener with error handling and reconnection logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a;
    console.log("Background received message:", message.type);
    // Get the tab ID if available
    const tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
    // Handle potential disconnections
    const handleError = (error) => {
        var _a, _b;
        console.error("Error in message handler:", error);
        // Try to reconnect if context was invalidated
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Extension context invalidated")) {
            console.log("Attempting to reconnect...");
            startKeepAlive();
        }
        // Send error response
        sendResponse({
            error: error instanceof Error ? error.message : String(error),
            explanation: "",
            originalText: ((_b = message.payload) === null || _b === void 0 ? void 0 : _b.text) || "",
            conversationHistory: [],
        });
    };
    try {
        switch (message.type) {
            case types_1.MessageType.EXPLAIN_TEXT:
                handleExplainText(message.payload, tabId)
                    .then((result) => {
                    sendResponse(result);
                })
                    .catch(handleError);
                break;
            case types_1.MessageType.FOLLOW_UP_QUESTION:
                console.log("Background handling FOLLOW_UP_QUESTION request");
                handleFollowUpQuestion(message.payload, tabId)
                    .then(sendResponse)
                    .catch(handleError);
                break;
            case types_1.MessageType.WEB_SEARCH:
                console.log("Background handling WEB_SEARCH request");
                handleWebSearch(message.payload, tabId)
                    .then(sendResponse)
                    .catch(handleError);
                break;
            case types_1.MessageType.GET_SETTINGS:
                console.log("Background handling GET_SETTINGS request");
                (0, utils_1.getSettings)()
                    .then((settings) => {
                    console.log("Sending settings:", settings);
                    sendResponse(settings);
                })
                    .catch(handleError);
                break;
            case types_1.MessageType.SAVE_SETTINGS:
                console.log("Background handling SAVE_SETTINGS request");
                (0, utils_1.saveSettings)(message.payload)
                    .then(() => {
                    console.log("Settings saved, broadcasting update");
                    // Broadcast settings update to all tabs
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab) => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, {
                                    type: types_1.MessageType.SETTINGS_UPDATED,
                                    payload: message.payload,
                                }, () => {
                                    // Ignore errors - tab might not have a content script
                                    if (chrome.runtime.lastError) {
                                        console.log("Error sending settings update:", chrome.runtime.lastError);
                                    }
                                });
                            }
                        });
                    });
                    sendResponse({ success: true });
                })
                    .catch(handleError);
                break;
            case types_1.MessageType.EXPLAIN_MEDIA:
                console.log("Background handling EXPLAIN_MEDIA request");
                handleMediaExplainRequest(message.payload, sender)
                    .then((result) => {
                    console.log("Sending media explanation result:", result);
                    sendResponse(result);
                })
                    .catch(handleError);
                break;
            case types_1.MessageType.EXPLAIN_MULTIMODAL:
                handleMultimodalRequest(message.payload, sender)
                    .then((result) => {
                    sendResponse(result);
                })
                    .catch(handleError);
                break;
            default:
                console.log("Unknown message type:", message.type);
                break;
        }
    }
    catch (error) {
        handleError(error);
    }
    // Return true to indicate async response
    return true;
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
            if (settings.cacheEnabled && !request.skipCache) {
                const cacheKey = (0, utils_1.generateCacheKey)(request.text);
                const { data: cachedResult, historyEntry } = yield (0, utils_1.getCacheItem)(cacheKey);
                if (cachedResult) {
                    // If we have a history entry, use its conversation history
                    if (historyEntry) {
                        cachedResult.conversationHistory = historyEntry.conversationHistory;
                    }
                    return cachedResult;
                }
            }
            // Generate enhanced conversation history with system prompts
            const enhancedConversationHistory = [
                // System prompt with instructions
                {
                    role: "system",
                    content: "You are AI Dictionary+, a helpful AI assistant integrated into a browser extension. " +
                        "Your purpose is to explain concepts, answer questions, and engage in helpful conversation. " +
                        "You have access to the user's current context and can explain technical terms, concepts, and provide detailed information on a wide range of topics. " +
                        "Always be thorough in your explanations, providing detailed context and real-world examples where applicable. " +
                        "IMPORTANT: Ignore any CSS styling information in the context unless the user is specifically asking about CSS. " +
                        "Focus on explaining the core concept, not the styling or formatting of the webpage. " +
                        "When explaining technical terms, provide clear definitions, examples of use, and relevant context.",
                },
                // Add context about what the user is looking at
                {
                    role: "system",
                    content: `The user has selected this text to be explained: "${request.text}". ` +
                        (request.contextText
                            ? `Additional context surrounding the selection (which may include CSS that should be ignored unless directly relevant): ${request.contextText}`
                            : "No additional context is available."),
                },
                // User question
                {
                    role: "user",
                    content: `Explain this clearly and concisely: "${request.text}"`,
                },
            ];
            // Call Gemini API with enhanced context
            const explanation = yield callGeminiAPI(enhancedConversationHistory, settings);
            // Create result - only include the actual conversation in the history (not system messages)
            // This prevents UI confusion with system messages appearing in the chat
            const resultConversationHistory = [
                {
                    role: "user",
                    content: `Explain this clearly and concisely: "${request.text}"`,
                },
                {
                    role: "assistant",
                    content: explanation,
                },
            ];
            // Create result
            const result = {
                explanation,
                originalText: request.text,
                conversationHistory: resultConversationHistory,
            };
            // Add to history log
            const historyLogId = yield (0, utils_1.addHistoryLogEntry)({
                text: request.text,
                contextText: request.contextText,
                explanation,
                conversationHistory: resultConversationHistory,
                pageUrl: request.pageUrl,
            });
            // Cache result if enabled
            if (settings.cacheEnabled) {
                const cacheKey = (0, utils_1.generateCacheKey)(request.text);
                yield (0, utils_1.setCacheItem)(cacheKey, result, settings.cacheExpiry, historyLogId);
            }
            // Clean up old history entries based on retention settings
            (0, utils_1.cleanupHistoryEntries)(settings).catch(console.error);
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
            // Enhanced conversation history with system prompts for better context
            const enhancedConversationHistory = [];
            // Add system prompt about AI Dictionary+ capabilities
            enhancedConversationHistory.push({
                role: "system",
                content: "You are AI Dictionary+, a helpful AI assistant integrated into a browser extension. " +
                    "Your purpose is to explain concepts, answer questions, and engage in helpful conversation. " +
                    "You have access to the user's current context and can explain technical terms, concepts, and provide detailed information on a wide range of topics. " +
                    "Always be thorough in your explanations, providing detailed context and real-world examples where applicable. " +
                    "IMPORTANT: Ignore any CSS styling information in the context unless the user is specifically asking about CSS. " +
                    "Focus on explaining the core concept, not the styling or formatting of the webpage. " +
                    "When explaining technical terms, provide clear definitions, examples of use, and relevant context.",
            });
            // Add context about the content the user is viewing if available
            if (request.originalText) {
                enhancedConversationHistory.push({
                    role: "system",
                    content: `The user is currently looking at content related to: "${request.originalText}". Tailor your responses to be relevant to this context when appropriate, but ignore CSS styling information unless specifically asked about it.`,
                });
            }
            // Add existing conversation history
            enhancedConversationHistory.push(...request.conversationHistory);
            // Add current user question
            enhancedConversationHistory.push({
                role: "user",
                content: request.question,
            });
            // Use the user's configured token limit (no arbitrary doubling)
            const explanation = yield callGeminiAPI(enhancedConversationHistory, settings);
            // Create result - only include the actual conversation in the history (not system messages)
            // This prevents UI confusion with system messages appearing in the chat
            const resultConversationHistory = [
                ...request.conversationHistory,
                { role: "user", content: request.question },
                { role: "assistant", content: explanation },
            ];
            const result = {
                explanation,
                originalText: request.originalText,
                conversationHistory: resultConversationHistory,
            };
            // Find and update the history entry for this conversation
            const historyEntries = yield (0, db_1.getAllHistoryEntries)();
            const historyEntry = historyEntries.find((entry) => entry.text === request.originalText);
            if (historyEntry) {
                // Update the conversation history
                const updatedEntry = Object.assign(Object.assign({}, historyEntry), { conversationHistory: resultConversationHistory });
                // Update the entry in the database
                yield (0, db_1.addHistoryEntry)(updatedEntry);
            }
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
        const contents = conversationHistory.map((message) => {
            // Map roles from our app format to Gemini API format
            let apiRole = "user";
            if (message.role === "assistant") {
                apiRole = "model";
            }
            else if (message.role === "system") {
                // For system messages, we'll use "user" role but add a prefix to indicate system instructions
                return {
                    parts: [
                        {
                            text: "[SYSTEM INSTRUCTION]\n" + message.content,
                        },
                    ],
                    role: "user",
                };
            }
            return {
                parts: [
                    {
                        text: message.content,
                    },
                ],
                role: apiRole,
            };
        });
        // Additional system instructions to include in the prompt
        const enhancedInstructions = {
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
            generationConfig: {
                maxOutputTokens: settings.maxTokens,
                temperature: 0.2,
                topP: 0.95,
                topK: 40,
            },
        };
        const payload = Object.assign({ contents }, enhancedInstructions);
        console.log("Sending payload to Gemini:", JSON.stringify(payload));
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
// Function to upload video to Gemini File API and get a file URI
function uploadVideoToGeminiAPI(videoUrl, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Uploading video to Gemini File API:", videoUrl);
        try {
            // Fetch the video data
            const response = yield fetch(videoUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
            }
            // Get the video data as blob
            const videoBlob = yield response.blob();
            // Get the content type
            const mimeType = response.headers.get("content-type") || "video/mp4";
            // Create form data for upload
            const formData = new FormData();
            formData.append("file", videoBlob, "video.mp4");
            // Upload to Gemini Files API
            const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
            // Initial resumable upload request
            const initResponse = yield fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "X-Goog-Upload-Protocol": "resumable",
                    "X-Goog-Upload-Command": "start",
                    "X-Goog-Upload-Header-Content-Length": videoBlob.size.toString(),
                    "X-Goog-Upload-Header-Content-Type": mimeType,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    file: {
                        display_name: "Uploaded Video",
                    },
                }),
            });
            if (!initResponse.ok) {
                throw new Error(`Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}`);
            }
            // Get the upload URL from headers
            const uploadSessionUrl = initResponse.headers.get("X-Goog-Upload-URL");
            if (!uploadSessionUrl) {
                throw new Error("Upload URL not found in response headers");
            }
            // Upload the video content
            const uploadResponse = yield fetch(uploadSessionUrl, {
                method: "POST",
                headers: {
                    "Content-Length": videoBlob.size.toString(),
                    "X-Goog-Upload-Offset": "0",
                    "X-Goog-Upload-Command": "upload, finalize",
                },
                body: videoBlob,
            });
            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload video content: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }
            // Parse the response to get the file URI
            const fileInfo = yield uploadResponse.json();
            console.log("File upload response:", JSON.stringify(fileInfo, null, 2));
            if (!fileInfo.file || !fileInfo.file.uri) {
                throw new Error("File URI not found in upload response");
            }
            // Wait for the file to be processed (if needed)
            let file = fileInfo.file;
            let processingAttempts = 0;
            const maxProcessingAttempts = 5;
            while (file.state === "PROCESSING" &&
                processingAttempts < maxProcessingAttempts) {
                processingAttempts++;
                console.log(`Video still processing, attempt ${processingAttempts}/${maxProcessingAttempts}...`);
                yield new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
                // Check file status - Use the full file name as returned by the API
                // The file.name already contains the full path like "files/12345"
                let fileStatusUrl;
                if (file.name.startsWith("files/")) {
                    fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`;
                }
                else {
                    fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/files/${file.name}?key=${apiKey}`;
                }
                console.log("Checking file status at URL:", fileStatusUrl);
                try {
                    const fileResponse = yield fetch(fileStatusUrl);
                    if (!fileResponse.ok) {
                        console.error("Failed to check file status:", fileResponse.status, fileResponse.statusText);
                        // Don't throw an error, just try the alternative URL format if this is the first failure
                        if (processingAttempts === 1 && fileStatusUrl.includes("/files/")) {
                            // Try alternative URL format
                            file.name = file.name.replace("files/", "");
                            continue; // Skip to next iteration with new file name
                        }
                        throw new Error(`Failed to check file status: ${fileResponse.status} ${fileResponse.statusText}`);
                    }
                    const fileStatusData = yield fileResponse.json();
                    console.log("File status response:", JSON.stringify(fileStatusData, null, 2));
                    file = fileStatusData.file || fileStatusData;
                }
                catch (error) {
                    console.error("Error checking file status:", error);
                    // If this is not the last attempt, continue trying
                    if (processingAttempts < maxProcessingAttempts) {
                        continue;
                    }
                    throw error;
                }
            }
            if (processingAttempts >= maxProcessingAttempts &&
                file.state === "PROCESSING") {
                throw new Error("Video processing timed out after multiple attempts");
            }
            if (file.state === "FAILED") {
                throw new Error("Video processing failed");
            }
            console.log("Video uploaded successfully, file URI:", file.uri);
            return {
                name: file.name,
                file_uri: file.uri,
            };
        }
        catch (error) {
            console.error("Error uploading video to Gemini File API:", error);
            // Create a more user-friendly error message based on the specific error
            let userMessage = "Failed to process the video. ";
            if (error instanceof Error) {
                const errorMessage = error.message;
                console.error("Error details:", errorMessage);
                // Add specific error handling based on common failures
                if (errorMessage.includes("Failed to fetch video")) {
                    userMessage +=
                        "The video URL couldn't be accessed. This may be due to cross-origin restrictions or the video is not publicly accessible.";
                }
                else if (errorMessage.includes("Failed to initialize upload")) {
                    userMessage +=
                        "The Gemini API couldn't start the upload process. Please check your API key and network connection.";
                }
                else if (errorMessage.includes("Upload URL not found")) {
                    userMessage +=
                        "The upload session couldn't be established with the Gemini API. This may be a temporary issue.";
                }
                else if (errorMessage.includes("Failed to upload video content")) {
                    userMessage +=
                        "The video couldn't be uploaded to the Gemini API. This may be due to the file size or network issues.";
                }
                else if (errorMessage.includes("File URI not found")) {
                    userMessage +=
                        "The uploaded file information wasn't returned properly. This is usually a temporary API issue.";
                }
                else if (errorMessage.includes("Failed to check file status")) {
                    userMessage +=
                        "The status of the uploaded video couldn't be verified. The file may have been deleted or may not be accessible.";
                }
                else if (errorMessage.includes("Video processing failed")) {
                    userMessage +=
                        "The Gemini API couldn't process the video. This may be due to an unsupported format or content issues.";
                }
                else {
                    userMessage += "An unexpected error occurred: " + errorMessage;
                }
            }
            else {
                userMessage += "An unknown error occurred during video processing.";
            }
            // Throw a new error with the user-friendly message
            throw new Error(userMessage);
        }
    });
}
/**
 * Upload an audio file to the Gemini File API
 * This function handles the upload process for audio files similar to videos
 */
function uploadAudioToGeminiAPI(audioUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Uploading audio to Gemini File API:", audioUrl);
        try {
            // Fetch the audio file data from URL
            const response = yield fetch(audioUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
            }
            // Get the audio data as blob
            const audioBlob = yield response.blob();
            console.log("Audio blob:", audioBlob);
            // Get API key for Gemini
            const settings = yield (0, utils_1.getSettings)();
            const apiKey = settings.apiKey;
            if (!apiKey) {
                throw new Error("API key not found in settings");
            }
            // Get the content type
            const mimeType = response.headers.get("content-type") || "audio/mpeg";
            // Create form data for upload
            const formData = new FormData();
            formData.append("file", audioBlob, "audio.mp3");
            // Upload to Gemini Files API - using the same endpoint as video uploads
            const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
            // Initial resumable upload request
            const initResponse = yield fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "X-Goog-Upload-Protocol": "resumable",
                    "X-Goog-Upload-Command": "start",
                    "X-Goog-Upload-Header-Content-Length": audioBlob.size.toString(),
                    "X-Goog-Upload-Header-Content-Type": mimeType,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    file: {
                        display_name: "Uploaded Audio",
                    },
                }),
            });
            if (!initResponse.ok) {
                throw new Error(`Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}`);
            }
            // Get the upload URL from headers
            const uploadSessionUrl = initResponse.headers.get("X-Goog-Upload-URL");
            if (!uploadSessionUrl) {
                throw new Error("Upload URL not found in response headers");
            }
            // Upload the audio content
            const uploadResponse = yield fetch(uploadSessionUrl, {
                method: "POST",
                headers: {
                    "Content-Length": audioBlob.size.toString(),
                    "X-Goog-Upload-Offset": "0",
                    "X-Goog-Upload-Command": "upload, finalize",
                },
                body: audioBlob,
            });
            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload audio content: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }
            // Parse the response to get the file URI
            const fileInfo = yield uploadResponse.json();
            console.log("File upload response:", JSON.stringify(fileInfo, null, 2));
            if (!fileInfo.file || !fileInfo.file.uri) {
                throw new Error("File URI not found in upload response");
            }
            // Wait for the file to be processed (if needed)
            let file = fileInfo.file;
            let processingAttempts = 0;
            const maxProcessingAttempts = 5;
            while (file.state === "PROCESSING" &&
                processingAttempts < maxProcessingAttempts) {
                processingAttempts++;
                console.log(`Audio still processing, attempt ${processingAttempts}/${maxProcessingAttempts}...`);
                yield new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
                // Check file status - Use the full file name as returned by the API
                // Construct URL differently based on the format of the file.name
                let fileStatusUrl;
                if (file.name.startsWith("files/")) {
                    fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`;
                }
                else {
                    fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/files/${file.name}?key=${apiKey}`;
                }
                console.log("Checking file status at URL:", fileStatusUrl);
                try {
                    const fileResponse = yield fetch(fileStatusUrl);
                    if (!fileResponse.ok) {
                        console.error("Failed to check file status:", fileResponse.status, fileResponse.statusText);
                        // Don't throw an error, just try the alternative URL format if this is the first failure
                        if (processingAttempts === 1 && fileStatusUrl.includes("/files/")) {
                            // Try alternative URL format
                            file.name = file.name.replace("files/", "");
                            continue; // Skip to next iteration with new file name
                        }
                        throw new Error(`Failed to check file status: ${fileResponse.status} ${fileResponse.statusText}`);
                    }
                    const fileStatusData = yield fileResponse.json();
                    console.log("File status response:", JSON.stringify(fileStatusData, null, 2));
                    file = fileStatusData.file || fileStatusData;
                }
                catch (error) {
                    console.error("Error checking file status:", error);
                    // If this is not the last attempt, continue trying
                    if (processingAttempts < maxProcessingAttempts) {
                        continue;
                    }
                    throw error;
                }
            }
            if (processingAttempts >= maxProcessingAttempts &&
                file.state === "PROCESSING") {
                throw new Error("Audio processing timed out after multiple attempts");
            }
            if (file.state === "FAILED") {
                throw new Error("Audio processing failed");
            }
            console.log("Audio uploaded successfully, file URI:", file.uri);
            return {
                name: file.name,
                file_uri: file.uri,
            };
        }
        catch (error) {
            console.error("Error uploading audio to Gemini File API:", error);
            // Create a more user-friendly error message based on the specific error
            let userMessage = "Failed to process the audio. ";
            if (error instanceof Error) {
                const errorMessage = error.message;
                console.error("Error details:", errorMessage);
                // Add specific error handling based on common failures
                if (errorMessage.includes("Failed to fetch audio")) {
                    userMessage +=
                        "The audio URL couldn't be accessed. This may be due to cross-origin restrictions or the audio is not publicly accessible.";
                }
                else if (errorMessage.includes("Failed to initialize upload")) {
                    userMessage +=
                        "The Gemini API couldn't start the upload process. Please check your API key and network connection.";
                }
                else if (errorMessage.includes("Upload URL not found")) {
                    userMessage +=
                        "The upload session couldn't be established with the Gemini API. This may be a temporary issue.";
                }
                else if (errorMessage.includes("Failed to upload audio content")) {
                    userMessage +=
                        "The audio couldn't be uploaded to the Gemini API. This may be due to the file size or network issues.";
                }
                else if (errorMessage.includes("File URI not found")) {
                    userMessage +=
                        "The uploaded file information wasn't returned properly. This is usually a temporary API issue.";
                }
                else if (errorMessage.includes("Failed to check file status")) {
                    userMessage +=
                        "The status of the uploaded audio couldn't be verified. The file may have been deleted or may not be accessible.";
                }
                else if (errorMessage.includes("Audio processing failed")) {
                    userMessage +=
                        "The Gemini API couldn't process the audio. This may be due to an unsupported format or content issues.";
                }
                else {
                    userMessage += "An unexpected error occurred: " + errorMessage;
                }
            }
            else {
                userMessage += "An unknown error occurred during audio processing.";
            }
            // Throw a new error with the user-friendly message
            throw new Error(userMessage);
        }
    });
}
// Update handleMediaExplainRequest to support both video and audio uploads
function handleMediaExplainRequest(request, sender) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            console.log("Handling media explain request:", request);
            // Get settings
            const settings = yield (0, utils_1.getSettings)();
            // Check if multimodal is enabled
            if (!settings.multimodalEnabled) {
                return {
                    explanation: "Multimedia content analysis is not enabled. Please enable it in the extension options.",
                    error: "Feature not enabled",
                    conversationHistory: [],
                    originalText: `${request.mediaType} content`,
                };
            }
            // Check if API key is set
            if (!settings.apiKey) {
                return {
                    explanation: "Please set your API key in the extension options",
                    error: "No API key",
                    conversationHistory: [],
                    originalText: `${request.mediaType} content`,
                };
            }
            // Set tab ID from sender if not provided
            if (!request.tabId && ((_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id)) {
                request.tabId = sender.tab.id;
            }
            // Check if we are handling a video that needs to be uploaded using File API
            let fileUri;
            if (request.mediaType === types_1.MediaType.VIDEO) {
                console.log("Processing video with File API");
                try {
                    // uploadVideoToGeminiAPI now returns an object with file_uri property
                    const fileResult = yield uploadVideoToGeminiAPI(request.mediaData, settings.apiKey);
                    fileUri = fileResult.file_uri;
                    console.log("Video uploaded successfully, file_uri:", fileUri);
                }
                catch (error) {
                    console.error("Error uploading video:", error);
                    throw new Error(`Video upload failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            // Check if we are handling an audio file that needs to be uploaded using File API
            else if (request.mediaType === types_1.MediaType.AUDIO) {
                console.log("Processing audio with File API");
                try {
                    // uploadAudioToGeminiAPI returns an object with file_uri property
                    const fileResult = yield uploadAudioToGeminiAPI(request.mediaData);
                    fileUri = fileResult.file_uri;
                    console.log("Audio uploaded successfully, file_uri:", fileUri);
                }
                catch (error) {
                    console.error("Error uploading audio:", error);
                    throw new Error(`Audio upload failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            // For images and other media types, proceed with regular processing
            else if (request.mediaType === types_1.MediaType.IMAGE &&
                request.mediaData.startsWith("http")) {
                console.log("Processing image URL, fetching as base64");
                // Fetch image as base64 for URLs
                try {
                    request.mediaData = yield fetchImageAsBase64(request.mediaData);
                }
                catch (error) {
                    console.error("Error fetching image as base64:", error);
                    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            // Create conversation history
            const conversationHistory = [];
            // Add system message
            conversationHistory.push({
                role: "system",
                content: getSystemPromptForMedia(request.mediaType),
            });
            // Add user message with media content
            const userMessage = {
                role: "user",
                content: [],
            };
            // Create content parts based on media type
            const contentParts = [];
            // Add text part with context and instructions
            let textPrompt = `Please analyze this ${request.mediaType.toLowerCase()}`;
            // Add timestamp for videos if available
            if (request.mediaType === types_1.MediaType.VIDEO && request.timestamp) {
                textPrompt += ` at timestamp ${request.timestamp}`;
            }
            // Add context if available
            if (request.contextText) {
                textPrompt += `. Context: ${request.contextText}`;
            }
            // Add text part
            contentParts.push({
                type: "text",
                text: textPrompt,
            });
            // Add media part
            if (request.mediaType === types_1.MediaType.IMAGE &&
                request.mediaData.startsWith("data:")) {
                // For images with base64 data
                contentParts.push({
                    type: "image",
                    mediaData: request.mediaData,
                    mimeType: request.mimeType || "image/jpeg",
                });
            }
            else if (request.mediaType === types_1.MediaType.VIDEO) {
                // For videos using file_uri format
                contentParts.push({
                    type: "video",
                    file_uri: fileUri, // This should now be a proper file_uri from the File API
                    mimeType: request.mimeType || "video/mp4",
                });
            }
            else if (request.mediaType === types_1.MediaType.AUDIO && fileUri) {
                // For audio using file_uri format
                contentParts.push({
                    type: "audio",
                    file_uri: fileUri, // Use the file_uri from the upload
                    mimeType: request.mimeType || "audio/mpeg",
                });
            }
            else {
                // For other media types or images with URLs
                contentParts.push({
                    type: request.mediaType.toLowerCase(),
                    mediaData: request.mediaData,
                    mimeType: request.mimeType ||
                        getMimeTypeForMedia(request.mediaType, request.mediaData),
                });
            }
            // Set the content parts in the user message
            userMessage.content = contentParts;
            conversationHistory.push(userMessage);
            // Call Gemini API for multimodal content
            console.log("Calling Gemini API with conversation history:", conversationHistory);
            const explanation = yield callGeminiMultimodalAPI(conversationHistory, settings);
            // Add assistant response to conversation history
            conversationHistory.push({
                role: "assistant",
                content: explanation,
            });
            // Return the result
            return {
                explanation,
                conversationHistory,
                originalText: `[${request.mediaType.toUpperCase()}] ${request.pageUrl || "Unknown URL"}`,
            };
        }
        catch (error) {
            console.error("Error in handleMediaExplainRequest:", error);
            return {
                explanation: "",
                originalText: "",
                error: `${error instanceof Error ? error.message : String(error)}`,
                conversationHistory: [],
            };
        }
    });
}
// Helper function to get system prompt for different media types
function getSystemPromptForMedia(mediaType) {
    const basePrompt = "You are AI Dictionary+, a helpful AI assistant that explains content on the web. ";
    switch (mediaType) {
        case types_1.MediaType.IMAGE:
            return (basePrompt +
                "Analyze the image and provide a detailed explanation of what it shows. " +
                "Include information about the subject, composition, colors, and any text visible in the image. " +
                "If it's a chart or diagram, explain what it represents. Be concise but thorough.");
        case types_1.MediaType.VIDEO:
            return (basePrompt +
                "Analyze the video frame and provide a detailed explanation of what it shows. " +
                "Describe the scene, any visible action, and key elements in the frame. " +
                "If there's text or captions visible, include that in your analysis. Be concise but thorough.");
        case types_1.MediaType.AUDIO:
            return (basePrompt +
                "Analyze the audio content and describe what you hear. " +
                "If it's speech, summarize what is being said. If it's music, describe the genre, instruments, and mood. " +
                "Note any distinctive sounds or patterns. Be concise but thorough.");
        case types_1.MediaType.DOCUMENT:
            return (basePrompt +
                "Analyze the document and provide a summary of its content. " +
                "Identify the document type, key topics, and main points. " +
                "If there are charts, tables, or images, describe what they show. Be concise but thorough.");
        default:
            return (basePrompt +
                "Analyze the content and provide a detailed explanation. Be concise but thorough.");
    }
}
// Helper function to get MIME type for media
function getMimeTypeForMedia(mediaType, mediaUrl) {
    var _a;
    // Default MIME types based on media type
    const defaultMimeTypes = {
        [types_1.MediaType.IMAGE]: "image/jpeg",
        [types_1.MediaType.VIDEO]: "video/mp4",
        [types_1.MediaType.AUDIO]: "audio/mpeg",
        [types_1.MediaType.DOCUMENT]: "application/pdf",
        [types_1.MediaType.TEXT]: "text/plain",
    };
    // Try to determine from URL extension
    const extension = (_a = mediaUrl.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (extension) {
        switch (extension) {
            // Images
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "svg":
                return "image/svg+xml";
            // Videos
            case "mp4":
                return "video/mp4";
            case "webm":
                return "video/webm";
            case "ogg":
                return "video/ogg";
            case "mov":
                return "video/quicktime";
            // Audio
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "aac":
                return "audio/aac";
            case "flac":
                return "audio/flac";
            // Documents
            case "pdf":
                return "application/pdf";
            case "doc":
            case "docx":
                return "application/msword";
            case "txt":
                return "text/plain";
        }
    }
    // Fallback to default MIME type for this media type
    return defaultMimeTypes[mediaType] || "application/octet-stream";
}
// New function for calling Gemini API with multimodal content
function callGeminiMultimodalAPI(conversationHistory, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Calling Gemini API for multimodal content with history:", conversationHistory);
        // Convert the conversation history to the format expected by the Gemini API
        const geminiContents = conversationHistory.map((message) => {
            // If content is a string, create a simple text part
            if (typeof message.content === "string") {
                return {
                    role: mapRole(message.role),
                    parts: [{ text: message.content }],
                };
            }
            // If content is an array of ContentPart objects
            else if (Array.isArray(message.content)) {
                return {
                    role: mapRole(message.role),
                    parts: message.content.map((part) => {
                        var _a;
                        switch (part.type) {
                            case "text":
                                return { text: part.text || "" };
                            case "image":
                                return {
                                    inline_data: {
                                        mime_type: part.mimeType || "image/jpeg",
                                        data: ((_a = part.mediaData) === null || _a === void 0 ? void 0 : _a.replace(/^data:image\/[^;]+;base64,/, "")) ||
                                            "",
                                    },
                                };
                            case "video":
                                // Handle video with file_uri format for processed videos
                                if ("file_uri" in part && part.file_uri) {
                                    return {
                                        file_data: {
                                            mime_type: part.mimeType || "video/mp4",
                                            file_uri: part.file_uri,
                                        },
                                    };
                                }
                                else {
                                    return {
                                        file_data: {
                                            mime_type: part.mimeType || "video/mp4",
                                            file_uri: part.mediaData || "",
                                        },
                                    };
                                }
                            case "audio":
                            case "document":
                                // For now, these are handled as file_data in the API
                                return {
                                    file_data: {
                                        mime_type: part.mimeType || "",
                                        file_uri: part.mediaData || "",
                                    },
                                };
                            default:
                                return { text: "Unsupported content type" };
                        }
                    }),
                };
            }
            // Fallback for any other unexpected format
            return {
                role: mapRole(message.role),
                parts: [{ text: "Unable to process content" }],
            };
        });
        // Configure the API request
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`;
        const requestBody = {
            contents: geminiContents,
            generation_config: {
                temperature: 0.2,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: settings.maxTokens,
            },
            safety_settings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        };
        console.log("Gemini API request:", JSON.stringify(requestBody, null, 2));
        try {
            // Make the API request
            const response = yield fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = yield response.text();
                throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
            }
            const data = yield response.json();
            console.log("Gemini API response:", data);
            // Extract the text from the response
            if (data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0] &&
                data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text;
            }
            else {
                throw new Error("Invalid response format from Gemini API");
            }
        }
        catch (error) {
            console.error("Error calling Gemini Multimodal API:", error);
            throw error;
        }
    });
}
// Helper function to map our role types to Gemini API role types
function mapRole(role) {
    switch (role) {
        case "user":
            return "user";
        case "assistant":
            return "model";
        case "system":
            return "user"; // Gemini doesn't have a system role, we prepend this as user message
        default:
            return "user";
    }
}
// New function to fetch an image and convert it to base64
function fetchImageAsBase64(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Fetch the image data
            const response = yield fetch(imageUrl, {
                // Add options to handle CORS
                mode: "cors",
                cache: "no-cache",
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            // Get the image data as blob
            const blob = yield response.blob();
            // Convert blob to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === "string") {
                        resolve(reader.result);
                    }
                    else {
                        reject(new Error("Failed to convert image to base64"));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
        catch (error) {
            console.error("Error fetching image:", error);
            throw error;
        }
    });
}
// Handler for multimodal requests (combined text and media)
function handleMultimodalRequest(request, sender) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("Handling multimodal request:", request);
        try {
            // Get settings
            const settings = yield (0, utils_1.getSettings)();
            // Set the tab ID
            request.tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
            // For videos, use the File API to upload the video
            if (request.mediaType === types_1.MediaType.VIDEO) {
                try {
                    console.log("Processing video URL for multimodal request:", request.mediaData);
                    if (request.mediaData.startsWith("http")) {
                        // Upload the video to Gemini File API and get a file_uri
                        const fileResult = yield uploadVideoToGeminiAPI(request.mediaData, settings.apiKey);
                        request.mediaData = fileResult.file_uri;
                        console.log("Successfully uploaded video to Gemini File API:", request.mediaData);
                    }
                }
                catch (error) {
                    console.error("Error processing video for multimodal request:", error);
                    throw new Error("Failed to process the video component. Gemini requires videos to be processed through its File API. " +
                        "This may be due to:\n\n" +
                        "• The video URL is not directly accessible\n" +
                        "• The video format is not supported\n" +
                        "• The video is too large or too long\n" +
                        "• There was a network error during upload\n\n" +
                        "Please try with a different video or check that the URL is publicly accessible.");
                }
            }
            // For images, use base64 data
            if (request.mediaType === types_1.MediaType.IMAGE &&
                !request.mediaData.startsWith("data:")) {
                try {
                    console.log("Converting image URL to base64 for multimodal request");
                    request.mediaData = yield fetchImageAsBase64(request.mediaData);
                }
                catch (error) {
                    console.error("Error converting image to base64:", error);
                    throw new Error("Failed to process the image component. This may be due to image protection by the website or CORS restrictions.");
                }
            }
            // Create conversation history
            const conversationHistory = [];
            // Add system message
            conversationHistory.push({
                role: "system",
                content: getSystemPromptForMultimodal(request),
            });
            // Create user message with combined content parts
            const userMessage = {
                role: "user",
                content: [],
            };
            // Create content parts array
            const contentParts = [];
            // Add text part first
            contentParts.push({
                type: "text",
                text: `Please analyze this text and ${request.mediaType.toLowerCase()} together and explain their relationship: "${request.text}"`,
            });
            // Add media part based on type
            if (request.mediaType === types_1.MediaType.IMAGE &&
                request.mediaData.startsWith("data:")) {
                // For images with base64 data
                contentParts.push({
                    type: "image",
                    mediaData: request.mediaData,
                    mimeType: request.mimeType || "image/jpeg",
                });
            }
            else if (request.mediaType === types_1.MediaType.VIDEO) {
                // For videos using file_uri format
                contentParts.push({
                    type: "video",
                    file_uri: request.mediaData, // This should now be a proper file_uri from the File API
                    mimeType: request.mimeType || "video/mp4",
                });
            }
            else {
                // For other media types
                contentParts.push({
                    type: request.mediaType.toLowerCase(),
                    mediaData: request.mediaData,
                    mimeType: request.mimeType ||
                        getMimeTypeForMedia(request.mediaType, request.mediaData),
                });
            }
            // Set the content parts in the user message
            userMessage.content = contentParts;
            conversationHistory.push(userMessage);
            // Call Gemini API for multimodal content
            console.log("Calling Gemini API with multimodal content:", conversationHistory);
            const explanation = yield callGeminiMultimodalAPI(conversationHistory, settings);
            // Create result conversation history
            const resultConversationHistory = [
                {
                    role: "user",
                    content: `Explain the relationship between this text: "${request.text}" and the ${request.mediaType.toLowerCase()}.`,
                },
                {
                    role: "assistant",
                    content: explanation,
                },
            ];
            // Return the result
            return {
                explanation,
                conversationHistory: resultConversationHistory,
                originalText: `Text + ${request.mediaType} content`,
            };
        }
        catch (error) {
            console.error("Error handling multimodal request:", error);
            throw error;
        }
    });
}
// Get system prompt for multimodal content
function getSystemPromptForMultimodal(request) {
    // Start with generic instructions
    let prompt = "You are an AI assistant specialized in explaining how text and visual content relate to each other. " +
        "Provide clear, educational explanations that identify connections between the two. " +
        "Be comprehensive but concise.";
    // Add media type specific instructions
    switch (request.mediaType) {
        case types_1.MediaType.IMAGE:
            prompt +=
                " Focus on how the image illustrates, contradicts, or relates to the text. " +
                    "Consider elements like subject matter, composition, colors, and visual metaphors.";
            break;
        case types_1.MediaType.VIDEO:
            prompt +=
                " Describe how the video content relates to or expands upon the text. " +
                    "Consider motion, timing, visual elements, and how they complement or contrast with the text.";
            break;
        case types_1.MediaType.AUDIO:
            prompt +=
                " Explain how the audio relates to the text. " +
                    "Consider tone, mood, spoken content, and how the audio enhances understanding of the text.";
            break;
        case types_1.MediaType.DOCUMENT:
            prompt +=
                " Analyze how the document content relates to or provides context for the text. " +
                    "Consider structure, formatting, and content relationships.";
            break;
    }
    // Add context information
    if (request.contextText) {
        prompt += `\n\nThe text was found in this broader context (which may include CSS that should be ignored unless directly relevant): "${request.contextText}"`;
    }
    if (request.mediaContextText) {
        prompt += `\n\nThe ${request.mediaType.toLowerCase()} was found with this context: "${request.mediaContextText}"`;
    }
    return prompt;
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
/******/ 	var __webpack_exports__ = __webpack_require__("./src/background/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=background.js.map