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
        <div className="options-container">
            <h1>AI Dictionary+ Settings</h1>

            <form onSubmit={handleSubmit}>
                <div className="settings-group">
                    <h2>API Configuration</h2>
                    <div className="input-group">
                        <label htmlFor="apiKey">Gemini API Key:</label>
                        <input
                            type="password"
                            id="apiKey"
                            name="apiKey"
                            value={settings.apiKey}
                            onChange={handleInputChange}
                            placeholder="Enter your Gemini API key"
                        />
                        <p className="help-text">
                            Get your API key from{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    <div className="input-group">
                        <label htmlFor="perplexityApiKey">Perplexity API Key (for web search):</label>
                        <input
                            type="password"
                            id="perplexityApiKey"
                            name="perplexityApiKey"
                            value={settings.perplexityApiKey}
                            onChange={handleInputChange}
                            placeholder="Enter your Perplexity API key (optional)"
                        />
                        <p className="help-text">
                            Get your API key from{' '}
                            <a
                                href="https://docs.perplexity.ai/docs/getting-started"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Perplexity AI
                            </a>
                        </p>
                    </div>
                </div>

                <div className="settings-group">
                    <h2>Appearance</h2>
                    <div className="input-group">
                        <label htmlFor="theme">Theme:</label>
                        <select
                            id="theme"
                            name="theme"
                            value={settings.theme}
                            onChange={handleInputChange}
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (follow system)</option>
                        </select>
                    </div>
                </div>

                <div className="settings-group">
                    <h2>Features</h2>

                    <div className="input-group checkbox-group">
                        <label htmlFor="webSearchEnabled">
                            <input
                                type="checkbox"
                                id="webSearchEnabled"
                                name="webSearchEnabled"
                                checked={settings.webSearchEnabled}
                                onChange={handleInputChange}
                            />
                            Enable web search
                        </label>
                        <p className="help-text">
                            Allow AI Dictionary+ to search the web for up-to-date information
                            (requires Perplexity API key)
                        </p>
                    </div>

                    <div className="multimedia-feature">
                        <div className="input-group checkbox-group">
                            <label htmlFor="multimodalEnabled">
                                <input
                                    type="checkbox"
                                    id="multimodalEnabled"
                                    name="multimodalEnabled"
                                    checked={settings.multimodalEnabled}
                                    onChange={handleInputChange}
                                />
                                Enable multimedia content analysis
                                <span className="multimedia-badge">NEW</span>
                            </label>
                            <p className="help-text">
                                Allow AI Dictionary+ to analyze images, videos, audio, and documents using Gemini's multimodal capabilities.
                                Right-click on media elements to access these features.
                            </p>
                        </div>
                    </div>

                    <div className="input-group checkbox-group">
                        <label htmlFor="cacheEnabled">
                            <input
                                type="checkbox"
                                id="cacheEnabled"
                                name="cacheEnabled"
                                checked={settings.cacheEnabled}
                                onChange={handleInputChange}
                            />
                            Enable response caching
                        </label>
                        <p className="help-text">
                            Cache responses to reduce API calls for repeated queries
                        </p>
                    </div>

                    <div className="input-group">
                        <label htmlFor="cacheExpiry">Cache expiry (hours):</label>
                        <input
                            type="number"
                            id="cacheExpiry"
                            name="cacheExpiry"
                            min="1"
                            max="168"
                            value={settings.cacheExpiry}
                            onChange={handleInputChange}
                            disabled={!settings.cacheEnabled}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="maxTokens">Maximum response tokens:</label>
                        <input
                            type="number"
                            id="maxTokens"
                            name="maxTokens"
                            min="100"
                            max="4000"
                            value={settings.maxTokens}
                            onChange={handleInputChange}
                        />
                        <p className="help-text">
                            Limit the length of AI responses (100-4000). Higher values provide more detailed responses but use more API tokens.
                        </p>
                    </div>
                </div>

                <div className="settings-group">
                    <h2>Keyboard Shortcut</h2>
                    <div className="input-group">
                        <label htmlFor="keyboardShortcut">Shortcut key combination:</label>
                        <div className="shortcut-container">
                            <input
                                type="text"
                                id="keyboardShortcut"
                                ref={shortcutInputRef}
                                value={formatShortcut()}
                                onKeyDown={handleShortcutKeyDown}
                                readOnly
                                placeholder="Click to record shortcut"
                                onClick={startRecordingShortcut}
                            />
                            <button
                                type="button"
                                className="record-button"
                                onClick={startRecordingShortcut}
                            >
                                {recordingShortcut ? 'Recording...' : 'Record'}
                            </button>
                        </div>
                        <p className="help-text">
                            {recordingShortcut
                                ? 'Press the key combination you want to use'
                                : 'Click to set a keyboard shortcut for quick explanations'}
                        </p>
                    </div>
                </div>

                <div className="button-group">
                    <button type="submit" className="save-button">
                        Save Settings
                    </button>
                </div>

                {status && (
                    <div className={`status-message ${status.type}`}>
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