import React, { useRef, useEffect } from 'react';
import { cn } from '../../shared/utils/cn';
import { SendHorizontalIcon } from 'lucide-react';
import { marked } from 'marked';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface CustomThreadProps {
    messages: Message[];
    isLoading: boolean;
    initialMessage?: string;
    onSubmit: (message: string) => Promise<void>;
    className?: string;
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

export const CustomThread: React.FC<CustomThreadProps> = ({
    messages,
    isLoading,
    initialMessage = "How can I help you today?",
    onSubmit,
    className,
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputRef.current && inputRef.current.value.trim() && !isLoading) {
            onSubmit(inputRef.current.value.trim());
            inputRef.current.value = '';
        }
    };

    // Handle key press (Enter to send)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault();
            if (inputRef.current && inputRef.current.value.trim()) {
                onSubmit(inputRef.current.value.trim());
                inputRef.current.value = '';
            }
        }
    };

    // Auto-resize textarea
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-center">{initialMessage}</p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex",
                                    message.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-lg p-3",
                                        message.role === 'user'
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground"
                                    )}
                                >
                                    <div
                                        className="prose prose-sm dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                    />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted text-foreground max-w-[80%] rounded-lg p-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-3 w-3 animate-bounce rounded-full bg-primary"></div>
                                        <div className="h-3 w-3 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="h-3 w-3 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex items-end space-x-2">
                    <textarea
                        ref={inputRef}
                        className="flex-1 min-h-[40px] max-h-[120px] p-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Type your message..."
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        type="submit"
                        className={cn(
                            "p-2 rounded-md",
                            isLoading
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        disabled={isLoading}
                    >
                        <SendHorizontalIcon className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}; 