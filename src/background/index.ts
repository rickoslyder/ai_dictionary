/// <reference types="chrome" />
import {
  getSettings,
  addHistoryLogEntry,
  cleanupHistoryEntries,
  generateCacheKey,
  getCacheItem,
  setCacheItem,
  saveSettings,
  clearExpiredCache,
} from "../shared/utils";
import {
  MessageType,
  ExplainTextRequest,
  ExplanationResult,
  FollowUpRequest,
  ConversationMessage,
  WebSearchRequest,
  MediaType,
  ExplainMediaRequest,
  ContentPart,
  HistoryLogEntry,
  Settings,
  ExplainMultimodalRequest,
} from "../shared/types";
import { getAllHistoryEntries, addHistoryEntry } from "../shared/db";

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
  clearExpiredCache();
});

// Keep service worker alive
let keepAliveInterval: NodeJS.Timeout;

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

  if (info.menuItemId === "explainText" && info.selectionText && tab?.id) {
    console.log(
      "Sending message to tab",
      tab.id,
      "with text:",
      info.selectionText
    );
    // Send a message to the content script to show the tooltip
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: MessageType.EXPLAIN_TEXT,
          payload: {
            text: info.selectionText,
          },
        },
        (response) => {
          console.log("Response from content script:", response);
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in context menu handler:", error);
    }
  } else if (info.menuItemId === "explainImage" && info.srcUrl && tab?.id) {
    // Handle image explanation request
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "CONTEXT_MENU_CLICKED",
          payload: {
            mediaType: MediaType.IMAGE,
            mediaUrl: info.srcUrl,
            pageUrl: info.pageUrl,
          },
        },
        (response) => {
          console.log("Response from content script for image:", response);
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in image context menu handler:", error);
    }
  } else if (info.menuItemId === "explainVideo" && info.srcUrl && tab?.id) {
    // Handle video explanation request
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "CONTEXT_MENU_CLICKED",
          payload: {
            mediaType: MediaType.VIDEO,
            mediaUrl: info.srcUrl,
            pageUrl: info.pageUrl,
          },
        },
        (response) => {
          console.log("Response from content script for video:", response);
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in video context menu handler:", error);
    }
  } else if (info.menuItemId === "explainAudio" && info.srcUrl && tab?.id) {
    // Handle audio explanation request
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "CONTEXT_MENU_CLICKED",
          payload: {
            mediaType: MediaType.AUDIO,
            mediaUrl: info.srcUrl,
            pageUrl: info.pageUrl,
          },
        },
        (response) => {
          console.log("Response from content script for audio:", response);
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in audio context menu handler:", error);
    }
  } else if (info.menuItemId === "explainDocument" && info.linkUrl && tab?.id) {
    // Handle document explanation request
    try {
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "CONTEXT_MENU_CLICKED",
          payload: {
            mediaType: MediaType.DOCUMENT,
            mediaUrl: info.linkUrl,
            pageUrl: info.pageUrl,
          },
        },
        (response) => {
          console.log("Response from content script for document:", response);
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in document context menu handler:", error);
    }
  }
});

// Message listener with error handling and reconnection logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.type);

  // Get the tab ID if available
  const tabId = sender.tab?.id;

  // Handle potential disconnections
  const handleError = (error: any) => {
    console.error("Error in message handler:", error);

    // Try to reconnect if context was invalidated
    if (error.message?.includes("Extension context invalidated")) {
      console.log("Attempting to reconnect...");
      startKeepAlive();
    }

    // Send error response
    sendResponse({
      error: error instanceof Error ? error.message : String(error),
      explanation: "",
      originalText: message.payload?.text || "",
      conversationHistory: [],
    });
  };

  try {
    switch (message.type) {
      case MessageType.EXPLAIN_TEXT:
        handleExplainText(message.payload, tabId)
          .then((result) => {
            sendResponse(result);
          })
          .catch(handleError);
        break;

      case MessageType.FOLLOW_UP_QUESTION:
        console.log("Background handling FOLLOW_UP_QUESTION request");
        handleFollowUpQuestion(message.payload, tabId)
          .then(sendResponse)
          .catch(handleError);
        break;

      case MessageType.WEB_SEARCH:
        console.log("Background handling WEB_SEARCH request");
        handleWebSearch(message.payload, tabId)
          .then(sendResponse)
          .catch(handleError);
        break;

      case MessageType.GET_SETTINGS:
        console.log("Background handling GET_SETTINGS request");
        getSettings()
          .then((settings) => {
            console.log("Sending settings:", settings);
            sendResponse(settings);
          })
          .catch(handleError);
        break;

      case MessageType.SAVE_SETTINGS:
        console.log("Background handling SAVE_SETTINGS request");
        saveSettings(message.payload)
          .then(() => {
            console.log("Settings saved, broadcasting update");
            // Broadcast settings update to all tabs
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  chrome.tabs.sendMessage(
                    tab.id,
                    {
                      type: MessageType.SETTINGS_UPDATED,
                      payload: message.payload,
                    },
                    () => {
                      // Ignore errors - tab might not have a content script
                      if (chrome.runtime.lastError) {
                        console.log(
                          "Error sending settings update:",
                          chrome.runtime.lastError
                        );
                      }
                    }
                  );
                }
              });
            });
            sendResponse({ success: true });
          })
          .catch(handleError);
        break;

      case MessageType.EXPLAIN_MEDIA:
        console.log("Background handling EXPLAIN_MEDIA request");
        handleMediaExplainRequest(message.payload, sender)
          .then((result) => {
            console.log("Sending media explanation result:", result);
            sendResponse(result);
          })
          .catch(handleError);
        break;

      case MessageType.EXPLAIN_MULTIMODAL:
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
  } catch (error) {
    handleError(error);
  }

  // Return true to indicate async response
  return true;
});

// Handle explain text requests
async function handleExplainText(
  request: ExplainTextRequest,
  tabId?: number
): Promise<ExplanationResult> {
  try {
    const settings = await getSettings();

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
      const cacheKey = generateCacheKey(request.text);
      const { data: cachedResult, historyEntry } =
        await getCacheItem<ExplanationResult>(cacheKey);

      if (cachedResult) {
        // If we have a history entry, use its conversation history
        if (historyEntry) {
          cachedResult.conversationHistory = historyEntry.conversationHistory;
        }
        return cachedResult;
      }
    }

    // Generate enhanced conversation history with system prompts
    const enhancedConversationHistory: ConversationMessage[] = [
      // System prompt with instructions
      {
        role: "system",
        content:
          "You are AI Dictionary+, a helpful AI assistant integrated into a browser extension. " +
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
        content:
          `The user has selected this text to be explained: "${request.text}". ` +
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
    const explanation = await callGeminiAPI(
      enhancedConversationHistory,
      settings
    );

    // Create result - only include the actual conversation in the history (not system messages)
    // This prevents UI confusion with system messages appearing in the chat
    const resultConversationHistory: ConversationMessage[] = [
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
    const result: ExplanationResult = {
      explanation,
      originalText: request.text,
      conversationHistory: resultConversationHistory,
    };

    // Add to history log
    const historyLogId = await addHistoryLogEntry({
      text: request.text,
      contextText: request.contextText,
      explanation,
      conversationHistory: resultConversationHistory,
      pageUrl: request.pageUrl,
    });

    // Cache result if enabled
    if (settings.cacheEnabled) {
      const cacheKey = generateCacheKey(request.text);
      await setCacheItem(cacheKey, result, settings.cacheExpiry, historyLogId);
    }

    // Clean up old history entries based on retention settings
    cleanupHistoryEntries(settings).catch(console.error);

    return result;
  } catch (error) {
    console.error("Error explaining text:", error);
    return {
      explanation: "An error occurred while getting the explanation.",
      originalText: request.text,
      error: error instanceof Error ? error.message : String(error),
      conversationHistory: [],
    };
  }
}

// Handle follow-up questions
async function handleFollowUpQuestion(
  request: FollowUpRequest,
  tabId?: number
): Promise<ExplanationResult> {
  try {
    const settings = await getSettings();

    if (!settings.apiKey) {
      return {
        explanation: "Please set your API key in the extension options",
        originalText: request.originalText,
        error: "No API key",
        conversationHistory: [],
      };
    }

    // Enhanced conversation history with system prompts for better context
    const enhancedConversationHistory: ConversationMessage[] = [];

    // Add system prompt about AI Dictionary+ capabilities
    enhancedConversationHistory.push({
      role: "system",
      content:
        "You are AI Dictionary+, a helpful AI assistant integrated into a browser extension. " +
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
    const explanation = await callGeminiAPI(
      enhancedConversationHistory,
      settings
    );

    // Create result - only include the actual conversation in the history (not system messages)
    // This prevents UI confusion with system messages appearing in the chat
    const resultConversationHistory: ConversationMessage[] = [
      ...request.conversationHistory,
      { role: "user" as const, content: request.question },
      { role: "assistant" as const, content: explanation },
    ];

    const result: ExplanationResult = {
      explanation,
      originalText: request.originalText,
      conversationHistory: resultConversationHistory,
    };

    // Find and update the history entry for this conversation
    const historyEntries = await getAllHistoryEntries();
    const historyEntry = historyEntries.find(
      (entry: HistoryLogEntry) => entry.text === request.originalText
    );

    if (historyEntry) {
      // Update the conversation history
      const updatedEntry: HistoryLogEntry = {
        ...historyEntry,
        conversationHistory: resultConversationHistory,
      };

      // Update the entry in the database
      await addHistoryEntry(updatedEntry);
    }

    return result;
  } catch (error) {
    console.error("Error with follow-up question:", error);
    return {
      explanation: "An error occurred while getting the explanation.",
      originalText: request.originalText,
      error: error instanceof Error ? error.message : String(error),
      conversationHistory: request.conversationHistory,
    };
  }
}

// Call Gemini API
async function callGeminiAPI(
  conversationHistory: ConversationMessage[],
  settings: Settings
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`;

  // Format the conversation for Gemini
  const contents = conversationHistory.map((message) => {
    // Map roles from our app format to Gemini API format
    let apiRole = "user";
    if (message.role === "assistant") {
      apiRole = "model";
    } else if (message.role === "system") {
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

  const payload = {
    contents,
    ...enhancedInstructions,
  };

  console.log("Sending payload to Gemini:", JSON.stringify(payload));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract text from response
  if (
    data.candidates &&
    data.candidates[0]?.content?.parts &&
    data.candidates[0].content.parts[0]?.text
  ) {
    return data.candidates[0].content.parts[0].text as string;
  }

  throw new Error("Unexpected API response format");
}

// Handle web search requests
async function handleWebSearch(
  request: WebSearchRequest,
  tabId?: number
): Promise<ExplanationResult> {
  try {
    const settings = await getSettings();

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
    const { explanation, citations } = await callPerplexityAPI(
      request.text,
      request.originalExplanation,
      settings
    );

    console.log("Web search result:", { explanation, citations });

    // Create result
    const result: ExplanationResult = {
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
  } catch (error) {
    console.error("Error in web search:", error);
    return {
      explanation: request.originalExplanation,
      originalText: request.text,
      error: error instanceof Error ? error.message : String(error),
      conversationHistory: [],
      webSearched: false,
    };
  }
}

// Call Perplexity API with the sonar model
async function callPerplexityAPI(
  query: string,
  originalExplanation: string,
  settings: Settings
): Promise<{ explanation: string; citations: string[] }> {
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.perplexityApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Perplexity API response:", data);

  // Extract response text
  if (data.choices && data.choices[0]?.message?.content) {
    const explanation = data.choices[0].message.content;

    // Extract citations directly from the API response
    const citations = data.citations || [];

    return { explanation, citations };
  }

  throw new Error("Unexpected API response format from Perplexity");
}

// Function to upload video to Gemini File API and get a file URI
async function uploadVideoToGeminiAPI(
  videoUrl: string,
  apiKey: string
): Promise<{ name: string; file_uri: string }> {
  console.log("Uploading video to Gemini File API:", videoUrl);

  try {
    // Fetch the video data
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch video: ${response.status} ${response.statusText}`
      );
    }

    // Get the video data as blob
    const videoBlob = await response.blob();

    // Get the content type
    const mimeType = response.headers.get("content-type") || "video/mp4";

    // Create form data for upload
    const formData = new FormData();
    formData.append("file", videoBlob, "video.mp4");

    // Upload to Gemini Files API
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

    // Initial resumable upload request
    const initResponse = await fetch(uploadUrl, {
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
      throw new Error(
        `Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}`
      );
    }

    // Get the upload URL from headers
    const uploadSessionUrl = initResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadSessionUrl) {
      throw new Error("Upload URL not found in response headers");
    }

    // Upload the video content
    const uploadResponse = await fetch(uploadSessionUrl, {
      method: "POST",
      headers: {
        "Content-Length": videoBlob.size.toString(),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload video content: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    // Parse the response to get the file URI
    const fileInfo = await uploadResponse.json();

    console.log("File upload response:", JSON.stringify(fileInfo, null, 2));

    if (!fileInfo.file || !fileInfo.file.uri) {
      throw new Error("File URI not found in upload response");
    }

    // Wait for the file to be processed (if needed)
    let file = fileInfo.file;
    let processingAttempts = 0;
    const maxProcessingAttempts = 5;

    while (
      file.state === "PROCESSING" &&
      processingAttempts < maxProcessingAttempts
    ) {
      processingAttempts++;
      console.log(
        `Video still processing, attempt ${processingAttempts}/${maxProcessingAttempts}...`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      // Check file status - Use the full file name as returned by the API
      // The file.name already contains the full path like "files/12345"
      let fileStatusUrl;
      if (file.name.startsWith("files/")) {
        fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`;
      } else {
        fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/files/${file.name}?key=${apiKey}`;
      }

      console.log("Checking file status at URL:", fileStatusUrl);

      try {
        const fileResponse = await fetch(fileStatusUrl);

        if (!fileResponse.ok) {
          console.error(
            "Failed to check file status:",
            fileResponse.status,
            fileResponse.statusText
          );
          // Don't throw an error, just try the alternative URL format if this is the first failure
          if (processingAttempts === 1 && fileStatusUrl.includes("/files/")) {
            // Try alternative URL format
            file.name = file.name.replace("files/", "");
            continue; // Skip to next iteration with new file name
          }
          throw new Error(
            `Failed to check file status: ${fileResponse.status} ${fileResponse.statusText}`
          );
        }

        const fileStatusData = await fileResponse.json();
        console.log(
          "File status response:",
          JSON.stringify(fileStatusData, null, 2)
        );

        file = fileStatusData.file || fileStatusData;
      } catch (error) {
        console.error("Error checking file status:", error);
        // If this is not the last attempt, continue trying
        if (processingAttempts < maxProcessingAttempts) {
          continue;
        }
        throw error;
      }
    }

    if (
      processingAttempts >= maxProcessingAttempts &&
      file.state === "PROCESSING"
    ) {
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
  } catch (error) {
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
      } else if (errorMessage.includes("Failed to initialize upload")) {
        userMessage +=
          "The Gemini API couldn't start the upload process. Please check your API key and network connection.";
      } else if (errorMessage.includes("Upload URL not found")) {
        userMessage +=
          "The upload session couldn't be established with the Gemini API. This may be a temporary issue.";
      } else if (errorMessage.includes("Failed to upload video content")) {
        userMessage +=
          "The video couldn't be uploaded to the Gemini API. This may be due to the file size or network issues.";
      } else if (errorMessage.includes("File URI not found")) {
        userMessage +=
          "The uploaded file information wasn't returned properly. This is usually a temporary API issue.";
      } else if (errorMessage.includes("Failed to check file status")) {
        userMessage +=
          "The status of the uploaded video couldn't be verified. The file may have been deleted or may not be accessible.";
      } else if (errorMessage.includes("Video processing failed")) {
        userMessage +=
          "The Gemini API couldn't process the video. This may be due to an unsupported format or content issues.";
      } else {
        userMessage += "An unexpected error occurred: " + errorMessage;
      }
    } else {
      userMessage += "An unknown error occurred during video processing.";
    }

    // Throw a new error with the user-friendly message
    throw new Error(userMessage);
  }
}

/**
 * Upload an audio file to the Gemini File API
 * This function handles the upload process for audio files similar to videos
 */
async function uploadAudioToGeminiAPI(
  audioUrl: string
): Promise<{ name: string; file_uri: string }> {
  console.log("Uploading audio to Gemini File API:", audioUrl);

  try {
    // Fetch the audio file data from URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch audio file: ${response.status} ${response.statusText}`
      );
    }

    // Get the audio data as blob
    const audioBlob = await response.blob();
    console.log("Audio blob:", audioBlob);

    // Get API key for Gemini
    const settings = await getSettings();
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
    const initResponse = await fetch(uploadUrl, {
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
      throw new Error(
        `Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}`
      );
    }

    // Get the upload URL from headers
    const uploadSessionUrl = initResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadSessionUrl) {
      throw new Error("Upload URL not found in response headers");
    }

    // Upload the audio content
    const uploadResponse = await fetch(uploadSessionUrl, {
      method: "POST",
      headers: {
        "Content-Length": audioBlob.size.toString(),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: audioBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload audio content: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    // Parse the response to get the file URI
    const fileInfo = await uploadResponse.json();
    console.log("File upload response:", JSON.stringify(fileInfo, null, 2));

    if (!fileInfo.file || !fileInfo.file.uri) {
      throw new Error("File URI not found in upload response");
    }

    // Wait for the file to be processed (if needed)
    let file = fileInfo.file;
    let processingAttempts = 0;
    const maxProcessingAttempts = 5;

    while (
      file.state === "PROCESSING" &&
      processingAttempts < maxProcessingAttempts
    ) {
      processingAttempts++;
      console.log(
        `Audio still processing, attempt ${processingAttempts}/${maxProcessingAttempts}...`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      // Check file status - Use the full file name as returned by the API
      // Construct URL differently based on the format of the file.name
      let fileStatusUrl;
      if (file.name.startsWith("files/")) {
        fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`;
      } else {
        fileStatusUrl = `https://generativelanguage.googleapis.com/v1beta/files/${file.name}?key=${apiKey}`;
      }

      console.log("Checking file status at URL:", fileStatusUrl);

      try {
        const fileResponse = await fetch(fileStatusUrl);

        if (!fileResponse.ok) {
          console.error(
            "Failed to check file status:",
            fileResponse.status,
            fileResponse.statusText
          );
          // Don't throw an error, just try the alternative URL format if this is the first failure
          if (processingAttempts === 1 && fileStatusUrl.includes("/files/")) {
            // Try alternative URL format
            file.name = file.name.replace("files/", "");
            continue; // Skip to next iteration with new file name
          }
          throw new Error(
            `Failed to check file status: ${fileResponse.status} ${fileResponse.statusText}`
          );
        }

        const fileStatusData = await fileResponse.json();
        console.log(
          "File status response:",
          JSON.stringify(fileStatusData, null, 2)
        );

        file = fileStatusData.file || fileStatusData;
      } catch (error) {
        console.error("Error checking file status:", error);
        // If this is not the last attempt, continue trying
        if (processingAttempts < maxProcessingAttempts) {
          continue;
        }
        throw error;
      }
    }

    if (
      processingAttempts >= maxProcessingAttempts &&
      file.state === "PROCESSING"
    ) {
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
  } catch (error) {
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
      } else if (errorMessage.includes("Failed to initialize upload")) {
        userMessage +=
          "The Gemini API couldn't start the upload process. Please check your API key and network connection.";
      } else if (errorMessage.includes("Upload URL not found")) {
        userMessage +=
          "The upload session couldn't be established with the Gemini API. This may be a temporary issue.";
      } else if (errorMessage.includes("Failed to upload audio content")) {
        userMessage +=
          "The audio couldn't be uploaded to the Gemini API. This may be due to the file size or network issues.";
      } else if (errorMessage.includes("File URI not found")) {
        userMessage +=
          "The uploaded file information wasn't returned properly. This is usually a temporary API issue.";
      } else if (errorMessage.includes("Failed to check file status")) {
        userMessage +=
          "The status of the uploaded audio couldn't be verified. The file may have been deleted or may not be accessible.";
      } else if (errorMessage.includes("Audio processing failed")) {
        userMessage +=
          "The Gemini API couldn't process the audio. This may be due to an unsupported format or content issues.";
      } else {
        userMessage += "An unexpected error occurred: " + errorMessage;
      }
    } else {
      userMessage += "An unknown error occurred during audio processing.";
    }

    // Throw a new error with the user-friendly message
    throw new Error(userMessage);
  }
}

// Update handleMediaExplainRequest to support both video and audio uploads
async function handleMediaExplainRequest(
  request: ExplainMediaRequest,
  sender: chrome.runtime.MessageSender
): Promise<ExplanationResult> {
  try {
    console.log("Handling media explain request:", request);

    // Get settings
    const settings = await getSettings();

    // Check if multimodal is enabled
    if (!settings.multimodalEnabled) {
      return {
        explanation:
          "Multimedia content analysis is not enabled. Please enable it in the extension options.",
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
    if (!request.tabId && sender.tab?.id) {
      request.tabId = sender.tab.id;
    }

    // Check if we are handling a video that needs to be uploaded using File API
    let fileUri: string | undefined;

    if (request.mediaType === MediaType.VIDEO) {
      console.log("Processing video with File API");
      try {
        // uploadVideoToGeminiAPI now returns an object with file_uri property
        const fileResult = await uploadVideoToGeminiAPI(
          request.mediaData,
          settings.apiKey
        );
        fileUri = fileResult.file_uri;
        console.log("Video uploaded successfully, file_uri:", fileUri);
      } catch (error) {
        console.error("Error uploading video:", error);
        throw new Error(
          `Video upload failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    // Check if we are handling an audio file that needs to be uploaded using File API
    else if (request.mediaType === MediaType.AUDIO) {
      console.log("Processing audio with File API");
      try {
        // uploadAudioToGeminiAPI returns an object with file_uri property
        const fileResult = await uploadAudioToGeminiAPI(request.mediaData);
        fileUri = fileResult.file_uri;
        console.log("Audio uploaded successfully, file_uri:", fileUri);
      } catch (error) {
        console.error("Error uploading audio:", error);
        throw new Error(
          `Audio upload failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    // For images and other media types, proceed with regular processing
    else if (
      request.mediaType === MediaType.IMAGE &&
      request.mediaData.startsWith("http")
    ) {
      console.log("Processing image URL, fetching as base64");
      // Fetch image as base64 for URLs
      try {
        request.mediaData = await fetchImageAsBase64(request.mediaData);
      } catch (error) {
        console.error("Error fetching image as base64:", error);
        throw new Error(
          `Image processing failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Create conversation history
    const conversationHistory: ConversationMessage[] = [];

    // Add system message
    conversationHistory.push({
      role: "system",
      content: getSystemPromptForMedia(request.mediaType),
    });

    // Add user message with media content
    const userMessage: ConversationMessage = {
      role: "user",
      content: [],
    };

    // Create content parts based on media type
    const contentParts: ContentPart[] = [];

    // Add text part with context and instructions
    let textPrompt = `Please analyze this ${request.mediaType.toLowerCase()}`;

    // Add timestamp for videos if available
    if (request.mediaType === MediaType.VIDEO && request.timestamp) {
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
    if (
      request.mediaType === MediaType.IMAGE &&
      request.mediaData.startsWith("data:")
    ) {
      // For images with base64 data
      contentParts.push({
        type: "image",
        mediaData: request.mediaData,
        mimeType: request.mimeType || "image/jpeg",
      });
    } else if (request.mediaType === MediaType.VIDEO) {
      // For videos using file_uri format
      contentParts.push({
        type: "video",
        file_uri: fileUri, // This should now be a proper file_uri from the File API
        mimeType: request.mimeType || "video/mp4",
      });
    } else if (request.mediaType === MediaType.AUDIO && fileUri) {
      // For audio using file_uri format
      contentParts.push({
        type: "audio",
        file_uri: fileUri, // Use the file_uri from the upload
        mimeType: request.mimeType || "audio/mpeg",
      });
    } else {
      // For other media types or images with URLs
      contentParts.push({
        type: request.mediaType.toLowerCase() as
          | "image"
          | "video"
          | "audio"
          | "document",
        mediaData: request.mediaData,
        mimeType:
          request.mimeType ||
          getMimeTypeForMedia(request.mediaType, request.mediaData),
      });
    }

    // Set the content parts in the user message
    userMessage.content = contentParts;
    conversationHistory.push(userMessage);

    // Call Gemini API for multimodal content
    console.log(
      "Calling Gemini API with conversation history:",
      conversationHistory
    );
    const explanation = await callGeminiMultimodalAPI(
      conversationHistory,
      settings
    );

    // Add assistant response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: explanation,
    });

    // Return the result
    return {
      explanation,
      conversationHistory,
      originalText: `[${request.mediaType.toUpperCase()}] ${
        request.pageUrl || "Unknown URL"
      }`,
    };
  } catch (error) {
    console.error("Error in handleMediaExplainRequest:", error);
    return {
      explanation: "",
      originalText: "",
      error: `${error instanceof Error ? error.message : String(error)}`,
      conversationHistory: [],
    };
  }
}

// Helper function to get system prompt for different media types
function getSystemPromptForMedia(mediaType: MediaType): string {
  const basePrompt =
    "You are AI Dictionary+, a helpful AI assistant that explains content on the web. ";

  switch (mediaType) {
    case MediaType.IMAGE:
      return (
        basePrompt +
        "Analyze the image and provide a detailed explanation of what it shows. " +
        "Include information about the subject, composition, colors, and any text visible in the image. " +
        "If it's a chart or diagram, explain what it represents. Be concise but thorough."
      );

    case MediaType.VIDEO:
      return (
        basePrompt +
        "Analyze the video frame and provide a detailed explanation of what it shows. " +
        "Describe the scene, any visible action, and key elements in the frame. " +
        "If there's text or captions visible, include that in your analysis. Be concise but thorough."
      );

    case MediaType.AUDIO:
      return (
        basePrompt +
        "Analyze the audio content and describe what you hear. " +
        "If it's speech, summarize what is being said. If it's music, describe the genre, instruments, and mood. " +
        "Note any distinctive sounds or patterns. Be concise but thorough."
      );

    case MediaType.DOCUMENT:
      return (
        basePrompt +
        "Analyze the document and provide a summary of its content. " +
        "Identify the document type, key topics, and main points. " +
        "If there are charts, tables, or images, describe what they show. Be concise but thorough."
      );

    default:
      return (
        basePrompt +
        "Analyze the content and provide a detailed explanation. Be concise but thorough."
      );
  }
}

// Helper function to get MIME type for media
function getMimeTypeForMedia(mediaType: MediaType, mediaUrl: string): string {
  // Default MIME types based on media type
  const defaultMimeTypes: Record<MediaType, string> = {
    [MediaType.IMAGE]: "image/jpeg",
    [MediaType.VIDEO]: "video/mp4",
    [MediaType.AUDIO]: "audio/mpeg",
    [MediaType.DOCUMENT]: "application/pdf",
    [MediaType.TEXT]: "text/plain",
  };

  // Try to determine from URL extension
  const extension = mediaUrl.split(".").pop()?.toLowerCase();
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
async function callGeminiMultimodalAPI(
  conversationHistory: ConversationMessage[],
  settings: Settings
): Promise<string> {
  console.log(
    "Calling Gemini API for multimodal content with history:",
    conversationHistory
  );

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
          switch (part.type) {
            case "text":
              return { text: part.text || "" };
            case "image":
              return {
                inline_data: {
                  mime_type: part.mimeType || "image/jpeg",
                  data:
                    part.mediaData?.replace(/^data:image\/[^;]+;base64,/, "") ||
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
              } else {
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
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", data);

    // Extract the text from the response
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid response format from Gemini API");
    }
  } catch (error) {
    console.error("Error calling Gemini Multimodal API:", error);
    throw error;
  }
}

// Helper function to map our role types to Gemini API role types
function mapRole(role: string): string {
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
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    // Fetch the image data
    const response = await fetch(imageUrl, {
      // Add options to handle CORS
      mode: "cors",
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    // Get the image data as blob
    const blob = await response.blob();

    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

// Handler for multimodal requests (combined text and media)
async function handleMultimodalRequest(
  request: ExplainMultimodalRequest,
  sender: chrome.runtime.MessageSender
): Promise<ExplanationResult> {
  console.log("Handling multimodal request:", request);
  try {
    // Get settings
    const settings = await getSettings();

    // Set the tab ID
    request.tabId = sender.tab?.id;

    // For videos, use the File API to upload the video
    if (request.mediaType === MediaType.VIDEO) {
      try {
        console.log(
          "Processing video URL for multimodal request:",
          request.mediaData
        );
        if (request.mediaData.startsWith("http")) {
          // Upload the video to Gemini File API and get a file_uri
          const fileResult = await uploadVideoToGeminiAPI(
            request.mediaData,
            settings.apiKey
          );
          request.mediaData = fileResult.file_uri;
          console.log(
            "Successfully uploaded video to Gemini File API:",
            request.mediaData
          );
        }
      } catch (error) {
        console.error("Error processing video for multimodal request:", error);
        throw new Error(
          "Failed to process the video component. Gemini requires videos to be processed through its File API. " +
            "This may be due to:\n\n" +
            "• The video URL is not directly accessible\n" +
            "• The video format is not supported\n" +
            "• The video is too large or too long\n" +
            "• There was a network error during upload\n\n" +
            "Please try with a different video or check that the URL is publicly accessible."
        );
      }
    }

    // For images, use base64 data
    if (
      request.mediaType === MediaType.IMAGE &&
      !request.mediaData.startsWith("data:")
    ) {
      try {
        console.log("Converting image URL to base64 for multimodal request");
        request.mediaData = await fetchImageAsBase64(request.mediaData);
      } catch (error) {
        console.error("Error converting image to base64:", error);
        throw new Error(
          "Failed to process the image component. This may be due to image protection by the website or CORS restrictions."
        );
      }
    }

    // Create conversation history
    const conversationHistory: ConversationMessage[] = [];

    // Add system message
    conversationHistory.push({
      role: "system",
      content: getSystemPromptForMultimodal(request),
    });

    // Create user message with combined content parts
    const userMessage: ConversationMessage = {
      role: "user",
      content: [],
    };

    // Create content parts array
    const contentParts: ContentPart[] = [];

    // Add text part first
    contentParts.push({
      type: "text",
      text: `Please analyze this text and ${request.mediaType.toLowerCase()} together and explain their relationship: "${
        request.text
      }"`,
    });

    // Add media part based on type
    if (
      request.mediaType === MediaType.IMAGE &&
      request.mediaData.startsWith("data:")
    ) {
      // For images with base64 data
      contentParts.push({
        type: "image",
        mediaData: request.mediaData,
        mimeType: request.mimeType || "image/jpeg",
      });
    } else if (request.mediaType === MediaType.VIDEO) {
      // For videos using file_uri format
      contentParts.push({
        type: "video",
        file_uri: request.mediaData, // This should now be a proper file_uri from the File API
        mimeType: request.mimeType || "video/mp4",
      });
    } else {
      // For other media types
      contentParts.push({
        type: request.mediaType.toLowerCase() as
          | "image"
          | "video"
          | "audio"
          | "document",
        mediaData: request.mediaData,
        mimeType:
          request.mimeType ||
          getMimeTypeForMedia(request.mediaType, request.mediaData),
      });
    }

    // Set the content parts in the user message
    userMessage.content = contentParts;
    conversationHistory.push(userMessage);

    // Call Gemini API for multimodal content
    console.log(
      "Calling Gemini API with multimodal content:",
      conversationHistory
    );
    const explanation = await callGeminiMultimodalAPI(
      conversationHistory,
      settings
    );

    // Create result conversation history
    const resultConversationHistory: ConversationMessage[] = [
      {
        role: "user",
        content: `Explain the relationship between this text: "${
          request.text
        }" and the ${request.mediaType.toLowerCase()}.`,
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
  } catch (error) {
    console.error("Error handling multimodal request:", error);
    throw error;
  }
}

// Get system prompt for multimodal content
function getSystemPromptForMultimodal(
  request: ExplainMultimodalRequest
): string {
  // Start with generic instructions
  let prompt =
    "You are an AI assistant specialized in explaining how text and visual content relate to each other. " +
    "Provide clear, educational explanations that identify connections between the two. " +
    "Be comprehensive but concise.";

  // Add media type specific instructions
  switch (request.mediaType) {
    case MediaType.IMAGE:
      prompt +=
        " Focus on how the image illustrates, contradicts, or relates to the text. " +
        "Consider elements like subject matter, composition, colors, and visual metaphors.";
      break;
    case MediaType.VIDEO:
      prompt +=
        " Describe how the video content relates to or expands upon the text. " +
        "Consider motion, timing, visual elements, and how they complement or contrast with the text.";
      break;
    case MediaType.AUDIO:
      prompt +=
        " Explain how the audio relates to the text. " +
        "Consider tone, mood, spoken content, and how the audio enhances understanding of the text.";
      break;
    case MediaType.DOCUMENT:
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
    prompt += `\n\nThe ${request.mediaType.toLowerCase()} was found with this context: "${
      request.mediaContextText
    }"`;
  }

  return prompt;
}
