# Learnings

This document tracks issues encountered during development and their solutions.

## Setup Phase

- **Issue**: TypeScript linter errors with Chrome API types
- **Solution**: Added `/// <reference types="chrome" />` to files using Chrome APIs and installed `@types/chrome` package

## Build Phase

- **Issue**: Type error in chat component with undefined vs null
- **Solution**: Fixed by ensuring error property is always a string or null, not undefined, by using `error: response.error || 'Unknown error'`

## React Integration

- **Issue**: React components need proper HTML containers
- **Solution**: Updated HTML files to include a root div element for React to render into

## Content Script Issues

- **Issue**: "Cannot access 'handleTextSelection' before initialization" error
- **Solution**: Moved the `init()` call to the end of the file, after all functions have been defined

- **Issue**: Tooltip visibility problems
- **Solution**: Enhanced the tooltip styling with more visible borders and better positioning logic, using setTimeout(0) instead of requestAnimationFrame to ensure positioning is updated after the tooltip is added to the DOM

## UI Enhancements

- **Issue**: Text responses didn't render Markdown properly
- **Solution**: Integrated the marked library to parse Markdown in both content script tooltip and full chat interface

- **Issue**: Button text wasn't vertically aligned
- **Solution**: Added flexbox styling to buttons with `display: flex`, `align-items: center`, and `justify-content: center` properties

## Bug Fixes

- **Issue**: Multiple follow-up inputs being created when asking successive follow-up questions
- **Solution**: Added code to remove any existing follow-up area before creating a new one, ensuring only one input field exists at a time

- **Issue**: Updated extension icons not appearing despite being in the correct directory
- **Solution**: Chrome aggressively caches extension icons. The solution is to completely remove the extension and reload it as an unpacked extension after rebuilding. 

## Web Search Integration

- **Issue**: Type errors with the Settings interface when implementing keyboard shortcuts
- **Solution**: Carefully read the Settings interface definition in shared/types.ts to ensure the correct structure is used

- **Issue**: Null vs undefined type errors with activeTooltip parameter
- **Solution**: Used the existing showExplanation function which already handles null activeTooltip values correctly

- **Issue**: Perplexity API requires specific permissions
- **Solution**: Added "https://api.perplexity.ai/" to the host_permissions array in manifest.json

- **Issue**: Extracting citations from API responses
- **Solution**: Implemented a regex-based extraction function that looks for URLs in square brackets and returns unique URLs 

- **Issue**: Perplexity API error: "Invalid model 'sonar-small-online'"
- **Solution**: Updated the model name from 'sonar-small-online' to 'sonar' based on Perplexity API documentation

- **Issue**: Citations not being displayed in web search results
- **Solution**: Updated the implementation to use the `citations` array directly from the Perplexity API response instead of trying to extract URLs from the text content. Modified the API function to return both explanation and citations.

## Settings Management

- **Issue**: Options page error "Cannot read properties of undefined (reading 'metaKey')" when accessing keyboard shortcut
- **Solution**: Two-part fix: 1) Added null checks in the formatShortcut function to handle undefined values gracefully, 2) Updated the getSettings utility function to properly merge saved settings with default settings, especially for nested objects like keyboardShortcut 

## Assistant UI Integration Lessons

### Issue: Chat Wasn't Submitting Messages
**Problem**: The chat interface wasn't sending messages when users typed text and tried to submit.
**Root Cause**: We were incorrectly using runtime API methods that don't exist or have different signatures from what we expected.
**Solution**: Used the ComposerPrimitive.Root component's built-in submission handling mechanism instead of trying to manually handle message submissions.
**Learning**: Always refer to the official documentation for component libraries rather than making assumptions about their API. When stuck, look for examples or usage patterns in the documentation.

### Issue: Context Not Passed Between Components
**Problem**: Opening the chat from the popup or content script didn't preserve the context of the conversation.
**Root Cause**: We were sending messages to the background script but not properly passing data via URL parameters.
**Solution**: Encoded conversation data and passed it via URL parameters to ensure the chat page receives the proper context.
**Learning**: When working with Chrome extensions, URL parameters are a reliable way to pass data between different extension pages, in addition to message passing.

### Issue: Complex Message Format Conversion
**Problem**: Messages were in different formats between our internal representation and the Assistant UI components.
**Root Cause**: The ThreadMessage format in Assistant-UI is different from our ConversationMessage format, especially with content handling.
**Solution**: Added robust conversion logic that checks for different content types and extracts text appropriately.
**Learning**: When integrating with third-party UI libraries, pay close attention to their data structures and provide proper adapters between your app's data model and the library's requirements.

### Issue: "Continue in chat" Button Stopped Working
**Problem**: After updating the context passing functionality, the "Continue in chat" button stopped working.
**Root Cause**: We changed the implementation to use `chrome.tabs.create()` instead of `window.open()`. Content scripts don't have direct access to the `chrome.tabs` API without specific permissions.
**Solution**: Reverted back to using `window.open()` which is accessible from content scripts, while still maintaining the improved context passing via URL parameters.
**Learning**: Be mindful of Chrome Extension API access limitations in different contexts. Content scripts have restricted access to certain Chrome APIs. When modifying code, ensure the replacement APIs are accessible in the same context. 

### Issue: Component Context Errors with Assistant UI
**Problem**: The chat interface was showing multiple React errors about context and DOM manipulation.
**Root Cause**: We were trying to use Assistant UI components (particularly MessagePrimitive.Root) outside of their required context providers, and had improper nesting of HTML elements (button inside button).
**Solution**: Simplified the component architecture by:
1. Not using ThreadPrimitive.Messages with components prop (which required specific provider context)
2. Manually rendering messages with appropriate styling
3. Replacing nested buttons with properly styled divs
**Learning**: When using complex UI component libraries with context-based architectures:
1. Make sure to understand the component hierarchy and context requirements
2. Consider simplifying by using only the parts of the library you fully understand
3. Check for HTML validation issues like improper element nesting
4. If struggling with a complex component, sometimes a simpler custom implementation is more reliable

### Issue: Chat Message Submission Not Working
**Problem**: After fixing the rendering errors, messages could not be sent or received in the chat interface.
**Root Cause**: The Assistant UI library's runtime system and message submission flow was complex and not properly integrated with our backend. Attempts to use the ThreadRuntime interfaces led to type errors and non-functional code.
**Solution**: Completely replaced the Assistant UI message handling with a direct implementation that:
1. Manages message state in the main component
2. Directly calls our background script API for responses 
3. Implements our own loading indicators and UI feedback
**Learning**: 
1. When integrating with complex third-party libraries, evaluate whether partial integration is creating more problems than it solves
2. Sometimes a clean implementation from scratch is more maintainable than forcing integration with a library that doesn't align with your architecture
3. Direct API integrations with simple state management can be more reliable than complex context-based systems
4. Always ensure you have proper visual feedback (loading indicators, error states) when implementing asynchronous operations
5. When multiple attempts to fix integration issues fail, consider pivoting to a simpler solution that you have full control over

### Issue: Improving Response Quality with Gemini Flash 2.0
**Problem**: We needed to enhance the quality and relevance of AI responses by providing better context, while respecting user settings.
**Root Cause**: The default implementation only sent the direct conversation history without additional context that could help the model generate better responses.
**Solution**:
1. Added system messages with context about the extension's purpose and the user's current content
2. Improved role mapping for different message types
3. Enhanced the API configuration with better parameters
4. Increased default and maximum token limits
**Learning**:
1. System messages in LLM requests are powerful for providing context without cluttering the user-visible conversation
2. When modifying user-controlled settings (like token limits), it's better to update the configurable range rather than silently overriding user preferences
3. Enhancements to AI services should be transparent to users, with clear documentation and settings
4. The way context is formatted and structured has a significant impact on response quality
5. Each message role (system, user, assistant) serves a different purpose and should be handled appropriately in the API integration

### Issue: Enhancing Context Gathering from Web Pages
**Problem**: The context gathering function was only capturing a limited amount of surrounding text (500 characters) from the selected element, which didn't provide enough context for the AI model.
**Root Cause**: The original `getContextText()` function had a simple implementation that only used the first matching element's content with a 500-character limit, missing valuable surrounding context.
**Solution**:
1. Expanded the DOM element selectors to include more types of content elements
2. Doubled the character limit from 500 to 1000 characters
3. Added logic to intelligently use the parent element's content when it provides more context
4. Added proper error handling with a fallback to the selected text
**Learning**:
1. When working with web page content extraction, it's important to handle a wide variety of DOM structures
2. Error handling is critical in DOM traversal functions since web pages can have unpredictable structures
3. When gathering context, it's often valuable to look both at the selected element and its parent container
4. Balancing between getting enough context and avoiding too much irrelevant content is key
5. Using a more comprehensive context gathering approach leads to significantly improved AI responses 

### Issue: CSS Information Distracting AI from Core Explanations
**Problem**: When explaining selected text, the AI model would sometimes focus on CSS styling information present in the context rather than the core concepts.
**Root Cause**: The context gathered from web pages often includes CSS declarations, and without specific guidance, the AI would include this information in explanations even when not relevant.
**Solution**:
1. Added explicit instructions in system prompts to ignore CSS information unless specifically asked about it
2. Updated context gathering to provide clearer guidance on what information is relevant
3. Restructured the system prompt to emphasize focusing on core concepts, not styling or formatting
**Learning**:
1. AI models benefit from explicit negative instructions ("ignore X") as well as positive ones
2. System prompts should be tailored to the specific domain and potential distractions in that domain
3. When providing context to AI models, it's important to guide their attention to what's relevant
4. User experience is improved when explanations focus on what the user likely wants to know rather than incidental details

### Issue: Making Explanations More Accessible to Users
**Problem**: Users had no easy way to capture or save explanations for later reference.
**Root Cause**: The extension didn't provide functionality to copy or save the provided explanations.
**Solution**:
1. Added a copy-to-clipboard button with SVG icon to the explanation tooltip
2. Implemented a visual "Copied!" confirmation for better user feedback
3. Ensured the button styling matches the extension's design language in both light and dark modes
**Learning**:
1. Small UI enhancements can significantly improve overall user experience
2. Providing visual feedback for user actions is essential for a polished feel
3. Copy functionality should be accessible but not intrusive to the main content
4. When implementing clipboard operations, proper error handling is important for browser compatibility

### Issue: Testing New System Prompts on Cached Results
**Problem**: When we updated system prompts to improve explanation quality, users couldn't test these improvements on terms that already had cached explanations.
**Root Cause**: The caching system, while efficient for performance, prevented users from seeing the effects of system prompt changes on previously queried terms.
**Solution**:
1. Added a "Regenerate" button with distinct purple styling
2. Implemented a skipCache flag in the ExplainTextRequest interface
3. Modified the handleExplainText function to bypass cache checking when skipCache is true
4. Created a dedicated handleRegenerateExplanation function for regeneration requests
**Learning**:
1. Even well-designed caching systems need bypass mechanisms for certain use cases
2. User-controlled cache invalidation provides a powerful balance between performance and flexibility
3. Visual distinction (color coding) helps users understand the different actions available
4. When implementing new features that modify core functionality, thoughtful interface design is important to avoid confusion
5. Providing users with multiple ways to get information creates a more versatile user experience 

### Issue: Markdown Not Rendering in Chat Interface
**Problem**: The chat interface was displaying raw markdown instead of properly rendered HTML, despite markdown rendering working correctly in the tooltip explanations.
**Root Cause**: The content script used the marked library to parse markdown in tooltips, but the same functionality was missing in the chat interface which displayed raw text.
**Solution**:
1. Added the marked library import to the chat component
2. Implemented a renderMarkdown helper function to safely parse markdown to HTML
3. Updated the message rendering in the ChatThread component to use dangerouslySetInnerHTML with parsed markdown for assistant messages
4. Added comprehensive CSS styling for markdown elements (headings, lists, code blocks, etc.) in globals.css to ensure consistency between tooltip and chat markdown rendering
**Learning**:
1. Consistent rendering techniques should be used across different parts of an application
2. When using markdown in web applications, proper CSS styling is essential for readability
3. dangerouslySetInnerHTML should be used carefully with proper sanitization (which marked provides)
4. Reusing existing patterns (like the marked library implementation) helps maintain consistency
5. Different components may need different approaches - only assistant messages need markdown rendering, while user messages should remain as plain text 