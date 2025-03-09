# AI Dictionary+

A browser extension that provides context-aware, AI-generated explanations of highlighted text.

## Features

- Quick pop-up summaries for single terms or phrases
- Interactive prompt for refining explanations
- "Continue in Chat" option for deeper conversations
- Context-aware explanations using Gemini 2.0 Flash LLM

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder from this project

## Development Workflow

- For active development with auto-reloading:
  ```
  npm start
  ```
- To create a production build:
  ```
  npm run build
  ```

## Configuration

Before using the extension, you need to:

1. Get a Gemini API key from Google AI Studio
2. Enter the API key in the extension options page

## Project Structure

- `src/content/` - Content scripts injected into web pages
- `src/background/` - Background service worker
- `src/popup/` - Extension popup UI
- `src/options/` - Settings page
- `src/chat/` - Full chat interface
- `src/shared/` - Shared utilities and types

## Technologies Used

- TypeScript
- React
- Chrome Extensions API (Manifest V3)
- Gemini 2.0 Flash API 