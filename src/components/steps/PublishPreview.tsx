import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Eye, RefreshCw, ChevronRight, Database, Edit3, Check, AlertCircle, Copy } from 'lucide-react';

interface SchemaField {
    name: string;
    type: string;
    required: boolean;
    description: string;
}

export const PublishPreview: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();
    const [schema, setSchema] = useState<SchemaField[]>([]);
    const [payload, setPayload] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [copied, setCopied] = useState(false);

    // 从 session context 聚合数据
    useEffect(() => {
        if (session?.context) {
            const ctx = session.context;
            const meta = ctx.articleJson?.meta || {};
            const aggregated: Record<string, any> = {
                date: meta.date || new Date().toISOString().split('T')[0],
                level: meta.level || ctx.level || '10',
                topic: meta.topic || ctx.topic || '科技',
                title_zh: ctx.articleJson?.title?.zh || meta.title_zh || meta.title || ctx.topic || '',
                title_en: ctx.articleJson?.title?.en || meta.title_en || meta.title || '',
                intro: ctx.articleJson?.intro || (meta.briefing ? { text: meta.briefing } : {}),
                content: ctx.articleJson
                    ? { meta, paragraphs: ctx.articleJson.paragraphs || [] }
                    : {},
                glossary: ctx.glossary || {},
                podcast_script: ctx.podcastScript || '',
                podcast_url: ctx.podcastUrl || '',
            };

            // Use finalPayload if exists, otherwise use aggregated
            setPayload(ctx.finalPayload || aggregated);
        }
    }, [session?.context]);

    // 获取服务器 Schema
    const fetchSchema = async () => {
        setStatus('loading');
        setError('');

        try {
            const res = await fetch('/api/schema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: 'articles' })
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                const message = data?.error || '读取服务器字段失败，请检查后端连接。';
                setError(message);
                setStatus('error');
                return;
            }

            setSchema(data.schema || []);
            setStatus('ready');
        } catch (e) {
            setError(`读取服务器字段失败：${String(e)}`);
            setStatus('error');
        }
    };

    // 自动加载 schema
    useEffect(() => {
        if (status === 'idle') {
            fetchSchema();
        }
    }, [status]);

    // 更新字段值
    const updateField = (fieldName: string, value: any) => {
        const updated = { ...payload, [fieldName]: value };
        setPayload(updated);
        if (session) {
            updateSession(session.id, {
                context: { ...session.context, finalPayload: updated }
            });
        }
    };

    // 复制 JSON
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };

    // 验证数据
    const validatePayload = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        schema.forEach(field => {
            if (field.required && !payload[field.name]) {
                errors.push(`${field.name} 是必填字段`);
            }
        });
        return { valid: errors.length === 0, errors };
    };

    const validation = validatePayload();

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'publishing',
            context: { ...session.context, finalPayload: payload },
            steps: session.steps.map(s =>
                s.id === 'publish-preview' ? { ...s, status: 'completed' } :
                    s.id === 'publishing' ? { ...s, status: 'running' } : s
            )
        });
    };

    // 渲染字段编辑器
    const renderFieldEditor = (field: SchemaField) => {
        const value = payload[field.name];
        const isJson = field.type === 'json';

        if (!editMode) {
            const preview = isJson ? JSON.stringify(value ?? null) ?? '' : String(value || '-');
            return (
                <div className="text-sm text-foreground truncate">
                    {isJson ? (
                        <span className="text-muted-foreground font-mono text-xs">
                            {preview.slice(0, 100)}...
                        </span>
                    ) : (
                        preview
                    )}
                </div>
            );
        }

        if (isJson) {
            return (
                <textarea
                    value={typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2) ?? ''}
                    onChange={(e) => {
                        try {
                            updateField(field.name, JSON.parse(e.target.value));
                        } catch {
                            // Keep as string if not valid JSON
                        }
                    }}
                    className="w-full h-24 bg-card/50 border border-white/10 rounded px-2 py-1 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
            );
        }

        if (field.type === 'number') {
            return (
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => updateField(field.name, parseInt(e.target.value) || 0)}
                    className="w-full bg-card/50 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
            );
        }

        return (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-full bg-card/50 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
        );
    };

    return (
        <div className="space-y-4 h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Eye className="w-6 h-6 text-blue-400" />
                        发布预览 (Publish Preview)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        查看并编辑即将上传到服务器的数据。
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchSchema}
                        disabled={status === 'loading'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {status === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        读取服务器字段
                    </button>

                    <button
                        onClick={() => setEditMode(!editMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${editMode ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                        <Edit3 className="w-4 h-4" />
                        {editMode ? '完成编辑' : '编辑模式'}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!validation.valid || status !== 'ready'}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        发布
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error/Validation Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <strong>读取失败：</strong> {error}
                    </div>
                </div>
            )}

            {!validation.valid && !error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <strong>校验失败：</strong>
                        <ul className="list-disc ml-4 mt-1">
                            {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex gap-4">
                {/* Left: Schema Fields */}
                <div className="w-1/2 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">服务器字段</h4>
                        <span className="text-xs text-muted-foreground">{schema.length} 个字段</span>
                    </div>

                    <div className="space-y-2">
                        {schema.map(field => (
                            <div
                                key={field.name}
                                className="bg-card/30 border border-white/5 rounded-lg p-3 hover:bg-card/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-medium">{field.name}</span>
                                        <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-muted-foreground">{field.type}</span>
                                        {field.required && (
                                            <span className="text-xs text-red-400">*必填</span>
                                        )}
                                    </div>
                                    {payload[field.name] && (
                                        <Check className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                                {renderFieldEditor(field)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: JSON Preview */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">JSON 预览</h4>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                    <div className="flex-1 bg-card/30 border border-white/5 rounded-lg p-4 overflow-auto">
                        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                            {JSON.stringify(payload, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
