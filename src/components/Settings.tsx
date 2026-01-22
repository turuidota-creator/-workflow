
import { useState, useEffect } from 'react';
import { Save, CheckCircle2, Terminal, Key, Cpu, Sparkles, FileText } from 'lucide-react';

// 可选模型列表
const AVAILABLE_MODELS = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: '最强大，适合复杂任务' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: '快速响应，适合简单任务' },
    { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', description: '稳定版本' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '旧版快速模型' },
];

export const Settings = () => {
    const [apiKey, setApiKey] = useState('');
    const [articleModel, setArticleModel] = useState('gemini-3-pro-preview');
    const [researchModel, setResearchModel] = useState('gemini-3-flash-preview');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [testOutput, setTestOutput] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    // Prompt Editor State
    const [selectedPromptKey, setSelectedPromptKey] = useState('article-system');
    const [promptContent, setPromptContent] = useState('');
    const [promptStatus, setPromptStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

    useEffect(() => {
        // Load config on mount
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (data.GEMINI_API_KEY) setApiKey(data.GEMINI_API_KEY);
                if (data.ARTICLE_MODEL) setArticleModel(data.ARTICLE_MODEL);
                if (data.RESEARCH_MODEL) setResearchModel(data.RESEARCH_MODEL);
            })
            .catch(err => console.error("Failed to load config", err));

        // Load initial prompt
        loadPromptContent('article-system');
    }, []);

    // Effect to reload prompt when selection changes
    useEffect(() => {
        loadPromptContent(selectedPromptKey);
    }, [selectedPromptKey]);

    const loadPromptContent = async (key: string) => {
        setPromptStatus('loading');
        try {
            const res = await fetch(`/api/prompts?key=${key}`);
            const data = await res.json();
            if (data.content !== undefined) {
                setPromptContent(data.content);
                setPromptStatus('idle');
            } else {
                setPromptStatus('error');
            }
        } catch (e) {
            setPromptStatus('error');
        }
    };

    const loadPrompt = () => loadPromptContent(selectedPromptKey);

    const savePrompt = async () => {
        setPromptStatus('saving');
        try {
            const res = await fetch('/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: selectedPromptKey, content: promptContent })
            });
            if (res.ok) {
                setPromptStatus('success');
                setTimeout(() => setPromptStatus('idle'), 2000);
            } else {
                setPromptStatus('error');
            }
        } catch (e) {
            setPromptStatus('error');
        }
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    GEMINI_API_KEY: apiKey,
                    ARTICLE_MODEL: articleModel,
                    RESEARCH_MODEL: researchModel
                })
            });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestOutput('Sending request to Gemini...');
        try {
            const res = await fetch('/api/test-gemini', {
                method: 'POST'
            });
            const data = await res.json();
            setTestOutput(JSON.stringify(data, null, 2));
        } catch (e) {
            setTestOutput(JSON.stringify({ error: String(e) }, null, 2));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto p-8">
            <div className="space-y-2">
                <h3 className="text-2xl font-bold">设置 (Settings)</h3>
                <p className="text-muted-foreground">配置 API 密钥和模型选择。</p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-6">
                {/* API Key Section */}
                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        Gemini API Key
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Model Selection Section */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        模型配置
                    </h4>

                    {/* Article Generation Model */}
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            文章生成模型
                        </label>
                        <select
                            value={articleModel}
                            onChange={(e) => setArticleModel(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                            {AVAILABLE_MODELS.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Research Model */}
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            深度研究模型
                        </label>
                        <select
                            value={researchModel}
                            onChange={(e) => setResearchModel(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                            {AVAILABLE_MODELS.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Prompt Configuration Section */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        提示词配置 (Prompt Configuration)
                    </h4>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <select
                                value={selectedPromptKey}
                                onChange={(e) => setSelectedPromptKey(e.target.value)}
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                            >
                                <option value="article-system">文章生成提示词 (System Prompt)</option>
                                <option value="research-template">深度研究提示词 (Research Template)</option>
                                <option value="vocabulary-system">词汇提取提示词 (Vocabulary System)</option>
                                <option value="style-old-editor">风格A提示词 (Style: Old Editor)</option>
                                <option value="style-show-off">风格B提示词 (Style: Show-off)</option>
                            </select>
                            <button
                                onClick={loadPrompt}
                                className="px-3 bg-secondary hover:bg-secondary/80 rounded-lg border border-white/5 transition-colors"
                                title="Reload"
                            >
                                ↺
                            </button>
                        </div>

                        <div className="relative">
                            <textarea
                                value={promptContent}
                                onChange={(e) => setPromptContent(e.target.value)}
                                className="w-full h-64 bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                                placeholder="Select a prompt to edit..."
                            />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button
                                    onClick={savePrompt}
                                    disabled={promptStatus === 'saving'}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg"
                                >
                                    {promptStatus === 'saving' ? 'Saving...' : 'Save Prompt'}
                                </button>
                            </div>
                        </div>
                        {promptStatus === 'success' && <p className="text-xs text-green-400">Prompt saved successfully!</p>}
                        {promptStatus === 'error' && <p className="text-xs text-red-400">Failed to save prompt.</p>}
                    </div>
                </div>

                {/* Save Button (Global Config) */}
                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={handleSave}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {status === 'saving' ? '保存中...' : status === 'success' ? '已保存' : '保存配置'}
                    </button>
                    {status === 'success' && <p className="text-xs text-green-400 mt-2 text-center">配置已保存到 .env 文件</p>}
                </div>

                {/* API Test Section */}
                <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" />
                            API 连接测试
                        </label>
                        <button
                            onClick={handleTest}
                            disabled={isTesting || !apiKey}
                            className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded border border-white/5 transition-colors disabled:opacity-50"
                        >
                            {isTesting ? '测试中...' : '测试连接'}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute top-0 left-0 w-full h-8 bg-black/40 rounded-t-lg flex items-center px-4 border-b border-white/5">
                            <span className="text-[10px] text-muted-foreground font-mono">OUTPUT LOG</span>
                        </div>
                        <textarea
                            readOnly
                            value={testOutput}
                            className="w-full h-48 bg-black/40 border border-white/10 rounded-lg pt-10 pb-4 px-4 font-mono text-xs text-green-400 focus:outline-none resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
