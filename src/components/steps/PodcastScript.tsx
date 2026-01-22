import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Mic, RefreshCw, ChevronRight, Copy, Check, Play } from 'lucide-react';

export const PodcastScript: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();
    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [script, setScript] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    // Initialize from session context if available
    useEffect(() => {
        if (session?.context.podcastScript) {
            setScript(session.context.podcastScript);
            setStatus('success');
        }
    }, [session?.context.podcastScript]);

    const handleGenerate = async () => {
        if (!session?.context.articleJson) {
            setError('没有可用的文章数据，请先完成 Step 2。');
            return;
        }

        setStatus('generating');
        setError('');

        try {
            const res = await fetch('/api/podcast-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleJson: session.context.articleJson,
                    glossary: session.context.glossary
                })
            });

            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setError(data.error);
            } else {
                setStatus('success');
                const generatedScript = data.script || data;
                setScript(generatedScript);
                updateSession(session.id, {
                    context: { ...session.context, podcastScript: generatedScript }
                });
            }
        } catch (e) {
            setStatus('error');
            setError(String(e));
        }
    };

    // 复制到剪贴板
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'audio-synthesis',
            context: { ...session.context, podcastScript: script },
            steps: session.steps.map(s =>
                s.id === 'podcast-script' ? { ...s, status: 'completed' } :
                    s.id === 'audio-synthesis' ? { ...s, status: 'running' } : s
            )
        });
    };

    const wordCount = script.split(/\s+/).filter(Boolean).length;
    const charCount = script.length;

    return (
        <div className="space-y-4 h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Mic className="w-6 h-6 text-purple-400" />
                        播客脚本 (Podcast Script)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        生成中英双语播客讲解脚本，适用于 TTS 合成。
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={status === 'generating'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {status === 'generating' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {script ? '重新生成' : '生成脚本'}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!script}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Stats Bar */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>字符: <strong className="text-foreground">{charCount}</strong></span>
                <span>词数: <strong className="text-foreground">{wordCount}</strong></span>
                {script && (
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? '已复制' : '复制脚本'}
                    </button>
                )}
            </div>

            {/* Script Editor */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {status === 'generating' && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <RefreshCw className="w-10 h-10 animate-spin text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">正在生成播客脚本...</p>
                        </div>
                    </div>
                )}

                {status !== 'generating' && !script && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        点击 "生成脚本" 开始
                    </div>
                )}

                {script && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Preview Header */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-widest">脚本预览</span>
                            <div className="flex items-center gap-2">
                                <Play className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">预计时长: ~{Math.ceil(charCount / 200)} 分钟</span>
                            </div>
                        </div>

                        {/* Script Content */}
                        <textarea
                            value={script}
                            onChange={(e) => {
                                setScript(e.target.value);
                                if (session) {
                                    updateSession(session.id, {
                                        context: { ...session.context, podcastScript: e.target.value }
                                    });
                                }
                            }}
                            className="flex-1 w-full bg-card/30 border border-white/5 rounded-lg p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            placeholder="脚本内容将在此显示..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
