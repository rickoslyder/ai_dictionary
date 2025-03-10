import React from 'react';
import {
    ThreadPrimitive,
    ComposerPrimitive,
    MessagePrimitive,
    useLocalRuntime,
    AssistantRuntimeProvider,
    type ChatModelAdapter
} from '@assistant-ui/react';
import { cn } from '../../shared/utils/cn';
import { SendHorizontalIcon } from 'lucide-react';
import { TooltipIconButton } from './tooltip-icon-button';
import { MarkdownText } from './markdown-text';

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
    messagesClassName?: string;
    messagingClassName?: string;
}

export const CustomThread: React.FC<CustomThreadProps> = ({
    messages,
    isLoading,
    initialMessage = "How can I help you today?",
    onSubmit,
    className,
    messagesClassName,
    messagingClassName
}) => {
    // Create a custom model adapter that uses our onSubmit function
    const modelAdapter: ChatModelAdapter = React.useMemo(() => ({
        async run(options) {
            const adapterMessages = options.messages;
            const lastMessage = adapterMessages[adapterMessages.length - 1];
            if (lastMessage.role === 'user') {
                // Get the text content from the first content part if it exists
                const textContent = lastMessage.content?.find(part => part.type === 'text');
                const content = textContent && 'text' in textContent ? textContent.text : '';

                await onSubmit(content);
            }
            return { content: [] };
        }
    }), [onSubmit]);

    // Create a local runtime with our custom adapter
    const runtime = useLocalRuntime(modelAdapter);

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root
                className={cn("bg-background box-border flex h-full flex-col overflow-hidden", className)}
                style={{
                    ["--thread-max-width" as string]: "100%",
                }}
            >
                <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8">
                    <ThreadPrimitive.Empty>
                        <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
                            <div className="flex w-full flex-grow flex-col items-center justify-center">
                                <p className="mt-4 font-medium">
                                    {initialMessage}
                                </p>
                            </div>
                        </div>
                    </ThreadPrimitive.Empty>

                    {messages.map((message) => (
                        <MessagePrimitive.Root
                            key={message.id}
                            className={cn(
                                "w-full max-w-[var(--thread-max-width)] py-4",
                                message.role === 'user'
                                    ? "grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2"
                                    : "grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative"
                            )}
                        >
                            <div
                                className={cn(
                                    "break-words",
                                    message.role === 'user'
                                        ? "bg-muted text-foreground max-w-[calc(var(--thread-max-width)*0.8)] rounded-3xl px-5 py-2.5 col-start-2 row-start-2"
                                        : "text-foreground max-w-[calc(var(--thread-max-width)*0.8)] leading-7 col-span-2 col-start-2 row-start-1 my-1.5"
                                )}
                            >
                                {message.content}
                            </div>
                        </MessagePrimitive.Root>
                    ))}

                    {isLoading && (
                        <div className="w-full max-w-[var(--thread-max-width)] py-4 grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative">
                            <div className="text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5 flex items-center">
                                <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                                <span>AI is thinking...</span>
                            </div>
                        </div>
                    )}

                    <div className={cn("sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-4", messagingClassName)}>
                        <ComposerPrimitive.Root className="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in">
                            <ComposerPrimitive.Input
                                rows={1}
                                autoFocus
                                placeholder="Write a message..."
                                className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                                        e.preventDefault();
                                        const target = e.target as HTMLTextAreaElement;
                                        if (target.value.trim()) {
                                            onSubmit(target.value.trim());
                                            target.value = '';
                                        }
                                    }
                                }}
                            />
                            <div className="my-2.5 flex items-center justify-center px-2">
                                {isLoading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                                ) : (
                                    <button
                                        className="text-primary hover:text-primary/80 transition-colors"
                                        onClick={() => {
                                            const input = document.querySelector('textarea') as HTMLTextAreaElement;
                                            if (input && input.value.trim() && !isLoading) {
                                                onSubmit(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                    >
                                        <SendHorizontalIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </ComposerPrimitive.Root>
                    </div>
                </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
    );
}; 