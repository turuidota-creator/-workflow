
import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Bot, FileJson, Play, CheckCircle2, AlertTriangle, RefreshCw, MousePointerClick } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ArticleGeneration: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // State for two separate generations
    const [statusA, setStatusA] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [jsonA, setJsonA] = useState<string>('');
    const [errorA, setErrorA] = useState('');

    const [statusB, setStatusB] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [jsonB, setJsonB] = useState<string>('');
    const [errorB, setErrorB] = useState('');

    // Selection
    const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);

    // Mock data for testing
    const MOCK_ARTICLE = {
        article: {
            meta: {
                id: "20260122_test_topic",
                slug: "test-topic",
                title: "Test Article: Tech Industry Trends",
                level: "10",
                topic: "科技",
                date: new Date().toISOString().split('T')[0],
                wordCount: 350,
                briefing: {
                    what: "Major technology companies announce new AI initiatives",
                    who: "Global tech giants including Google, Microsoft, and emerging startups",
                    when: "January 2026",
                    impact: "Expected to reshape the industry landscape"
                }
            },
            title: {
                type: "title",
                id: "title-test",
                zh: "测试文章：科技行业趋势",
                en: "Test Article: Tech Industry Trends"
            },
            intro: {
                type: "intro",
                id: "intro-test",
                text: "2026年1月，全球科技巨头纷纷宣布新的人工智能计划，预计将重塑行业格局。"
            },
            paragraphs: [
                {
                    type: "paragraph",
                    id: "p1",
                    paragraph: {
                        id: "p1",
                        tokenizedSentences: [
                            {
                                id: "s1-test",
                                tokens: [
                                    { text: "The", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "technology", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "industry", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "is", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "undergoing", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "rapid", type: "word" },
                                    { text: " ", type: "space" },
                                    { text: "transformation", type: "word" },
                                    { text: ".", type: "punctuation" }
                                ],
                                zh: "科技行业正在经历快速转型。",
                                analysis: {
                                    grammar: "简单句，主语+谓语+宾语结构",
                                    explanation: "人话：科技圈正在大变样。"
                                }
                            }
                        ]
                    }
                }
            ]
        },
        glossary: {}
    };

    const useTestData = (side: 'A' | 'B') => {
        const setJson = side === 'A' ? setJsonA : setJsonB;
        const setStatus = side === 'A' ? setStatusA : setStatusB;
        setJson(JSON.stringify(MOCK_ARTICLE, null, 2));
        setStatus('success');
    };

    const generateSide = async (side: 'A' | 'B') => {
        if (!session?.context.topic) return;

        const setStatus = side === 'A' ? setStatusA : setStatusB;
        const setJson = side === 'A' ? setJsonA : setJsonB;
        const setError = side === 'A' ? setErrorA : setErrorB;

        setStatus('generating');
        setError('');

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: session.context.topic,
                    level: "10",
                    style: side
                })
            });

            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setError(data.error);
                if (data.raw) setJson(data.raw);
            } else {
                setStatus('success');
                setJson(JSON.stringify(data, null, 2));
            }
        } catch (e) {
            setStatus('error');
            setError(String(e));
        }
    };

    const handleGenerateAll = () => {
        generateSide('A');
        generateSide('B');
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

    // Helper to render a column
    const renderColumn = (side: 'A' | 'B', status: string, json: string, error: string) => {
        const isSelected = selectedSide === side;
        const title = side === 'A' ? "Style A: The Old Editor" : "Style B: The Show-off";
        const desc = side === 'A' ? "精准、克制、新闻专业风" : "华丽、复杂、炫技风";

        return (
            <div
                onClick={() => status === 'success' && setSelectedSide(side)}
                className={cn(
                    "flex-1 flex flex-col border rounded-xl overflow-hidden transition-all cursor-pointer relative",
                    isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-white/10 bg-black/20 hover:bg-black/30",
                    status === 'success' ? "opacity-100" : "opacity-90"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", side === 'A' ? "bg-blue-400" : "bg-purple-400")} />
                            <h4 className="font-bold text-sm">{title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>

                {/* Content Area */}
                <div className="flex-1 relative min-h-0">
                    {status === 'generating' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 text-red-400 text-xs font-mono break-all">
                            <AlertTriangle className="w-4 h-4 mb-2" />
                            {error}
                        </div>
                    )}

                    <textarea
                        value={json}
                        onChange={(e) => side === 'A' ? setJsonA(e.target.value) : setJsonB(e.target.value)}
                        placeholder={status === 'idle' ? "等待生成..." : ""}
                        readOnly={false}
                        className="w-full h-full bg-transparent p-4 font-mono text-xs text-green-400 focus:outline-none resize-none leading-relaxed"
                        onClick={(e) => e.stopPropagation()} // Allow editing without triggering selection maybe? Actually selection is fine.
                    />
                </div>

                {/* Footer Action (Implicit Selection) */}
                {status === 'success' && !isSelected && (
                    <div className="absolute bottom-4 right-4 bg-black/80 text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 pointer-events-none">
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
                        onClick={() => { useTestData('A'); useTestData('B'); }}
                        className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        使用测试数据
                    </button>

                    <button
                        onClick={handleGenerateAll}
                        disabled={statusA === 'generating' || statusB === 'generating'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {(statusA === 'generating' || statusB === 'generating') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        全部生成
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!selectedSide}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        确认选择 ({selectedSide || 'None'})
                        <CheckCircle2 className="w-4 h-4" />
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
