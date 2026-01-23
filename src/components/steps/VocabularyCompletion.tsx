import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Book, RefreshCw, Trash2, ChevronRight, Database, Plus, Check, AlertCircle, Scan, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GlossaryEntry {
    word: string;
    lemma?: string;
    phonetic?: string;
    definition?: string;
    contextDefinition?: string;
    pos?: string;
    sentence?: string;
    definitions?: { pos: string; zh: string; en: string }[];
    example?: string;
}

interface ScanResult {
    totalArticleWords: number;  // Total word occurrences
    uniqueWordCount?: number;   // Unique words count
    existingCount: number;
    missingCount: number;
    missingWords: { word: string; inDict: boolean }[];
    coveragePercent: number;
}

type LevelTab = '10' | '7';

export const VocabularyCompletion: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // Active Tab
    const [activeTab, setActiveTab] = useState<LevelTab>('10');

    // Level 10 States
    const [status10, setStatus10] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [glossary10, setGlossary10] = useState<Record<string, GlossaryEntry>>({});
    const [error10, setError10] = useState('');

    // Level 7 States
    const [status7, setStatus7] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [glossary7, setGlossary7] = useState<Record<string, GlossaryEntry>>({});
    const [error7, setError7] = useState('');

    // Dictionary sync states (shared)
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'generating' | 'adding'>('idle');
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [dictStats, setDictStats] = useState<{ totalWords: number } | null>(null);

    // Initialize from session context
    useEffect(() => {
        if (session?.context.glossary) {
            setGlossary10(session.context.glossary);
            setStatus10('success');
        }
        if (session?.context.glossary7) {
            setGlossary7(session.context.glossary7);
            setStatus7('success');
        }
        fetchDictStats();
    }, [session?.context.glossary, session?.context.glossary7]);

    const fetchDictStats = async () => {
        try {
            const res = await fetch('/api/dictionary/stats');
            const data = await res.json();
            setDictStats(data);
        } catch (e) {
            console.error('Failed to fetch dict stats:', e);
        }
    };

    // Generate vocabulary for specified level
    const handleGenerate = async (level: LevelTab) => {
        // Re-fetch the latest session to avoid stale closure values
        const latestSession = getActiveSession();
        const articleJson = level === '10' ? latestSession?.context.articleJson : latestSession?.context.articleJson7;
        const setStatus = level === '10' ? setStatus10 : setStatus7;
        const setGlossary = level === '10' ? setGlossary10 : setGlossary7;
        const setError = level === '10' ? setError10 : setError7;
        const contextKey = level === '10' ? 'glossary' : 'glossary7';

        if (!articleJson) {
            setError(`没有 Level ${level} 文章数据，请先完成前面的步骤。`);
            return;
        }

        setStatus('generating');
        setError('');

        try {
            const res = await fetch('/api/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleJson })
            });

            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setError(data.error);
            } else {
                setStatus('success');
                const extracted = data.glossary || data;
                setGlossary(extracted);

                // CRITICAL: Re-fetch session again before saving to ensure we have the latest context
                const currentSession = getActiveSession();
                if (currentSession) {
                    console.log('[VocabularyCompletion] Saving glossary', {
                        level,
                        contextKey,
                        glossaryKeys: Object.keys(extracted).length,
                        sessionId: currentSession.id
                    });
                    updateSession(currentSession.id, {
                        context: { ...currentSession.context, [contextKey]: extracted }
                    });
                }
            }
        } catch (e) {
            setStatus('error');
            setError(String(e));
        }
    };

    // Upload glossary for specified level
    const handleUpload = async (level: LevelTab) => {
        // CRITICAL: Re-fetch the latest session to avoid stale closure values
        // This ensures articleId7 set in ArticleRewrite is properly read
        const latestSession = getActiveSession();
        if (!latestSession) return;

        const articleId = level === '10' ? latestSession.context.articleId : latestSession.context.articleId7;
        const articleJson = level === '10' ? latestSession.context.articleJson : latestSession.context.articleJson7;
        const glossary = level === '10' ? glossary10 : glossary7;

        // Debug log to help diagnose issues
        console.log('[VocabularyCompletion] handleUpload called', {
            level,
            articleId,
            hasArticleId: !!latestSession.context.articleId,
            hasArticleId7: !!latestSession.context.articleId7,
            glossaryKeys: Object.keys(glossary).length
        });

        if (!articleId) {
            alert(`❌ 请先在 Level ${level} 的文章页面上传文章，再上传词汇。`);
            return;
        }

        try {
            const payload = {
                articleId,  // Pass articleId for update instead of create
                article: articleJson,
                glossary,
                level,
            };
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                // Save the articleId if:
                // 1. We got a new ID from PocketBase
                // 2. AND (no existing ID OR existing ID is a local one OR IDs are different)
                const isLocalId = articleId?.startsWith('article_');
                const shouldUpdateId = data.articleId && (!articleId || isLocalId || data.articleId !== articleId);

                if (shouldUpdateId) {
                    const idKey = level === '10' ? 'articleId' : 'articleId7';
                    console.log(`[VocabularyCompletion] Updating ${idKey}:`, { old: articleId, new: data.articleId });
                    updateSession(latestSession.id, {
                        context: { ...latestSession.context, [idKey]: data.articleId }
                    });
                }
                alert(`✅ Level ${level} 词汇已${articleId && !isLocalId ? '更新' : '上传'}至数据库`);
            } else {
                alert('❌ 上传失败');
            }
        } catch (e) {
            alert('❌ 上传失败: ' + String(e));
        }
    };

    // Scan dictionary (for active tab)
    const handleScanDictionary = async () => {
        const articleJson = activeTab === '10' ? session?.context.articleJson : session?.context.articleJson7;

        if (!articleJson) {
            const setError = activeTab === '10' ? setError10 : setError7;
            setError(`没有 Level ${activeTab} 文章数据`);
            return;
        }

        setScanStatus('scanning');

        try {
            const res = await fetch('/api/dictionary/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleJson })
            });

            const data = await res.json();

            if (data.error) {
                setScanStatus('idle');
            } else {
                setScanResult(data);
                setScanStatus('idle');
            }
        } catch (e) {
            setScanStatus('idle');
        }
    };

    // Add missing words to dictionary
    const handleAddMissingWords = async () => {
        if (!scanResult || scanResult.missingWords.length === 0) return;

        setScanStatus('generating');

        try {
            const words = scanResult.missingWords.map(w => w.word);
            const genRes = await fetch('/api/dictionary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: words.slice(0, 20) })
            });

            const genData = await genRes.json();

            if (genData.error) {
                setScanStatus('idle');
                return;
            }

            setScanStatus('adding');
            const addRes = await fetch('/api/dictionary/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: genData.entries })
            });

            const addData = await addRes.json();

            if (addData.success) {
                await fetchDictStats();
                await handleScanDictionary();
            }

            setScanStatus('idle');
        } catch (e) {
            setScanStatus('idle');
        }
    };

    const handleRemoveWord = (key: string, level: LevelTab) => {
        if (level === '10') {
            const updated = { ...glossary10 };
            delete updated[key];
            setGlossary10(updated);
        } else {
            const updated = { ...glossary7 };
            delete updated[key];
            setGlossary7(updated);
        }
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'podcast-script',
            context: { ...session.context, glossary: glossary10, glossary7 },
            steps: session.steps.map(s =>
                s.id === 'vocabulary' ? { ...s, status: 'completed' } :
                    s.id === 'podcast-script' ? { ...s, status: 'running' } : s
            )
        });
    };

    // Current tab data
    const currentGlossary = activeTab === '10' ? glossary10 : glossary7;
    const currentStatus = activeTab === '10' ? status10 : status7;
    const currentError = activeTab === '10' ? error10 : error7;
    const entries = Object.entries(currentGlossary);
    const hasArticle = activeTab === '10' ? !!session?.context.articleJson : !!session?.context.articleJson7;

    return (
        <div className="space-y-4 h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Book className="w-6 h-6 text-yellow-400" />
                        词汇补全 (Vocabulary)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        分别为 Level 10 和 Level 7 文章提取词汇。
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleGenerate(activeTab)}
                        disabled={currentStatus === 'generating' || !hasArticle}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        {currentStatus === 'generating' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {entries.length > 0 ? '重新生成' : '提取词汇'}
                    </button>

                    <button
                        onClick={() => handleUpload(activeTab)}
                        disabled={entries.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                        title={`上传 Level ${activeTab} 词汇到数据库`}
                    >
                        <Upload className="w-4 h-4" />
                        上传 L{activeTab}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={Object.keys(glossary10).length === 0 && Object.keys(glossary7).length === 0}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Level Tabs */}
            <div className="flex gap-1 bg-card/30 p-1 rounded-lg border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab('10')}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all",
                        activeTab === '10'
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    Level 10
                    {Object.keys(glossary10).length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/30 text-xs">
                            {Object.keys(glossary10).length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('7')}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all",
                        activeTab === '7'
                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    Level 7
                    {Object.keys(glossary7).length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-500/30 text-xs">
                            {Object.keys(glossary7).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {currentError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        <span>操作失败</span>
                    </div>
                    <p className="font-mono bg-black/20 p-2 rounded text-xs break-all">{currentError}</p>
                </div>
            )}

            {/* No Article Warning */}
            {!hasArticle && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    没有 Level {activeTab} 的文章数据，请先在之前的步骤中{activeTab === '7' ? '改写' : '生成'}文章。
                </div>
            )}

            {/* Dictionary Sync Section */}
            <div className="bg-card/30 border border-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        <h4 className="font-medium">词典同步 (Level {activeTab})</h4>
                        {dictStats && (
                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                                词库: {dictStats.totalWords} 词
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleScanDictionary}
                            disabled={scanStatus !== 'idle' || !hasArticle}
                            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                        >
                            {scanStatus === 'scanning' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                            扫描文章
                        </button>
                    </div>
                </div>

                {/* Scan Results */}
                {scanResult && (
                    <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                            <span>总词数: <strong className="text-foreground">{scanResult.totalArticleWords}</strong></span>
                            <span>唯一词: <strong className="text-foreground">{scanResult.uniqueWordCount || scanResult.totalArticleWords}</strong></span>
                            <span>已收录: <strong className="text-green-400">{scanResult.existingCount}</strong></span>
                            <span>缺失: <strong className={scanResult.missingCount > 0 ? 'text-red-400' : 'text-green-400'}>{scanResult.missingCount}</strong></span>
                            <span>覆盖率: <strong className={scanResult.coveragePercent >= 90 ? 'text-green-400' : 'text-yellow-400'}>{scanResult.coveragePercent}%</strong></span>
                        </div>

                        <div className="h-2 bg-card/50 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${scanResult.coveragePercent >= 90 ? 'bg-green-500' : scanResult.coveragePercent >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${scanResult.coveragePercent}%` }}
                            />
                        </div>

                        {scanResult.missingCount > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">缺失单词 (前20个):</span>
                                    <button
                                        onClick={handleAddMissingWords}
                                        disabled={scanStatus !== 'idle'}
                                        className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1 rounded text-sm font-medium transition-all disabled:opacity-50"
                                    >
                                        {scanStatus === 'generating' || scanStatus === 'adding' ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Plus className="w-3 h-3" />
                                        )}
                                        {scanStatus === 'generating' ? '生成中...' : scanStatus === 'adding' ? '添加中...' : '生成并添加'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {scanResult.missingWords.slice(0, 20).map(({ word }) => (
                                        <span key={word} className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                                            {word}
                                        </span>
                                    ))}
                                    {scanResult.missingCount > 20 && (
                                        <span className="text-xs text-muted-foreground">+{scanResult.missingCount - 20} 更多</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {scanResult.missingCount === 0 && (
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <Check className="w-4 h-4" />
                                所有单词都已收录！
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Level {activeTab} 共 <strong className="text-foreground">{entries.length}</strong> 个词汇</span>
            </div>

            {/* Vocabulary Cards */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {currentStatus === 'generating' && (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw className="w-10 h-10 animate-spin text-muted-foreground" />
                    </div>
                )}

                {currentStatus !== 'generating' && entries.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        点击 "提取词汇" 开始提取 Level {activeTab} 词汇
                    </div>
                )}

                {entries.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {entries.map(([key, entry]) => (
                            <div
                                key={key}
                                className="group relative bg-card/30 border border-white/5 rounded-lg p-4 hover:bg-card/50 transition-colors"
                            >
                                <button
                                    onClick={() => handleRemoveWord(key, activeTab)}
                                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/10 rounded transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="font-bold text-foreground">{entry.word || entry.lemma}</span>
                                    {entry.phonetic && (
                                        <span className="text-xs text-muted-foreground font-mono">/{entry.phonetic}/</span>
                                    )}
                                    {entry.pos && (
                                        <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-slate-400">{entry.pos}</span>
                                    )}
                                </div>

                                {/* New format: definition + contextDefinition */}
                                {entry.definition && (
                                    <p className="text-xs text-slate-300 mb-1">{entry.definition}</p>
                                )}
                                {entry.contextDefinition && (
                                    <p className="text-xs text-slate-500 mb-1 italic">语境: {entry.contextDefinition}</p>
                                )}

                                {/* Old format: definitions array */}
                                {entry.definitions?.map((def, idx) => (
                                    <div key={idx} className="text-xs mb-1">
                                        <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-slate-400 mr-2">{def.pos}</span>
                                        <span className="text-slate-300">{def.zh}</span>
                                    </div>
                                ))}

                                {(entry.example || entry.sentence) && (
                                    <p className="text-xs text-slate-500 mt-2 italic line-clamp-2">"{entry.example || entry.sentence}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
