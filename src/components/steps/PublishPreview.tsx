import React, { useMemo, useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { CheckCircle2, Eye, RefreshCw, Upload, XCircle } from 'lucide-react';

type LevelKey = '10' | '7';

type UploadState = {
    status: 'idle' | 'uploading' | 'success' | 'error';
    error?: string;
    articleId?: string;
    url?: string;
};

type AuditItem = {
    key: 'body' | 'glossary' | 'coverage' | 'podcast';
    label: string;
    passed: boolean;
    detail: string;
};

type LevelSnapshot = {
    level: LevelKey;
    article: any | null;
    articleData: any | null;
    glossary: Record<string, any>;
    podcastScript: string;
    podcastUrl: string;
    meta: Record<string, any>;
    paragraphs: any[];
    glossaryKeys: string[];
    uniqueWordCount: number;
    coveredWordCount: number;
    coverageValue: number | null;
    coverageSource: 'meta' | 'calculated' | null;
    payload: Record<string, any> | null;
};


interface ScanResult {
    totalArticleWords: number;
    uniqueWordCount: number;
    existingCount: number;
    missingCount: number;
    missingWords: any[];
    coveragePercent: number;
}

const coverageMetaKeys = ['wordCoverage', 'word_coverage', 'coverage', 'coveragePercent'] as const;

const getMetaCoverage = (meta: Record<string, any>): number | null => {
    for (const key of coverageMetaKeys) {
        const value = meta[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    return null;
};

const extractUniqueWords = (articleData: any): Set<string> => {
    const uniqueWords = new Set<string>();

    const addWord = (raw: any) => {
        if (!raw) return;
        const text = String(raw).toLowerCase();
        const matches = text.match(/[a-zA-Z][a-zA-Z'-]*/g);
        if (!matches) return;
        matches.forEach(match => {
            const clean = match.replace(/[^a-z'-]/g, '').replace(/^-+|-+$/g, '');
            if (clean.length > 1) {
                uniqueWords.add(clean);
            }
        });
    };

    const processTokens = (tokens: any[]) => {
        if (!Array.isArray(tokens)) return;
        tokens.forEach(token => {
            if (token?.isWord && token?.text) {
                addWord(token.text);
            } else if (token?.text) {
                addWord(token.text);
            }
        });
    };

    const processTokenizedSentences = (sentences: any[]) => {
        if (!Array.isArray(sentences)) return;
        sentences.forEach(sentence => {
            if (Array.isArray(sentence?.tokens)) {
                processTokens(sentence.tokens);
            } else if (sentence?.text) {
                addWord(sentence.text);
            }
        });
    };

    const paragraphs = Array.isArray(articleData?.paragraphs) ? articleData.paragraphs : [];
    paragraphs.forEach((para: any) => {
        if (para?.paragraph?.tokenizedSentences) {
            processTokenizedSentences(para.paragraph.tokenizedSentences);
        } else if (para?.tokenizedSentences) {
            processTokenizedSentences(para.tokenizedSentences);
        } else if (Array.isArray(para?.tokens)) {
            processTokens(para.tokens);
        } else if (para?.text) {
            addWord(para.text);
        }
    });

    if (articleData?.intro?.tokens) {
        processTokens(articleData.intro.tokens);
    } else if (articleData?.intro?.text) {
        addWord(articleData.intro.text);
    }

    if (articleData?.title?.en) {
        addWord(articleData.title.en);
    } else if (articleData?.title?.text) {
        addWord(articleData.title.text);
    }

    return uniqueWords;
};

const buildGlossaryWordSet = (glossary: Record<string, any>): Set<string> => {
    const glossaryWordSet = new Set<string>();
    Object.entries(glossary || {}).forEach(([key, value]) => {
        glossaryWordSet.add(key.toLowerCase());
        const lemma = value?.lemma;
        if (typeof lemma === 'string' && lemma.trim()) {
            glossaryWordSet.add(lemma.toLowerCase());
        }
    });
    return glossaryWordSet;
};

const calculateCoverageFromGlossary = (
    articleData: any,
    glossary: Record<string, any>
): { coverage: number | null; uniqueWordCount: number; coveredWordCount: number } => {
    const uniqueWords = extractUniqueWords(articleData);
    const uniqueWordCount = uniqueWords.size;
    if (uniqueWordCount === 0) {
        return { coverage: null, uniqueWordCount: 0, coveredWordCount: 0 };
    }

    const glossaryWordSet = buildGlossaryWordSet(glossary);
    if (glossaryWordSet.size === 0) {
        return { coverage: 0, uniqueWordCount, coveredWordCount: 0 };
    }

    let coveredWordCount = 0;
    uniqueWords.forEach(word => {
        if (glossaryWordSet.has(word)) {
            coveredWordCount += 1;
        }
    });

    const coverage = (coveredWordCount / uniqueWordCount) * 100;
    return { coverage, uniqueWordCount, coveredWordCount };
};

const formatCoverage = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return '未提供';
    const normalized = value <= 1 ? value * 100 : value;
    const clamped = Math.max(0, Math.min(normalized, 100));
    const rounded = clamped >= 100 ? Math.round(clamped) : Math.round(clamped * 10) / 10;
    return `${rounded}%`;
};

export const PublishPreview: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    const [uploadState, setUploadState] = useState<Record<LevelKey, UploadState>>({
        '10': { status: 'idle' },
        '7': { status: 'idle' }
    });

    const [scanResults, setScanResults] = useState<Record<LevelKey, { coverage: number | null; loading: boolean }>>({
        '10': { coverage: null, loading: false },
        '7': { coverage: null, loading: false }
    });

    // Trigger scan on mount or when article changes
    useEffect(() => {
        const scanLevel = async (level: LevelKey) => {
            const article = level === '10' ? session?.context.articleJson : session?.context.articleJson7;
            if (!article) return;

            setScanResults(prev => ({ ...prev, [level]: { ...prev[level], loading: true } }));

            try {
                const res = await fetch('/api/dictionary/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ articleJson: article })
                });
                const data: ScanResult = await res.json();

                if (!data || typeof data.coveragePercent !== 'number') {
                    throw new Error('Invalid scan result');
                }

                setScanResults(prev => ({
                    ...prev,
                    [level]: { coverage: data.coveragePercent, loading: false }
                }));
            } catch (e) {
                console.error(`Failed to scan level ${level}:`, e);
                setScanResults(prev => ({ ...prev, [level]: { ...prev[level], loading: false } }));
            }
        };

        if (session?.context.articleJson) scanLevel('10');
        if (session?.context.articleJson7) scanLevel('7');
    }, [session?.context.articleJson, session?.context.articleJson7]);
    const buildSnapshot = (level: LevelKey): LevelSnapshot => {
        const article = level === '10' ? session?.context.articleJson : session?.context.articleJson7;
        const articleData = article?.article || article || null;
        const glossary = (level === '10' ? session?.context.glossary : session?.context.glossary7) || {};
        const podcastScript = level === '10' ? session?.context.podcastScript || '' : session?.context.podcastScript7 || '';
        const podcastUrl = level === '10' ? session?.context.podcastUrl || '' : session?.context.podcastUrl7 || '';
        const meta = articleData?.meta || {};
        const paragraphs = Array.isArray(articleData?.paragraphs) ? articleData.paragraphs : [];
        const glossaryKeys = Object.keys(glossary);

        const metaCoverage = getMetaCoverage(meta);

        // Prefer scan result, then meta, then local calculation (fallback)
        const scanCoverage = scanResults[level].coverage;

        let calculatedCoverage = { coverage: null as number | null, uniqueWordCount: 0, coveredWordCount: 0 };
        let coverageSource: LevelSnapshot['coverageSource'] = null;

        if (scanCoverage !== null) {
            calculatedCoverage = { coverage: scanCoverage, uniqueWordCount: 0, coveredWordCount: 0 };
            coverageSource = 'calculated';
        } else if (metaCoverage !== null) {
            calculatedCoverage = { coverage: metaCoverage, uniqueWordCount: 0, coveredWordCount: 0 };
            coverageSource = 'meta';
        } else {
            calculatedCoverage = calculateCoverageFromGlossary(articleData, glossary);
            coverageSource = calculatedCoverage.coverage !== null ? 'calculated' : null;
        }
        const coverageValue = coverageSource ? calculatedCoverage.coverage : null;
        const uniqueWordCount = calculatedCoverage.uniqueWordCount;
        const coveredWordCount = calculatedCoverage.coveredWordCount;

        const payload = article
            ? {
                article,
                glossary,
                podcast_script: podcastScript,
                podcast_url: podcastUrl,
            }
            : null;

        return {
            level,
            article: article || null,
            articleData,
            glossary,
            podcastScript,
            podcastUrl,
            meta,
            paragraphs,
            glossaryKeys,
            uniqueWordCount,
            coveredWordCount,
            coverageValue,
            coverageSource,
            payload,
        };
    };

    const snapshots = useMemo(() => ({
        '10': buildSnapshot('10'),
        '7': buildSnapshot('7'),
    }), [session]);

    const audits = useMemo<Record<LevelKey, AuditItem[]>>(() => {
        const createAuditItems = (snapshot: LevelSnapshot): AuditItem[] => {
            const hasBody = snapshot.paragraphs.length > 0;
            const hasGlossary = snapshot.glossaryKeys.length > 0;
            const hasCoverage = snapshot.coverageValue !== null && snapshot.coverageValue > 0;
            const hasPodcast = snapshot.podcastScript.trim().length > 0;

            return [
                {
                    key: 'body',
                    label: '主文内容 (Body)',
                    passed: hasBody,
                    detail: hasBody ? `${snapshot.paragraphs.length} 段` : '缺少段落数据',
                },
                {
                    key: 'glossary',
                    label: '词汇表 (Glossary)',
                    passed: hasGlossary,
                    detail: hasGlossary ? `${snapshot.glossaryKeys.length} 个词` : '词汇表为空',
                },
                {
                    key: 'coverage',
                    label: '词汇覆盖率 (Coverage)',
                    passed: hasCoverage,
                    detail: scanResults[snapshot.level].loading
                        ? '正在扫描词库...'
                        : hasCoverage
                            ? `${formatCoverage(snapshot.coverageValue)}${snapshot.coverageSource === 'calculated'
                                ? `（词库覆盖 ${snapshot.coveredWordCount}/${snapshot.uniqueWordCount} 个正文词）`
                                : ''}`
                            : '缺少覆盖率信息',
                },
                {
                    key: 'podcast',
                    label: '播客脚本 (Podcast)',
                    passed: hasPodcast,
                    detail: hasPodcast ? `脚本长度 ${snapshot.podcastScript.length} 字符` : '播客脚本缺失',
                },
            ];
        };

        return {
            '10': createAuditItems(snapshots['10']),
            '7': createAuditItems(snapshots['7']),
        };
    }, [snapshots]);

    const auditStatus = useMemo<Record<LevelKey, { ready: boolean; missing: number }>>(() => {
        const summarize = (items: AuditItem[]) => {
            const missing = items.filter(item => !item.passed).length;
            return { ready: missing === 0, missing };
        };

        return {
            '10': summarize(audits['10']),
            '7': summarize(audits['7']),
        };
    }, [audits]);

    const handleUpload = async (level: LevelKey) => {
        if (!session) return;
        if (!auditStatus[level].ready) return;

        const snapshot = snapshots[level];
        if (!snapshot.payload) return;

        setUploadState(prev => ({
            ...prev,
            [level]: { status: 'uploading' }
        }));

        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...snapshot.payload })
            });
            const data = await res.json();

            if (!res.ok || data?.error) {
                const message = data?.error || `上传失败（${res.status}）`;
                setUploadState(prev => ({
                    ...prev,
                    [level]: { status: 'error', error: message }
                }));
                return;
            }

            const nextContext = {
                ...session.context,
                finalPayload: level === '10' ? snapshot.payload : session.context.finalPayload,
                ...(level === '10'
                    ? { articleId: data.articleId || data.id }
                    : { articleId7: data.articleId || data.id })
            };

            const updatedSteps = session.steps.map(step => {
                if (step.id === 'publish-preview') {
                    return { ...step, status: 'completed' as const };
                }
                if (step.id === 'publishing') {
                    return { ...step, status: 'completed' as const };
                }
                return step;
            });

            updateSession(session.id, {
                status: 'completed',
                currentStepId: 'publish-preview',
                context: nextContext,
                steps: updatedSteps
            });

            setUploadState(prev => ({
                ...prev,
                [level]: {
                    status: 'success',
                    articleId: data.articleId || data.id,
                    url: data.url
                }
            }));
        } catch (e) {
            setUploadState(prev => ({
                ...prev,
                [level]: { status: 'error', error: String(e) }
            }));
        }
    };

    const renderAuditItem = (item: AuditItem) => (
        <div
            key={item.key}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${item.passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}
        >
            {item.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className={`text-xs ${item.passed ? 'text-emerald-300/80' : 'text-red-300/80'}`}>
                    {item.detail}
                </div>
            </div>
        </div>
    );

    const renderUploadButton = (level: LevelKey) => {
        const state = uploadState[level];
        const ready = auditStatus[level].ready;
        const snapshot = snapshots[level];
        const hasArticle = !!snapshot.article;
        const disabled = !ready || !hasArticle || state.status === 'uploading';

        let label = `上传 Level ${level}`;
        if (state.status === 'uploading') label = '上传中...';
        if (state.status === 'success') label = '已上传';
        if (!ready && hasArticle) label = `缺少 ${auditStatus[level].missing} 项`;

        return (
            <div className="space-y-2">
                <button
                    onClick={() => handleUpload(level)}
                    disabled={disabled}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${state.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed'}`}
                >
                    {state.status === 'uploading' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : state.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {label} 到 PocketBase
                </button>

                {!hasArticle && (
                    <div className="text-xs text-red-300/80">缺少 Level {level} 文章数据。</div>
                )}

                {state.status === 'error' && state.error && (
                    <div className="text-xs text-red-300/80">{state.error}</div>
                )}

                {state.status === 'success' && state.articleId && (
                    <div className="text-xs text-emerald-300/90">
                        文章 ID：<span className="font-mono">{state.articleId}</span>
                        {state.url && (
                            <a
                                href={state.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-blue-300 hover:text-blue-200 underline"
                            >
                                查看
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderColumn = (level: LevelKey) => {
        const snapshot = snapshots[level];
        const ready = auditStatus[level].ready;
        const completedItems = audits[level].filter(item => item.passed).length;
        const totalItems = audits[level].length;
        const title = snapshot.meta?.title || snapshot.meta?.title_zh || snapshot.meta?.topic || session?.context.topic || '未命名';

        return (
            <div className="flex h-full flex-col rounded-xl border border-white/5 bg-card/30 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Level {level}</div>
                        <div className="truncate text-lg font-semibold text-foreground">{title}</div>
                    </div>
                    <div className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ready ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                        {completedItems}/{totalItems}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {audits[level].map(renderAuditItem)}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        正文段落：<span className="text-foreground">{snapshot.paragraphs.length}</span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        词汇数量：<span className="text-foreground">{snapshot.glossaryKeys.length}</span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        覆盖率：<span className="text-foreground">
                            {scanResults[level].loading
                                ? '扫描中...'
                                : formatCoverage(snapshot.coverageValue)}
                        </span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        播客脚本：<span className="text-foreground">{snapshot.podcastScript ? '已生成' : '缺失'}</span>
                    </div>
                </div>

                <div className="mt-6">{renderUploadButton(level)}</div>
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            <div className="shrink-0">
                <h3 className="flex items-center gap-2 bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-2xl font-bold text-transparent">
                    <Eye className="h-6 w-6 text-blue-400" />
                    发布预览 (Publish Preview)
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    在上传前审核 Level 10 与 Level 7 的内容完整性，并直接发布到 PocketBase。
                </p>
            </div>

            <div className="flex flex-1 min-h-0 gap-4">
                <div className="w-1/2 min-w-0 overflow-y-auto pr-1">{renderColumn('10')}</div>
                <div className="w-1/2 min-w-0 overflow-y-auto pl-1">{renderColumn('7')}</div>
            </div>
        </div>
    );
};
