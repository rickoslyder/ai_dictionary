// Type definitions for the extension

// Extension settings
export interface Settings {
  apiKey: string;
  perplexityApiKey: string; // Perplexity API key
  theme: "light" | "dark" | "auto";
  maxTokens: number;
  cacheEnabled: boolean;
  cacheExpiry: number; // in hours
  webSearchEnabled: boolean; // Whether to enable web search
  keyboardShortcut: {
    key: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
  }; // Keyboard shortcut configuration
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
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
export enum MessageType {
  EXPLAIN_TEXT = "EXPLAIN_TEXT",
  EXPLANATION_RESULT = "EXPLANATION_RESULT",
  FOLLOW_UP_QUESTION = "FOLLOW_UP_QUESTION",
  WEB_SEARCH = "WEB_SEARCH",
  WEB_SEARCH_RESULT = "WEB_SEARCH_RESULT",
  OPEN_CHAT = "OPEN_CHAT",
  GET_SETTINGS = "GET_SETTINGS",
  SAVE_SETTINGS = "SAVE_SETTINGS",
  SETTINGS_UPDATED = "SETTINGS_UPDATED",
  ERROR = "ERROR",
}

// Basic message structure
export interface Message {
  type: MessageType;
  payload: any;
}

// Structure for an explanation request
export interface ExplainTextRequest {
  text: string;
  contextText?: string; // Optional surrounding text for context
  tabId?: number;
}

// Structure for a web search request
export interface WebSearchRequest {
  text: string;
  originalExplanation: string;
  tabId?: number;
}

// Structure for a follow-up question
export interface FollowUpRequest {
  originalText: string;
  question: string;
  conversationHistory: ConversationMessage[];
  tabId?: number;
}

// Structure for the explanation result
export interface ExplanationResult {
  explanation: string;
  originalText: string;
  error?: string;
  conversationHistory: ConversationMessage[];
  webSearched?: boolean;
  citations?: string[];
}

// Structure for a message in the conversation history
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Cache item structure
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}
