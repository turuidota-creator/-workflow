import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Upload, RefreshCw, Check, AlertCircle, ExternalLink, Copy, CheckCircle2, XCircle } from 'lucide-react';

interface PublishResult {
    success: boolean;
    articleId?: string;
    glossaryCount?: number;
    error?: string;
    url?: string;
}

export const Publishing: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();
    const [status, setStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<PublishResult | null>(null);
    const [copied, setCopied] = useState(false);

    // Check if we have data to publish
    const hasData = session?.context.finalPayload || session?.context.articleJson;

    const handlePublish = async () => {
        if (!session) return;

        const payload = session.context.finalPayload || {
            article: session.context.articleJson,
            glossary: session.context.glossary,
            podcast_script: session.context.podcastScript,
            podcast_url: session.context.podcastUrl,
        };

        setStatus('publishing');
        setResult(null);

        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setResult({ success: false, error: data.error });
            } else {
                setStatus('success');
                setResult({
                    success: true,
                    articleId: data.articleId || data.id,
                    glossaryCount: data.glossaryCount,
                    url: data.url
                });

                // Mark workflow as completed
                updateSession(session.id, {
                    status: 'completed',
                    steps: session.steps.map(s =>
                        s.id === 'publishing' ? { ...s, status: 'completed' } : s
                    )
                });
            }
        } catch (e) {
            setStatus('error');
            setResult({ success: false, error: String(e) });
        }
    };

    // 模拟发布（用于测试）
    const simulatePublish = () => {
        setStatus('publishing');
        setResult(null);

        setTimeout(() => {
            setStatus('success');
            setResult({
                success: true,
                articleId: 'article_' + Date.now(),
                glossaryCount: Object.keys(session?.context.glossary || {}).length,
                url: 'https://readread.app/articles/example'
            });

            if (session) {
                updateSession(session.id, {
                    status: 'completed',
                    steps: session.steps.map(s =>
                        s.id === 'publishing' ? { ...s, status: 'completed' } : s
                    )
                });
            }
        }, 2000);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };

    const handleNewWorkflow = () => {
        // Could reset or create new workflow
        window.location.reload();
    };

    return (
        <div className="space-y-6 h-full flex flex-col p-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent flex items-center justify-center gap-3">
                    <Upload className="w-8 h-8 text-emerald-400" />
                    最终发布 (Publishing)
                </h3>
                <p className="text-muted-foreground text-sm mt-2">
                    将文章、词汇表和播客数据上传至 PocketBase 后端。
                </p>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center">
                {status === 'idle' && (
                    <div className="text-center space-y-6 max-w-md">
                        {/* Pre-publish Summary */}
                        <div className="bg-card/30 border border-white/5 rounded-xl p-6 text-left space-y-3">
                            <h4 className="font-medium text-lg mb-4">📦 即将发布的内容</h4>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">文章标题</span>
                                <span className="font-medium truncate max-w-[200px]">
                                    {session?.context.articleJson?.meta?.title || session?.context.topic || '未命名'}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">词汇数量</span>
                                <span className="font-medium">
                                    {Object.keys(session?.context.glossary || {}).length} 词
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">播客脚本</span>
                                <span className={`font-medium ${session?.context.podcastScript ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {session?.context.podcastScript ? '✓ 已生成' : '未生成'}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">音频文件</span>
                                <span className={`font-medium ${session?.context.podcastUrl ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {session?.context.podcastUrl ? '✓ 已合成' : '未合成'}
                                </span>
                            </div>
                        </div>

                        {/* Publish Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handlePublish}
                                disabled={!hasData}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="w-5 h-5" />
                                发布到 PocketBase
                            </button>

                            <button
                                onClick={simulatePublish}
                                className="w-full flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 px-6 py-2 rounded-xl font-medium transition-all"
                            >
                                模拟发布 (测试)
                            </button>
                        </div>

                        {!hasData && (
                            <p className="text-sm text-red-400">
                                没有可发布的数据，请先完成前面的步骤。
                            </p>
                        )}
                    </div>
                )}

                {status === 'publishing' && (
                    <div className="text-center space-y-4">
                        <RefreshCw className="w-16 h-16 animate-spin text-emerald-400 mx-auto" />
                        <p className="text-lg text-muted-foreground">正在发布中...</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            上传文章数据
                        </div>
                    </div>
                )}

                {status === 'success' && result && (
                    <div className="text-center space-y-6 max-w-md">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        </div>

                        <div>
                            <h4 className="text-2xl font-bold text-emerald-400 mb-2">发布成功！</h4>
                            <p className="text-muted-foreground">文章和相关数据已成功上传。</p>
                        </div>

                        <div className="bg-card/30 border border-white/5 rounded-xl p-4 text-left space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">文章 ID</span>
                                <div className="flex items-center gap-2">
                                    <code className="bg-card/50 px-2 py-0.5 rounded text-xs">{result.articleId}</code>
                                    <button
                                        onClick={() => handleCopy(result.articleId || '')}
                                        className="text-blue-400 hover:text-blue-300"
                                    >
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>

                            {result.glossaryCount !== undefined && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">同步词汇</span>
                                    <span className="font-medium">{result.glossaryCount} 词</span>
                                </div>
                            )}

                            {result.url && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">文章链接</span>
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                    >
                                        查看 <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleNewWorkflow}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-all"
                        >
                            开始新的工作流
                        </button>
                    </div>
                )}

                {status === 'error' && result && (
                    <div className="text-center space-y-6 max-w-md">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="w-12 h-12 text-red-400" />
                        </div>

                        <div>
                            <h4 className="text-2xl font-bold text-red-400 mb-2">发布失败</h4>
                            <p className="text-muted-foreground">请检查错误信息并重试。</p>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-left">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{result.error}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setStatus('idle')}
                            className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-xl font-medium transition-all"
                        >
                            返回重试
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
