import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Bot, RefreshCw, AlertTriangle, ChevronRight, FileText, ArrowRight, Upload, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
// Import shared audit logic
import { AuditStatus } from '../parts/AuditStatus';
import { BriefingFieldKey } from '../../lib/audit';

export const ArticleRewrite: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // Level 10 Article (Read-only)
    const article10 = session?.context.articleJson;

    // Level 7 Article (State)
    const [status7, setStatus7] = useState<'idle' | 'generating' | 'success' | 'error'>(
        session?.context.articleJson7 ? 'success' : 'idle'
    );
    const [json7, setJson7] = useState<string>(
        session?.context.articleJson7 ? JSON.stringify(session.context.articleJson7, null, 2) : ''
    );
    const [error7, setError7] = useState('');

    // Upload State for Level 7
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');

    // View Mode for Level 7
    const [viewMode7, setViewMode7] = useState<'json' | 'preview'>('preview');

    // Handler helpers for audit regeneration (Confirmation wrapper)
    const handleRegenerateBriefingField = async (_side: 'A' | 'B' | undefined, field: BriefingFieldKey) => {
        if (!window.confirm(`确认要重新生成 Briefing 字段: ${field}? (这将覆盖当前字段)`)) return;
        await handleRewrite({ briefingTarget: field });
    };

    const handleRegenerateSentenceAnalysis = async (_side: 'A' | 'B' | undefined) => {
        if (!window.confirm('确认要重新生成句法分析? (这将覆盖当前句法分析)')) return;
        await handleRewrite({ analysisTarget: 'sentence_analysis' });
    };

    const handleRewrite = async (options: { briefingTarget?: string, analysisTarget?: string } = {}) => {
        if (!session || !article10) return;

        // If it's a full rewrite (no specific targets), confirm first if we already have content
        if (!options.briefingTarget && !options.analysisTarget && status7 === 'success') {
            if (!window.confirm('确认要重新全部改写吗？当前内容将被覆盖。')) return;
        }

        setStatus7('generating');
        setError7('');

        try {
            // Support partial update logic if backend supports it (ArticleGeneration does, we need to allow it here too)
            // But currently backend uses "previousDraft" + "feedback". 
            // If we are targeting specific field, we should construct the feedback accordingly or use the same params as ArticleGeneration.

            const reqBody: any = {
                topic: session.context.topic,
                level: "7",
                previousDraft: status7 === 'success' ? JSON.parse(json7) : article10, // If refining, use current; else use L10
                targetDate: session.context.targetDate,
                briefingTarget: options.briefingTarget,
                analysisTarget: options.analysisTarget
            };

            if (options.briefingTarget || options.analysisTarget) {
                // Partial update mode
                // NO explicit feedback needed, server handles briefingTarget param
            } else {
                // Full Rewrite Mode (or Retry)
                // If status7 is already success (or we just want to rewrite based on L10), we actually want to base it on L10 usually for a fresh rewrite.
                // BUT if we want to "fix" the current L7 (e.g. word count), we might send current L7 as previousDraft? 
                // The user wants "Rewrite this article to Level 7".
                // Let's stick to using L10 as source for a fresh rewrite to avoid degradation, UNLESS it's a specific fix?
                // Actually, "Rewrite" usually means fresh content. 
                reqBody.previousDraft = article10;
                reqBody.feedback = "Rewrite this article to Level 7 difficulty. Simplify vocabulary and sentence structure while keeping the same core information and structure (3 paragraphs). IMPORTANT: Target word count must be between 210-270 words.";
            }

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });

            const data = await res.json();

            let newJson = '';
            if (data.error) {
                setStatus7('error');
                setError7(data.error);
                if (data.raw) newJson = data.raw;
                setJson7(newJson);
            } else {
                setStatus7('success');
                // Handle partial updates merging logic (similar to ArticleGeneration)
                if (options.briefingTarget) {
                    try {
                        const originalRoot = JSON.parse(json7);
                        const updatedRoot = JSON.parse(JSON.stringify(originalRoot));
                        const updatedData = data.article || data;
                        const updatedBriefing = updatedData?.meta?.briefing || {};
                        const nextValue = updatedBriefing?.[options.briefingTarget];
                        if (typeof nextValue === 'string' && nextValue.trim()) {
                            if (updatedRoot.article) {
                                updatedRoot.article.meta.briefing[options.briefingTarget] = nextValue;
                            } else {
                                updatedRoot.meta.briefing[options.briefingTarget] = nextValue;
                            }
                            newJson = JSON.stringify(updatedRoot, null, 2);
                        } else {
                            newJson = JSON.stringify(data, null, 2);
                        }
                    } catch (e) { newJson = JSON.stringify(data, null, 2); }
                } else if (options.analysisTarget) {
                    try {
                        const originalRoot = JSON.parse(json7);
                        const updatedRoot = JSON.parse(JSON.stringify(originalRoot));
                        const originalData = updatedRoot.article || updatedRoot;
                        const updatedData = data.article || data;
                        // Simplistic merge for sentences
                        const originalParagraphs = originalData?.paragraphs || [];
                        const updatedParagraphs = updatedData?.paragraphs || [];
                        originalParagraphs.forEach((para: any, paraIndex: number) => {
                            const originalSentences = para?.paragraph?.tokenizedSentences || [];
                            const updatedPara = updatedParagraphs[paraIndex];
                            const updatedSentences = updatedPara?.paragraph?.tokenizedSentences || [];
                            originalSentences.forEach((sentence: any, sentenceIndex: number) => {
                                if (updatedSentences[sentenceIndex]?.analysis) {
                                    sentence.analysis = updatedSentences[sentenceIndex].analysis;
                                }
                            });
                        });
                        newJson = JSON.stringify(updatedRoot, null, 2);
                    } catch (e) { newJson = JSON.stringify(data, null, 2); }
                } else {
                    newJson = JSON.stringify(data, null, 2);
                }

                setJson7(newJson);

                // Persist immediately - use getActiveSession() for fresh context
                const parsed7 = JSON.parse(newJson);
                const latestSession = getActiveSession();
                if (latestSession) {
                    updateSession(latestSession.id, {
                        context: {
                            ...latestSession.context,
                            articleJson7: parsed7.article || parsed7
                        }
                    });
                }
            }
        } catch (e) {
            const errString = String(e);
            setStatus7('error');
            setError7(errString);
        }
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'vocabulary',
            steps: session.steps.map(s =>
                s.id === 'article-rewrite' ? { ...s, status: 'completed' } :
                    s.id === 'vocabulary' ? { ...s, status: 'running' } : s
            )
        });
    };

    // Upload Level 7 article to articles collection
    const handleUpload7 = async () => {
        // CRITICAL: Re-fetch the latest session to get the most recent articleId7
        const latestSession = getActiveSession();
        if (!latestSession || !json7) return;

        setUploadStatus('uploading');
        setUploadError('');

        try {
            const parsed7 = JSON.parse(json7);
            const articleData = parsed7.article || parsed7;
            const articleId = latestSession.context.articleId7;

            // Debug: Check what ID we're sending
            console.log('[ArticleRewrite] handleUpload7 - sending request', {
                articleId,
                isLocalId: articleId?.startsWith('article_'),
                willCreate: !articleId || articleId?.startsWith('article_')
            });

            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleId, // Add ID for update
                    article: articleData,
                    level: '7',
                    glossary: latestSession.context.glossary7 || {},
                    // NOTE: Don't send podcast fields here - they are handled in the Podcast step
                })
            });

            const data = await res.json();

            // Debug: Log all IDs for comparison
            console.log('[ArticleRewrite Upload Debug]', {
                sentArticleId: articleId,
                returnedArticleId: data.articleId,
                contextArticleId: latestSession.context.articleId,
                contextArticleId7: latestSession.context.articleId7,
                level: '7'
            });

            if (data.error) {
                setUploadStatus('error');
                setUploadError(data.error);
            } else {
                setUploadStatus('success');
                // Save the article ID to context if:
                // 1. We got a new ID from PocketBase
                // 2. AND (no existing ID OR existing ID is a local one OR IDs are different)
                const isLocalId = articleId?.startsWith('article_');
                const shouldUpdateId = data.articleId && (!articleId || isLocalId || data.articleId !== articleId);

                if (shouldUpdateId) {
                    console.log('[ArticleRewrite] Updating articleId7:', {
                        old: articleId,
                        new: data.articleId,
                        reason: !articleId ? 'no existing' : isLocalId ? 'replacing local ID' : 'ID changed'
                    });
                    updateSession(latestSession.id, {
                        context: {
                            ...latestSession.context,
                            articleId7: data.articleId
                        }
                    });
                }
                alert(`[DEBUG] Level 7 Upload:\n- Sent ID (L7): ${articleId || 'NONE (will create)'}\n- Returned ID: ${data.articleId}\n- L10 ID in context: ${latestSession.context.articleId || 'NONE'}\n- Mode: ${articleId ? 'UPDATE' : 'CREATE'}\n- ID Updated: ${shouldUpdateId ? 'YES' : 'NO'}`);
            }
        } catch (e) {
            setUploadStatus('error');
            setUploadError(String(e));
        }
    };

    // Helper to render preview (reuse logic or simplify? Simplified here for now)
    const renderPreview = (data: any) => {
        if (!data) return <div className="p-8 text-center text-muted-foreground">暂无内容</div>;
        const article = data.article || data;

        return (
            <div className="h-full overflow-y-auto p-6 space-y-6 text-sm">
                <div className="space-y-4 border-b border-white/10 pb-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-primary">{article.title?.en || "No Title"}</h2>
                        <h3 className="text-lg text-slate-300">{article.title?.zh || "无标题"}</h3>
                    </div>
                    {article.intro?.text && (
                        <div className="p-4 rounded-lg bg-white/5 text-slate-300 leading-relaxed">
                            {article.intro.text}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    {article.paragraphs?.map((p: any, idx: number) => {
                        const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);
                        const enText = sentences.map((s: any) => {
                            if (Array.isArray(s.tokens)) return s.tokens.map((t: any) => t.text || t.value || t.word).join('');
                            return '';
                        }).join(' ');
                        const cnText = sentences.map((s: any) => s.zh).join('。');

                        return (
                            <div key={idx} className="space-y-1">
                                <p className="text-slate-200 leading-relaxed font-medium">{enText}</p>
                                <p className="text-slate-400 leading-relaxed text-xs">{cnText}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderJsonPreview = (jsonStr: string) => {
        try {
            const data = JSON.parse(jsonStr);
            return renderPreview(data);
        } catch (e) {
            return <div className="p-4 text-red-400">JSON 解析错误</div>;
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-blue-400" />
                        文章改写 (Level 10 → Level 7)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        基于生成的 Level 10 文章，改写出更简单的 Level 7 版本。
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left: Level 10 (Source) */}
                <div className="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20">
                    <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="font-bold text-sm text-slate-300">Level 10 (Source)</span>
                        </div>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {renderPreview(article10)}
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center text-slate-600">
                    <ArrowRight className="w-6 h-6" />
                </div>

                {/* Right: Level 7 (Target) */}
                <div className="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20 transition-all relative">
                    <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", status7 === 'success' ? "bg-green-500" : "bg-slate-500")} />
                            <span className="font-bold text-sm text-slate-300">Level 7 (Rewrite)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {status7 === 'success' && (
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                                    <button
                                        onClick={() => setViewMode7('preview')}
                                        className={cn("px-2 py-0.5 text-[10px] rounded transition-all", viewMode7 === 'preview' ? "bg-white/10 text-white" : "text-muted-foreground")}
                                    >Preview</button>
                                    <button
                                        onClick={() => setViewMode7('json')}
                                        className={cn("px-2 py-0.5 text-[10px] rounded transition-all", viewMode7 === 'json' ? "bg-white/10 text-white" : "text-muted-foreground")}
                                    >JSON</button>
                                </div>
                            )}
                            <button
                                onClick={() => handleRewrite()}
                                disabled={status7 === 'generating'}
                                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                {status7 === 'generating' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                                {status7 === 'success' ? '重新改写' : '开始改写'}
                            </button>
                            {/* Upload Button for Level 7 */}
                            {status7 === 'success' && (
                                <button
                                    onClick={handleUpload7}
                                    disabled={uploadStatus === 'uploading'}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors disabled:opacity-50",
                                        uploadStatus === 'success'
                                            ? "bg-green-600 text-white"
                                            : uploadStatus === 'error'
                                                ? "bg-red-600 hover:bg-red-700 text-white"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    )}
                                >
                                    {uploadStatus === 'uploading' ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : uploadStatus === 'success' ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                        <Upload className="w-3 h-3" />
                                    )}
                                    {uploadStatus === 'success' ? '已上传' : uploadStatus === 'error' ? '重试上传' : '上传到 DB'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        {status7 === 'idle' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                                <FileText className="w-12 h-12 opacity-20" />
                                <p className="text-sm">点击上方按钮生成 Level 7 版本</p>
                            </div>
                        )}
                        {status7 === 'generating' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-4">
                                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                                    <span className="text-xs text-muted-foreground animate-pulse">正在改写为 Level 7...</span>
                                </div>
                            </div>
                        )}
                        {status7 === 'error' && (
                            <div className="p-4 text-red-400 text-xs font-mono break-all">
                                <AlertTriangle className="w-4 h-4 mb-2" />
                                {error7}
                            </div>
                        )}
                        {uploadError && (
                            <div className="absolute bottom-2 right-2 bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded text-xs">
                                上传失败: {uploadError}
                            </div>
                        )}

                        {/* Content */}
                        {(status7 === 'success' || (status7 === 'error' && json7)) && (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-auto">
                                    {viewMode7 === 'json' ? (
                                        <textarea
                                            value={json7}
                                            onChange={(e) => setJson7(e.target.value)} // Allow editing?
                                            className="w-full h-full bg-transparent p-4 font-mono text-xs text-green-400 focus:outline-none resize-none leading-relaxed"
                                            spellCheck={false}
                                        />
                                    ) : (
                                        renderJsonPreview(json7)
                                    )}
                                </div>
                                {/* Audit Panel */}
                                <div className="p-4 border-t border-white/5 bg-black/20">
                                    <AuditStatus
                                        json={json7}
                                        onRegenerateBriefingField={handleRegenerateBriefingField}
                                        onRegenerateSentenceAnalysis={handleRegenerateSentenceAnalysis}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
