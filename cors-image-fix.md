# Cross-Origin Image Processing Fix

## The Problem

When trying to explain images from certain websites, users encountered this error:

```
Error: Gemini API Error (400): { "error": { "code": 400, "message": "Invalid value at 'contents[1].parts[1].inline_data.data' (TYPE_BYTES), Base64 decoding failed for [URL]", "status": "INVALID_ARGUMENT", ... } }
```

This happened because:

1. The Gemini API requires images to be provided as base64-encoded data, not URLs
2. The content script was trying to convert images to base64 using a canvas element
3. This failed due to CORS (Cross-Origin Resource Sharing) restrictions for images from domains that don't allow cross-origin access
4. When the conversion failed, the content script fell back to sending the URL directly, which the API couldn't process

## The Solution

We implemented a two-part solution:

### 1. Stop Trying to Convert Images in the Content Script

Modified `getMediaData` in `src/content/index.ts`:

```typescript
// Get media data as base64 or URL
async function getMediaData(
  mediaType: MediaType,
  mediaUrl: string
): Promise<string> {
  // Simply return the URL for all media types including images
  // The background script will handle conversion to base64 when needed
  return mediaUrl;
}
```

### 2. Add Base64 Conversion in the Background Script

Added new code in `handleMediaExplainRequest` in `src/background/index.ts`:

```typescript
// For image URLs that aren't already base64, convert them
if (
  request.mediaType === MediaType.IMAGE &&
  !request.mediaData.startsWith("data:") &&
  request.mediaData.startsWith("http")
) {
  try {
    console.log("Converting image URL to base64:", request.mediaData);
    request.mediaData = await fetchImageAsBase64(request.mediaData);
    console.log("Successfully converted image to base64");
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return {
      explanation: "Failed to process the image. The image might be from a domain that doesn't allow cross-origin access.",
      error: error instanceof Error ? error.message : String(error),
      conversationHistory: [],
      originalText: `${request.mediaType} content`,
    };
  }
}
```

Created a new helper function to fetch and convert images:

```typescript
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    // Fetch the image data
    const response = await fetch(imageUrl, {
      // Add options to handle CORS
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image data as blob
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}
```

### 3. Improved Error Messages

Enhanced error handling in `src/content/index.ts` to provide more useful information to users:

```typescript
// Show error message with helpful information
const errorMessage = error instanceof Error ? error.message : String(error);
let userFriendlyMessage = "An error occurred while processing the media.";

// Add more specific error details based on media type
if (mediaType === MediaType.IMAGE) {
  userFriendlyMessage = "Failed to analyze the image. This may be due to:";
  userFriendlyMessage += "\n\n• The image is protected by the website";
  userFriendlyMessage += "\n• The image is too large";
  userFriendlyMessage += "\n• There are network connectivity issues";
  userFriendlyMessage += "\n\nPlease try downloading the image and using a local file instead.";
}
```

## Key Learnings

- Background scripts in browser extensions have fewer CORS restrictions than content scripts and can make cross-origin requests more freely
- Always provide fallback mechanisms and clear error messages when handling web content that might be restricted
- When integrating with APIs that have specific format requirements (like base64 for images), handle the conversion at the appropriate level of your application
- Consider user guidance in error messages, especially for issues that have workarounds (like downloading images locally) 