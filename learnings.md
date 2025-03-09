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