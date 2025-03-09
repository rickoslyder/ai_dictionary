/// <reference types="chrome" />
import { MessageType } from '../shared/types';
import { getSettings, getTheme } from '../shared/utils';

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Apply theme
    const settings = await getSettings();
    applyTheme(settings);

    // Check API key
    checkApiKey(settings.apiKey);

    // Set up event listeners
    setupEventListeners();
});

// Apply theme based on settings
function applyTheme(settings: any) {
    const theme = getTheme(settings);

    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Check if API key is set
function checkApiKey(apiKey: string) {
    const statusElement = document.getElementById('apiKeyStatus');
    if (!statusElement) return;

    if (!apiKey) {
        statusElement.textContent = 'API Key is not set. Please set it in the options.';
        statusElement.classList.add('error');
    } else {
        statusElement.textContent = 'API Key is set ✓';
        statusElement.classList.remove('error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Options button
    const optionsBtn = document.getElementById('optionsBtn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        });
    }

    // Chat button
    const chatBtn = document.getElementById('chatBtn');
    if (chatBtn) {
        chatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const chatUrl = chrome.runtime.getURL('chat.html');
            chrome.tabs.create({ url: chatUrl });
        });
    }
} 