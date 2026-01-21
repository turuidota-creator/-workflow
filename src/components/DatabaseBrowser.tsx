import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, ChevronRight, FileJson, Book, X, ExternalLink, Trash2, Folder } from 'lucide-react';

interface Collection {
    name: string;
    type: string;
}

interface RecordItem {
    id: string;
    [key: string]: any;
}

export const DatabaseBrowser: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [activeCollection, setActiveCollection] = useState<string>('articles');
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [error, setError] = useState('');
    const [source, setSource] = useState<'local' | 'pocketbase' | 'unknown'>('local');

    // Load collections on mount
    useEffect(() => {
        loadCollections();
    }, []);

    // Load records when active collection changes
    useEffect(() => {
        if (activeCollection) {
            loadRecords(activeCollection);
        }
    }, [activeCollection]);

    const loadCollections = async () => {
        try {
            const res = await fetch('/api/database/collections');
            const data = await res.json();
            if (data.collections) {
                setCollections(data.collections);
                setSource(data.source);
            }
        } catch (e) {
            console.error("Failed to load collections", e);
        }
    };

    const loadRecords = async (collectionName: string) => {
        setLoading(true);
        setError('');
        setRecords([]);
        setSelectedItem(null);

        try {
            const res = await fetch(`/api/database/collections/${collectionName}/records`);
            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setRecords(data.items || []);
            }
        } catch (e) {
            setError(String(e));
        }
        setLoading(false);
    };

    const deleteRecord = async (id: string, collection: string) => {
        if (!confirm(`Are you sure you want to delete this record from ${collection}?`)) return;

        // Use the old endpoint for articles if it's the article collection, 
        // OR we can genericize the delete endpoint too. 
        // For now, let's assume we update the backend DELETE too or use the specific one only for articles.
        // Actually, the backend generic DELETE isn't implemented yet, only specific article delete.
        // I will stick to article delete for now, identifying by collection name.

        let endpoint = `/api/database/articles/${id}`;
        if (collection !== 'articles') {
            alert("Delete is currently only supported for 'articles' collection.");
            return;
        }

        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadRecords(collection);
                setSelectedItem(null);
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };

    // Helper to try to find a display title for a record
    const getDisplayTitle = (item: any) => {
        if (item.word) return item.word; // Dictionary
        if (item.title) return item.title;
        if (item.name) return item.name;
        if (item.email) return item.email;
        if (item.username) return item.username;
        if (item.meta?.title) return item.meta.title;
        if (item.content?.meta?.title) return item.content.meta.title; // Nested meta
        return item.id;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-card/50">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-blue-400" />
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                数据库浏览器
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/5">
                                    {source === 'pocketbase' ? 'PocketBase' : 'Local Storage'}
                                </span>
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Collections */}
                    <div className="w-64 border-r border-white/10 bg-black/20 overflow-y-auto p-2">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
                            Collections
                        </div>
                        <div className="space-y-1">
                            {collections.length === 0 && (
                                <div className="text-sm text-muted-foreground px-2">Loading...</div>
                            )}
                            {collections.map(col => (
                                <button
                                    key={col.name}
                                    onClick={() => setActiveCollection(col.name)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeCollection === col.name
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Folder className="w-4 h-4" />
                                        {col.name}
                                    </div>
                                    {col.type === 'local' && (
                                        <span className="text-[10px] bg-white/10 px-1 rounded">Local</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Middle: Record List */}
                    <div className="w-80 border-r border-white/10 flex flex-col bg-card/30">
                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-card/50">
                            <span className="text-sm font-medium text-muted-foreground">
                                {records.length} Records
                            </span>
                            <button
                                onClick={() => loadRecords(activeCollection)}
                                className="p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading && (
                                <div className="flex items-center justify-center h-32">
                                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {!loading && error && (
                                <div className="p-4 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {!loading && records.length === 0 && !error && (
                                <div className="text-center text-muted-foreground py-8 text-sm">
                                    暂无数据
                                </div>
                            )}

                            {!loading && records.map((item, idx) => {
                                const title = getDisplayTitle(item);
                                const isSelected = selectedItem?.id === item.id;

                                return (
                                    <div
                                        key={item.id || idx}
                                        onClick={() => setSelectedItem(item)}
                                        className={`p-3 border-b border-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-400' : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-medium truncate text-sm ${isSelected ? 'text-blue-400' : 'text-foreground'}`}>
                                                {title}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="truncate max-w-[120px] font-mono opacity-70">
                                                {item.id}
                                            </span>
                                            <span>
                                                {item.created ? new Date(item.created).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Detail View */}
                    <div className="flex-1 overflow-y-auto bg-black/20 p-6">
                        {!selectedItem ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <FileJson className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select a record to view details</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">
                                            {getDisplayTitle(selectedItem)}
                                        </h2>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                                            <span className="bg-white/10 px-2 py-0.5 rounded">ID: {selectedItem.id}</span>
                                            {selectedItem.collectionName && (
                                                <span>Collection: {selectedItem.collectionName}</span>
                                            )}
                                        </div>
                                    </div>

                                    {activeCollection === 'articles' && (
                                        <button
                                            onClick={() => deleteRecord(selectedItem.id, activeCollection)}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors text-sm font-medium"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Record
                                        </button>
                                    )}
                                </div>

                                {/* Quick Preview Fields (if generic fields exist) */}
                                {(selectedItem.description || selectedItem.briefing || selectedItem.email) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedItem.email && (
                                            <div className="bg-card/50 p-3 rounded-lg border border-white/5">
                                                <div className="text-xs text-muted-foreground mb-1 uppercase">Email</div>
                                                <div>{selectedItem.email}</div>
                                            </div>
                                        )}
                                        {selectedItem.briefing && (
                                            <div className="col-span-2 bg-card/50 p-3 rounded-lg border border-white/5">
                                                <div className="text-xs text-muted-foreground mb-1 uppercase">Briefing</div>
                                                <div className="text-sm leading-relaxed">{selectedItem.briefing}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <div className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                                        Raw JSON Data
                                    </div>
                                    <div className="bg-slate-950 rounded-lg p-4 border border-white/10 overflow-x-auto shadow-inner">
                                        <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                                            {JSON.stringify(selectedItem, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
