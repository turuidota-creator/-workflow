import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Book, RefreshCw, Trash2, ChevronRight, Database, Plus, Check, AlertCircle, Scan, Upload } from 'lucide-react';

interface GlossaryEntry {
    word: string;
    phonetic?: string;
    definitions: { pos: string; zh: string; en: string }[];
    example?: string;
}

interface ScanResult {
    totalArticleWords: number;
    existingCount: number;
    missingCount: number;
    missingWords: { word: string; inDict: boolean }[];
    coveragePercent: number;
}


export const VocabularyCompletion: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();
    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>({});
    const [error, setError] = useState('');

    // Dictionary sync states
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'generating' | 'adding'>('idle');
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [dictStats, setDictStats] = useState<{ totalWords: number } | null>(null);

    // Initialize from session context if available
    useEffect(() => {
        if (session?.context.glossary) {
            setGlossary(session.context.glossary);
            setStatus('success');
        }
        // Load dictionary stats
        fetchDictStats();
    }, [session?.context.glossary]);

    const fetchDictStats = async () => {
        try {
            const res = await fetch('/api/dictionary/stats');
            const data = await res.json();
            setDictStats(data);
        } catch (e) {
            console.error('Failed to fetch dict stats:', e);
        }
    };

    const handleGenerate = async () => {
        if (!session?.context.articleJson) {
            setError('没有可用的文章数据，请先完成 Step 2。');
            return;
        }

        setStatus('generating');
        setError('');

        try {
            const res = await fetch('/api/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleJson: session.context.articleJson })
            });

            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setError(data.error);
            } else {
                setStatus('success');
                const extracted = data.glossary || data;
                setGlossary(extracted);
                updateSession(session.id, {
                    context: { ...session.context, glossary: extracted }
                });
            }
        } catch (e) {
            setStatus('error');
            setError(String(e));
        }
    };

    // 扫描文章单词并检查词典
    const handleScanDictionary = async () => {
        if (!session?.context.articleJson) {
            setError('没有可用的文章数据，请先完成 Step 2。');
            return;
        }

        setScanStatus('scanning');
        setError('');

        try {
            const res = await fetch('/api/dictionary/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleJson: session.context.articleJson })
            });

            const data = await res.json();

            if (data.error) {
                setError(data.error);
                setScanStatus('idle');
            } else {
                setScanResult(data);
                setScanStatus('idle');
            }
        } catch (e) {
            setError(String(e));
            setScanStatus('idle');
        }
    };

    // 为缺失的单词生成释义并添加到词典
    const handleAddMissingWords = async () => {
        if (!scanResult || scanResult.missingWords.length === 0) return;

        setScanStatus('generating');
        setError('');

        try {
            // 1. Generate definitions for missing words
            const words = scanResult.missingWords.map(w => w.word);
            const genRes = await fetch('/api/dictionary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: words.slice(0, 20) }) // Limit to 20 words at a time
            });

            const genData = await genRes.json();

            if (genData.error) {
                setError(genData.error);
                setScanStatus('idle');
                return;
            }

            // 2. Add to dictionary
            setScanStatus('adding');
            const addRes = await fetch('/api/dictionary/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: genData.entries })
            });

            const addData = await addRes.json();

            if (addData.success) {
                // Refresh stats and re-scan
                await fetchDictStats();
                await handleScanDictionary();
            } else {
                setError(addData.error || '添加失败');
            }

            setScanStatus('idle');
        } catch (e) {
            setError(String(e));
            setScanStatus('idle');
        }
    };

    const handleRemoveWord = (key: string) => {
        const updated = { ...glossary };
        delete updated[key];
        setGlossary(updated);
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'podcast-script',
            context: { ...session.context, glossary },
            steps: session.steps.map(s =>
                s.id === 'vocabulary' ? { ...s, status: 'completed' } :
                    s.id === 'podcast-script' ? { ...s, status: 'running' } : s
            )
        });
    };

    const entries = Object.entries(glossary);

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
                        提取文章重点词汇并生成释义。
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={status === 'generating'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {status === 'generating' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {entries.length > 0 ? '重新生成' : '提取词汇'}
                    </button>

                    <button
                        onClick={async () => {
                            if (!session) return;
                            try {
                                const payload = {
                                    article: session.context.articleJson,
                                    glossary: status === 'success' ? glossary : session.context.glossary,
                                    podcast_script: session.context.podcastScript,
                                    podcast_url: session.context.podcastUrl,
                                };
                                const res = await fetch('/api/publish', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });
                                if (res.ok) alert('✅ 已上传至云端数据库');
                                else alert('❌ 上传失败');
                            } catch (e) {
                                alert('❌ 上传失败: ' + String(e));
                            }
                        }}
                        disabled={entries.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                        title="立即上传当前进度到数据库"
                    >
                        <Upload className="w-4 h-4" />
                        上传
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={entries.length === 0}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        <span>操作失败</span>
                    </div>
                    <p className="font-mono bg-black/20 p-2 rounded text-xs break-all">{error}</p>
                    <p className="text-xs text-red-400/70">
                        可能原因：生成的 JSON 格式无效、模型超时或网络连接中断。
                        建议：点击“重新生成”重试。
                    </p>
                </div>
            )}

            {/* Dictionary Sync Section */}
            <div className="bg-card/30 border border-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        <h4 className="font-medium">词典同步</h4>
                        {dictStats && (
                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                                词库: {dictStats.totalWords} 词
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleScanDictionary}
                            disabled={scanStatus !== 'idle' || !session?.context.articleJson}
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
                        {/* Coverage Stats */}
                        <div className="flex items-center gap-4 text-sm">
                            <span>文章单词: <strong className="text-foreground">{scanResult.totalArticleWords}</strong></span>
                            <span>已收录: <strong className="text-green-400">{scanResult.existingCount}</strong></span>
                            <span>缺失: <strong className={scanResult.missingCount > 0 ? 'text-red-400' : 'text-green-400'}>{scanResult.missingCount}</strong></span>
                            <span>覆盖率: <strong className={scanResult.coveragePercent >= 90 ? 'text-green-400' : 'text-yellow-400'}>{scanResult.coveragePercent}%</strong></span>
                        </div>

                        {/* Coverage Bar */}
                        <div className="h-2 bg-card/50 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${scanResult.coveragePercent >= 90 ? 'bg-green-500' : scanResult.coveragePercent >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${scanResult.coveragePercent}%` }}
                            />
                        </div>

                        {/* Missing Words */}
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
                <span>共 <strong className="text-foreground">{entries.length}</strong> 个词汇</span>
            </div>

            {/* Vocabulary Cards */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {status === 'generating' && (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw className="w-10 h-10 animate-spin text-muted-foreground" />
                    </div>
                )}

                {status !== 'generating' && entries.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        点击 "提取词汇" 开始
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
                                    onClick={() => handleRemoveWord(key)}
                                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/10 rounded transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="font-bold text-foreground">{entry.word}</span>
                                    {entry.phonetic && (
                                        <span className="text-xs text-muted-foreground font-mono">/{entry.phonetic}/</span>
                                    )}
                                </div>

                                {entry.definitions?.map((def, idx) => (
                                    <div key={idx} className="text-xs mb-1">
                                        <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-slate-400 mr-2">{def.pos}</span>
                                        <span className="text-slate-300">{def.zh}</span>
                                    </div>
                                ))}

                                {entry.example && (
                                    <p className="text-xs text-slate-500 mt-2 italic line-clamp-2">"{entry.example}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
