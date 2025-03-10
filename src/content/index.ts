/// <reference types="chrome" />
import {
  MessageType,
  ExplanationResult,
  ConversationMessage,
  Settings,
} from "../shared/types";
import { debounce, getSettings, getTheme, isValidText } from "../shared/utils";
import { marked } from "marked";

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
};

// Initialize function
function init() {
  // Listen for text selection events
  document.addEventListener("mouseup", handleTextSelection);

  // Load settings
  loadSettings();

  // Add keyboard shortcut listener
  document.addEventListener("keydown", handleKeyboardShortcut);

  console.log("AI Dictionary+ content script initialized");

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message, sender);
    const { type, payload } = message;

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
    }

    // Return true to indicate async response
    return true;
  });
}

// Load user settings
async function loadSettings() {
  userSettings = await getSettings();
}

// Handle keyboard shortcuts
function handleKeyboardShortcut(event: KeyboardEvent) {
  if (!userSettings) return;

  const { keyboardShortcut } = userSettings;

  // Check if the pressed keys match the shortcut
  if (
    event.key.toUpperCase() === keyboardShortcut.key.toUpperCase() &&
    event.ctrlKey === keyboardShortcut.ctrlKey &&
    event.shiftKey === keyboardShortcut.shiftKey &&
    event.altKey === keyboardShortcut.altKey &&
    event.metaKey === keyboardShortcut.metaKey
  ) {
    event.preventDefault();

    // Get the selected text
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      return;
    }

    const text = selection.toString().trim();
    if (!isValidText(text)) {
      return;
    }

    // Trigger explanation
    handleExplainRequest(text);
  }
}

// Handle selection events
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

  // Create a button near the selection
  createSelectionButton(event, text);
}, 300);

// Create a button near the selected text
function createSelectionButton(event: MouseEvent, text: string) {
  console.log("Creating selection button for:", text);
  selectionButton = document.createElement("button");
  selectionButton.className = "ai-dictionary-button";
  selectionButton.textContent = "Explain";
  selectionButton.style.position = "absolute";
  selectionButton.style.left = `${event.pageX + 10}px`;
  selectionButton.style.top = `${event.pageY + 10}px`;
  selectionButton.style.zIndex = "10000"; // Ensure it's on top

  selectionButton.addEventListener("click", (e) => {
    console.log("Selection button clicked for text:", text);
    e.stopPropagation(); // Prevent document click from removing tooltip immediately
    removeSelectionButton();
    handleExplainRequest(text);
  });

  document.body.appendChild(selectionButton);
  console.log(
    "Selection button added to document.body at:",
    selectionButton.style.left,
    selectionButton.style.top
  );

  // Automatically remove the button after 3 seconds
  setTimeout(() => {
    removeSelectionButton();
  }, 3000);
}

// Remove the selection button
function removeSelectionButton() {
  if (selectionButton && document.body.contains(selectionButton)) {
    document.body.removeChild(selectionButton);
    selectionButton = null;
  }
}

// Handle an explain request
function handleExplainRequest(text: string) {
  console.log("Handling explain request for text:", text);

  // Store the active text
  activeText = text;

  // Create loading tooltip
  const tooltip = createTooltip(text);

  // Make the tooltip very visible
  tooltip.style.border = "2px solid #4285f4";
  tooltip.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";

  showLoadingState(tooltip);

  // Send request to background script
  console.log("Sending explain request to background script");
  chrome.runtime.sendMessage(
    {
      type: MessageType.EXPLAIN_TEXT,
      payload: {
        text,
        contextText: getContextText(text),
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
  title.textContent = "AI Dictionary+";
  header.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.className = "ai-dictionary-close";
  closeButton.textContent = "✕";
  closeButton.addEventListener("click", removeTooltip);
  header.appendChild(closeButton);

  tooltip.appendChild(header);

  // Content area
  const content = document.createElement("div");
  content.className = "ai-dictionary-content";
  tooltip.appendChild(content);

  // Position tooltip
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position below the selection, with some padding
    tooltip.style.left = `${window.scrollX + Math.max(rect.left, 10)}px`;
    tooltip.style.top = `${window.scrollY + rect.bottom + 10}px`;
    console.log(
      "Positioned tooltip at:",
      tooltip.style.left,
      tooltip.style.top
    );

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

      console.log(
        "Adjusted tooltip position to:",
        tooltip.style.left,
        tooltip.style.top
      );
    }, 0);
  } else {
    console.log("No selection found for positioning tooltip");

    // Default position in the middle of the viewport
    tooltip.style.left = "50%";
    tooltip.style.top = "100px";
    tooltip.style.transform = "translateX(-50%)";
  }

  // Apply the theme
  applyTheme(tooltip);

  // Add to document body
  document.body.appendChild(tooltip);
  console.log("Tooltip added to document.body");
  activeTooltip = tooltip;

  return tooltip;
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

// Remove the tooltip
function removeTooltip() {
  if (activeTooltip && document.body.contains(activeTooltip)) {
    document.body.removeChild(activeTooltip);
    activeTooltip = null;
  }
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

// Call init() after all functions are defined
init();
