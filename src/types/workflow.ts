
export type WorkflowStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed';

export type StepId =
    | 'topic-discovery'
    | 'article-generation'
    | 'vocabulary'
    | 'podcast-script'
    | 'audio-synthesis'
    | 'publish-preview'
    | 'publishing';

export interface WorkflowStep {
    id: StepId;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    data?: any; // Flexible data for each step
}

export interface NewsItem {
    category: string;
    source: string;
    title: string;
    link: string;
    raw: string;
}

export interface WorkflowSession {
    id: string;
    title: string; // e.g., "Topic: AI Sovereignty"
    createdAt: number;
    status: WorkflowStatus;
    currentStepId: StepId;
    steps: WorkflowStep[];
    // Data accumulator
    context: {
        targetDate?: string; // e.g. "2024-01-20"
        category?: string;
        topic?: string;
        newsItems?: NewsItem[]; // Persist searched news
        level?: string;
        articleId?: string;
        articleJson?: any; // The main article object
        glossary?: any;
        podcastScript?: string;
        podcastUrl?: string;
        finalPayload?: any; // Edited payload before publishing
        researchResult?: {  // 深度研究结果
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
        };
        generationState?: {
            A?: { status: string; json: string; error: string; };
            B?: { status: string; json: string; error: string; };
        };
    };
}

export const INITIAL_STEPS: WorkflowStep[] = [
    { id: 'topic-discovery', label: '选题搜索', status: 'pending' },
    { id: 'article-generation', label: '文章生成', status: 'pending' },
    { id: 'vocabulary', label: '词汇补全', status: 'pending' },
    { id: 'podcast-script', label: '播客脚本', status: 'pending' },
    { id: 'audio-synthesis', label: '音频合成', status: 'pending' },
    { id: 'publish-preview', label: '发布预览', status: 'pending' },
    { id: 'publishing', label: '最终发布', status: 'pending' },
];
