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

# AI Dictionary+ Multimedia Integration Learnings

## Issues and Solutions

### 1. Chrome API Callback Function Missing

**Issue:** Linter error in `src/background/index.ts` where `chrome.tabs.sendMessage` was called with only two arguments but expected three.

**Solution:** Added a callback function as the third argument to handle potential errors:

```typescript
chrome.tabs.sendMessage(
  tabId,
  { type: "EXPLAIN_MEDIA", mediaType, mediaUrl, mediaAlt, mediaContext },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message:", chrome.runtime.lastError);
      return;
    }
    // Handle response if needed
  }
);
```

### 2. Multimedia Feature Integration

**Issue:** Needed to integrate multimedia support across multiple components (background, content, options, popup) while maintaining consistent UI/UX.

**Solution:** 
- Added new types in `shared/types.ts` for multimedia messages
- Updated background script to handle context menu items for different media types
- Implemented content script handlers for processing media elements
- Added settings toggle in options page with visual indicators
- Enhanced CSS for multimedia tooltips and elements
- Updated popup UI to inform users about the new feature

### 3. Consistent Styling Across Components

**Issue:** Needed to ensure consistent styling for multimedia elements across different parts of the extension.

**Solution:**
- Added new CSS variables in `globals.css` for multimedia-specific colors and styles
- Created dedicated classes for multimedia elements (tooltips, badges, etc.)
- Applied consistent styling to options page and popup UI
- Added visual indicators (badges, highlights) to draw attention to new features

### 4. Gemini API Integration for Multimedia Content

**Issue:** Implementing the Gemini API for multimedia content analysis required handling different media types and formats.

**Solution:**
- Created a specialized `callGeminiMultimodalAPI` function that properly formats requests for the Gemini API
- Implemented media type detection and MIME type handling for different content types
- Added support for base64-encoded images and direct URLs for other media types
- Created custom system prompts for each media type to get better analysis results
- Implemented proper error handling and user feedback for API requests
- Added context awareness by incorporating surrounding text and timestamps for videos

### 5. TypeScript Type Safety for API Responses

**Issue:** TypeScript linter errors related to missing properties in the API response types.

**Solution:**
- Updated the `ExplanationResult` interface to ensure all required properties are included
- Used `Record<MediaType, string>` for type-safe mapping of media types to MIME types
- Added proper type assertions for media content parts to ensure type safety
- Ensured consistent error handling with proper type information

### 6. Chat Component Compatibility with Multimedia Content

**Issue:** Build error in the chat component due to type mismatch between the new `ConversationMessage` type (which can now contain `ContentPart[]` arrays) and the `ChatThreadProps` interface (which expected only string content).

**Solution:**
- Updated the `formattedMessages` function to handle different content types:
  - For string content, use it directly
  - For `ContentPart[]` arrays, extract text content and join with spaces
  - For any other format, convert to JSON string
- This approach maintains backward compatibility while supporting the new multimedia content types
- The build now completes successfully with all components working together

### 7. Inconsistent Tooltip Styling Between Text and Media

**Issue:** The tooltip styling for multimedia content looked inconsistent and inferior compared to text tooltips, creating a jarring user experience when switching between explanation types.

**Solution:**
- Identified that the multimedia tooltips were using different CSS class names compared to text tooltips
- Updated the `createMediaTooltip` function to use the same class names as text tooltips:
  - Changed `ai-dictionary-tooltip-header` to `ai-dictionary-header`
  - Changed `ai-dictionary-tooltip-title` to `ai-dictionary-title`
  - Changed `ai-dictionary-tooltip-close-button` to `ai-dictionary-close`
  - Changed `ai-dictionary-tooltip-content` to `ai-dictionary-content`
- Updated the `showMediaExplanation` function to reference the new class names
- Modified button classes to match existing styling patterns
- Updated CSS in `globals.css` to work with the new class structure
- Added styling for the footer element that appears in media tooltips

**Learning:**
- Maintaining consistent class naming conventions across related components is crucial for visual consistency
- When creating new UI elements similar to existing ones, directly reuse existing CSS classes when possible
- Standardizing DOM structure between similar components simplifies maintenance and ensures consistent styling
- Purple accent color works for multimedia content, but the tooltip container should maintain the same layout as text tooltips

### 8. CORS Issues with Image Analysis

**Issue:** When trying to explain images from some websites, we encountered this error: `Base64 decoding failed for [URL]`. This happens because the Gemini API requires images to be provided as base64-encoded data, not URLs. The content script tried to convert images to base64 using a canvas, but this failed due to CORS (Cross-Origin Resource Sharing) restrictions when the images came from domains that don't allow cross-origin access.

**Solution:**
1. Modified the `getMediaData` function in the content script to stop attempting base64 conversion and instead pass all image URLs directly to the background script
2. Added a new `fetchImageAsBase64` function in the background script that fetches the image data and converts it to base64 format
3. Updated the `handleMediaExplainRequest` function in the background script to detect image URLs and convert them to base64 before sending to the Gemini API
4. Improved error messages to provide more helpful guidance to users when image processing fails

**Technical Details:**
- The original implementation in `getMediaData` was trying to use `img.crossOrigin = "anonymous"` with canvas conversion, but this only works if the server explicitly allows CORS with appropriate headers
- Browser extensions have more flexible permissions in background scripts, which can fetch resources across origins
- The new solution leverages the background script's `fetch()` capabilities, combined with `FileReader.readAsDataURL()` to convert blob data to base64
- Added explicit error checking for HTTP response status to provide better error messages

**Implementation:** A comprehensive explanation of this issue and its solution is documented in the `cors-image-fix.md` file, which includes code snippets and detailed explanation of the approach.

**Learning:**
- Browser extensions have different permission models for content scripts vs. background scripts
- Background scripts can make cross-origin requests much more freely than content scripts
- When working with third-party APIs that require specific data formats (like base64), it's important to handle the conversions properly
- Providing user-friendly error messages with troubleshooting steps greatly improves the user experience when things go wrong
- Always consider cross-origin restrictions when designing features that interact with web content from various domains

## Additional Learnings

- **Issue**: TypeScript linter errors with Chrome API types
- **Solution**: Added `/// <reference types="chrome" />` to files using Chrome APIs and installed `@types/chrome` package

- **Issue**: Type error in chat component with undefined vs null
- **Solution**: Fixed by ensuring error property is always a string or null, not undefined, by using `error: response.error || 'Unknown error'`

- **Issue**: React components need proper HTML containers
- **Solution**: Updated HTML files to include a root div element for React to render into

- **Issue**: "Cannot access 'handleTextSelection' before initialization" error
- **Solution**: Moved the `init()` call to the end of the file, after all functions have been defined

- **Issue**: Tooltip visibility problems
- **Solution**: Enhanced the tooltip styling with more visible borders and better positioning logic, using setTimeout(0) instead of requestAnimationFrame to ensure positioning is updated after the tooltip is added to the DOM

- **Issue**: Text responses didn't render Markdown properly
- **Solution**: Integrated the marked library to parse Markdown in both content script tooltip and full chat interface

- **Issue**: Button text wasn't vertically aligned
- **Solution**: Added flexbox styling to buttons with `display: flex`, `align-items: center`, and `justify-content: center` properties

- **Issue**: Multiple follow-up inputs being created when asking successive follow-up questions
- **Solution**: Added code to remove any existing follow-up area before creating a new one, ensuring only one input field exists at a time

- **Issue**: Updated extension icons not appearing despite being in the correct directory
- **Solution**: Chrome aggressively caches extension icons. The solution is to completely remove the extension and reload it as an unpacked extension after rebuilding. 

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

- **Issue**: Options page error "Cannot read properties of undefined (reading 'metaKey')" when accessing keyboard shortcut
- **Solution**: Two-part fix: 1) Added null checks in the formatShortcut function to handle undefined values gracefully, 2) Updated the getSettings utility function to properly merge saved settings with default settings, especially for nested objects like keyboardShortcut 

- **Issue**: ComposerPrimitive.Root component's submission handling
- **Solution**: Used the ComposerPrimitive.Root component's built-in submission handling mechanism instead of trying to manually handle message submissions.

- **Issue**: Context passing between components
- **Solution**: Encoded conversation data and passed it via URL parameters to ensure the chat page receives the proper context.

- **Issue**: Complex message format conversion
- **Solution**: Added robust conversion logic that checks for different content types and extracts text appropriately.

- **Issue**: "Continue in chat" button stopped working
- **Solution**: Reverted back to using `window.open()` which is accessible from content scripts, while still maintaining the improved context passing via URL parameters.

- **Issue**: Component context errors with Assistant UI
- **Solution**: Simplified the component architecture by:
1. Not using ThreadPrimitive.Messages with components prop (which required specific provider context)
2. Manually rendering messages with appropriate styling
3. Replacing nested buttons with properly styled divs

- **Issue**: Chat message submission not working
- **Solution**: Completely replaced the Assistant UI message handling with a direct implementation that:
1. Manages message state in the main component
2. Directly calls our background script API for responses 
3. Implements our own loading indicators and UI feedback

- **Issue**: Improving response quality with Gemini Flash 2.0
- **Solution**: Added system messages with context about the extension's purpose and the user's current content, improved role mapping for different message types, enhanced the API configuration with better parameters, and increased default and maximum token limits.

- **Issue**: Enhancing context gathering from web pages
- **Solution**: Expanded the DOM element selectors to include more types of content elements, doubled the character limit from 500 to 1000 characters, added logic to intelligently use the parent element's content when it provides more context, and added proper error handling with a fallback to the selected text.

- **Issue**: CSS information distracting AI from core explanations
- **Solution**: Added explicit instructions in system prompts to ignore CSS information unless specifically asked about it, updated context gathering to provide clearer guidance on what information is relevant, and restructured the system prompt to emphasize focusing on core concepts, not styling or formatting.

- **Issue**: Making explanations more accessible to users
- **Solution**: Added a copy-to-clipboard button with SVG icon to the explanation tooltip, implemented a visual "Copied!" confirmation for better user feedback, and ensured the button styling matches the extension's design language in both light and dark modes.

- **Issue**: Testing new system prompts on cached results
- **Solution**: Added a "Regenerate" button with distinct purple styling, implemented a skipCache flag in the ExplainTextRequest interface, modified the handleExplainText function to bypass cache checking when skipCache is true, and created a dedicated handleRegenerateExplanation function for regeneration requests.

- **Issue**: Markdown not rendering in chat interface
- **Solution**: Added the marked library import to the chat component, implemented a renderMarkdown helper function to safely parse markdown to HTML, updated the message rendering in the ChatThread component to use dangerouslySetInnerHTML with parsed markdown for assistant messages, and added comprehensive CSS styling for markdown elements (headings, lists, code blocks, etc.) in globals.css to ensure consistency between tooltip and chat markdown rendering.

- **Issue**: Inconsistent tooltip styling between text and media
- **Solution**: Updated the `createMediaTooltip` function to use the same class names as text tooltips, updated the `showMediaExplanation` function to reference the new class names, modified button classes to match existing styling patterns, updated CSS in `globals.css` to work with the new class structure, and added styling for the footer element that appears in media tooltips.

## Cross-Origin Image Processing Issue

**Issue:** We encountered an error when trying to explain images from certain websites: `Base64 decoding failed for [URL]`. The Gemini API requires images to be provided as base64-encoded data, not URLs. The content script was trying to convert images to base64 using a canvas element, but this failed due to CORS (Cross-Origin Resource Sharing) restrictions when images came from domains that don't allow cross-origin access.

**Solution:**
1. Modified the `getMediaData` function in the content script to stop attempting base64 conversion and instead pass all image URLs directly to the background script
2. Added a new `fetchImageAsBase64` function in the background script that fetches the image data and converts it to base64 format
3. Updated the `handleMediaExplainRequest` function in the background script to detect image URLs and convert them to base64 before sending to the Gemini API
4. Improved error messages to provide more helpful guidance to users when image processing fails

**Technical Details:**
- The original implementation in `getMediaData` was trying to use `img.crossOrigin = "anonymous"` with canvas conversion, but this only works if the server explicitly allows CORS with appropriate headers
- Browser extensions have more flexible permissions in background scripts, which can fetch resources across origins
- The new solution leverages the background script's `fetch()` capabilities, combined with `FileReader.readAsDataURL()` to convert blob data to base64
- Added explicit error checking for HTTP response status to provide better error messages

**Implementation:** A comprehensive explanation of this issue and its solution is documented in the `cors-image-fix.md` file, which includes code snippets and detailed explanation of the approach.

**Learning:**
- Browser extensions have different permission models for content scripts vs. background scripts
- Background scripts can make cross-origin requests much more freely than content scripts
- When working with third-party APIs that require specific data formats (like base64), it's important to handle the conversions properly
- Providing user-friendly error messages with troubleshooting steps greatly improves the user experience when things go wrong
- Always consider cross-origin restrictions when designing features that interact with web content from various domains

## Inconsistent Tooltip UI Styling

**Issue:** The tooltips for text content and media content (images, videos, etc.) had inconsistent styling and button layouts, causing a jarring user experience when switching between them. Specifically, the media tooltip had buttons that weren't properly aligned, lacked the "Ask" button for follow-up questions, and had inconsistent styling compared to the text tooltip.

**Root Cause:** The media tooltip creation function and the regular tooltip creation function were developed separately, leading to different class names and inconsistent button layouts. The media tooltip was missing certain UI elements and didn't properly leverage the CSS classes that were already defined for the text tooltip.

**Solution:**
1. Unified button styling across all tooltip types by standardizing CSS classes
2. Updated the `showMediaExplanation` function to add an "Ask" button for follow-up questions
3. Enhanced CSS in `content.css` to provide consistent styling for buttons, inputs, and containers
4. Applied the `markdown-content` class to explanation elements in media tooltips
5. Improved responsive behavior with flex-wrap and consistent spacing

**Key Improvements:**
- Added consistent button layout with proper alignment and spacing
- Standardized button styling with proper text centering and hover effects
- Improved the visual hierarchy with better borders and shadows
- Fixed follow-up question functionality in media tooltips
- Enhanced the footer styling for better visual distinction
- Standardized content area styling for better readability

**Learning:**
1. **Consistent Component Creation:** When creating similar UI components (like tooltips), use shared functions or templates to ensure consistency
2. **CSS Class Management:** Maintain a clear naming convention for CSS classes and reuse them across similar components
3. **Button Standardization:** Create a unified button system with consistent styling, padding, and hover states
4. **Responsive Design:** Use flexbox with gap and flex-wrap to create naturally responsive layouts that work at different widths
5. **Visual Testing:** Always test UI components at different sizes and with different content lengths to ensure they remain usable
6. **DOM Structure Consistency:** Keep the DOM structure consistent between similar components to simplify CSS styling
7. **Markdown Content:** When rendering markdown, apply consistent CSS classes to ensure proper styling across all instances

The unified approach not only improved the appearance but also simplified future maintenance by reducing code duplication and ensuring any styling changes apply consistently across the extension.

## Gemini API Video Processing Issue

**Issue:** When trying to analyze videos with Gemini API, we encountered the error: `Invalid or unsupported file uri: https://www.w3schools.com/html/mov_bbb.mp4`. Unlike image files which can be sent directly as base64-encoded data, video files need to be properly uploaded to the Gemini API's File service first.

**Root Cause:** The Gemini API handles different media types in different ways:
1. Images can be sent directly as base64-encoded data using the `inline_data` property
2. Videos, however, must be processed through the File API and referenced using a `file_uri` property

Our implementation was incorrectly trying to pass direct video URLs as `file_uri` values, but the Gemini API expects these URIs to be in a specific format that comes from its own File API.

**Solution:**
1. Implemented a new `uploadVideoToGeminiAPI` function in the background script that:
   - Fetches the video data from the URL
   - Uses the Gemini File API's resumable upload protocol to upload the video
   - Waits for the video to be processed by checking its status
   - Returns the proper `file_uri` format required by the API
2. Updated the `handleMediaExplainRequest` function to use this upload process for videos
3. Modified the `ContentPart` interface to include a `file_uri` property for video content
4. Enhanced error messages to provide users with clear information about video requirements

**Implementation:**
The process for handling videos now follows these steps:
1. When a video URL is detected, the extension fetches the video data
2. It then uploads this data to the Gemini File API using a two-step process:
   - An initial request to start the upload session and get an upload URL
   - A second request to upload the actual video data
3. After uploading, we poll the API to check if the video has finished processing
4. Once the video is processed (state changes from "PROCESSING" to "ACTIVE"), we use the returned `file_uri` in the Gemini API request

**Key Learnings:**
1. Different media types require different handling in the Gemini API:
   - Images: Use `inline_data` with base64-encoded content
   - Videos: Use `file_data` with a proper `file_uri` from the File API
2. Video processing with Gemini has specific requirements:
   - Videos must be under certain limits (size, duration)
   - The File API imposes a 2-day expiration on uploaded files
   - Videos go through a processing phase before they can be analyzed
3. The resumable upload protocol is important for larger files to handle potential connection issues
4. Providing clear, detailed error messages to users is crucial when working with complex APIs and media processing

**User Experience Improvements:**
1. Enhanced error messages with specific guidance about video requirements
2. Added proper status handling during video processing
3. Included troubleshooting tips for common video issues 

This implementation makes our extension more robust when handling different media types and provides a better user experience by giving clear feedback when issues occur.

### Update: Fixed File Status Check for Video Processing in Gemini API (June 13, 2024)

**Issue**: After implementing video upload support for the Gemini API, users encountered a "Failed to check file status: 404" error when attempting to explain videos. This occurred because the file status check endpoint was not correctly constructed.

**Root Cause**: The error stemmed from an incorrect URL construction when checking the status of an uploaded video file. We were using:
```javascript
https://generativelanguage.googleapis.com/v1beta/files/${file.name}?key=${apiKey}
```
However, the file name returned from the upload response already contains the full path in the format `files/file-xxxxx`, so the correct endpoint should be:
```javascript
https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}
```

**Solution Implemented**:
1. Modified the file status check URL to use the full path returned by the API instead of appending the file name to a hardcoded path
2. Added better parsing of the upload response to extract the file URI correctly
3. Implemented comprehensive error handling to provide users with more specific error messages based on the type of failure
4. Added detailed error logging to aid in debugging future issues

**Key Learnings**:
1. The Gemini File API returns file references that include the full API path - these should be used as-is without adding additional path components
2. File status checks require polling with the exact path provided in the upload response
3. 404 errors in file status checks typically indicate an incorrectly formatted path rather than a missing file
4. Detailed error messages significantly improve the user experience when dealing with API integration issues
5. The Gemini File API documentation could be more explicit about the format of file references and status check endpoints

This fix ensures that video uploads complete successfully and can be properly processed by the Gemini API, resolving the "Failed to check file status: 404" error that users were experiencing.

### Implementing Multimodal Selection for Enhanced Explanations (June 13, 2024)

**Feature Overview**: We implemented a new capability allowing users to select both text and media elements (images, videos, audio, documents) to get unified explanations of their relationship, leveraging Gemini's multimodal processing capabilities.

**Technical Implementation**:

1. **State Management**: 
   - Added a stateful object `pendingMultimodalSelection` to track both text selections and media elements simultaneously
   - Implemented a system where right-clicking on media after selecting text automatically offers the combined explanation option

2. **UI Integration**:
   - Created a multi-button selection panel that dynamically shows the "Explain with Media" option when both text and media are selected
   - Implemented a preview panel in the tooltip showing both the selected text and a thumbnail of the media
   - Built a specialized tooltip for multimodal content with appropriate styling and positioning logic

3. **Context Gathering**:
   - Enhanced our `getContextTextForMedia` function to extract captions, alt text, and surrounding content
   - Combined text context and media context in a structured format for the API request
   - Implemented media-specific prompt generation that guides the model to analyze the relationship between text and different media types

4. **API Integration**:
   - Extended the Gemini API integration to handle multiple content parts in a single request
   - Created a specialized content part array that correctly structures text and media content
   - Implemented proper handling for different media types (images, videos, audio, documents)

**Key Lessons Learned**:

1. **State Synchronization**: Maintaining state across multiple user interactions (text selection → media right-click) required careful planning. We learned to use persistent state objects that survive between interaction events.

2. **Context Flow**: We discovered that sending context for both the text and media separately works better than combining them, as it helps the model understand the distinct sources.

3. **Media Type Handling**: Different media types require specialized approaches:
   - Images: Need base64 encoding and proper MIME type detection
   - Videos: Require the File API upload protocol with correct status checking
   - Audio/Documents: Benefit from specialized prompting to guide the analysis

4. **API Design Considerations**: The Gemini multimodal API expects a specific format for content parts, and nesting them correctly is essential. Sending multiple content parts in an array within a user message works better than separate messages.

5. **User Interface Design**: For multimodal interactions:
   - Clear visual cues indicating when both text and media are selected improve usability
   - Previewing both selected elements helps users confirm their selection
   - Timeouts on selection buttons need to be longer to accommodate the multi-step process

6. **Error Handling**: Multimodal requests have more potential failure points, so comprehensive error handling with clear user feedback was essential.

**Impact**: This feature significantly enhances the extension's capabilities, allowing for deeper analysis of web content by understanding the relationship between text and media elements. It leverages Gemini's true multimodal capabilities, providing insights that wouldn't be possible with separate text and media analyses.

## Multimodal Selection UX Improvements

**Date:** June 14, 2024

### Issue

The multimodal selection feature (combining text and media for a single explanation) lacked visual feedback and error recovery options. Users had no clear indication of which elements were selected, and errors during processing would reset the selection state, forcing users to start over.

### Root Cause

1. The original implementation didn't provide visual indicators when both text and media were selected.
2. Error handling was destructive, immediately resetting the selection state upon any error.
3. The UI didn't offer alternative actions when errors occurred.

### Solution

1. **Visual Selection Indicators**:
   - Added a `highlightSelectedElements` function that applies a temporary visual highlight to selected media elements.
   - Created a floating indicator label that appears near selected elements to confirm the selection.
   - Applied transition effects for smooth appearance and disappearance of indicators.

2. **Improved Error Recovery**:
   - Modified error handling to preserve selection state when errors occur.
   - Added a structured error display with multiple action options.
   - Implemented retry functionality that allows users to attempt the request again without reselecting content.

3. **Alternative Actions**:
   - Added buttons to process just the text or just the media when combined processing fails.
   - Improved error messages to provide more context about what went wrong.
   - Enhanced the tooltip UI with a preview of both selected content types.

4. **Keyboard Shortcut Support**:
   - Added support for triggering multimodal requests via keyboard shortcuts.
   - Implemented the same visual feedback for keyboard-triggered selections.

### Key Learnings

1. **State Preservation**: Preserving user selection state during errors is crucial for a good UX, allowing users to retry without starting over.

2. **Visual Feedback**: Temporary visual indicators help users understand what's selected without permanently altering the page.

3. **Graceful Degradation**: Offering alternative actions (like processing just text or just media) provides users with fallback options when the primary action fails.

4. **Contextual Error Handling**: Different error scenarios require different recovery options - a one-size-fits-all approach to errors leads to poor UX.

5. **Transient UI Elements**: Elements like highlights and notifications should be non-intrusive and automatically clean up after themselves.

The improved multimodal selection experience now provides clear visual feedback, preserves user selections during errors, and offers multiple recovery paths when things go wrong, significantly enhancing the usability of this complex feature.

## Audio File Processing Fix for Gemini API Integration (June 14, 2024)

**Issue:** After implementing support for images and videos, we encountered an error when trying to explain audio files: `Invalid or unsupported file uri: https://www.w3schools.com/html/horse.ogg`. This is identical to the issue we faced with video files, where the Gemini API requires media to be uploaded through their File API instead of being passed as direct URLs.

**Root Cause:** The Gemini API handles different media types with different requirements:
1. Images can be sent directly as base64-encoded data using the `inline_data` property
2. Videos must be uploaded through the Gemini File API and referenced via `file_uri`
3. Audio files also require the File API approach, similar to videos

Our implementation was correctly handling images and videos after recent fixes, but audio files were still being attempted with direct URLs instead of being properly uploaded.

**Solution:**
1. Created a new `uploadAudioToGeminiAPI` function modeled after our video upload function that:
   - Fetches the audio data from the URL
   - Uploads it to the Gemini File API using their resumable upload protocol
   - Monitors processing status until completion
   - Returns the proper `file_uri` format required by the API
   
2. Updated the `handleMediaExplainRequest` function to detect audio files and process them through the new upload function
   
3. Added a special case in the content parts creation to properly use the `file_uri` for audio files

4. Enhanced error handling with audio-specific error messages

**Key Learnings:**
1. The Gemini API has consistent patterns for handling non-image media (video, audio) using the File API, but these aren't clearly documented together
   
2. Different media types require different approaches in multimodal API integration:
   - Images: Use `inline_data` with base64 encoding
   - Videos/Audio: Use `file_uri` from the File API
   - Text: Use standard text properties
   
3. The File API upload process is the same for both audio and video:
   - Start an upload session
   - Upload the file data
   - Wait for processing to complete
   - Use the returned URI in the proper format

4. When handling different media types, it's important to implement specific error messages for each type to help users troubleshoot issues

This fix completes our support for all common media types in the AI Dictionary+ extension, ensuring that users can get explanations for text, images, videos, and audio files with consistent behavior and error handling.

## June 15, 2024 - Enhancing File Status Checking for Audio and Video

### Issue
Even after standardizing the audio and video upload functions, users were still encountering errors with audio file processing: "The status of the uploaded audio couldn't be verified. The file may have been deleted or may not be accessible."

### Root Cause
The issue was in the file status checking phase after successful upload. The Gemini API's File API can return file references in different formats:
1. Sometimes as `files/file-id` (with the "files/" prefix)
2. Sometimes as just the file ID without the prefix

Our URL construction for status checking was assuming a consistent format, but the API's responses could vary.

### Solution
We enhanced the file status checking logic in both audio and video upload functions:

1. **Smart URL Construction**: 
   - Added logic to check if the file name starts with "files/" and construct the URL accordingly
   - Implemented two different URL formats based on the returned file name structure

2. **Adaptive Retry Logic**:
   - Added a retry mechanism that tries both URL formats if the first attempt fails
   - Implemented a more robust error handling system with multiple attempts

3. **Better Error Recovery**:
   - Added try/catch blocks around the status check to handle network errors
   - Implemented a maximum number of retry attempts to prevent infinite loops
   - Added detailed logging to help diagnose issues in production

4. **Clearer Error Messages**:
   - Added timeout detection for files stuck in processing
   - Enhanced error messages with more specific information about what went wrong

### Key Learnings
1. API responses may not be consistent in format, even within the same API
2. Status checking endpoints should be flexible enough to handle variations in resource identifiers
3. Retry mechanisms are essential when working with asynchronous processes like file processing
4. Having a maximum retry count prevents infinite loops while still allowing for reasonable recovery
5. Detailed logging of API responses helps identify patterns in how the API behaves in different scenarios

This enhancement makes our media upload functions more resilient to variations in the API's response format and provides better recovery mechanisms when status checking fails.