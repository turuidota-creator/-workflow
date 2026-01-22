import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Mic, RefreshCw, ChevronRight, Copy, Check, AlertCircle, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ScriptResult {
    status: 'idle' | 'generating' | 'success' | 'error';
    text: string;
    error: string;
}

export const PodcastScript: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // Independent states
    const [script10, setScript10] = useState<ScriptResult>({
        status: session?.context.podcastScript ? 'success' : 'idle',
        text: session?.context.podcastScript || '',
        error: ''
    });

    const [script7, setScript7] = useState<ScriptResult>({
        status: session?.context.podcastScript7 ? 'success' : 'idle',
        text: session?.context.podcastScript7 || '',
        error: ''
    });

    // Update session when local state changes (debounced or immediate)
    useEffect(() => {
        if (!session) return;
        if (script10.text !== (session.context.podcastScript || '')) {
            updateSession(session.id, { context: { ...session.context, podcastScript: script10.text } });
        }
    }, [script10.text]);

    useEffect(() => {
        if (!session) return;
        if (script7.text !== (session.context.podcastScript7 || '')) {
            updateSession(session.id, { context: { ...session.context, podcastScript7: script7.text } });
        }
    }, [script7.text]);

    const handleGenerate = async (level: '10' | '7') => {
        const targetArticle = level === '10' ? session?.context.articleJson : session?.context.articleJson7;
        // For simple dictionary, use the global glossary (since we merged words) or better yet, if we had separated glossaries
        // For now, use the main glossary
        const glossary = session?.context.glossary || {};

        if (!targetArticle) {
            const set = level === '10' ? setScript10 : setScript7;
            set(prev => ({ ...prev, status: 'error', error: '没有对应的文章数据' }));
            return;
        }

        const set = level === '10' ? setScript10 : setScript7;
        set(prev => ({ ...prev, status: 'generating', error: '' }));

        try {
            const res = await fetch('/api/podcast-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleJson: targetArticle,
                    glossary,
                    level // Optional hint to backend if needed
                })
            });

            const data = await res.json();

            if (data.error) {
                set(prev => ({ ...prev, status: 'error', error: data.error }));
            } else {
                const generatedText = data.script || data;
                set(prev => ({ ...prev, status: 'success', text: generatedText }));
            }
        } catch (e) {
            set(prev => ({ ...prev, status: 'error', error: String(e) }));
        }
    };

    // Copy helper
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    };

    const ScriptEditor = ({
        level,
        state,
        setState,
        title,
        color,
        hasSource
    }: {
        level: '10' | '7',
        state: ScriptResult,
        setState: React.Dispatch<React.SetStateAction<ScriptResult>>,
        title: string,
        color: string,
        hasSource: boolean
    }) => {
        const [showCopyTick, setShowCopyTick] = useState(false);

        if (!hasSource) {
            return (
                <div className="flex-1 border border-white/5 rounded-xl bg-black/20 flex flex-col items-center justify-center text-muted-foreground p-6 opacity-50">
                    <p>Level {level} 文章数据缺失</p>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20">
                {/* Header */}
                <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", color)} />
                        <span className="font-bold text-sm text-slate-300">{title}</span>
                    </div>
                    <div className="flex gap-2">
                        {state.text && (
                            <button
                                onClick={async () => {
                                    if (await copyToClipboard(state.text)) {
                                        setShowCopyTick(true);
                                        setTimeout(() => setShowCopyTick(false), 2000);
                                    }
                                }}
                                className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                title="复制全文"
                            >
                                {showCopyTick ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        )}
                        <button
                            onClick={() => handleGenerate(level)}
                            disabled={state.status === 'generating'}
                            className="px-2 py-1 text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded flex items-center gap-1 transition-colors"
                        >
                            {state.status === 'generating' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            {state.text ? '重写' : '生成'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative min-h-[400px]">
                    {state.status === 'generating' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div className="p-4 text-red-400 text-xs">{state.error}</div>
                    )}

                    <textarea
                        value={state.text}
                        onChange={(e) => setState(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full h-full bg-transparent p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none leading-relaxed"
                        placeholder="点击生成按钮自动撰写播客脚本..."
                    />
                </div>

                {state.text && (
                    <div className="px-3 py-1 bg-black/40 text-[10px] text-slate-500 border-t border-white/5 flex justify-between">
                        <span>~{Math.ceil(state.text.length / 200)} mins</span>
                        <span>{state.text.length} chars</span>
                    </div>
                )}
            </div>
        );
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'audio-synthesis',
            steps: session.steps.map(s =>
                s.id === 'podcast-script' ? { ...s, status: 'completed' } :
                    s.id === 'audio-synthesis' ? { ...s, status: 'running' } : s
            )
        });
    };

    return (
        <div className="space-y-4 h-full flex flex-col relative">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Mic className="w-6 h-6 text-purple-400" />
                        播客脚本 (L10 & L7)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        分别为 Level 10 原文和 Level 7 改写版本生成播客脚本。
                    </p>
                </div>
                <div>
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
                <ScriptEditor
                    level="10"
                    state={script10}
                    setState={setScript10}
                    title="Level 10 Script"
                    color="bg-purple-500"
                    hasSource={!!session?.context.articleJson}
                />
                <ScriptEditor
                    level="7"
                    state={script7}
                    setState={setScript7}
                    title="Level 7 Script"
                    color="bg-green-500"
                    hasSource={!!session?.context.articleJson7}
                />
            </div>
        </div>
    );
};
