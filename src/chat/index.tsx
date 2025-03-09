/// <reference types="chrome" />
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
    ConversationMessage,
    MessageType,
    FollowUpRequest,
    ExplanationResult
} from '../shared/types';
import { getSettings, getTheme } from '../shared/utils';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
    breaks: true,
    gfm: true,
});

interface ChatState {
    messages: ConversationMessage[];
    originalText: string;
    inputText: string;
    isLoading: boolean;
    error: string | null;
}

// Function to safely parse markdown
const renderMarkdown = (content: string): string => {
    try {
        return marked.parse(content);
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return content;
    }
};

const ChatPage: React.FC = () => {
    const [chatState, setChatState] = useState<ChatState>({
        messages: [],
        originalText: '',
        inputText: '',
        isLoading: false,
        error: null,
    });

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Load conversation on mount
    useEffect(() => {
        loadConversation();
        applyTheme();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [chatState.messages]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = document.getElementById('inputField') as HTMLTextAreaElement;
        if (textarea) {
            const resizeTextarea = () => {
                // Reset height temporarily to get the correct scrollHeight
                textarea.style.height = 'auto';
                // Set to scrollHeight
                const maxHeight = 120;
                textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
            };

            textarea.addEventListener('input', resizeTextarea);
            return () => textarea.removeEventListener('input', resizeTextarea);
        }
    }, []);

    // Apply theme based on settings
    const applyTheme = async () => {
        const settings = await getSettings();
        const theme = getTheme(settings);

        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    };

    // Load conversation from URL parameters
    const loadConversation = () => {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        const chatData = params.get('data');

        if (chatData) {
            try {
                const { originalText, conversationHistory } = JSON.parse(
                    decodeURIComponent(chatData)
                );

                if (originalText && conversationHistory && Array.isArray(conversationHistory)) {
                    setChatState((prev) => ({
                        ...prev,
                        originalText,
                        messages: conversationHistory,
                    }));
                }
            } catch (error) {
                console.error('Error parsing chat data:', error);
            }
        }
    };

    // Scroll chat to bottom
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    // Handle sending a message
    const handleSendMessage = async () => {
        if (!chatState.inputText.trim() || chatState.isLoading) return;

        const newMessage: ConversationMessage = {
            role: 'user',
            content: chatState.inputText.trim(),
        };

        // Add user message to chat
        setChatState((prev) => ({
            ...prev,
            messages: [...prev.messages, newMessage],
            inputText: '',
            isLoading: true,
            error: null,
        }));

        try {
            // Send to background script for processing
            const request: FollowUpRequest = {
                originalText: chatState.originalText,
                question: newMessage.content,
                conversationHistory: chatState.messages,
            };

            chrome.runtime.sendMessage(
                {
                    type: MessageType.FOLLOW_UP_QUESTION,
                    payload: request,
                },
                (response: ExplanationResult) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError);
                        setChatState((prev) => ({
                            ...prev,
                            isLoading: false,
                            error: 'Error communicating with the extension.',
                        }));
                        return;
                    }

                    if (response.error) {
                        setChatState((prev) => ({
                            ...prev,
                            isLoading: false,
                            error: response.error || 'Unknown error',
                        }));
                        return;
                    }

                    // Add assistant response to chat
                    const assistantMessage: ConversationMessage = {
                        role: 'assistant',
                        content: response.explanation,
                    };

                    setChatState((prev) => ({
                        ...prev,
                        messages: [...prev.messages, assistantMessage],
                        isLoading: false,
                    }));
                }
            );
        } catch (error) {
            setChatState((prev) => ({
                ...prev,
                isLoading: false,
                error: `Error: ${error instanceof Error ? error.message : String(error)}`,
            }));
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatState((prev) => ({
            ...prev,
            inputText: e.target.value,
        }));
    };

    // Handle key press (Enter to send)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Format timestamp
    const formatTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
    };

    // Open options page
    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    return (
        <div className="container">
            <div className="header">
                <div className="logo">AI Dictionary+ Chat</div>
                <button className="settings-button" onClick={openOptions}>
                    Settings
                </button>
            </div>

            <div className="chat-container" ref={chatContainerRef}>
                {chatState.messages.length === 0 ? (
                    <div className="empty-state">Start your conversation...</div>
                ) : (
                    chatState.messages.map((message, index) => (
                        <div
                            key={index}
                            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'
                                }`}
                        >
                            <div
                                className="message-content"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                            />
                            <div className="message-time">{formatTime()}</div>
                        </div>
                    ))
                )}

                {chatState.isLoading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <span>AI is thinking...</span>
                    </div>
                )}

                {chatState.error && <div className="error">{chatState.error}</div>}
            </div>

            <div className="input-container">
                <textarea
                    id="inputField"
                    className="input-field"
                    placeholder="Type your message here..."
                    value={chatState.inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={chatState.isLoading}
                ></textarea>
                <button
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={!chatState.inputText.trim() || chatState.isLoading}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

// Render the React component
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ChatPage />
    </React.StrictMode>
); 