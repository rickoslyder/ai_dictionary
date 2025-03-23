/// <reference types="chrome" />
import {
  MessageType,
  ExplanationResult,
  ConversationMessage,
  Settings,
  MediaType,
  ExplainMediaRequest,
  ExplainMultimodalRequest,
} from "../shared/types";
import { debounce, getSettings, getTheme, isValidText } from "../shared/utils";
import { marked } from "marked";

// At the top of the file, near the other interfaces
// Add a declaration to extend Window interface
declare global {
  interface Window {
    multimodalOptionsElement: HTMLElement | null;
  }
}

// Initialize as null
window.multimodalOptionsElement = null;

// Initialize marked options for security
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

// Store any active tooltip element
let activeTooltip: HTMLElement | null = null;
let selectionButton: HTMLElement | null = null;
let activeConversationHistory: ConversationMessage[] = [];
let activeText = "";
let userSettings: Settings | null = null;

// State for tracking multimodal selections
let pendingMultimodalSelection: {
  text: string | null;
  textContext: string | null;
  mediaType: MediaType | null;
  mediaUrl: string | null;
  mediaElement: HTMLElement | null;
  selection: Selection | null;
} = {
  text: null,
  textContext: null,
  mediaType: null,
  mediaUrl: null,
  mediaElement: null,
  selection: null,
};

// Update the settings to match the correct type
let settings: Settings = {
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
    metaKey: true, // Command key on Mac, Windows key on Windows
  },
  multimodalEnabled: true, // Enable multimodal content by default
  historyRetention: 7, // Default to 7 days retention
};

// Keep track of connection status
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // 1 second

// Interfaces
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  tooltipX: number;
  tooltipY: number;
}

// Tooltip state management
let dragState: DragState | null = null;
let hasBeenMoved = false;

// Function to establish connection with background script
function connectToBackground() {
  try {
    const port = chrome.runtime.connect({ name: "content-script" });

    port.onDisconnect.addListener(() => {
      console.log("Disconnected from background script");
      isConnected = false;

      if (chrome.runtime.lastError) {
        console.error("Connection error:", chrome.runtime.lastError);
      }

      // Try to reconnect if we haven't exceeded max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
        );
        setTimeout(connectToBackground, RECONNECT_DELAY);
      } else {
        console.error("Max reconnection attempts reached");
        showError(
          activeTooltip || createTooltip("Error"),
          "Lost connection to extension. Please refresh the page."
        );
      }
    });

    port.onMessage.addListener((message) => {
      console.log("Received message from background:", message);
    });

    isConnected = true;
    reconnectAttempts = 0;
    console.log("Connected to background script");
  } catch (error) {
    console.error("Error connecting to background:", error);
    isConnected = false;
  }
}

// Initialize function
function init(): void {
  // Connect to background script
  connectToBackground();

  // Listen for text selection events
  document.addEventListener("mouseup", handleTextSelection);

  // Load settings
  loadSettings();

  // Add keyboard shortcut listener
  setupKeyboardShortcuts();

  console.log("AI Dictionary+ content script initialized");

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message, sender);
    const { type, payload } = message;

    // Handle potential disconnections
    if (chrome.runtime.lastError) {
      console.error("Runtime error:", chrome.runtime.lastError);
      if (
        chrome.runtime.lastError.message?.includes(
          "Extension context invalidated"
        )
      ) {
        isConnected = false;
        connectToBackground();
      }
      return;
    }

    switch (type) {
      case MessageType.EXPLAIN_TEXT:
        if (payload.text) {
          console.log("Handling explain request for:", payload.text);
          handleExplainRequest(payload.text);
          sendResponse({ success: true });
        }
        break;

      case MessageType.EXPLANATION_RESULT:
        showExplanation(payload);
        sendResponse({ success: true });
        break;

      case MessageType.SETTINGS_UPDATED:
        // Refresh any active UI with new settings
        loadSettings();
        if (activeTooltip) {
          applyTheme(activeTooltip);
        }
        sendResponse({ success: true });
        break;

      case MessageType.WEB_SEARCH_RESULT:
        showWebSearchResult(payload);
        sendResponse({ success: true });
        break;

      case MessageType.EXPLAIN_MEDIA:
        console.log("Content script handling EXPLAIN_MEDIA request:", payload);
        if (payload.mediaType && payload.mediaUrl) {
          handleMediaExplainRequest(
            payload.mediaType,
            payload.mediaUrl,
            payload.pageUrl
          );
          sendResponse({ success: true });
        } else {
          console.error("Missing required media properties");
          sendResponse({
            success: false,
            error: "Missing required media properties",
          });
        }
        break;

      case MessageType.MEDIA_EXPLANATION_RESULT:
        showMediaExplanation(payload);
        sendResponse({ success: true });
        break;

      case "CONTEXT_MENU_CLICKED":
        const { mediaType, mediaUrl } = payload;

        // Store the media information for potential multimodal use
        pendingMultimodalSelection.mediaType = mediaType;
        pendingMultimodalSelection.mediaUrl = mediaUrl;
        pendingMultimodalSelection.mediaElement = findMediaElement(
          mediaType,
          mediaUrl
        );

        // Highlight the selected elements
        if (
          pendingMultimodalSelection.text &&
          pendingMultimodalSelection.mediaElement
        ) {
          highlightSelectedElements(
            pendingMultimodalSelection.text,
            pendingMultimodalSelection.mediaElement
          );
        }

        // If there's already text selected, show options instead of immediately handling
        if (
          pendingMultimodalSelection.text &&
          window.getSelection()?.toString().trim() ===
            pendingMultimodalSelection.text
        ) {
          console.log("Text and media selected, showing multimodal options");

          // Create a synthetic mouse event at the position of the media element
          let posX = 0;
          let posY = 0;

          if (pendingMultimodalSelection.mediaElement) {
            const rect =
              pendingMultimodalSelection.mediaElement.getBoundingClientRect();
            posX = window.scrollX + rect.left;
            posY = window.scrollY + rect.bottom;
          }

          const syntheticEvent = {
            pageX: posX,
            pageY: posY,
          } as MouseEvent;

          // Show options for combined or separate explanations
          showMultimodalOptions(syntheticEvent);
        } else {
          // No text selection active, just handle media explanation
          handleMediaExplainRequest(mediaType, mediaUrl, window.location.href);
        }

        sendResponse({ success: true });
        return true;

      default:
        return false;
    }

    // Return true to indicate async response
    return true;
  });
}

// Load user settings
async function loadSettings() {
  userSettings = await getSettings();
}

/**
 * Setup keyboard shortcuts for the extension
 */
function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (event) => {
    // Check if we have settings loaded
    if (!userSettings) return;

    // Check for text shortcut (Alt+D by default)
    if (event.altKey && event.key === "d") {
      handleKeyboardShortcutPress();
    }
  });
}

/**
 * Handle keyboard shortcut press
 */
function handleKeyboardShortcutPress(): void {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    // No text selected, show notification
    showToast(
      "Please select some text first before using the keyboard shortcut."
    );
    return;
  }

  const selectedText = selection.toString().trim();

  // Check if text meets requirements
  if (selectedText.length < 3 || selectedText.length > 2000) {
    showToast(
      selectedText.length < 3
        ? "Please select at least 3 characters of text."
        : "Selected text is too long (max 2000 characters)."
    );
    return;
  }

  // Save context
  let contextText = "";
  try {
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Get nearest block element
      let contextNode = container;
      if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
        contextNode = container.parentElement;
      }

      if (contextNode && contextNode.textContent) {
        contextText = contextNode.textContent.trim();
      }
    }
  } catch (error) {
    console.error("Error getting context for selection:", error);
  }

  // Check if we have a pending multimodal selection
  if (
    pendingMultimodalSelection.mediaType &&
    pendingMultimodalSelection.mediaUrl &&
    pendingMultimodalSelection.mediaElement
  ) {
    // Update text part of multimodal selection
    pendingMultimodalSelection.text = selectedText;
    pendingMultimodalSelection.textContext = contextText;
    pendingMultimodalSelection.selection = selection;

    // Highlight selections to provide visual feedback
    if (pendingMultimodalSelection.mediaElement) {
      highlightSelectedElements(
        selectedText,
        pendingMultimodalSelection.mediaElement
      );
    }

    // Handle the multimodal request
    handleMultimodalRequest();
  } else {
    // Regular text shortcut behavior
    handleExplainRequest(selectedText);
  }
}

/**
 * Show a toast notification
 */
function showToast(message: string): void {
  const toast = document.createElement("div");
  toast.className = "ai-dictionary-toast";
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  toast.style.color = "white";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "4px";
  toast.style.zIndex = "10000";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Handle keyboard shortcuts
function handleKeyboardShortcut(event: KeyboardEvent) {
  // Only proceed if we have settings
  if (!userSettings || !userSettings.keyboardShortcut) return;

  const { key, ctrlKey, shiftKey, altKey, metaKey } =
    userSettings.keyboardShortcut;

  // Check if the pressed key combination matches the configured shortcut
  if (
    event.key.toLowerCase() === key.toLowerCase() &&
    event.ctrlKey === ctrlKey &&
    event.shiftKey === shiftKey &&
    event.altKey === altKey &&
    event.metaKey === metaKey
  ) {
    // Get the current text selection
    const selectedText = window.getSelection()?.toString().trim() || "";

    // Only proceed if there's a valid selection
    if (isValidText(selectedText)) {
      event.preventDefault(); // Prevent any default action for this key combination
      console.log("Shortcut triggered for text:", selectedText);

      // Update the pending multimodal selection state with current text
      pendingMultimodalSelection.text = selectedText;
      pendingMultimodalSelection.textContext =
        getContextText(selectedText) || null;

      // Check if we have a pending media selection
      if (
        pendingMultimodalSelection.mediaType &&
        pendingMultimodalSelection.mediaUrl
      ) {
        console.log(
          "Multimodal content detected, handling combined explanation"
        );
        handleMultimodalRequest();
      } else {
        // Also check if there's a media element that's currently in focus or selected
        const selectedMedia = getSelectedMediaElement();
        if (selectedMedia) {
          console.log("Found selected media element:", selectedMedia);

          // Update the pending multimodal selection
          pendingMultimodalSelection.mediaType = selectedMedia.mediaType;
          pendingMultimodalSelection.mediaUrl = selectedMedia.mediaUrl;
          pendingMultimodalSelection.mediaElement = selectedMedia.element;

          // Show a notification about available multimodal explanation
          showMultimodalOptions(event);
        } else {
          // No media detected, proceed with regular text explanation
          handleExplainRequest(selectedText);
        }
      }
    }
  }
}

// Function to find selected or focused media elements
function getSelectedMediaElement(): {
  mediaType: MediaType;
  mediaUrl: string;
  element: HTMLElement;
} | null {
  // Check if there's a media element currently in focus
  if (document.activeElement) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === "img") {
      return {
        mediaType: MediaType.IMAGE,
        mediaUrl: (activeElement as HTMLImageElement).src,
        element: activeElement as HTMLElement,
      };
    } else if (activeElement.tagName.toLowerCase() === "video") {
      const videoElement = activeElement as HTMLVideoElement;
      const src =
        videoElement.src ||
        (videoElement.querySelector("source") as HTMLSourceElement)?.src;
      if (src) {
        return {
          mediaType: MediaType.VIDEO,
          mediaUrl: src,
          element: videoElement,
        };
      }
    } else if (activeElement.tagName.toLowerCase() === "audio") {
      const audioElement = activeElement as HTMLAudioElement;
      const src =
        audioElement.src ||
        (audioElement.querySelector("source") as HTMLSourceElement)?.src;
      if (src) {
        return {
          mediaType: MediaType.AUDIO,
          mediaUrl: src,
          element: audioElement,
        };
      }
    }
  }

  // Check for media elements near the current selection
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const selectionRect = range.getBoundingClientRect();

    // Find all media elements on the page
    const mediaElements = [
      ...document.querySelectorAll("img, video, audio"),
    ] as HTMLElement[];

    // Find the closest media element to the selection
    const closestElement = mediaElements.reduce((closest, element) => {
      const rect = element.getBoundingClientRect();

      // Check if media element is near the selection (within 100px)
      const distance = Math.min(
        Math.abs(rect.left - selectionRect.right),
        Math.abs(rect.right - selectionRect.left),
        Math.abs(rect.top - selectionRect.bottom),
        Math.abs(rect.bottom - selectionRect.top)
      );

      if (distance < 100 && (!closest || distance < closest.distance)) {
        return { element, distance };
      }

      return closest;
    }, null as { element: HTMLElement; distance: number } | null);

    if (closestElement) {
      const element = closestElement.element;
      if (element.tagName.toLowerCase() === "img") {
        return {
          mediaType: MediaType.IMAGE,
          mediaUrl: (element as HTMLImageElement).src,
          element,
        };
      } else if (element.tagName.toLowerCase() === "video") {
        const videoElement = element as HTMLVideoElement;
        const src =
          videoElement.src ||
          (videoElement.querySelector("source") as HTMLSourceElement)?.src;
        if (src) {
          return {
            mediaType: MediaType.VIDEO,
            mediaUrl: src,
            element: videoElement,
          };
        }
      } else if (element.tagName.toLowerCase() === "audio") {
        const audioElement = element as HTMLAudioElement;
        const src =
          audioElement.src ||
          (audioElement.querySelector("source") as HTMLSourceElement)?.src;
        if (src) {
          return {
            mediaType: MediaType.AUDIO,
            mediaUrl: src,
            element: audioElement,
          };
        }
      }
    }
  }

  return null;
}

// Show options for multimodal explanation
function showMultimodalOptions(event: Event) {
  if (
    !pendingMultimodalSelection.text ||
    !pendingMultimodalSelection.mediaType ||
    !pendingMultimodalSelection.mediaUrl
  ) {
    return;
  }

  // Create options container
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "ai-dictionary-multimodal-options";
  optionsContainer.style.position = "fixed";
  optionsContainer.style.zIndex = "10001";
  optionsContainer.style.backgroundColor = "white";
  optionsContainer.style.border = "1px solid #ccc";
  optionsContainer.style.borderRadius = "6px";
  optionsContainer.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  optionsContainer.style.padding = "10px";

  // Position near the event or text selection
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    optionsContainer.style.top = `${window.scrollY + rect.bottom + 10}px`;
    optionsContainer.style.left = `${window.scrollX + rect.left}px`;
  } else if (event instanceof MouseEvent) {
    optionsContainer.style.top = `${event.pageY + 10}px`;
    optionsContainer.style.left = `${event.pageX + 10}px`;
  } else {
    // Default position
    optionsContainer.style.top = "100px";
    optionsContainer.style.left = "100px";
  }

  // Add title
  const title = document.createElement("div");
  title.textContent = "AI Dictionary+ Detected Text and Media";
  title.style.marginBottom = "10px";
  title.style.fontWeight = "bold";
  optionsContainer.appendChild(title);

  // Add buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.display = "flex";
  buttonsContainer.style.gap = "8px";

  // Button for text-only explanation
  const textButton = document.createElement("button");
  textButton.textContent = "Explain Text Only";
  textButton.className = "ai-dictionary-option-button";
  textButton.addEventListener("click", () => {
    removeMultimodalOptions();
    handleExplainRequest(pendingMultimodalSelection.text!);
  });
  buttonsContainer.appendChild(textButton);

  // Button for media-only explanation
  const mediaButton = document.createElement("button");
  mediaButton.textContent = `Explain ${pendingMultimodalSelection.mediaType} Only`;
  mediaButton.className = "ai-dictionary-option-button";
  mediaButton.addEventListener("click", () => {
    removeMultimodalOptions();
    handleMediaExplainRequest(
      pendingMultimodalSelection.mediaType!,
      pendingMultimodalSelection.mediaUrl!,
      window.location.href
    );
  });
  buttonsContainer.appendChild(mediaButton);

  // Button for combined explanation
  const combinedButton = document.createElement("button");
  combinedButton.textContent = "Explain Both Together";
  combinedButton.className = "ai-dictionary-option-button";
  combinedButton.style.backgroundColor = "#4285f4";
  combinedButton.style.color = "white";
  combinedButton.addEventListener("click", () => {
    removeMultimodalOptions();
    handleMultimodalRequest();
  });
  buttonsContainer.appendChild(combinedButton);

  optionsContainer.appendChild(buttonsContainer);
  document.body.appendChild(optionsContainer);

  // Store reference to remove later
  window.multimodalOptionsElement = optionsContainer;

  // Auto-remove after a few seconds
  setTimeout(removeMultimodalOptions, 8000);
}

// Remove multimodal options dialog
function removeMultimodalOptions() {
  if (
    window.multimodalOptionsElement &&
    document.body.contains(window.multimodalOptionsElement)
  ) {
    document.body.removeChild(window.multimodalOptionsElement);
    window.multimodalOptionsElement = null;
  }
}

/**
 * Highlights selected elements (text + media) to provide visual feedback
 */
function highlightSelectedElements(
  selectedText: string,
  mediaElement: HTMLElement
): void {
  // Remove any previous highlights
  const existingHighlights = document.querySelectorAll(
    ".ai-dictionary-highlight-indicator"
  );
  existingHighlights.forEach((el) => el.remove());

  // Highlight the media element
  const originalOutline = mediaElement.style.outline;
  const originalBoxShadow = mediaElement.style.boxShadow;

  // Apply highlight effect
  mediaElement.style.outline = "3px solid rgba(66, 133, 244, 0.8)";
  mediaElement.style.boxShadow = "0 0 10px rgba(66, 133, 244, 0.6)";

  // Create an indicator label
  const indicator = document.createElement("div");
  indicator.className = "ai-dictionary-highlight-indicator";
  indicator.style.position = "absolute";
  indicator.style.backgroundColor = "rgba(66, 133, 244, 0.95)";
  indicator.style.color = "white";
  indicator.style.padding = "4px 8px";
  indicator.style.borderRadius = "4px";
  indicator.style.fontSize = "12px";
  indicator.style.fontWeight = "bold";
  indicator.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  indicator.style.zIndex = "9999";
  indicator.style.pointerEvents = "none"; // Don't interfere with user interaction
  indicator.style.transition = "opacity 0.2s ease-in-out";
  indicator.textContent = "Text + Media selected";

  // Position the indicator near the element
  const rect = mediaElement.getBoundingClientRect();
  indicator.style.left = `${window.scrollX + rect.left}px`;
  indicator.style.top = `${window.scrollY + rect.top - 30}px`;

  // Add to document
  document.body.appendChild(indicator);

  // Remove the highlight after 1.5 seconds
  setTimeout(() => {
    mediaElement.style.outline = originalOutline;
    mediaElement.style.boxShadow = originalBoxShadow;

    // Fade out and remove the indicator
    indicator.style.opacity = "0";
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 200);
  }, 1500);
}

// Function to handle text selection
const handleTextSelection = debounce(async (event: MouseEvent) => {
  // Remove any existing selection button
  removeSelectionButton();

  const selection = window.getSelection();
  if (!selection || selection.toString().trim() === "") {
    return;
  }

  const text = selection.toString().trim();
  if (!isValidText(text)) {
    return;
  }

  // Store the selected text for potential multimodal use
  pendingMultimodalSelection.text = text;
  pendingMultimodalSelection.textContext = getContextText(text) || null;

  // Create a button near the selection
  createSelectionButton(event, text);

  // If we also have media selected, highlight it
  if (pendingMultimodalSelection.mediaElement) {
    highlightSelectedElements(text, pendingMultimodalSelection.mediaElement!);
  }
}, 300);

// Function to explain selected text
function explainText(text: string) {
  // Create loading tooltip
  const tooltip = createTooltip(text);
  showLoadingState(tooltip);

  // Get context text
  const contextText = getContextText(text);

  // Send request to background script
  console.log("Sending request to background script");
  chrome.runtime.sendMessage(
    {
      type: MessageType.EXPLAIN_TEXT,
      payload: {
        text,
        contextText,
        pageUrl: window.location.href, // Add the current page URL
      },
    },
    (response: ExplanationResult) => {
      console.log("Received response from background script:", response);
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        showError(tooltip, "Error communicating with the extension.");
        return;
      }

      if (response.error) {
        console.error("Error in response:", response.error);
        showError(tooltip, response.error);
        return;
      }

      console.log("Showing explanation in tooltip");
      // Update UI with explanation
      showExplanation(response, tooltip);
    }
  );
}

// Create a button near the selected text
function createSelectionButton(event: MouseEvent, text: string) {
  console.log("Creating selection button for:", text);

  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "ai-dictionary-selection-buttons";
  buttonContainer.style.position = "absolute";
  buttonContainer.style.left = `${event.pageX + 10}px`;
  buttonContainer.style.top = `${event.pageY + 10}px`;
  buttonContainer.style.zIndex = "10000"; // Ensure it's on top
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "5px";

  // Create explain button
  const explainButton = document.createElement("button");
  explainButton.className = "ai-dictionary-button";
  explainButton.textContent = "Explain";
  explainButton.addEventListener("click", (e) => {
    console.log("Selection button clicked for text:", text);
    e.stopPropagation(); // Prevent document click from removing tooltip immediately
    removeSelectionButton();
    handleExplainRequest(text);

    // Clear multimodal state
    resetMultimodalSelection();
  });

  buttonContainer.appendChild(explainButton);

  // If there's a pending media selection, add a "Combine with Media" button
  if (
    pendingMultimodalSelection.mediaType &&
    pendingMultimodalSelection.mediaUrl
  ) {
    const combineButton = document.createElement("button");
    combineButton.className =
      "ai-dictionary-button ai-dictionary-combine-button";
    combineButton.textContent = "Explain with Media";
    combineButton.style.backgroundColor = "#4285f4";
    combineButton.style.color = "white";

    combineButton.addEventListener("click", (e) => {
      console.log(
        "Combine button clicked for text and media:",
        text,
        pendingMultimodalSelection.mediaUrl
      );
      e.stopPropagation();
      removeSelectionButton();
      handleMultimodalRequest();
    });

    buttonContainer.appendChild(combineButton);
  }

  document.body.appendChild(buttonContainer);
  console.log("Selection buttons added to document.body");
  selectionButton = buttonContainer;

  // Automatically remove the button after 3 seconds
  setTimeout(() => {
    removeSelectionButton();
  }, 5000);
}

// Remove the selection button
function removeSelectionButton() {
  if (selectionButton && document.body.contains(selectionButton)) {
    document.body.removeChild(selectionButton);
    selectionButton = null;
  }
}

// Handle an explain request
async function handleExplainRequest(text: string) {
  console.log("Handling explain request for text:", text);

  // Store the active text
  activeText = text;

  // Create loading tooltip
  const tooltip = createTooltip(text);

  // Make the tooltip very visible
  tooltip.style.border = "2px solid #4285f4";
  tooltip.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";

  showLoadingState(tooltip);

  try {
    // Send request to background script using safe message sending
    console.log("Sending explain request to background script");
    const response = await sendBackgroundMessage({
      type: MessageType.EXPLAIN_TEXT,
      payload: {
        text,
        contextText: getContextText(text),
      },
    });

    console.log("Received response from background script:", response);

    if (response.error) {
      console.error("Error in response:", response.error);
      showError(tooltip, response.error);
      return;
    }

    console.log("Showing explanation in tooltip");
    // Update UI with explanation
    showExplanation(response, tooltip);
  } catch (error) {
    console.error("Error in handleExplainRequest:", error);
    showError(
      tooltip,
      error instanceof Error
        ? error.message
        : "An error occurred while getting the explanation."
    );
  }
}

// Get enhanced surrounding context for the selected text
function getContextText(selectedText: string): string | undefined {
  try {
    // Try to find the selected text in the document with broader selectors
    const textNodes = [
      ...document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, div, span, article, section"
      ),
    ].filter(
      (node) => node.textContent && node.textContent.includes(selectedText)
    );

    if (textNodes.length === 0) {
      return undefined;
    }

    // Use the first matching element as context
    const contextNode = textNodes[0];
    const fullText = contextNode.textContent || "";

    // Also get context from the parent element if available
    let parentText = "";
    const parentNode = contextNode.parentElement;
    if (parentNode && parentNode.textContent) {
      parentText = parentNode.textContent;
    }

    // Use the longer text between the element's text and its parent's text
    let contextText = fullText;
    if (parentText.length > fullText.length && parentText.length < 5000) {
      contextText = parentText;
    }

    // Return surrounding context, doubling the limit from 500 to 1000 characters
    if (contextText.length > 1000) {
      return contextText.substring(0, 1000); // Double the previous limit of 500
    }

    return contextText;
  } catch (error) {
    console.error("Error getting context text:", error);
    return selectedText; // Fallback to just the selected text
  }
}

// Create the tooltip element
function createTooltip(text: string): HTMLElement {
  console.log("Creating tooltip for:", text);

  // Remove any existing tooltip
  removeTooltip();

  // Create new tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "ai-dictionary-tooltip";

  // Header
  const header = document.createElement("div");
  header.className = "ai-dictionary-header";

  const title = document.createElement("div");
  title.className = "ai-dictionary-title";

  // Add drag handle icon
  const dragHandle = document.createElement("span");
  dragHandle.className = "ai-dictionary-drag-handle";
  dragHandle.textContent = "⋮⋮"; // Vertical dots to indicate draggable
  title.appendChild(dragHandle);

  const titleText = document.createElement("span");
  titleText.textContent = "AI Dictionary+";
  title.appendChild(titleText);

  header.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.className = "ai-dictionary-close";
  closeButton.textContent = "✕";
  closeButton.addEventListener("click", removeTooltip);
  header.appendChild(closeButton);

  // Add drag functionality
  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Only handle left mouse button
    e.preventDefault();

    const tooltipRect = tooltip.getBoundingClientRect();
    dragState = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      tooltipX: tooltipRect.left,
      tooltipY: tooltipRect.top,
    };

    tooltip.classList.add("dragging");

    // Add temporary event listeners for drag and drop
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDrop);
  });

  tooltip.appendChild(header);

  // Content area
  const content = document.createElement("div");
  content.className = "ai-dictionary-content";
  tooltip.appendChild(content);

  // Position tooltip
  if (!hasBeenMoved) {
    positionTooltipNearSelection(tooltip, window.getSelection());
  } else {
    // Use the last known position
    const lastTooltip = activeTooltip;
    if (lastTooltip) {
      tooltip.style.left = lastTooltip.style.left;
      tooltip.style.top = lastTooltip.style.top;
    } else {
      positionTooltipCenter(tooltip);
    }
  }

  // Apply the theme
  applyTheme(tooltip);

  // Add to document body
  document.body.appendChild(tooltip);
  console.log("Tooltip added to document.body");
  activeTooltip = tooltip;

  return tooltip;
}

// Handle drag movement
function handleDrag(e: MouseEvent) {
  if (!dragState || !activeTooltip) return;

  const deltaX = e.clientX - dragState.startX;
  const deltaY = e.clientY - dragState.startY;

  // Calculate new position
  let newX = dragState.tooltipX + deltaX;
  let newY = dragState.tooltipY + deltaY;

  // Get tooltip dimensions
  const tooltipRect = activeTooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;

  // Keep tooltip within viewport bounds
  newX = Math.max(10, Math.min(newX, window.innerWidth - tooltipWidth - 10));
  newY = Math.max(10, Math.min(newY, window.innerHeight - tooltipHeight - 10));

  // Update tooltip position
  activeTooltip.style.left = `${newX}px`;
  activeTooltip.style.top = `${newY}px`;

  hasBeenMoved = true;
}

// Handle drop
function handleDrop() {
  if (!activeTooltip) return;

  activeTooltip.classList.remove("dragging");
  dragState = null;

  // Remove temporary event listeners
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", handleDrop);
}

// When removing tooltip, reset the hasBeenMoved flag
function removeTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
    hasBeenMoved = false;
  }
}

// Apply theme based on settings
async function applyTheme(element: HTMLElement) {
  const settings = await getSettings();
  const theme = getTheme(settings);

  if (theme === "dark") {
    element.classList.add("dark-theme");
  } else {
    element.classList.remove("dark-theme");
  }
}

// Show loading state
function showLoadingState(tooltip: HTMLElement) {
  const content = tooltip.querySelector(".ai-dictionary-content");
  if (!content) return;

  content.innerHTML = "";

  const loading = document.createElement("div");
  loading.className = "ai-dictionary-loading";

  const spinner = document.createElement("div");
  spinner.className = "ai-dictionary-spinner";
  loading.appendChild(spinner);

  const text = document.createElement("span");
  text.textContent = "Getting explanation...";
  loading.appendChild(text);

  content.appendChild(loading);
}

// Show error message
function showError(tooltip: HTMLElement, errorMessage: string) {
  const content = tooltip.querySelector(".ai-dictionary-content");
  if (!content) return;

  content.innerHTML = "";

  const error = document.createElement("div");
  error.className = "ai-dictionary-error";
  error.textContent = `Error: ${errorMessage}`;

  content.appendChild(error);
}

// Show explanation
function showExplanation(result: ExplanationResult, tooltip?: HTMLElement) {
  if (!tooltip) {
    tooltip = activeTooltip || createTooltip(result.originalText);
  }

  const content = tooltip.querySelector(".ai-dictionary-content");
  if (!content) return;

  // Store conversation history
  activeText = result.originalText;
  activeConversationHistory = result.conversationHistory;

  // Clear content
  content.innerHTML = "";

  // Add explanation text with markdown rendering
  const explanationText = document.createElement("div");
  explanationText.className = "ai-dictionary-markdown";

  // Render markdown content safely
  try {
    explanationText.innerHTML = marked.parse(result.explanation);
  } catch (error) {
    console.error("Error parsing markdown:", error);
    explanationText.textContent = result.explanation;
  }

  // Add copy button
  const copyButtonContainer = document.createElement("div");
  copyButtonContainer.className = "ai-dictionary-copy-container";

  const copyButton = document.createElement("button");
  copyButton.className = "ai-dictionary-copy-button";
  copyButton.title = "Copy explanation to clipboard";
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  // Add tooltip text that shows on hover
  const tooltipText = document.createElement("span");
  tooltipText.className = "ai-dictionary-tooltip-text";
  tooltipText.textContent = "Copied!";
  copyButton.appendChild(tooltipText);

  // Add click event to copy the explanation text
  copyButton.addEventListener("click", () => {
    // Create a temporary textarea to hold the text
    const textarea = document.createElement("textarea");
    textarea.value = result.explanation;
    document.body.appendChild(textarea);
    textarea.select();

    try {
      // Copy the text
      document.execCommand("copy");

      // Show the copied tooltip
      tooltipText.classList.add("show");

      // Hide the tooltip after 2 seconds
      setTimeout(() => {
        tooltipText.classList.remove("show");
      }, 2000);
    } catch (err) {
      console.error("Error copying text:", err);
    } finally {
      document.body.removeChild(textarea);
    }
  });

  copyButtonContainer.appendChild(copyButton);
  explanationText.appendChild(copyButtonContainer);

  content.appendChild(explanationText);

  // Add citations if available
  if (result.webSearched && result.citations && result.citations.length > 0) {
    const citationsContainer = document.createElement("div");
    citationsContainer.className = "ai-dictionary-citations";

    const citationsTitle = document.createElement("div");
    citationsTitle.className = "ai-dictionary-citations-title";
    citationsTitle.textContent = "Sources";
    citationsContainer.appendChild(citationsTitle);

    const citationsList = document.createElement("ul");
    result.citations.forEach((citation) => {
      const citationItem = document.createElement("li");
      // Try to extract domain from URL for cleaner display
      try {
        const url = new URL(citation);
        const domain = url.hostname.replace("www.", "");

        const citationLink = document.createElement("a");
        citationLink.href = citation;
        citationLink.textContent = domain;
        citationLink.target = "_blank";
        citationLink.rel = "noopener noreferrer";

        citationItem.appendChild(citationLink);
      } catch (e) {
        // If URL parsing fails, just show the raw citation
        citationItem.textContent = citation;
      }

      citationsList.appendChild(citationItem);
    });

    citationsContainer.appendChild(citationsList);
    content.appendChild(citationsContainer);
  }

  // Remove any existing follow-up area before creating a new one
  const existingFollowUp = tooltip.querySelector(".ai-dictionary-follow-up");
  if (existingFollowUp) {
    tooltip.removeChild(existingFollowUp);
  }

  // Add follow-up area
  const followUp = document.createElement("div");
  followUp.className = "ai-dictionary-follow-up";

  const input = document.createElement("input");
  input.className = "ai-dictionary-input";
  input.type = "text";
  input.placeholder = "Ask a follow-up question...";
  followUp.appendChild(input);

  const buttons = document.createElement("div");
  buttons.className = "ai-dictionary-buttons";

  const submitButton = document.createElement("button");
  submitButton.className = "ai-dictionary-submit";
  submitButton.textContent = "Ask";
  submitButton.addEventListener("click", () => {
    if (input.value.trim()) {
      handleFollowUpQuestion(input.value.trim(), tooltip!);
    }
  });
  buttons.appendChild(submitButton);

  // Only add web search button if it's enabled and not already searched
  if (
    userSettings?.webSearchEnabled &&
    userSettings?.perplexityApiKey &&
    !result.webSearched
  ) {
    const webSearchButton = document.createElement("button");
    webSearchButton.className = "ai-dictionary-web-search";
    webSearchButton.textContent = "Search Web";
    webSearchButton.addEventListener("click", () => {
      handleWebSearch(result.originalText, result.explanation);
    });
    buttons.appendChild(webSearchButton);
  }

  const chatButton = document.createElement("button");
  chatButton.className = "ai-dictionary-chat";
  chatButton.textContent = "Continue in Chat";
  chatButton.addEventListener("click", () => {
    openChatPage();
  });
  buttons.appendChild(chatButton);

  // Add regenerate button
  const regenerateButton = document.createElement("button");
  regenerateButton.className = "ai-dictionary-regenerate";
  regenerateButton.textContent = "Regenerate";
  regenerateButton.title = "Get a fresh explanation (bypass cache)";
  regenerateButton.addEventListener("click", () => {
    handleRegenerateExplanation(
      result.originalText,
      getContextText(result.originalText)
    );
  });
  buttons.appendChild(regenerateButton);

  followUp.appendChild(buttons);

  // Add event listener for enter key
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && input.value.trim()) {
      handleFollowUpQuestion(input.value.trim(), tooltip!);
    }
  });

  tooltip.appendChild(followUp);

  // Focus on the input field
  setTimeout(() => {
    input.focus();
  }, 100);
}

// Handle follow-up question
function handleFollowUpQuestion(question: string, tooltip: HTMLElement) {
  // Show loading state
  showLoadingState(tooltip);

  // Clear the input
  const input = tooltip.querySelector(
    ".ai-dictionary-input"
  ) as HTMLInputElement;
  if (input) {
    input.value = "";
  }

  // Send follow-up request
  chrome.runtime.sendMessage(
    {
      type: MessageType.FOLLOW_UP_QUESTION,
      payload: {
        originalText: activeText,
        question,
        conversationHistory: activeConversationHistory,
      },
    },
    (response: ExplanationResult) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        showError(tooltip, "Error communicating with the extension.");
        return;
      }

      if (response.error) {
        showError(tooltip, response.error);
        return;
      }

      // Update UI with explanation
      showExplanation(response, tooltip);
    }
  );
}

// Open the chat page with the current conversation context
function openChatPage() {
  // Prepare data to send to the chat page
  const chatData = {
    originalText: activeText,
    conversationHistory: activeConversationHistory,
  };

  // Encode the data for URL transmission
  const encodedData = encodeURIComponent(JSON.stringify(chatData));
  const chatUrl = chrome.runtime.getURL(`chat.html?data=${encodedData}`);

  // Notify the background script (useful for future features)
  chrome.runtime.sendMessage({
    type: MessageType.OPEN_CHAT,
    payload: chatData,
  });

  // Open the chat in a new tab using window.open() which is available in content scripts
  window.open(chatUrl, "_blank");
}

// Listen for clicks outside the tooltip to close it
document.addEventListener("click", (event) => {
  if (
    activeTooltip &&
    event.target instanceof Node &&
    !activeTooltip.contains(event.target) &&
    (!selectionButton || !selectionButton.contains(event.target))
  ) {
    removeTooltip();
  }
});

// Handle web search request
function handleWebSearch(originalText: string, originalExplanation: string) {
  if (!activeTooltip) return;

  // Show loading state
  showLoadingState(activeTooltip);

  // Send request to background script
  console.log("Sending web search request to background script");
  chrome.runtime.sendMessage(
    {
      type: MessageType.WEB_SEARCH,
      payload: {
        text: originalText,
        originalExplanation,
      },
    },
    (response: ExplanationResult) => {
      console.log("Received web search response:", response);
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        showError(activeTooltip!, "Error communicating with the extension.");
        return;
      }

      if (response.error) {
        console.error("Error in response:", response.error);
        showError(activeTooltip!, response.error);
        return;
      }

      // Update UI with enhanced explanation
      showExplanation(response, activeTooltip!);
    }
  );
}

// Function to show web search results
function showWebSearchResult(result: ExplanationResult): void {
  // Just use the existing showExplanation function
  showExplanation(result);
}

// Function to regenerate explanation without using the cache
function handleRegenerateExplanation(
  originalText: string,
  contextText: string | undefined
) {
  // Create loading tooltip
  const tooltip = createTooltip(originalText);

  // Make the tooltip very visible
  tooltip.style.border = "2px solid #4285f4";
  tooltip.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";

  showLoadingState(tooltip);

  // Send request to background script with skipCache flag
  console.log("Sending regenerate request to background script");
  chrome.runtime.sendMessage(
    {
      type: MessageType.EXPLAIN_TEXT,
      payload: {
        text: originalText,
        contextText: contextText,
        skipCache: true, // Skip cache to get a fresh explanation
        pageUrl: window.location.href, // Add the current page URL
      },
    },
    (response: ExplanationResult) => {
      console.log("Received response from background script:", response);
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        showError(tooltip, "Error communicating with the extension.");
        return;
      }

      if (response.error) {
        console.error("Error in response:", response.error);
        showError(tooltip, response.error);
        return;
      }

      console.log("Showing regenerated explanation in tooltip");
      // Update UI with explanation
      showExplanation(response, tooltip);
    }
  );
}

// Handle media explanation request
async function handleMediaExplainRequest(
  mediaType: MediaType,
  mediaUrl: string,
  pageUrl?: string
) {
  try {
    console.log(`Handling ${mediaType} explanation request for ${mediaUrl}`);

    // Create a tooltip for the media
    const tooltip = createMediaTooltip(mediaType, mediaUrl);
    document.body.appendChild(tooltip);

    // Position the tooltip near the media element
    const mediaElement = findMediaElement(mediaType, mediaUrl);
    positionTooltip(tooltip, mediaElement);

    // Show loading state
    showLoadingState(tooltip);

    // Get context text if available
    const contextText = getContextTextForMedia(mediaElement, mediaUrl);

    // Get media data as base64 or URL
    const mediaData = await getMediaData(mediaType, mediaUrl);

    // Get MIME type based on media type and URL
    const mimeType = getMimeType(mediaType, mediaUrl);

    // Get timestamp if it's a video
    const timestamp =
      mediaType === MediaType.VIDEO
        ? getCurrentVideoTimestamp(mediaUrl)
        : undefined;

    // Create request payload
    const request: ExplainMediaRequest = {
      mediaType,
      mediaData,
      mimeType,
      contextText,
      tabId: undefined, // Will be set by the background script
      pageUrl,
      timestamp,
    };

    // Send request to background script
    const result = await chrome.runtime.sendMessage({
      type: MessageType.EXPLAIN_MEDIA,
      payload: request,
    });

    // Display the result
    showMediaExplanation(result, tooltip);
  } catch (error) {
    console.error(`Error handling ${mediaType} explanation:`, error);

    // Create error tooltip if none exists
    if (!activeTooltip) {
      const tooltip = createMediaTooltip(mediaType, mediaUrl);
      document.body.appendChild(tooltip);

      // Position near the media if possible
      const mediaElement = findMediaElement(mediaType, mediaUrl);
      positionTooltip(tooltip, mediaElement);
    }

    // Show error message with helpful information
    const errorMessage = error instanceof Error ? error.message : String(error);
    let userFriendlyMessage = "An error occurred while processing the media.";

    // Add more specific error details based on media type
    if (mediaType === MediaType.IMAGE) {
      userFriendlyMessage = "Failed to analyze the image. This may be due to:";
      userFriendlyMessage += "\n\n• The image is protected by the website";
      userFriendlyMessage += "\n• The image is too large";
      userFriendlyMessage += "\n• There are network connectivity issues";
      userFriendlyMessage +=
        "\n\nPlease try downloading the image and using a local file instead.";
    } else if (mediaType === MediaType.VIDEO) {
      userFriendlyMessage =
        "Failed to analyze the video. The Gemini API has specific requirements for video processing:\n\n" +
        "• Videos must be uploaded through the Gemini File API\n" +
        "• Video size should be under 200MB\n" +
        "• Video duration should be under 30 minutes\n" +
        "• Supported formats include MP4, MOV, and WebM\n" +
        "• The video URL must be publicly accessible\n\n" +
        "You may also try with a shorter video or a different video hosting service.";
    } else if (mediaType === MediaType.AUDIO) {
      userFriendlyMessage =
        "Failed to analyze the audio. This may be due to restricted access or an unsupported format.";
    } else if (mediaType === MediaType.DOCUMENT) {
      userFriendlyMessage =
        "Failed to analyze the document. This may be due to restricted access or an unsupported format.";
    }

    // Add technical details for debugging
    userFriendlyMessage += `\n\nTechnical details: ${errorMessage}`;

    showError(activeTooltip!, userFriendlyMessage);
  }
}

// Create a tooltip for media content
function createMediaTooltip(
  mediaType: MediaType,
  mediaUrl: string
): HTMLElement {
  // Remove any existing tooltip
  if (activeTooltip) {
    removeTooltip();
  }

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.className = "ai-dictionary-tooltip";
  tooltip.setAttribute("data-media-type", mediaType);
  tooltip.setAttribute("data-media-url", mediaUrl);

  // Add header
  const header = document.createElement("div");
  header.className = "ai-dictionary-header";

  // Add title based on media type
  const title = document.createElement("div");
  title.className = "ai-dictionary-title";
  switch (mediaType) {
    case MediaType.IMAGE:
      title.textContent = "Image Explanation";
      break;
    case MediaType.VIDEO:
      title.textContent = "Video Explanation";
      break;
    case MediaType.AUDIO:
      title.textContent = "Audio Explanation";
      break;
    case MediaType.DOCUMENT:
      title.textContent = "Document Explanation";
      break;
    default:
      title.textContent = "Content Explanation";
  }
  header.appendChild(title);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.className = "ai-dictionary-close";
  closeButton.textContent = "✕";
  closeButton.addEventListener("click", removeTooltip);
  header.appendChild(closeButton);

  tooltip.appendChild(header);

  // Add content container
  const content = document.createElement("div");
  content.className = "ai-dictionary-content";
  tooltip.appendChild(content);

  // Add footer
  const footer = document.createElement("div");
  footer.className = "ai-dictionary-footer";
  footer.textContent = "AI Dictionary+";
  tooltip.appendChild(footer);

  // Store as active tooltip
  activeTooltip = tooltip;

  // Apply appropriate theme
  applyTheme(tooltip);

  return tooltip;
}

// Find media element in the DOM based on its URL
function findMediaElement(
  mediaType: MediaType,
  mediaUrl: string
): HTMLElement | null {
  let selector = "";

  switch (mediaType) {
    case MediaType.IMAGE:
      selector = `img[src="${mediaUrl}"]`;
      break;
    case MediaType.VIDEO:
      selector = `video[src="${mediaUrl}"], video source[src="${mediaUrl}"]`;
      break;
    case MediaType.AUDIO:
      selector = `audio[src="${mediaUrl}"], audio source[src="${mediaUrl}"]`;
      break;
    default:
      return null;
  }

  const element = document.querySelector(selector) as HTMLElement;

  // If we found a source element, get its parent
  if (element && element.tagName.toLowerCase() === "source") {
    return element.parentElement as HTMLElement;
  }

  return element;
}

// Position tooltip near a media element
function positionTooltip(
  tooltip: HTMLElement,
  targetElement: HTMLElement | null
) {
  // If we have a target element, position near it
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();

    // Set initial position
    tooltip.style.position = "fixed";
    tooltip.style.zIndex = "9999";

    // Position at the bottom right of the target element
    tooltip.style.top = `${rect.bottom + window.scrollY}px`;
    tooltip.style.left = `${
      rect.right + window.scrollX - tooltip.offsetWidth
    }px`;

    // If tooltip would overflow window, reposition
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect();

      // If it's beyond the right edge, align with the left edge of the target
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = `${rect.left + window.scrollX}px`;
      }

      // If it extends below the window, position above the target
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = `${
          rect.top + window.scrollY - tooltip.offsetHeight
        }px`;
      }
    }, 0);
  } else {
    // If no target element, position in the center
    tooltip.style.position = "fixed";
    tooltip.style.zIndex = "9999";
    tooltip.style.top = "50%";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translate(-50%, -50%)";
  }
}

// Get context text for media element
function getContextTextForMedia(
  mediaElement: HTMLElement | null,
  mediaUrl: string
): string | undefined {
  if (!mediaElement) return undefined;

  // Get alt text for images
  if (mediaElement.tagName.toLowerCase() === "img") {
    const img = mediaElement as HTMLImageElement;
    if (img.alt) return `Image alt text: ${img.alt}`;
  }

  // Get surrounding caption, figcaption, or nearby text
  const parent = mediaElement.parentElement;
  if (!parent) return undefined;

  // Check for figcaption
  const figcaption = parent.querySelector("figcaption");
  if (figcaption) return figcaption.textContent || undefined;

  // Check for aria-label
  const ariaLabel = mediaElement.getAttribute("aria-label");
  if (ariaLabel) return `Element label: ${ariaLabel}`;

  // Get nearby text content
  const siblings = Array.from(parent.childNodes);
  const textSiblings = siblings.filter(
    (node) =>
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      node.textContent.trim().length > 0
  );

  if (textSiblings.length > 0) {
    return textSiblings
      .map((node) => node.textContent)
      .join(" ")
      .trim()
      .substring(0, 200);
  }

  // Get parent's text if nothing else
  const parentText = parent.textContent || "";
  if (parentText.length > 0) {
    return parentText.trim().substring(0, 200);
  }

  return undefined;
}

// Get current timestamp for video
function getCurrentVideoTimestamp(videoUrl: string): number | undefined {
  const videoElement = document.querySelector(
    `video[src="${videoUrl}"]`
  ) as HTMLVideoElement;
  if (!videoElement) {
    // Try to find video with this URL in a source element
    const sourceElement = document.querySelector(
      `video source[src="${videoUrl}"]`
    );
    if (sourceElement) {
      const parentVideo = sourceElement.closest("video") as HTMLVideoElement;
      if (parentVideo) {
        return Math.floor(parentVideo.currentTime);
      }
    }
    return undefined;
  }

  return Math.floor(videoElement.currentTime);
}

// Get MIME type from URL or media element
function getMimeType(mediaType: MediaType, mediaUrl: string): string {
  // Default MIME types based on media type
  const defaultMimeTypes = {
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

  // If we couldn't determine from extension, find element and check its type
  const mediaElement = findMediaElement(mediaType, mediaUrl);
  if (mediaElement) {
    if (mediaElement.tagName.toLowerCase() === "img") {
      // For images, we could potentially use new Image() to load it and check naturalWidth/naturalHeight
      // but for simplicity, we'll use the default
      return defaultMimeTypes[MediaType.IMAGE];
    } else if (mediaElement.tagName.toLowerCase() === "video") {
      // For video, check the type attribute of the source element
      const sourceElement = mediaElement.querySelector(
        `source[src="${mediaUrl}"]`
      );
      if (sourceElement && sourceElement.getAttribute("type")) {
        return (
          sourceElement.getAttribute("type") ||
          defaultMimeTypes[MediaType.VIDEO]
        );
      }
    } else if (mediaElement.tagName.toLowerCase() === "audio") {
      // For audio, check the type attribute of the source element
      const sourceElement = mediaElement.querySelector(
        `source[src="${mediaUrl}"]`
      );
      if (sourceElement && sourceElement.getAttribute("type")) {
        return (
          sourceElement.getAttribute("type") ||
          defaultMimeTypes[MediaType.AUDIO]
        );
      }
    }
  }

  // Fallback to default MIME type for this media type
  return defaultMimeTypes[mediaType];
}

// Get media data as base64 or URL
async function getMediaData(
  mediaType: MediaType,
  mediaUrl: string
): Promise<string> {
  // Simply return the URL for all media types including images
  // The background script will handle conversion to base64 when needed
  return mediaUrl;
}

// Show media explanation result
function showMediaExplanation(
  result: ExplanationResult,
  tooltip?: HTMLElement
): void {
  console.log("Showing media explanation:", result);

  // If no tooltip provided, use active tooltip
  if (!tooltip && !activeTooltip) {
    console.error("No tooltip available to show explanation");
    return;
  }

  const targetTooltip = tooltip || activeTooltip!;

  // Update conversation history
  activeConversationHistory = result.conversationHistory || [];

  // If there's an error, show error message
  if (result.error) {
    showError(targetTooltip, result.error);
    return;
  }

  // Get content container
  const contentContainer = targetTooltip.querySelector(
    ".ai-dictionary-content"
  );
  if (!contentContainer) {
    console.error("Content container not found in tooltip");
    return;
  }

  // Clear any loading indicator
  contentContainer.innerHTML = "";

  // Create explanation text element
  const explanationElement = document.createElement("div");
  explanationElement.className = "ai-dictionary-explanation markdown-content";

  // Parse markdown and set as HTML
  explanationElement.innerHTML = marked.parse(result.explanation);

  contentContainer.appendChild(explanationElement);

  // Add action buttons
  const actionsContainer = document.createElement("div");
  actionsContainer.className = "ai-dictionary-actions";

  // Add "Continue in Chat" button
  const chatButton = document.createElement("button");
  chatButton.className = "ai-dictionary-chat";
  chatButton.textContent = "Continue in Chat";
  chatButton.addEventListener("click", openChatPage);
  actionsContainer.appendChild(chatButton);

  // Add "Copy" button
  const copyButton = document.createElement("button");
  copyButton.className = "ai-dictionary-copy-button";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(result.explanation).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    });
  });
  actionsContainer.appendChild(copyButton);

  // Add "Regenerate" button
  const regenerateButton = document.createElement("button");
  regenerateButton.className = "ai-dictionary-regenerate";
  regenerateButton.textContent = "Regenerate";
  regenerateButton.addEventListener("click", () => {
    const mediaType = targetTooltip.getAttribute(
      "data-media-type"
    ) as MediaType;
    const mediaUrl = targetTooltip.getAttribute("data-media-url") || "";

    if (mediaType && mediaUrl) {
      handleMediaExplainRequest(mediaType, mediaUrl, window.location.href);
    }
  });
  actionsContainer.appendChild(regenerateButton);

  contentContainer.appendChild(actionsContainer);

  // Add follow-up area if not already present
  const existingFollowUp = targetTooltip.querySelector(
    ".ai-dictionary-follow-up-area"
  );
  if (!existingFollowUp) {
    const followUpArea = document.createElement("div");
    followUpArea.className = "ai-dictionary-follow-up-area";

    const followUpInput = document.createElement("input");
    followUpInput.className = "ai-dictionary-follow-up-input";
    followUpInput.placeholder = "Ask a follow-up question...";
    followUpInput.type = "text";

    followUpInput.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        const question = followUpInput.value.trim();
        if (question) {
          handleFollowUpQuestion(question, targetTooltip);
          followUpInput.value = "";
        }
      }
    });

    // Add submit button for follow-up
    const submitButton = document.createElement("button");
    submitButton.className = "ai-dictionary-submit";
    submitButton.textContent = "Ask";
    submitButton.addEventListener("click", () => {
      const question = followUpInput.value.trim();
      if (question) {
        handleFollowUpQuestion(question, targetTooltip);
        followUpInput.value = "";
      }
    });

    // Add submit button to a button container
    const followUpButtons = document.createElement("div");
    followUpButtons.className = "ai-dictionary-buttons";
    followUpButtons.appendChild(submitButton);

    followUpArea.appendChild(followUpInput);
    followUpArea.appendChild(followUpButtons);
    contentContainer.appendChild(followUpArea);

    // Focus the input
    setTimeout(() => {
      followUpInput.focus();
    }, 100);
  }

  // Make sure tooltip is visible
  targetTooltip.style.display = "block";

  // Adjust position if needed
  if (targetTooltip === activeTooltip) {
    const mediaType = targetTooltip.getAttribute(
      "data-media-type"
    ) as MediaType;
    const mediaUrl = targetTooltip.getAttribute("data-media-url") || "";
    const mediaElement = findMediaElement(mediaType, mediaUrl);

    if (mediaElement) {
      positionTooltip(targetTooltip, mediaElement);
    }
  }
}

// Handle multimodal request (text + media)
async function handleMultimodalRequest() {
  try {
    console.log("Handling multimodal request");

    if (
      !pendingMultimodalSelection.text ||
      !pendingMultimodalSelection.mediaType ||
      !pendingMultimodalSelection.mediaUrl
    ) {
      console.error("Missing required text or media for multimodal request");
      return;
    }

    // Create a tooltip for the multimodal content
    const tooltip = createMultimodalTooltip(
      pendingMultimodalSelection.text,
      pendingMultimodalSelection.mediaType,
      pendingMultimodalSelection.mediaUrl
    );
    document.body.appendChild(tooltip);

    // Position the tooltip
    positionTooltipForMultimodal(tooltip);

    // Show loading state
    showLoadingState(tooltip);

    // Get media data
    const mediaData = await getMediaData(
      pendingMultimodalSelection.mediaType,
      pendingMultimodalSelection.mediaUrl
    );

    // Get MIME type
    const mimeType = getMimeType(
      pendingMultimodalSelection.mediaType,
      pendingMultimodalSelection.mediaUrl
    );

    // Get timestamp if it's a video
    const timestamp =
      pendingMultimodalSelection.mediaType === MediaType.VIDEO
        ? getCurrentVideoTimestamp(pendingMultimodalSelection.mediaUrl)
        : undefined;

    // Get media context text if available
    const mediaContextText = getContextTextForMedia(
      pendingMultimodalSelection.mediaElement,
      pendingMultimodalSelection.mediaUrl
    );

    // Create request payload
    const request: ExplainMultimodalRequest = {
      text: pendingMultimodalSelection.text,
      contextText: pendingMultimodalSelection.textContext || undefined,
      mediaType: pendingMultimodalSelection.mediaType,
      mediaData,
      mimeType,
      mediaContextText,
      tabId: undefined, // Will be set by the background script
      pageUrl: window.location.href,
      timestamp,
    };

    // Send request to background script
    console.log("Sending multimodal request to background script:", request);
    const result = await chrome.runtime.sendMessage({
      type: MessageType.EXPLAIN_MULTIMODAL,
      payload: request,
    });

    // Display the result
    showMediaExplanation(result, tooltip);

    // Don't reset multimodal selection state immediately
    // This allows the user to try different approaches with the same selection

    // Schedule cleanup for later (30 seconds)
    setTimeout(() => {
      // Only reset if no tooltip is active (user isn't still interacting)
      if (!activeTooltip) {
        resetMultimodalSelection();
      }
    }, 30000);
  } catch (error) {
    console.error("Error handling multimodal request:", error);

    // Show error message
    if (activeTooltip) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Get content container
      const contentContainer = activeTooltip.querySelector(
        ".ai-dictionary-content"
      );
      if (!contentContainer) {
        console.error("Content container not found in tooltip");
        return;
      }

      // Clear loading state
      contentContainer.innerHTML = "";

      // Create error message
      const errorElement = document.createElement("div");
      errorElement.className = "ai-dictionary-error";
      errorElement.innerHTML = `
        <p>Failed to process the combined text and media content:</p>
        <p class="ai-dictionary-error-details">${errorMessage}</p>
        <p>You can try one of the following options:</p>
      `;
      contentContainer.appendChild(errorElement);

      // Create action buttons
      const actionContainer = document.createElement("div");
      actionContainer.className = "ai-dictionary-error-actions";
      actionContainer.style.display = "flex";
      actionContainer.style.gap = "8px";
      actionContainer.style.marginTop = "12px";

      // Retry button
      const retryButton = document.createElement("button");
      retryButton.className = "ai-dictionary-retry";
      retryButton.textContent = "Retry";
      retryButton.addEventListener("click", () => {
        removeTooltip();
        // Small delay to allow UI to clear
        setTimeout(() => {
          handleMultimodalRequest();
        }, 100);
      });
      actionContainer.appendChild(retryButton);

      // Text-only button
      const textButton = document.createElement("button");
      textButton.className = "ai-dictionary-text-only";
      textButton.textContent = "Explain Text Only";
      textButton.addEventListener("click", () => {
        removeTooltip();
        // Small delay to allow UI to clear
        setTimeout(() => {
          handleExplainRequest(pendingMultimodalSelection.text!);
        }, 100);
      });
      actionContainer.appendChild(textButton);

      // Media-only button
      const mediaButton = document.createElement("button");
      mediaButton.className = "ai-dictionary-media-only";
      mediaButton.textContent = `Explain ${pendingMultimodalSelection.mediaType} Only`;
      mediaButton.addEventListener("click", () => {
        removeTooltip();
        // Small delay to allow UI to clear
        setTimeout(() => {
          handleMediaExplainRequest(
            pendingMultimodalSelection.mediaType!,
            pendingMultimodalSelection.mediaUrl!,
            window.location.href
          );
        }, 100);
      });
      actionContainer.appendChild(mediaButton);

      contentContainer.appendChild(actionContainer);
    }

    // Do NOT reset multimodal selection state
    // This allows user to retry or choose an alternative
  }
}

/**
 * Creates a tooltip for multimodal content (combined text and media)
 */
function createMultimodalTooltip(
  text: string,
  mediaType: MediaType,
  mediaUrl: string
): HTMLElement {
  const tooltip = document.createElement("div");
  tooltip.className = "ai-dictionary-tooltip ai-dictionary-multimodal-tooltip";
  tooltip.style.visibility = "hidden";

  // Create header
  const header = document.createElement("div");
  header.className = "ai-dictionary-header";

  // Create title
  const title = document.createElement("div");
  title.className = "ai-dictionary-title";
  title.textContent = `Text & ${
    mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
  } Explanation`;
  header.appendChild(title);

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.className = "ai-dictionary-close";
  closeButton.textContent = "×";
  closeButton.addEventListener("click", removeTooltip);
  header.appendChild(closeButton);

  tooltip.appendChild(header);

  // Create content container
  const content = document.createElement("div");
  content.className = "ai-dictionary-content";

  // Create selection preview
  const previewContainer = document.createElement("div");
  previewContainer.className = "ai-dictionary-selection-preview";
  previewContainer.style.display = "flex";
  previewContainer.style.marginBottom = "12px";
  previewContainer.style.padding = "8px";
  previewContainer.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
  previewContainer.style.borderRadius = "4px";

  // Create text preview
  const textPreview = document.createElement("div");
  textPreview.className = "ai-dictionary-text-preview";
  textPreview.style.flex = "1";
  textPreview.style.marginRight = "8px";
  textPreview.style.fontStyle = "italic";
  textPreview.innerHTML = `<strong>Selected text:</strong> ${truncateText(
    text,
    100
  )}`;
  previewContainer.appendChild(textPreview);

  // Create media preview
  const mediaPreview = document.createElement("div");
  mediaPreview.className = "ai-dictionary-media-preview";
  mediaPreview.style.flex = "1";
  mediaPreview.style.fontStyle = "italic";

  // Format media URL for display
  const displayUrl =
    mediaUrl.length > 40 ? mediaUrl.substring(0, 37) + "..." : mediaUrl;

  mediaPreview.innerHTML = `<strong>Selected ${mediaType}:</strong> <a href="${mediaUrl}" target="_blank">${displayUrl}</a>`;
  previewContainer.appendChild(mediaPreview);

  content.appendChild(previewContainer);

  tooltip.appendChild(content);

  // Add footer area for action buttons
  const footer = document.createElement("div");
  footer.className = "ai-dictionary-footer";
  tooltip.appendChild(footer);

  activeTooltip = tooltip;

  return tooltip;
}

/**
 * Position the tooltip for multimodal content
 */
function positionTooltipForMultimodal(tooltip: HTMLElement): void {
  // If we have a media element, position near it
  if (pendingMultimodalSelection.mediaElement) {
    positionTooltipNearElement(
      tooltip,
      pendingMultimodalSelection.mediaElement
    );
  }
  // Otherwise, position based on the text selection
  else if (pendingMultimodalSelection.selection) {
    positionTooltipNearSelection(tooltip, pendingMultimodalSelection.selection);
  }
  // Fallback to center of screen
  else {
    positionTooltipCenter(tooltip);
  }

  // Make tooltip visible after positioning
  tooltip.style.visibility = "visible";
}

/**
 * Truncate text to a specific length and add ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Position tooltip in the center of the screen
 */
function positionTooltipCenter(tooltip: HTMLElement): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const tooltipWidth = Math.min(600, viewportWidth * 0.9);
  tooltip.style.width = `${tooltipWidth}px`;

  // Calculate position
  const left = (viewportWidth - tooltipWidth) / 2;
  const top = viewportHeight * 0.2; // 20% from the top

  // Apply position
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Position tooltip near an HTML element
 */
function positionTooltipNearElement(
  tooltip: HTMLElement,
  element: HTMLElement
): void {
  const elementRect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Determine tooltip size
  const tooltipWidth = Math.min(600, viewportWidth * 0.9);
  tooltip.style.width = `${tooltipWidth}px`;

  // Calculate initial position (below the element)
  let left = window.scrollX + elementRect.left;
  let top = window.scrollY + elementRect.bottom + 10;

  // Center horizontally with the element if possible
  if (elementRect.width > tooltipWidth) {
    // Element is wider than tooltip, center tooltip with element
    left =
      window.scrollX +
      elementRect.left +
      (elementRect.width - tooltipWidth) / 2;
  } else if (left + tooltipWidth > window.scrollX + viewportWidth - 20) {
    // Tooltip would go off-screen to the right, adjust left position
    left = window.scrollX + viewportWidth - tooltipWidth - 20;
  }

  // Ensure tooltip stays within viewport bounds (left edge)
  left = Math.max(left, window.scrollX + 20);

  // Apply position
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "9999";
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  // Adjust vertical position if needed after rendering
  setTimeout(() => {
    const tooltipRect = tooltip.getBoundingClientRect();

    // Check if tooltip goes below viewport
    if (tooltipRect.bottom > viewportHeight - 20) {
      // Not enough space below, try positioning above the element
      const topPosition =
        window.scrollY + elementRect.top - tooltipRect.height - 10;

      // Check if there's enough space above
      if (topPosition > window.scrollY + 20) {
        tooltip.style.top = `${topPosition}px`;
      } else {
        // Not enough space above or below, center in viewport
        tooltip.style.top = `${
          window.scrollY + Math.max(100, viewportHeight * 0.1)
        }px`;
      }
    }
  }, 0);
}

/**
 * Position tooltip near a text selection
 */
function positionTooltipNearSelection(
  tooltip: HTMLElement,
  selection: Selection | null
): void {
  if (!selection || !selection.rangeCount) {
    positionTooltipCenter(tooltip);
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Position below the selection, with some padding
  tooltip.style.left = `${window.scrollX + Math.max(rect.left, 10)}px`;
  tooltip.style.top = `${window.scrollY + rect.bottom + 10}px`;

  // Ensure tooltip is visible in viewport - will be applied after added to DOM
  setTimeout(() => {
    const tooltipRect = tooltip.getBoundingClientRect();

    // Check if off-screen horizontally
    if (tooltipRect.right > window.innerWidth - 20) {
      tooltip.style.left = `${
        window.scrollX +
        Math.max(window.innerWidth - tooltipRect.width - 20, 10)
      }px`;
    }

    // Check if off-screen vertically
    if (tooltipRect.bottom > window.innerHeight - 20) {
      // Position above selection instead
      tooltip.style.top = `${
        window.scrollY + Math.max(rect.top - tooltipRect.height - 10, 10)
      }px`;
    }
  }, 0);
}

// Reset the multimodal selection state
function resetMultimodalSelection() {
  pendingMultimodalSelection = {
    text: null,
    textContext: null,
    mediaType: null,
    mediaUrl: null,
    mediaElement: null,
    selection: null,
  };
}

// Function to safely send messages to background
async function sendBackgroundMessage(message: any): Promise<any> {
  if (!isConnected) {
    console.log("Not connected, attempting to reconnect...");
    connectToBackground();
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for connection
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          if (
            chrome.runtime.lastError.message?.includes(
              "Extension context invalidated"
            )
          ) {
            isConnected = false;
            connectToBackground();
          }
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    } catch (error) {
      console.error("Error in sendBackgroundMessage:", error);
      reject(error);
    }
  });
}

// Call init() after all functions are defined
init();
