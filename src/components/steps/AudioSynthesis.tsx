import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Volume2, RefreshCw, ChevronRight, Play, Pause, UploadCloud, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AudioState {
    status: 'idle' | 'synthesizing' | 'success' | 'error';
    url: string;
    error: string;
    progress: number;
    uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
    isPlaying: boolean;
    playbackSpeed: number;
}

export const AudioSynthesis: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();

    // Separate states
    const [audio10, setAudio10] = useState<AudioState>({
        status: session?.context.podcastUrl ? 'success' : 'idle',
        url: session?.context.podcastUrl || '',
        error: '',
        progress: 0,
        uploadStatus: 'idle',
        isPlaying: false,
        playbackSpeed: 1
    });

    const [audio7, setAudio7] = useState<AudioState>({
        status: session?.context.podcastUrl7 ? 'success' : 'idle',
        url: session?.context.podcastUrl7 || '',
        error: '',
        progress: 0,
        uploadStatus: 'idle',
        isPlaying: false,
        playbackSpeed: 1
    });

    const audioRef10 = useRef<HTMLAudioElement>(null);
    const audioRef7 = useRef<HTMLAudioElement>(null);

    // Sync speed to refs
    useEffect(() => {
        if (audioRef10.current) audioRef10.current.playbackRate = audio10.playbackSpeed;
    }, [audio10.playbackSpeed]);

    useEffect(() => {
        if (audioRef7.current) audioRef7.current.playbackRate = audio7.playbackSpeed;
    }, [audio7.playbackSpeed]);

    const handleSynthesize = async (level: '10' | '7') => {
        // Re-fetch the latest session to avoid stale closure values
        const latestSession = getActiveSession();
        const script = level === '10' ? latestSession?.context.podcastScript : latestSession?.context.podcastScript7;
        const set = level === '10' ? setAudio10 : setAudio7;

        if (!script) {
            set(prev => ({ ...prev, status: 'error', error: '没有对应的播客脚本' }));
            return;
        }

        set(prev => ({ ...prev, status: 'synthesizing', error: '', progress: 0, uploadStatus: 'idle' }));

        const progressInterval = setInterval(() => {
            set(prev => {
                if (prev.progress >= 90) return prev;
                return { ...prev, progress: prev.progress + 10 };
            });
        }, 500);

        try {
            const res = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script })
            });

            const data = await res.json();

            clearInterval(progressInterval);

            if (data.error) {
                set(prev => ({ ...prev, status: 'error', error: data.error, progress: 0 }));
            } else {
                const tempUrl = data.audioUrl || data.url;
                set(prev => ({ ...prev, status: 'success', url: tempUrl, progress: 100 }));

                // Update Session immediately for temp persistence
                if (latestSession) {
                    const updateKey = level === '10' ? 'podcastUrl' : 'podcastUrl7';
                    updateSession(latestSession.id, {
                        context: { ...latestSession.context, [updateKey]: tempUrl }
                    });
                }
            }
        } catch (e) {
            clearInterval(progressInterval);
            set(prev => ({ ...prev, status: 'error', error: String(e), progress: 0 }));
        }
    };

    const handleUpload = async (level: '10' | '7') => {
        // CRITICAL: Re-fetch the latest session to avoid stale closure values
        const latestSession = getActiveSession();
        if (!latestSession) return;

        const set = level === '10' ? setAudio10 : setAudio7;
        const state = level === '10' ? audio10 : audio7;

        // Critical: Determine target article ID. 
        // L10 users existing articleId. 
        // L7 needs a new one if not exists.
        const targetArticleId = level === '10' ? latestSession.context.articleId : latestSession.context.articleId7;

        // Debug log
        console.log('[AudioSynthesis] handleUpload called', {
            level,
            targetArticleId,
            hasArticleId: !!latestSession.context.articleId,
            hasArticleId7: !!latestSession.context.articleId7,
        });

        if (!state.url) return;
        if (!targetArticleId) {
            set(prev => ({ ...prev, uploadStatus: 'error', error: `请先上传 Level ${level} 文章，生成对应的文章记录后再上传播客。` }));
            return;
        }

        // Strict Check: Don't allow uploading to local temporary IDs
        // The spec requires that the article must be synced to PocketBase (real ID) before attaching audio.
        if (targetArticleId.startsWith('article_')) {
            set(prev => ({ ...prev, uploadStatus: 'error', error: `当前文章 ID 为本地临时 ID (${targetArticleId})。请返回文章页面点击“上传”按钮同步到数据库后，再尝试上传音频。` }));
            return;
        }

        set(prev => ({ ...prev, uploadStatus: 'uploading', error: '' }));

        try {
            const payload = {
                articleId: targetArticleId,
                audioUrl: state.url,
                podcast_script: level === '10' ? latestSession.context.podcastScript : latestSession.context.podcastScript7,
            };

            const res = await fetch('/api/podcast-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();

            // Update URL to permanent one
            if (data?.podcastUrl) {
                set(prev => ({ ...prev, url: data.podcastUrl }));

                // Update Session
                const urlKey = level === '10' ? 'podcastUrl' : 'podcastUrl7';
                updateSession(latestSession.id, {
                    context: { ...latestSession.context, [urlKey]: data.podcastUrl }
                });
            }

            // If we got a new article ID (e.g. for L7), save it!
            if (data?.articleId && level === '7') {
                updateSession(latestSession.id, {
                    context: { ...latestSession.context, articleId7: data.articleId }
                });
            }

            set(prev => ({ ...prev, uploadStatus: 'success' }));
        } catch (e) {
            set(prev => ({ ...prev, uploadStatus: 'error', error: `上传失败: ${String(e)}` }));
        }
    };

    const togglePlay = (level: '10' | '7') => {
        const ref = level === '10' ? audioRef10 : audioRef7;
        const set = level === '10' ? setAudio10 : setAudio7;
        const state = level === '10' ? audio10 : audio7;

        if (ref.current) {
            if (state.isPlaying) ref.current.pause();
            else ref.current.play();
            set(prev => ({ ...prev, isPlaying: !state.isPlaying }));
        }
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'publish-preview',
            context: {
                ...session.context,
                podcastUrl: audio10.url,
                podcastUrl7: audio7.url,
            },
            steps: session.steps.map(s =>
                s.id === 'audio-synthesis' ? { ...s, status: 'completed' } :
                    s.id === 'publish-preview' ? { ...s, status: 'running' } : s
            )
        });
    };

    const AudioCard = ({ level, state, set, title, color }: { level: '10' | '7', state: AudioState, set: React.Dispatch<React.SetStateAction<AudioState>>, title: string, color: string }) => {
        const ref = level === '10' ? audioRef10 : audioRef7;
        const isUploaded = !!state.url && !state.url.includes('/temp/');

        return (
            <div className="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", color)} />
                        <span className="font-bold text-sm text-slate-300">{title}</span>
                    </div>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-center space-y-4">
                    {state.status === 'synthesizing' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Generating...</span>
                                <span>{state.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-card/50 rounded-full overflow-hidden">
                                <div className={cn("h-full transition-all duration-300", color.replace('bg-', 'bg-'))} style={{ width: `${state.progress}%` }} />
                            </div>
                        </div>
                    )}

                    {state.error && <p className="text-red-400 text-xs">{state.error}</p>}

                    {state.url && (
                        <div className="space-y-4">
                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => togglePlay(level)}
                                    className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-lg", color)}
                                >
                                    {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpload(level)}
                                        disabled={state.uploadStatus === 'uploading' || isUploaded}
                                        className={cn(
                                            "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                            isUploaded
                                                ? "bg-green-500/20 text-green-400 border-green-500/20"
                                                : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                                        )}
                                    >
                                        {state.uploadStatus === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isUploaded ? <Check className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                        {isUploaded ? '已上传' : '上传到云端'}
                                    </button>
                                </div>
                            </div>

                            {/* Audio Element */}
                            <audio
                                ref={ref}
                                src={state.url}
                                onEnded={() => set(prev => ({ ...prev, isPlaying: false }))}
                                onPlay={() => set(prev => ({ ...prev, isPlaying: true }))}
                                onPause={() => set(prev => ({ ...prev, isPlaying: false }))}
                            />
                        </div>
                    )}

                    {!state.url && state.status !== 'synthesizing' && (
                        <div className="flex justify-center py-8">
                            <button
                                onClick={() => handleSynthesize(level)}
                                className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                开始合成
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Volume2 className="w-6 h-6 text-green-400" />
                        音频合成 (Audio Synthesis)
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleNext}
                        // Only require one audio to proceed? Or both? Let's say at least one.
                        disabled={!audio10.url && !audio7.url}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                <AudioCard level="10" state={audio10} set={setAudio10} title="Level 10 Audio" color="bg-purple-500" />
                <AudioCard level="7" state={audio7} set={setAudio7} title="Level 7 Audio" color="bg-green-500" />
            </div>
        </div>
    );
};
