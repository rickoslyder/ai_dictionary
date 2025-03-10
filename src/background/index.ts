/// <reference types="chrome" />
import {
  MessageType,
  ExplainTextRequest,
  ExplanationResult,
  FollowUpRequest,
  WebSearchRequest,
  ConversationMessage,
  Settings,
} from "../shared/types";
import {
  getSettings,
  saveSettings,
  getCacheItem,
  setCacheItem,
  generateCacheKey,
  clearExpiredCache,
} from "../shared/utils";

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
  clearExpiredCache();
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
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message, "from", sender);
  const { type, payload } = message;

  switch (type) {
    case MessageType.EXPLAIN_TEXT:
      console.log("Background handling EXPLAIN_TEXT request");
      handleExplainText(payload, sender.tab?.id)
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

    case MessageType.FOLLOW_UP_QUESTION:
      console.log("Background handling FOLLOW_UP_QUESTION request");
      handleFollowUpQuestion(payload, sender.tab?.id)
        .then(sendResponse)
        .catch((error) => {
          console.error("Error in handleFollowUpQuestion:", error);
          sendResponse({
            explanation:
              "An error occurred while processing your follow-up question.",
            originalText: payload.originalText,
            error: error instanceof Error ? error.message : String(error),
            conversationHistory: payload.conversationHistory || [],
          });
        });
      return true;

    case MessageType.WEB_SEARCH:
      console.log("Background handling WEB_SEARCH request");
      handleWebSearch(payload, sender.tab?.id)
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

    case MessageType.GET_SETTINGS:
      getSettings().then(sendResponse);
      return true;

    case MessageType.SAVE_SETTINGS:
      saveSettings(payload)
        .then(() => {
          sendResponse({ success: true });
          // Notify any open tabs about the settings change
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (tab.id) {
                chrome.tabs
                  .sendMessage(tab.id, {
                    type: MessageType.SETTINGS_UPDATED,
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

    case MessageType.OPEN_CHAT:
      console.log("Handling chat open request with data:", payload);
      sendResponse({ success: true });
      return true;

    default:
      console.log("Unknown message type:", type);
      return false;
  }
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
      const cachedResult = await getCacheItem<ExplanationResult>(cacheKey);

      if (cachedResult) {
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

    // Cache result if enabled
    if (settings.cacheEnabled) {
      const cacheKey = generateCacheKey(request.text);
      await setCacheItem(cacheKey, result, settings.cacheExpiry);
    }

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
