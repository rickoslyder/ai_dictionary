import React, { ReactNode, useState } from 'react';
import {
    AssistantRuntimeProvider,
    useLocalRuntime,
    type ChatModelAdapter,
    type ThreadMessage
} from '@assistant-ui/react';
import { MessageType, FollowUpRequest, ExplanationResult, ConversationMessage } from '../../shared/types';

interface ChatProviderProps {
    children: ReactNode;
    originalText: string;
    onError: (error: string) => void;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, originalText, onError }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // Create a model adapter that interfaces with our Chrome extension backend
    const modelAdapter: ChatModelAdapter = {
        async run(options) {
            const { messages } = options;
            setIsProcessing(true);

            try {
                // Get the last message (user input)
                const lastMessage = messages[messages.length - 1];

                if (lastMessage.role !== 'user') {
                    console.error("Expected a user message but got:", lastMessage.role);
                    setIsProcessing(false);
                    return { content: [] };
                }

                // Extract the text content from the message
                let userQuestion = '';
                if (typeof lastMessage.content === 'string') {
                    userQuestion = lastMessage.content;
                } else if (Array.isArray(lastMessage.content)) {
                    // Find the text content part
                    const textPart = lastMessage.content.find(part => part.type === 'text');
                    userQuestion = textPart ? textPart.text : '';
                }

                if (!userQuestion.trim()) {
                    console.error("No text content found in message:", lastMessage);
                    setIsProcessing(false);
                    return { content: [] };
                }

                // Convert previous thread messages to our conversation message format
                const conversationHistory: ConversationMessage[] = messages
                    .slice(0, -1)
                    .map(msg => {
                        let content = '';
                        if (typeof msg.content === 'string') {
                            content = msg.content;
                        } else if (Array.isArray(msg.content)) {
                            // Combine all text parts
                            content = msg.content
                                .filter(part => part.type === 'text')
                                .map(part => part.text)
                                .join('\n');
                        }
                        return {
                            role: msg.role,
                            content
                        };
                    });

                // Create the request for our background script
                const request: FollowUpRequest = {
                    originalText,
                    question: userQuestion,
                    conversationHistory
                };

                console.log("Sending follow-up request:", request);

                // Return a promise that resolves when the Chrome message response is received
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage(
                        {
                            type: MessageType.FOLLOW_UP_QUESTION,
                            payload: request,
                        },
                        (response: ExplanationResult) => {
                            setIsProcessing(false);

                            if (chrome.runtime.lastError) {
                                console.error('Error sending message:', chrome.runtime.lastError);
                                onError('Error communicating with the extension.');
                                resolve({
                                    content: [{ type: 'text', text: 'Error communicating with the extension. Please try again.' }]
                                });
                                return;
                            }

                            if (response.error) {
                                console.error('Response error:', response.error);
                                onError(response.error || 'Unknown error');
                                resolve({
                                    content: [{ type: 'text', text: response.error || 'Unknown error' }]
                                });
                                return;
                            }

                            // Return the response in the format expected by assistant-ui
                            resolve({
                                content: [
                                    {
                                        type: 'text',
                                        text: response.explanation,
                                    }
                                ]
                            });
                        }
                    );
                });
            } catch (error) {
                setIsProcessing(false);
                console.error('Error in chat model adapter:', error);
                onError('An unexpected error occurred while processing your message.');
                return {
                    content: [{
                        type: 'text',
                        text: 'An unexpected error occurred while processing your message. Please try again.'
                    }]
                };
            }
        }
    };

    // Create the runtime using our adapter
    const runtime = useLocalRuntime(modelAdapter);

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}; 