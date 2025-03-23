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
  multimodalEnabled: boolean; // Whether to enable multimodal content (images, audio, etc.)
  historyRetention: "forever" | number; // 'forever' or number of days to keep history
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
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
export enum MediaType {
  TEXT = "text",
  IMAGE = "image",
  DOCUMENT = "document",
  AUDIO = "audio",
  VIDEO = "video",
}

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
  // New message types for multimedia
  EXPLAIN_MEDIA = "EXPLAIN_MEDIA",
  MEDIA_EXPLANATION_RESULT = "MEDIA_EXPLANATION_RESULT",
  // New message type for multimodal content (text + media combined)
  EXPLAIN_MULTIMODAL = "EXPLAIN_MULTIMODAL",
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
  skipCache?: boolean; // Flag to bypass cache for regeneration
  pageUrl?: string; // URL of the page where the text was selected
}

// Structure for a multimedia explanation request
export interface ExplainMediaRequest {
  mediaType: MediaType;
  mediaData: string; // Base64 encoded data or URL
  mimeType: string; // MIME type of the media
  contextText?: string; // Optional surrounding text for context
  tabId?: number;
  skipCache?: boolean; // Flag to bypass cache for regeneration
  timestamp?: number; // For video, optional timestamp in seconds
  pageUrl?: string; // URL of the page containing the media
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
  content: string | ContentPart[];
}

// Structure for multimodal content parts
export interface ContentPart {
  type: "text" | "image" | "audio" | "video" | "document";
  text?: string;
  mediaData?: string; // Base64 encoded data or URL
  mimeType?: string; // MIME type if this is media
  file_uri?: string; // For videos and other media that use Gemini's File API
}

// History log entry structure
export interface HistoryLogEntry {
  id: string;
  timestamp: number;
  text: string;
  contextText?: string;
  explanation: string;
  mediaType?: MediaType;
  mediaData?: string;
  pageUrl?: string;
  conversationHistory: ConversationMessage[];
  webSearched?: boolean;
  citations?: string[];
}

// History log structure
export interface HistoryLog {
  entries: HistoryLogEntry[];
  lastUpdated: number;
}

// Cache item structure
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  historyLogId?: string; // Reference to the history log entry
}

// Structure for a multimodal explanation request (text + media combined)
export interface ExplainMultimodalRequest {
  text: string; // Selected text
  contextText?: string; // Optional surrounding text context
  mediaType: MediaType; // Type of media
  mediaData: string; // Base64 encoded data or URL for the media
  mimeType: string; // MIME type of the media
  mediaContextText?: string; // Optional context text for the media
  tabId?: number;
  skipCache?: boolean; // Flag to bypass cache for regeneration
  timestamp?: number; // For video, optional timestamp in seconds
  pageUrl?: string; // URL of the page containing the content
}
