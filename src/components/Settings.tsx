
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
        console.log('[Settings] Loading prompt:', key);
        try {
            const res = await fetch(`/api/prompts?key=${key}`);
            console.log('[Settings] Response status:', res.status);
            const data = await res.json();
            console.log('[Settings] Response data:', data);
            if (data.content !== undefined) {
                setPromptContent(data.content);
                setPromptStatus('idle');
            } else {
                console.error('[Settings] No content field in response:', data);
                setPromptStatus('error');
            }
        } catch (e) {
            console.error('[Settings] Fetch error:', e);
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
        <div className="h-full flex gap-4 bg-transparent p-4 overflow-hidden">
            {/* Left Column: Configuration (30%) */}
            <div className="w-[350px] shrink-0 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {/* Global Save Button - Top Access */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 sticky top-0 z-10 backdrop-blur-md">
                        <button
                            onClick={handleSave}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {status === 'saving' ? '保存中...' : status === 'success' ? '全局配置已保存' : '保存全局配置'}
                        </button>
                    </div>

                    <div className="glass-card p-4 rounded-xl space-y-4 border border-white/5 bg-black/20">
                        {/* API Key Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                                <Key className="w-4 h-4 text-primary" />
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none font-mono text-xs text-slate-300 transition-all focus:bg-black/60"
                            />
                        </div>

                        {/* Model Selection Section */}
                        <div className="pt-3 border-t border-white/10 space-y-3">
                            <h4 className="text-xs font-medium flex items-center gap-2 text-slate-400 uppercase tracking-wider">
                                <Cpu className="w-3 h-3" />
                                Model Config
                            </h4>

                            <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <FileText className="w-3 h-3" />
                                    文章生成模型
                                </label>
                                <div className="relative">
                                    <select
                                        value={articleModel}
                                        onChange={(e) => setArticleModel(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary text-slate-300 transition-all hover:bg-black/50"
                                    >
                                        {AVAILABLE_MODELS.map(model => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-2.5 pointer-events-none opacity-50 text-[10px]">▼</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" />
                                    深度研究模型
                                </label>
                                <div className="relative">
                                    <select
                                        value={researchModel}
                                        onChange={(e) => setResearchModel(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary text-slate-300 transition-all hover:bg-black/50"
                                    >
                                        {AVAILABLE_MODELS.map(model => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-2.5 pointer-events-none opacity-50 text-[10px]">▼</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Test Section */}
                    <div className="glass-card p-4 rounded-xl space-y-3 border border-white/5 bg-black/20">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2 text-slate-300">
                                <Terminal className="w-4 h-4 text-green-400" />
                                API Test
                            </label>
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !apiKey}
                                className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors disabled:opacity-50"
                            >
                                {isTesting ? 'Testing...' : 'Run Test'}
                            </button>
                        </div>
                        <div className="relative group">
                            <div className="absolute top-0 left-0 w-full h-6 bg-black/60 rounded-t-lg flex items-center px-3 border-b border-white/5">
                                <span className="text-[10px] text-muted-foreground font-mono">console.log</span>
                            </div>
                            <textarea
                                readOnly
                                value={testOutput}
                                className="w-full h-32 bg-black/80 border border-white/10 rounded-lg pt-8 pb-2 px-3 font-mono text-[10px] text-green-400 focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Prompt Editor (70%) */}
            <div className="flex-1 flex flex-col bg-black/20 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 text-primary">
                            <FileText className="w-5 h-5" />
                            <h3 className="font-bold text-sm">Prompt Engineering</h3>
                        </div>
                        <div className="h-4 w-px bg-white/10 mx-2" />
                        <select
                            value={selectedPromptKey}
                            onChange={(e) => setSelectedPromptKey(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none text-xs min-w-[300px] text-slate-200"
                        >
                            <option value="article-system">文章生成提示词 (System Prompt)</option>
                            <option value="research-template">深度研究提示词 (Research Template)</option>
                            <option value="vocabulary-system">词汇提取提示词 (Vocabulary System)</option>
                            <option value="style-old-editor">风格A提示词 (Style: Old Editor)</option>
                            <option value="style-show-off">风格B提示词 (Style: Show-off)</option>
                            <option value="article-refinement">文章修正提示词 (Refinement Loop)</option>
                            <option value="article-evaluation-briefing">Briefing重写提示词 (Briefing Update)</option>
                            <option value="article-evaluation-analysis">语法分析重写提示词 (Analysis Update)</option>
                            <option value="vocabulary-ask">词汇提取用户指令 (Vocabulary User Prompt)</option>
                            <option value="article-research-context">生成上下文: 深度研究 (Deep Research Context)</option>
                            <option value="article-basic-context">生成上下文: 基础 (Basic Context)</option>
                            <option value="article-task-instruction">生成指令模板 (Task Instruction)</option>
                        </select>
                        <button
                            onClick={loadPrompt}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Reload from Disk"
                        >
                            ↺
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {promptStatus === 'success' && <span className="text-xs text-green-400 animate-in fade-in slide-in-from-right-2">Saved!</span>}
                        {promptStatus === 'error' && <span className="text-xs text-red-400">Error!</span>}
                        <button
                            onClick={savePrompt}
                            disabled={promptStatus === 'saving'}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-primary/10 flex items-center gap-2"
                        >
                            {promptStatus === 'saving' ? 'Saving...' : (
                                <>
                                    <Save className="w-3 h-3" />
                                    Save Prompt
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-black/40">
                    <textarea
                        value={promptContent}
                        onChange={(e) => setPromptContent(e.target.value)}
                        className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed selection:bg-primary/30"
                        placeholder="Select a prompt to start editing..."
                        spellCheck={false}
                    />
                </div>
                <div className="px-4 py-1 bg-black/60 border-t border-white/5 text-[10px] text-slate-500 flex justify-between">
                    <span>Markdown Enabled</span>
                    <span>Lines: {promptContent.split('\n').length} | Chars: {promptContent.length}</span>
                </div>
            </div>
        </div>
    );
};
