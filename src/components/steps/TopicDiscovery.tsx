
import React, { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Search, Loader2, ChevronRight, ExternalLink, Sparkles, BookOpen, Users, AlertCircle } from 'lucide-react';
import { NewsItem } from '../../types/workflow';

// 研究结果结构
interface ResearchResult {
    summary: string;
    background: string;
    keyPoints: string[];
    perspectives: {
        supporters: string;
        critics: string;
    };
    relatedTopics: string[];
    sources: { title: string; url: string }[];
    topic: string;
}

// 类别颜色映射
const CATEGORY_COLORS: Record<string, string> = {
    '科技': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '国际': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    '政治': 'bg-red-500/20 text-red-400 border-red-500/30',
    '财经': 'bg-green-500/20 text-green-400 border-green-500/30',
    '默认': 'bg-white/5 text-slate-400 border-white/10'
};

// 默认推荐话题
const DEFAULT_TOPICS: NewsItem[] = [
    { category: '科技', source: 'Tech News', title: 'SpaceX Starship Launch Failure Analysis', link: '', raw: '【科技 | Tech News】SpaceX Starship Launch Failure Analysis' },
    { category: '科技', source: 'Tech News', title: 'Nvidia B200 Chip Architecture Breakdown', link: '', raw: '【科技 | Tech News】Nvidia B200 Chip Architecture Breakdown' },
    { category: '政治', source: 'World News', title: 'EU AI Act New Compliance Rules', link: '', raw: '【政治 | World News】EU AI Act New Compliance Rules' },
    { category: '财经', source: 'Finance', title: 'Bitcoin Halving Economic Impact', link: '', raw: '【财经 | Finance】Bitcoin Halving Economic Impact' },
    { category: '科技', source: 'AI News', title: 'DeepSeek vs OpenAI Technical Comparison', link: '', raw: '【科技 | AI News】DeepSeek vs OpenAI Technical Comparison' }
];

/**
 * 解析新闻标题格式：【类别 | 来源】标题（兼容旧版 API）
 */
function parseNewsTopic(rawTopic: string): NewsItem {
    const match = rawTopic.match(/^【(.+?)\s*\|\s*(.+?)】(.+)$/);
    if (match) {
        return {
            category: match[1].trim(),
            source: match[2].trim(),
            title: match[3].trim(),
            link: '',
            raw: rawTopic
        };
    }
    return {
        category: '科技',
        source: '未知来源',
        title: rawTopic,
        link: '',
        raw: rawTopic
    };
}

function normalizeResearchResult(data: unknown, fallbackTopic: string): ResearchResult | null {
    if (!data || typeof data !== 'object') {
        return null;
    }
    const record = data as Partial<ResearchResult>;
    const summary = typeof record.summary === 'string' ? record.summary : '';
    const background = typeof record.background === 'string' ? record.background : '';
    if (!summary && !background && !Array.isArray(record.keyPoints)) {
        return null;
    }
    return {
        summary,
        background,
        keyPoints: Array.isArray(record.keyPoints) ? record.keyPoints : [],
        perspectives: {
            supporters: typeof record.perspectives?.supporters === 'string' ? record.perspectives.supporters : '',
            critics: typeof record.perspectives?.critics === 'string' ? record.perspectives.critics : ''
        },
        relatedTopics: Array.isArray(record.relatedTopics) ? record.relatedTopics : [],
        sources: Array.isArray(record.sources) ? record.sources : [],
        topic: typeof record.topic === 'string' ? record.topic : fallbackTopic
    };
}

export const TopicDiscovery: React.FC = () => {
    const { updateSession, getActiveSession, sessions } = useWorkflow();
    const session = getActiveSession();

    // Initialize states (using previous logic for initial render)
    const [isSearching, setIsSearching] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(session?.context.topic || null);
    const [newsItems, setNewsItems] = useState<NewsItem[]>(
        session?.context.newsItems && session.context.newsItems.length > 0
            ? session.context.newsItems
            : DEFAULT_TOPICS
    );

    // 深度研究状态
    const [enableResearch, setEnableResearch] = useState(true);
    const [isResearching, setIsResearching] = useState(false);
    const [researchResult, setResearchResult] = useState<ResearchResult | null>(
        (session?.context.researchResult as unknown as ResearchResult) || null
    );
    const [researchError, setResearchError] = useState<string | null>(null);

    // Sync state when switching sessions
    React.useEffect(() => {
        if (session) {
            // Test Mode Logic
            if (session.context.isTestMode) {
                const testItem: NewsItem = {
                    category: '科技',
                    source: 'Test Source',
                    title: 'Test News Item for Workflow Verification',
                    link: '',
                    raw: '【测试 | Test Source】Test News Item for Workflow Verification'
                };
                setNewsItems([testItem]);
                setSelectedTopic(testItem.raw);
                setResearchResult(null);
                setIsSearching(false);
                setIsResearching(false);
                setResearchError(null);
                return;
            }

            setSelectedTopic(session.context.topic || null);
            setNewsItems(
                session.context.newsItems && session.context.newsItems.length > 0
                    ? session.context.newsItems
                    : DEFAULT_TOPICS
            );
            setResearchResult((session.context.researchResult as unknown as ResearchResult) || null);
            setIsSearching(false);
            setIsResearching(false);
            setResearchError(null);
        }
    }, [session?.id, session?.context?.isTestMode]);

    // 获取选中的新闻项
    const selectedNewsItem = useMemo(() => {
        return newsItems.find(item => item.raw === selectedTopic) || null;
    }, [newsItems, selectedTopic]);

    // 按类别分组并排序
    const groupedNews = useMemo(() => {
        // Pre-initialize strict categories to ensure consistent layout
        const groups: Record<string, NewsItem[]> = {
            '科技': [],
            '国际': [],
            '政治': [],
            '财经': []
        };

        newsItems.forEach(item => {
            if (!groups[item.category]) {
                // Determine if we should group unknown categories into '其他' or keep separate
                // For now, keep separate
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });

        const order = ['科技', '国际', '政治', '财经'];
        const allKeys = Array.from(new Set([...order, ...Object.keys(groups)]));

        const sortedKeys = allKeys.sort((a, b) => {
            const aIdx = order.indexOf(a);
            const bIdx = order.indexOf(b);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.localeCompare(b);
        });

        return sortedKeys.map(key => ({ category: key, items: groups[key] }));
    }, [newsItems]);

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const res = await fetch('/api/news/scan');
            const data = await res.json();
            let newItems: NewsItem[] = [];

            if (data.items && Array.isArray(data.items)) {
                newItems = data.items;
            } else if (data.topics && Array.isArray(data.topics)) {
                const parsed = data.topics.map(parseNewsTopic);
                newItems = parsed;
            }

            if (newItems.length > 0) {
                setNewsItems(newItems);
                // Persist news items to session context immediately
                const latestSession = getActiveSession();
                if (latestSession) {
                    updateSession(latestSession.id, {
                        context: {
                            ...latestSession.context,
                            newsItems: newItems
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to scan news:", e);
        } finally {
            setIsSearching(false);
        }
    };

    // 深度研究话题
    const handleResearch = async () => {
        if (!selectedNewsItem) return;

        setIsResearching(true);
        setResearchError(null);
        setResearchResult(null);

        try {
            const latestSession = getActiveSession();
            const res = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newsTitle: selectedNewsItem.title,
                    newsSource: selectedNewsItem.source,
                    topic: selectedTopic,
                    targetDate: latestSession?.context.targetDate // Pass the target date to backend
                })
            });

            const data = await res.json();

            if (data.error) {
                setResearchError(data.error);
            } else {
                const normalized = normalizeResearchResult(data, selectedTopic || '');
                if (normalized) {
                    setResearchResult(normalized);
                } else {
                    setResearchError('研究结果格式异常，请稍后重试。');
                }
            }
        } catch (e) {
            setResearchError(String(e));
        } finally {
            setIsResearching(false);
        }
    };

    const formatDateLabel = (targetDate: string) => {
        const [year, month, day] = targetDate.split('-');
        if (year && month && day) {
            return `${Number(month)}月${Number(day)}日`;
        }
        return targetDate;
    };

    const buildUniqueTitle = (targetDate: string, category: string) => {
        const baseTitle = `${formatDateLabel(targetDate)}${category}`;
        const usedTitles = new Set(
            sessions.filter(current => current.id !== session?.id).map(current => current.title)
        );
        if (!usedTitles.has(baseTitle)) {
            return baseTitle;
        }
        let index = 2;
        while (usedTitles.has(`${baseTitle}${index}`)) {
            index += 1;
        }
        return `${baseTitle}${index}`;
    };

    const handleConfirm = async () => {
        if (!session || !selectedTopic) return;

        // 如果启用了深度研究但还没有研究结果，先进行研究
        if (enableResearch && !researchResult && !isResearching) {
            await handleResearch();
            // 研究完成后再继续（此时 researchResult 会被更新）
        }

        const category = selectedNewsItem?.category;
        const nextTitle = category && session.context.targetDate
            ? buildUniqueTitle(session.context.targetDate, category)
            : session.title;

        // 更新 session，传递研究结果
        updateSession(session.id, {
            title: nextTitle,
            context: {
                ...session.context,
                category,
                topic: selectedTopic,
                researchResult: researchResult || undefined
            },
            currentStepId: 'article-generation',
            steps: session.steps.map(s =>
                s.id === 'topic-discovery' ? { ...s, status: 'completed' } :
                    s.id === 'article-generation' ? { ...s, status: 'running' } : s
            )
        });
    };

    const handleOpenLink = (e: React.MouseEvent, link: string) => {
        e.stopPropagation();
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const getCategoryStyle = (category: string) => {
        return CATEGORY_COLORS[category] || CATEGORY_COLORS['默认'];
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    选题搜索 (Topic Discovery)
                </h3>
                <p className="text-muted-foreground">
                    扫描过去 24 小时的高价值话题与新闻。
                </p>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="搜索关键词或使用默认新闻源..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '扫描新闻'}
                </button>
            </div>

            {/* 深度研究开关 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">深度研究模式</div>
                        <div className="text-xs text-muted-foreground">生成前自动搜索话题背景、正反方观点</div>
                    </div>
                </div>
                <button
                    onClick={() => setEnableResearch(!enableResearch)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${enableResearch ? 'bg-purple-500' : 'bg-slate-600'
                        }`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enableResearch ? 'left-7' : 'left-1'
                        }`} />
                </button>
            </div>

            {/* 按类别分列显示新闻 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px] max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                {groupedNews.map(group => (
                    <div key={group.category} className="space-y-3 p-3 rounded-xl bg-card/20 border border-white/5">
                        <div className="flex items-center gap-2 sticky top-0 bg-card/80 backdrop-blur-sm py-2 z-10">
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getCategoryStyle(group.category)}`}>
                                {group.category}
                            </span>
                            <span className="text-xs text-slate-500">
                                {group.items.length} 条
                            </span>
                        </div>
                        <div className="space-y-2">
                            {group.items.map((item, idx) => (
                                <div
                                    key={`${group.category}-${idx}`}
                                    onClick={() => {
                                        setSelectedTopic(item.raw);
                                        setResearchResult(null);
                                    }}
                                    className={`
                                        group p-3 rounded-lg border cursor-pointer transition-all
                                        ${selectedTopic === item.raw
                                            ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                                            : 'bg-card/30 border-white/5 hover:bg-card/50 hover:border-white/10'
                                        }
                                    `}
                                >
                                    <h4 className={`text-sm font-medium line-clamp-2 ${selectedTopic === item.raw ? 'text-primary' : 'text-foreground'}`}>
                                        {item.title}
                                    </h4>
                                    {item.title_zh && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {item.title_zh}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                                            {item.source}
                                        </span>
                                        {item.link && (
                                            <button
                                                onClick={(e) => handleOpenLink(e, item.link)}
                                                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                                title="在新窗口打开原文"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 研究结果预览 */}
            {selectedTopic && enableResearch && (
                <div className="space-y-4">
                    {/* 手动触发研究按钮 */}
                    {!researchResult && !isResearching && (
                        <button
                            onClick={handleResearch}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            预览深度研究结果
                        </button>
                    )}

                    {/* 研究进行中 */}
                    {isResearching && (
                        <div className="flex items-center justify-center gap-3 p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                            <span className="text-purple-300">正在搜索话题背景信息...</span>
                        </div>
                    )}

                    {/* 研究错误 */}
                    {researchError && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{researchError}</span>
                        </div>
                    )}

                    {/* 研究结果展示 */}
                    {researchResult && (
                        <div className="space-y-4 p-4 rounded-xl bg-gradient-to-b from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                            <div className="flex items-center gap-2 text-purple-300 font-medium">
                                <BookOpen className="w-4 h-4" />
                                深度研究结果
                            </div>

                            {/* 摘要 */}
                            <div className="text-sm text-muted-foreground">
                                {researchResult.summary}
                            </div>

                            {/* 关键要点 */}
                            {researchResult.keyPoints?.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">关键要点</div>
                                    <ul className="space-y-1">
                                        {researchResult.keyPoints.slice(0, 3).map((point, i) => (
                                            <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                                                <span className="text-primary">•</span>
                                                <span className="line-clamp-2">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* 多方观点 */}
                            {researchResult.perspectives && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <div className="flex items-center gap-1 text-xs text-green-400 mb-1">
                                            <Users className="w-3 h-3" />
                                            支持方
                                        </div>
                                        <p className="text-xs text-foreground/70 line-clamp-3">
                                            {researchResult.perspectives.supporters}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <div className="flex items-center gap-1 text-xs text-red-400 mb-1">
                                            <Users className="w-3 h-3" />
                                            反对方
                                        </div>
                                        <p className="text-xs text-foreground/70 line-clamp-3">
                                            {researchResult.perspectives.critics}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 来源数量 */}
                            {researchResult.sources?.length > 0 && (
                                <div className="text-xs text-slate-500">
                                    📚 已参考 {researchResult.sources.length} 个信息来源
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedTopic || isResearching}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isResearching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            研究中...
                        </>
                    ) : (
                        <>
                            {enableResearch && !researchResult ? '研究并生成' : '生成文章'}
                            <ChevronRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
