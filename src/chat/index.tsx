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
import {
    ThreadPrimitive,
} from '@assistant-ui/react';
import { ChatProvider } from '../components/chat/chat-provider';
import { marked } from 'marked';
import '../globals.css';

// Initialize marked options for security
marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
});

// Function to safely parse markdown
const renderMarkdown = (content: string): string => {
    try {
        return marked.parse(content);
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return content;
    }
};

interface ChatState {
    messages: ConversationMessage[];
    originalText: string;
    error: string | null;
    loading: boolean;
}

const ChatPage: React.FC = () => {
    const [chatState, setChatState] = useState<ChatState>({
        messages: [],
        originalText: '',
        error: null,
        loading: false,
    });

    // Load conversation on mount
    useEffect(() => {
        loadConversation();
        applyTheme();
    }, []);

    // Apply theme based on settings
    const applyTheme = async () => {
        const settings = await getSettings();
        const theme = getTheme(settings);

        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
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

    // Handle sending a new message
    const handleSendMessage = async (message: string) => {
        if (!message.trim()) return;

        // Create a user message
        const userMessage: ConversationMessage = {
            role: 'user',
            content: message
        };

        // Add user message to the chat state
        setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            loading: true,
            error: null
        }));

        // Create the request for our background script
        const request: FollowUpRequest = {
            originalText: chatState.originalText,
            question: message,
            conversationHistory: chatState.messages
        };

        console.log("Sending follow-up request:", request);

        // Send message to background script
        chrome.runtime.sendMessage(
            {
                type: MessageType.FOLLOW_UP_QUESTION,
                payload: request,
            },
            (response: ExplanationResult) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    setChatState(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Error communicating with the extension.'
                    }));
                    return;
                }

                if (response.error) {
                    console.error('Response error:', response.error);
                    setChatState(prev => ({
                        ...prev,
                        loading: false,
                        error: response.error || 'Unknown error'
                    }));
                    return;
                }

                // Add assistant response to the chat
                const assistantMessage: ConversationMessage = {
                    role: 'assistant',
                    content: response.explanation
                };

                setChatState(prev => ({
                    ...prev,
                    messages: [...prev.messages, assistantMessage],
                    loading: false
                }));
            }
        );
    };

    // Open options page
    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    // Format the messages for display
    const formattedMessages = chatState.messages.map(message => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
        role: message.role,
        content: typeof message.content === 'string'
            ? message.content
            : Array.isArray(message.content)
                ? message.content.map(part => part.type === 'text' ? part.text || '' : '[Media Content]').join(' ')
                : JSON.stringify(message.content),
    }));

    const welcomeMessage = chatState.originalText
        ? `Ask me anything about ${chatState.originalText}`
        : "How can I help you today?";

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-semibold">AI Dictionary+ Chat</h1>
                <button
                    onClick={openOptions}
                    className="text-primary hover:underline"
                >
                    Settings
                </button>
            </div>

            <div className="flex-1">
                <ChatThread
                    welcomeMessage={welcomeMessage}
                    messages={formattedMessages}
                    showWelcome={chatState.messages.length === 0}
                    onSendMessage={handleSendMessage}
                    loading={chatState.loading}
                />

                {chatState.error && (
                    <div className="p-4 mx-4 mb-4 bg-destructive/10 text-destructive rounded-md">
                        {chatState.error}
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom chat thread component with simplified messaging
interface ChatThreadProps {
    welcomeMessage: string;
    messages: Array<{
        id: string;
        role: string;
        content: string;
    }>;
    showWelcome: boolean;
    onSendMessage: (message: string) => void;
    loading: boolean;
}

const ChatThread: React.FC<ChatThreadProps> = ({
    welcomeMessage,
    messages,
    showWelcome,
    onSendMessage,
    loading
}) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && !loading) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 pt-8">
                {showWelcome && (
                    <div className="flex w-full max-w-4xl flex-grow flex-col">
                        <div className="flex w-full flex-grow flex-col items-center justify-center">
                            <p className="mt-4 font-medium">{welcomeMessage}</p>
                        </div>
                    </div>
                )}

                {/* Render messages */}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className="w-full max-w-4xl py-4"
                    >
                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={
                                    message.role === 'user'
                                        ? "bg-primary text-primary-foreground max-w-[80%] break-words rounded-xl px-5 py-2.5"
                                        : "bg-muted text-foreground max-w-[80%] break-words rounded-xl px-5 py-2.5 markdown-content"
                                }
                            >
                                {message.role === 'user' ? (
                                    message.content
                                ) : (
                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="w-full max-w-4xl py-4">
                        <div className="flex justify-start">
                            <div className="bg-muted text-foreground max-w-[80%] break-words rounded-xl px-5 py-2.5">
                                <div className="flex items-center space-x-2">
                                    <div className="h-3 w-3 animate-bounce rounded-full bg-primary"></div>
                                    <div className="h-3 w-3 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="h-3 w-3 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invisible div for scrolling to bottom */}
                <div ref={messagesEndRef} />
            </div>

            {/* Message input form */}
            <div className="sticky bottom-0 mt-3 px-4 pb-4">
                <form
                    className="flex w-full max-w-4xl mx-auto flex-wrap items-end rounded-lg border bg-background px-3 shadow-sm transition-colors ease-in"
                    onSubmit={handleSubmit}
                >
                    <input
                        autoFocus
                        placeholder="Type your message..."
                        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        disabled={loading}
                    />

                    {loading ? (
                        <div className="my-2.5 flex items-center justify-center px-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="my-2.5 p-2 rounded-md text-primary hover:text-primary/80 transition-colors"
                            disabled={inputValue.trim() === '' || loading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<ChatPage />);
    }
}); 