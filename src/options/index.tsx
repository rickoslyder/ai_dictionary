/// <reference types="chrome" />
import React, { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import ReactDOM from 'react-dom/client';
import { Settings, MessageType, DEFAULT_SETTINGS } from '../shared/types';
import { getSettings, saveSettings, getTheme } from '../shared/utils';

const OptionsPage: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [recordingShortcut, setRecordingShortcut] = useState(false);
    const shortcutInputRef = useRef<HTMLInputElement>(null);

    // Load settings when component mounts
    useEffect(() => {
        loadSettings();
    }, []);

    // Apply theme based on settings
    useEffect(() => {
        const theme = getTheme(settings);
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [settings.theme]);

    // Load settings from storage
    const loadSettings = async () => {
        const loadedSettings = await getSettings();
        setSettings(loadedSettings);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await saveSettings(settings);
            setStatus({
                message: 'Options saved successfully!',
                type: 'success',
            });

            // Clear status after 3 seconds
            setTimeout(() => {
                setStatus(null);
            }, 3000);
        } catch (error) {
            setStatus({
                message: `Error saving options: ${error instanceof Error ? error.message : String(error)}`,
                type: 'error',
            });
        }
    };

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setSettings((prev) => ({
                ...prev,
                [name]: checked,
            }));
        } else if (type === 'number') {
            setSettings((prev) => ({
                ...prev,
                [name]: parseInt(value, 10),
            }));
        } else {
            setSettings((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    // Start recording keyboard shortcut
    const startRecordingShortcut = () => {
        setRecordingShortcut(true);
        if (shortcutInputRef.current) {
            shortcutInputRef.current.focus();
        }
    };

    // Handle keyboard shortcut recording
    const handleShortcutKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (!recordingShortcut) return;

        // Ignore certain keys
        if (['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key)) {
            return;
        }

        e.preventDefault();

        const newShortcut = {
            key: e.key.toUpperCase(),
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
        };

        setSettings(prev => ({
            ...prev,
            keyboardShortcut: newShortcut,
        }));

        setRecordingShortcut(false);
    };

    // Format shortcut for display
    const formatShortcut = () => {
        const { keyboardShortcut } = settings;

        // Return a default string if keyboardShortcut is undefined
        if (!keyboardShortcut) {
            return 'No shortcut set';
        }

        // Make sure key exists, fall back to default if not
        const key = keyboardShortcut.key || DEFAULT_SETTINGS.keyboardShortcut.key;

        const parts = [];

        if (keyboardShortcut.metaKey) parts.push('⌘');
        if (keyboardShortcut.ctrlKey) parts.push('Ctrl');
        if (keyboardShortcut.altKey) parts.push('Alt');
        if (keyboardShortcut.shiftKey) parts.push('⇧');
        parts.push(key);

        return parts.join(' + ');
    };

    return (
        <div className="container">
            <h1>AI Dictionary+ Options</h1>
            <form id="optionsForm" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="apiKey">Gemini API Key</label>
                    <input
                        type="text"
                        id="apiKey"
                        name="apiKey"
                        value={settings.apiKey}
                        onChange={handleInputChange}
                        placeholder="Enter your API key"
                    />
                    <div className="description">
                        You can get your API key from{' '}
                        <a href="https://ai.google.dev/" target="_blank" rel="noreferrer">
                            Google AI Studio
                        </a>
                        .
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="perplexityApiKey">Perplexity API Key (for Web Search)</label>
                    <input
                        type="text"
                        id="perplexityApiKey"
                        name="perplexityApiKey"
                        value={settings.perplexityApiKey}
                        onChange={handleInputChange}
                        placeholder="Enter your Perplexity API key"
                    />
                    <div className="description">
                        Get your Perplexity API key from{' '}
                        <a href="https://docs.perplexity.ai/docs/getting-started" target="_blank" rel="noreferrer">
                            Perplexity AI
                        </a>
                        .
                    </div>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                id="webSearchEnabled"
                                name="webSearchEnabled"
                                checked={settings.webSearchEnabled}
                                onChange={handleInputChange}
                            />
                            Enable web search for enhanced explanations
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="theme">Theme</label>
                    <select
                        id="theme"
                        name="theme"
                        value={settings.theme}
                        onChange={handleInputChange}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (match system)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="maxTokens">Max Tokens</label>
                    <input
                        type="number"
                        id="maxTokens"
                        name="maxTokens"
                        value={settings.maxTokens}
                        onChange={handleInputChange}
                        min="100"
                        max="2000"
                        step="100"
                    />
                    <div className="description">
                        Maximum number of tokens for AI responses (100-2000).
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="cacheExpiry">Cache Expiry (hours)</label>
                    <input
                        type="number"
                        id="cacheExpiry"
                        name="cacheExpiry"
                        value={settings.cacheExpiry}
                        onChange={handleInputChange}
                        min="1"
                        max="168"
                        step="1"
                    />
                    <div className="description">
                        How long to cache responses (1-168 hours).
                    </div>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                id="cacheEnabled"
                                name="cacheEnabled"
                                checked={settings.cacheEnabled}
                                onChange={handleInputChange}
                            />
                            Enable caching of responses
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="keyboardShortcut">Keyboard Shortcut</label>
                    <div className="shortcut-container">
                        <input
                            type="text"
                            id="keyboardShortcut"
                            ref={shortcutInputRef}
                            value={formatShortcut()}
                            onKeyDown={handleShortcutKeyDown}
                            readOnly
                        />
                        <button
                            type="button"
                            className="shortcut-button"
                            onClick={startRecordingShortcut}
                        >
                            {recordingShortcut ? 'Press keys...' : 'Record Shortcut'}
                        </button>
                    </div>
                    <div className="description">
                        Keyboard shortcut to activate AI Dictionary+ on text selection. Default is ⌘ + ⇧ + E.
                    </div>
                </div>

                <button type="submit">Save Options</button>

                {status && (
                    <div className={`status ${status.type}`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
};

// Render the React component
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <OptionsPage />
    </React.StrictMode>
); 