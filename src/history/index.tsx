import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HistoryLogEntry } from '../shared/types';
import { getAllHistoryEntries } from '../shared/db';
import { marked } from 'marked';
import '../globals.css';

const HistoryPage: React.FC = () => {
    const [entries, setEntries] = useState<HistoryLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const historyEntries = await getAllHistoryEntries();
            // Sort by timestamp, newest first
            historyEntries.sort((a, b) => b.timestamp - a.timestamp);
            setEntries(historyEntries);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const filteredEntries = entries.filter(entry => {
        const searchLower = searchTerm.toLowerCase();
        return (
            entry.text.toLowerCase().includes(searchLower) ||
            entry.explanation.toLowerCase().includes(searchLower) ||
            entry.conversationHistory?.some(msg =>
                msg.content.toString().toLowerCase().includes(searchLower)
            )
        );
    });

    // Helper function to check if there are actual follow-up messages
    const hasFollowUpMessages = (entry: HistoryLogEntry) => {
        if (!entry.conversationHistory || entry.conversationHistory.length < 3) return false;
        // First two messages are always the initial explanation (user question + assistant response)
        // If there are more messages, they are follow-ups
        return true;
    };

    return (
        <div className="history-page">
            <header className="history-header">
                <h1>Explanation History</h1>
                <div className="history-search">
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="history-search-input"
                    />
                </div>
            </header>

            {loading && <div className="history-loading">Loading history...</div>}
            {error && <div className="history-error">Error: {error}</div>}

            <div className="history-entries">
                {filteredEntries.map((entry) => (
                    <div key={entry.id} className="history-entry">
                        <div className="history-entry-header">
                            <div className="history-entry-time">{formatDate(entry.timestamp)}</div>
                            {entry.pageUrl && (
                                <a href={entry.pageUrl} target="_blank" rel="noopener noreferrer" className="history-entry-url">
                                    Source Page
                                </a>
                            )}
                        </div>
                        <div className="history-entry-text">
                            <strong>Selected Text:</strong> {entry.text}
                        </div>
                        <div className="history-entry-explanation">
                            <div dangerouslySetInnerHTML={{ __html: marked(entry.explanation) }} />
                        </div>
                        {hasFollowUpMessages(entry) && (
                            <div className="history-entry-conversation">
                                <div className="history-entry-follow-ups">
                                    {entry.conversationHistory.slice(2).map((message, index) => (
                                        <div key={index} className={`history-message ${message.role}-message`}>
                                            <div className="message-content">
                                                {message.role === 'assistant' ? (
                                                    <div dangerouslySetInnerHTML={{ __html: marked(message.content.toString()) }} />
                                                ) : (
                                                    <div>{message.content.toString()}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="history-entry-actions">
                            <button onClick={() => window.open(chrome.runtime.getURL('chat.html'), '_blank')}>
                                Continue in Chat
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(entry.explanation)}>
                                Copy Explanation
                            </button>
                        </div>
                    </div>
                ))}
                {filteredEntries.length === 0 && !loading && (
                    <div className="history-empty">
                        {searchTerm ? 'No matching entries found.' : 'No history entries yet.'}
                    </div>
                )}
            </div>
        </div>
    );
};

// Initialize React
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<HistoryPage />);
} else {
    console.error('Failed to find app container element');
}

export default HistoryPage; 