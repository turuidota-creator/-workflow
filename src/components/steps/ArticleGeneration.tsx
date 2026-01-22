
import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Bot, Play, CheckCircle2, AlertTriangle, RefreshCw, Upload, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ArticleGeneration: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // State for two separate generations
    // State for two separate generations - initialize from session if available
    const [statusA, setStatusA] = useState<'idle' | 'generating' | 'success' | 'error'>(
        (session?.context.generationState?.A?.status as any) || 'idle'
    );
    const [jsonA, setJsonA] = useState<string>(
        session?.context.generationState?.A?.json || ''
    );
    const [errorA, setErrorA] = useState(
        session?.context.generationState?.A?.error || ''
    );

    const [statusB, setStatusB] = useState<'idle' | 'generating' | 'success' | 'error'>(
        (session?.context.generationState?.B?.status as any) || 'idle'
    );
    const [jsonB, setJsonB] = useState<string>(
        session?.context.generationState?.B?.json || ''
    );
    const [errorB, setErrorB] = useState(
        session?.context.generationState?.B?.error || ''
    );

    // Selection
    const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);

    type BriefingFieldKey = 'what' | 'when' | 'who' | 'scope' | 'market_implications' | 'grammar_analysis';
    const briefingFieldLabels: Record<BriefingFieldKey, string> = {
        what: '事件内容',
        when: '时间',
        who: '主体',
        scope: '范围',
        market_implications: '市场影响',
        grammar_analysis: '语法分析'
    };

    // Audit Helper
    const runAudit = (jsonStr: string) => {
        try {
            const data = JSON.parse(jsonStr);
            const articleData = data.article || data;
            const paragraphs = articleData.paragraphs || [];
            const meta = articleData.meta || {};
            const briefing = meta.briefing || {};

            let totalWords = 0;
            paragraphs.forEach((p: any) => {
                const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);
                sentences.forEach((s: any) => {
                    if (s.tokens && Array.isArray(s.tokens)) {
                        s.tokens.forEach((t: any) => {
                            const text = t.text || t.value || t.word || '';
                            if (!text) return;
                            // Split by whitespace and count each word that:
                            // - Contains at least one English letter
                            // - Does not contain Chinese characters
                            const words = text.split(/\s+/);
                            words.forEach((word: string) => {
                                // Clean punctuation from word edges
                                const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
                                if (cleanWord && /[a-zA-Z]/.test(cleanWord) && !/[\u4e00-\u9fa5]/.test(cleanWord)) {
                                    totalWords++;
                                }
                            });
                        });
                    }
                });
            });

            let hasSentenceAnalysis = false;
            let isSentenceAnalysisChineseStart = true;
            paragraphs.forEach((p: any) => {
                const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);
                sentences.forEach((s: any) => {
                    const analysis = s.analysis;
                    if (!analysis) return;
                    const grammarText = analysis.grammar || '';
                    const explanationText = analysis.explanation || '';
                    if (grammarText || explanationText) {
                        hasSentenceAnalysis = true;
                    }
                    const grammarOk = grammarText ? /^[\u4e00-\u9fa5]/.test(grammarText.trim()) : true;
                    const explanationOk = explanationText ? /^[\u4e00-\u9fa5]/.test(explanationText.trim()) : true;
                    if (!grammarOk || !explanationOk) {
                        isSentenceAnalysisChineseStart = false;
                    }
                });
            });

            // Briefing field validation (what, when, who, scope, market_implications)
            const hasWhat = !!(briefing.what && briefing.what.trim());
            const hasWhen = !!(briefing.when && briefing.when.trim());
            const hasWho = !!(briefing.who && briefing.who.trim());
            const hasScope = !!(briefing.scope && briefing.scope.trim());
            const hasMarketImplications = !!(briefing.market_implications && briefing.market_implications.trim());
            const hasGrammarAnalysis = !!(briefing.grammar_analysis && briefing.grammar_analysis.trim());
            const isGrammarAnalysisChineseStart = hasGrammarAnalysis
                ? /^[\u4e00-\u9fa5]/.test(briefing.grammar_analysis.trim())
                : false;
            const isGrammarAnalysisValid = hasGrammarAnalysis && isGrammarAnalysisChineseStart;
            const isBriefingComplete = hasWhat && hasWhen && hasWho && hasScope && hasMarketImplications && isGrammarAnalysisValid;

            return {
                wordCount: totalWords,
                paraCount: paragraphs.length,
                hasTitle: !!(articleData.title?.zh || articleData.title?.cn),
                hasBriefing: !!(articleData.intro?.text || Object.keys(briefing).length > 0),
                hasGlossary: !!(data.glossary && Object.keys(data.glossary).length > 0),
                hasSentenceAnalysis,
                isSentenceAnalysisChineseStart,
                // Briefing sub-fields
                hasWhat,
                hasWhen,
                hasWho,
                hasScope,
                hasMarketImplications,
                hasGrammarAnalysis,
                isGrammarAnalysisChineseStart,
                isGrammarAnalysisValid,
                isBriefingComplete,
                isWordCountValid: totalWords >= 210 && totalWords <= 260,
                isParaCountValid: paragraphs.length === 3,
                valid: (totalWords >= 210 && totalWords <= 260)
                    && paragraphs.length === 3
                    && isBriefingComplete
                    && isSentenceAnalysisChineseStart
            };
        } catch (e) {
            return null;
        }
    };

    const AuditStatus = ({
        json,
        side,
        onRegenerateBriefingField
    }: {
        json: string;
        side: 'A' | 'B';
        onRegenerateBriefingField: (side: 'A' | 'B', field: BriefingFieldKey) => void;
    }) => {
        if (!json) return null;
        const result = runAudit(json);
        if (!result) return <div className="text-red-400 text-xs">JSON 解析错误</div>;

        return (
            <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/10 text-xs space-y-2">
                <div className="font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>审计状态 (Audit Status)</span>
                    {result.valid ? <span className="text-green-400">✅ 通过</span> : <span className="text-red-400">❌ 未通过</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">字数 (210-260)</span>
                        <span className={result.isWordCountValid ? "text-green-400" : "text-red-400 font-bold"}>
                            {result.wordCount} {result.isWordCountValid ? "✅" : "⚠️"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">段落 (3段)</span>
                        <span className={result.isParaCountValid ? "text-green-400" : "text-red-400 font-bold"}>
                            {result.paraCount} {result.isParaCountValid ? "✅" : "⚠️"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">标题</span>
                        <span className={result.hasTitle ? "text-green-400" : "text-red-400"}>
                            {result.hasTitle ? "✅" : "❌"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Glossary</span>
                        <span className={result.hasGlossary ? "text-green-400" : "text-slate-500"}>
                            {result.hasGlossary ? "✅" : "⚪"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">语法分析(中文)</span>
                        <span className={result.isSentenceAnalysisChineseStart ? "text-green-400" : "text-red-400"}>
                            {result.isSentenceAnalysisChineseStart ? "✅" : "❌"}
                        </span>
                    </div>
                </div>

                {/* Briefing Fields Audit */}
                <div className="pt-2 border-t border-white/5">
                    <div className="font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Briefing 硬信息</span>
                        {result.isBriefingComplete ? <span className="text-green-400">✅ 完整</span> : <span className="text-yellow-400">⚠️ 缺失字段</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'what');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成事件内容"
                        >
                            <span className={result.hasWhat ? "text-green-400" : "text-red-400"}>
                                {result.hasWhat ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">{briefingFieldLabels.what}</span>
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'when');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成时间"
                        >
                            <span className={result.hasWhen ? "text-green-400" : "text-red-400"}>
                                {result.hasWhen ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">{briefingFieldLabels.when}</span>
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'who');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成主体"
                        >
                            <span className={result.hasWho ? "text-green-400" : "text-red-400"}>
                                {result.hasWho ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">{briefingFieldLabels.who}</span>
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'scope');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成范围"
                        >
                            <span className={result.hasScope ? "text-green-400" : "text-red-400"}>
                                {result.hasScope ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">{briefingFieldLabels.scope}</span>
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'market_implications');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成市场影响"
                        >
                            <span className={result.hasMarketImplications ? "text-green-400" : "text-red-400"}>
                                {result.hasMarketImplications ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">{briefingFieldLabels.market_implications}</span>
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRegenerateBriefingField(side, 'grammar_analysis');
                            }}
                            className="flex items-center gap-1 text-left hover:text-white transition-colors"
                            title="点击重新生成语法分析"
                        >
                            <span className={result.isGrammarAnalysisValid ? "text-green-400" : "text-red-400"}>
                                {result.isGrammarAnalysisValid ? "✓" : "✗"}
                            </span>
                            <span className="text-slate-500">
                                {briefingFieldLabels.grammar_analysis}
                                {result.hasGrammarAnalysis && !result.isGrammarAnalysisChineseStart ? " (需中文开头)" : ""}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const generateSide = async (
        side: 'A' | 'B',
        options: {
            isRewrite?: boolean;
            shouldPersist?: boolean;
            briefingTarget?: BriefingFieldKey;
        } = {}
    ) => {
        if (!session?.context.topic) return null;

        const setStatus = side === 'A' ? setStatusA : setStatusB;
        const setJson = side === 'A' ? setJsonA : setJsonB;
        const setError = side === 'A' ? setErrorA : setErrorB;
        const currentJson = side === 'A' ? jsonA : jsonB;
        const isRewrite = options.isRewrite ?? false;
        const shouldPersist = options.shouldPersist ?? true;
        const briefingTarget = options.briefingTarget;

        let previousDraft = null;
        let feedback = null;

        if (briefingTarget) {
            try {
                previousDraft = JSON.parse(currentJson);
                feedback = `Regenerate ONLY meta.briefing.${briefingTarget} (${briefingFieldLabels[briefingTarget]}). Keep every other field identical.`;
            } catch (e) {
                const errString = String(e);
                setError(`无法解析当前 JSON，无法局部重写：${errString}`);
                return { status: 'error', json: currentJson, error: errString };
            }
        } else if (isRewrite) {
            const audit = runAudit(currentJson);
            if (audit && !audit.valid) {
                previousDraft = JSON.parse(currentJson);
                const feedbackMessages = [];
                if (!audit.isWordCountValid) feedbackMessages.push(`Word count is ${audit.wordCount}, must be between 210 and 260.`);
                if (!audit.isParaCountValid) feedbackMessages.push(`Paragraph count is ${audit.paraCount}, must be exactly 3.`);
                feedback = feedbackMessages.join('\n');
            }
        }

        setStatus('generating');
        setError('');

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: session.context.topic,
                    level: "10",
                    style: side,
                    researchContext: session.context.researchResult || null,
                    targetDate: session.context.targetDate, // Pass the target date
                    previousDraft,
                    feedback,
                    briefingTarget,
                    briefingLabel: briefingTarget ? briefingFieldLabels[briefingTarget] : undefined
                })
            });

            const data = await res.json();

            let newStatus: any = 'success';
            let newJson = '';
            let newError = '';

            if (data.error) {
                newStatus = 'error';
                newError = data.error;
                if (data.raw) newJson = data.raw;

                setStatus('error');
                setError(data.error);
                if (data.raw) setJson(data.raw);
            } else {
                newStatus = 'success';
                if (briefingTarget && previousDraft) {
                    try {
                        const originalRoot = JSON.parse(currentJson);
                        const updatedRoot = JSON.parse(JSON.stringify(originalRoot));
                        const updatedData = data.article || data;
                        const updatedBriefing = updatedData?.meta?.briefing || {};
                        const nextValue = updatedBriefing?.[briefingTarget];
                        if (typeof nextValue === 'string' && nextValue.trim()) {
                            if (updatedRoot.article) {
                                updatedRoot.article.meta = {
                                    ...(updatedRoot.article.meta || {}),
                                    briefing: {
                                        ...(updatedRoot.article.meta?.briefing || {}),
                                        [briefingTarget]: nextValue
                                    }
                                };
                            } else {
                                updatedRoot.meta = {
                                    ...(updatedRoot.meta || {}),
                                    briefing: {
                                        ...(updatedRoot.meta?.briefing || {}),
                                        [briefingTarget]: nextValue
                                    }
                                };
                            }
                            newJson = JSON.stringify(updatedRoot, null, 2);
                        } else {
                            newJson = JSON.stringify(data, null, 2);
                        }
                    } catch (e) {
                        newJson = JSON.stringify(data, null, 2);
                    }
                } else {
                    newJson = JSON.stringify(data, null, 2);
                }
                setStatus('success');
                setJson(newJson);
            }

            const resultState = {
                status: newStatus,
                json: newJson,
                error: newError
            };

            // Persist to session only if requested
            if (shouldPersist && session) {
                updateSession(session.id, (prevSession) => {
                    const currentState = prevSession.context.generationState || {};
                    return {
                        context: {
                            ...prevSession.context,
                            generationState: {
                                ...currentState,
                                [side]: resultState
                            }
                        }
                    };
                });
            }

            return resultState;

        } catch (e) {
            const errString = String(e);
            setStatus('error');
            setError(errString);
            return { status: 'error', json: '', error: errString };
        }
    };

    const handleGenerateAll = async () => {
        if (!session) return;

        // Run both in parallel without individual persistence
        const [resA, resB] = await Promise.all([
            generateSide('A', { shouldPersist: false }),
            generateSide('B', { shouldPersist: false })
        ]);

        // Atomic update for both
        if (resA && resB) {
            updateSession(session.id, (prevSession) => {
                const currentState = prevSession.context.generationState || {};
                return {
                    context: {
                        ...prevSession.context,
                        generationState: {
                            ...currentState,
                            A: resA,
                            B: resB
                        }
                    }
                };
            });
        }
    };

    const handleNext = () => {
        if (!session || !selectedSide) return;
        const finalJsonStr = selectedSide === 'A' ? jsonA : jsonB;

        try {
            const json = JSON.parse(finalJsonStr);
            updateSession(session.id, {
                currentStepId: 'vocabulary',
                context: { ...session.context, articleJson: json },
                steps: session.steps.map(s =>
                    s.id === 'article-generation' ? { ...s, status: 'completed' } :
                        s.id === 'vocabulary' ? { ...s, status: 'running' } : s
                )
            });
        } catch (e) {
            alert("选中的 JSON 格式无效，请检查内容。");
        }
    };

    // View Mode State (independent for each side)
    const [viewModeA, setViewModeA] = useState<'json' | 'preview'>('preview');
    const [viewModeB, setViewModeB] = useState<'json' | 'preview'>('preview');

    const handleRegenerateBriefingField = async (side: 'A' | 'B', field: BriefingFieldKey) => {
        await generateSide(side, { briefingTarget: field });
    };

    // ... (existing code)

    // Helper to render the preview content
    const renderPreview = (jsonStr: string) => {
        try {
            if (!jsonStr) return <div className="p-8 text-center text-muted-foreground">暂无内容</div>;
            const root = JSON.parse(jsonStr);
            const data = root.article || root; // Support both nested and flat for backward compatibility

            return (
                <div className="h-full overflow-y-auto p-6 space-y-6 text-sm">
                    {/* Header */}
                    <div className="space-y-4 border-b border-white/10 pb-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-primary">{data.title?.en || "No Title"}</h2>
                            <h3 className="text-lg text-slate-300">{data.title?.zh || data.title?.cn || "无标题"}</h3>
                        </div>
                        {(data.intro?.text || data.briefing) && (
                            <div className="p-4 rounded-lg bg-white/5 space-y-2">
                                <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Briefing</div>
                                <p className="text-slate-300 leading-relaxed">{data.intro?.text || data.briefing}</p>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {data.paragraphs?.map((para: any, idx: number) => {
                            // Handle both new TokienizedSentence structure and old simple structure
                            // New structure: paragraph.tokenizedSentences array
                            // Old/Simpler? structure maybe simple paragraph object

                            // Check if it's the complex nested structure
                            const sentences = para.paragraph?.tokenizedSentences || (Array.isArray(para) ? para : []);
                            const simpleEn = para.en;
                            const simpleCn = para.cn;

                            if (simpleEn) {
                                // Fallback to flat structure if available
                                return (
                                    <div key={idx} className="space-y-1">
                                        <p className="text-slate-200 leading-relaxed font-medium">{simpleEn}</p>
                                        <p className="text-slate-400 leading-relaxed text-xs">{simpleCn}</p>
                                    </div>
                                );
                            }

                            if (sentences.length > 0) {
                                // Reconstruct paragraph from sentences
                                // Handle both object tokens (with value/word) and string tokens
                                const enText = sentences.map((s: any) => {
                                    if (!s.tokens) return '';
                                    if (Array.isArray(s.tokens)) {
                                        return s.tokens.map((t: any) => {
                                            if (typeof t === 'string') return t;
                                            return t.text || t.value || t.word || '';
                                        }).join('');
                                    }
                                    return '';
                                }).join(' ');

                                const cnText = sentences.map((s: any) => s.zh).join('。');

                                return (
                                    <div key={idx} className="space-y-1">
                                        <p className="text-slate-200 leading-relaxed font-medium">{enText}</p>
                                        <p className="text-slate-400 leading-relaxed text-xs">{cnText}</p>
                                    </div>
                                );
                            }

                            return null;
                        }) || (
                                <div className="text-red-400">无法预览：JSON 结构不符合预期</div>
                            )}
                    </div>
                </div>
            );
        } catch (e) {
            console.error("Preview Render Error:", e);
            return (
                <div className="p-8 flex flex-col items-center justify-center text-red-400 gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    <p>JSON 解析失败，请检查原始数据。</p>
                    <p className="text-xs text-muted-foreground">{String(e)}</p>
                </div>
            );
        }
    };

    // Helper to render a column
    const renderColumn = (side: 'A' | 'B', status: string, json: string, error: string) => {
        const isSelected = selectedSide === side;
        const title = side === 'A' ? "Style A: The Old Editor" : "Style B: The Show-off";
        const desc = side === 'A' ? "精准、克制、新闻专业风" : "华丽、复杂、炫技风";
        const viewMode = side === 'A' ? viewModeA : viewModeB;
        const setViewMode = side === 'A' ? setViewModeA : setViewModeB;

        return (
            <div
                onClick={() => status === 'success' && setSelectedSide(side)}
                className={cn(
                    "flex-1 flex flex-col border rounded-xl overflow-hidden transition-all relative",
                    isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-white/10 bg-black/20 hover:bg-black/30",
                    status === 'success' ? "opacity-100" : "opacity-90",
                    // Disable pointer events for selection if clicking inside interactive elements
                    ""
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-start bg-black/20">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", side === 'A' ? "bg-blue-400" : "bg-purple-400")} />
                            <h4 className="font-bold text-sm">{title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>

                    {/* Mode Toggle & Rewrite */}
                    <div className="flex items-center gap-3">
                        {status === 'success' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    generateSide(side, { isRewrite: true }); // Trigger rewrite
                                }}
                                className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center gap-1 text-slate-300 transition-colors"
                                title="基于当前审计结果重写"
                            >
                                <RefreshCw className="w-3 h-3" /> 重写
                            </button>
                        )}

                        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={cn(
                                    "px-3 py-1 text-xs rounded-md transition-all font-medium",
                                    viewMode === 'preview' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                                )}
                            >
                                预览
                            </button>
                            <button
                                onClick={() => setViewMode('json')}
                                className={cn(
                                    "px-3 py-1 text-xs rounded-md transition-all font-medium",
                                    viewMode === 'json' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                                )}
                            >
                                JSON
                            </button>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative min-h-[600px] flex flex-col">
                    {status === 'generating' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-4">
                                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground animate-pulse">正在以此风格生成文章...</span>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 text-red-400 text-xs font-mono break-all">
                            <AlertTriangle className="w-4 h-4 mb-2" />
                            {error}
                        </div>
                    )}

                    {/* View: JSON Editor */}
                    <div className={cn("flex-1 relative", viewMode === 'json' ? "block" : "hidden")}>
                        <textarea
                            value={json}
                            onChange={(e) => side === 'A' ? setJsonA(e.target.value) : setJsonB(e.target.value)}
                            placeholder={status === 'idle' ? "等待生成..." : ""}
                            spellCheck={false}
                            className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-xs text-green-400 focus:outline-none resize-none leading-relaxed"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* View: Preview */}
                    <div
                        className={cn("flex-1 relative bg-black/10 flex flex-col", viewMode === 'preview' ? "block" : "hidden")}
                        onClick={(e) => e.stopPropagation()} // Prevent selection when clicking valid preview content interactions
                    >
                        <div className="flex-1 overflow-hidden">
                            {renderPreview(json)}
                        </div>

                        {/* Audit Panel (only in preview mode and success status) */}
                        {status === 'success' && (
                            <div className="p-4 border-t border-white/5 bg-black/20">
                                <AuditStatus
                                    json={json}
                                    side={side}
                                    onRegenerateBriefingField={handleRegenerateBriefingField}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action (Implicit Selection Hint) */}
                {status === 'success' && !isSelected && (
                    <div className="absolute bottom-4 right-4 bg-black/80 text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 pointer-events-none z-20">
                        点击卡片选中
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Bot className="w-6 h-6 text-green-400" />
                        文章生成 (A/B Test)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        主题: {session?.context.topic}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateAll}
                        disabled={statusA === 'generating' || statusB === 'generating'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {(statusA === 'generating' || statusB === 'generating') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        全部生成
                    </button>

                    <button
                        onClick={async () => {
                            if (!session || !selectedSide) return;
                            const json = selectedSide === 'A' ? jsonA : jsonB;
                            try {
                                const payload = {
                                    article: JSON.parse(json),
                                    glossary: session.context.glossary,
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
                        disabled={!selectedSide}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                        title="立即上传当前进度到数据库"
                    >
                        <Upload className="w-4 h-4" />
                        上传
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!selectedSide}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-4">
                {renderColumn('A', statusA, jsonA, errorA)}
                {renderColumn('B', statusB, jsonB, errorB)}
            </div>
        </div>
    );
};
