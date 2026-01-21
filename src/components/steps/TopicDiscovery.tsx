
import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Search, Loader2, Newspaper, ChevronRight } from 'lucide-react';

const SUGGESTED_TOPICS = [
    "SpaceX Starship Launch Failure Analysis",
    "Nvidia B200 Chip Architecture Breakdown",
    "EU AI Act New Compliance Rules",
    "Bitcoin Halving Economic Impact",
    "DeepSeek vs OpenAI Technical Comparison"
];

export const TopicDiscovery: React.FC = () => {
    const { updateSession, getActiveSession } = useWorkflow();
    const session = getActiveSession();
    const [isSearching, setIsSearching] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(session?.context.topic || null);
    const [searchResults, setSearchResults] = useState(SUGGESTED_TOPICS);

    const handleSearch = () => {
        setIsSearching(true);
        // Simulate API call to 'news-researcher'
        setTimeout(() => {
            setIsSearching(false);
        }, 1500);
    };

    const handleConfirm = () => {
        if (session && selectedTopic) {
            updateSession(session.id, {
                context: { ...session.context, topic: selectedTopic },
                currentStepId: 'article-generation',
                steps: session.steps.map(s =>
                    s.id === 'topic-discovery' ? { ...s, status: 'completed' } :
                        s.id === 'article-generation' ? { ...s, status: 'running' } : s
                )
            });
        }
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

            <div className="grid gap-3">
                {searchResults.map((topic, idx) => (
                    <div
                        key={idx}
                        onClick={() => setSelectedTopic(topic)}
                        className={`
                group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                ${selectedTopic === topic
                                ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                                : 'bg-card/30 border-white/5 hover:bg-card/50 hover:border-white/10'
                            }
            `}
                    >
                        <div className={`p-3 rounded-full ${selectedTopic === topic ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}>
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-medium ${selectedTopic === topic ? 'text-primary' : 'text-foreground'}`}>
                                {topic}
                            </h4>
                            <div className="flex gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">科技</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">重点关注</span>
                            </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTopic === topic ? 'border-primary' : 'border-slate-600'}`}>
                            {selectedTopic === topic && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedTopic}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    生成文章
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
