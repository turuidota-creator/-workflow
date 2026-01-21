
import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { StepId } from '../../types/workflow';

import { TopicDiscovery } from '../steps/TopicDiscovery';
import { ArticleGeneration } from '../steps/ArticleGeneration';
import { VocabularyCompletion } from '../steps/VocabularyCompletion';
import { PodcastScript } from '../steps/PodcastScript';
import { AudioSynthesis } from '../steps/AudioSynthesis';
import { PublishPreview } from '../steps/PublishPreview';
import { Publishing } from '../steps/Publishing';

const STEP_COMPONENTS: Record<StepId, React.FC> = {
    'topic-discovery': TopicDiscovery,
    'article-generation': ArticleGeneration,
    'vocabulary': VocabularyCompletion,
    'podcast-script': PodcastScript,
    'audio-synthesis': AudioSynthesis,
    'publish-preview': PublishPreview,
    'publishing': Publishing,
};


export const StepViewer: React.FC = () => {
    const { getActiveSession } = useWorkflow();
    const session = getActiveSession();

    if (!session) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select or create a workflow to get started.
            </div>
        );
    }

    const ActiveComponent = STEP_COMPONENTS[session.currentStepId];

    return (
        <div className="flex-1 flex flex-col h-full bg-background/50">
            <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-black/10 backdrop-blur-md">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">{session.title}</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">
                        {session.currentStepId.replace('-', ' ')}
                    </span>
                </div>

                {/* Stepper Visualization could go here */}
                <div className="flex items-center gap-2">
                    {session.steps.map((step, idx) => (
                        <div
                            key={step.id}
                            className={`h-2 w-2 rounded-full ${step.id === session.currentStepId ? 'bg-primary' : (
                                step.status === 'completed' ? 'bg-green-500' : 'bg-slate-700'
                            )}`}
                            title={step.label}
                        />
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 relative">
                <div className="max-w-5xl mx-auto w-full">
                    <div className="glass-card rounded-xl min-h-[500px] border border-white/5 p-1 shadow-2xl">
                        <ActiveComponent />
                    </div>
                </div>
            </main>
        </div>
    );
};
