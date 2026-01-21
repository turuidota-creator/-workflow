import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Volume2, RefreshCw, ChevronRight, TestTube2, Play, Pause, Download, Settings2 } from 'lucide-react';

// 模拟音频 URL - 用于测试
const MOCK_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export const AudioSynthesis: React.FC = () => {
    const { getActiveSession, updateSession } = useWorkflow();
    const session = getActiveSession();
    const [status, setStatus] = useState<'idle' | 'synthesizing' | 'success' | 'error'>('idle');
    const [audioUrl, setAudioUrl] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Initialize from session context if available
    useEffect(() => {
        if (session?.context.podcastUrl) {
            setAudioUrl(session.context.podcastUrl);
            setStatus('success');
        }
    }, [session?.context.podcastUrl]);

    // Update playback speed
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    const handleSynthesize = async () => {
        if (!session?.context.podcastScript) {
            setError('没有可用的播客脚本，请先完成 Step 4。');
            return;
        }

        setStatus('synthesizing');
        setError('');
        setProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + 10;
            });
        }, 500);

        try {
            const res = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    script: session.context.podcastScript
                })
            });

            clearInterval(progressInterval);
            const data = await res.json();

            if (data.error) {
                setStatus('error');
                setError(data.error);
                setProgress(0);
            } else {
                setStatus('success');
                setProgress(100);
                const url = data.audioUrl || data.url;
                setAudioUrl(url);
                updateSession(session.id, {
                    context: { ...session.context, podcastUrl: url }
                });
            }
        } catch (e) {
            clearInterval(progressInterval);
            setStatus('error');
            setError(String(e));
            setProgress(0);
        }
    };

    // 使用测试数据
    const useTestData = () => {
        setAudioUrl(MOCK_AUDIO_URL);
        setStatus('success');
        setProgress(100);
        setError('');
        if (session) {
            updateSession(session.id, {
                context: { ...session.context, podcastUrl: MOCK_AUDIO_URL }
            });
        }
    };

    // 播放/暂停
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // 下载音频
    const handleDownload = () => {
        if (audioUrl) {
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `podcast_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleNext = () => {
        if (!session) return;
        updateSession(session.id, {
            currentStepId: 'publish-preview',
            context: { ...session.context, podcastUrl: audioUrl },
            steps: session.steps.map(s =>
                s.id === 'audio-synthesis' ? { ...s, status: 'completed' } :
                    s.id === 'publish-preview' ? { ...s, status: 'running' } : s
            )
        });
    };

    return (
        <div className="space-y-4 h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Volume2 className="w-6 h-6 text-green-400" />
                        音频合成 (Audio Synthesis)
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        使用 TTS 引擎将播客脚本转换为音频文件。
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* 测试数据按钮 */}
                    <button
                        onClick={useTestData}
                        className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        <TestTube2 className="w-4 h-4" />
                        使用测试数据
                    </button>

                    <button
                        onClick={handleSynthesize}
                        disabled={status === 'synthesizing'}
                        className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        {status === 'synthesizing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {audioUrl ? '重新合成' : '开始合成'}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!audioUrl}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Progress Bar */}
            {status === 'synthesizing' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>正在合成音频...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-card/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {status !== 'synthesizing' && !audioUrl && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Volume2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>点击 "开始合成" 或 "使用测试数据" 生成音频</p>
                        </div>
                    </div>
                )}

                {audioUrl && (
                    <div className="flex-1 flex flex-col">
                        {/* Audio Player Card */}
                        <div className="bg-card/30 border border-white/5 rounded-xl p-6 space-y-4">
                            {/* Waveform Placeholder */}
                            <div className="h-24 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-green-500/10 rounded-lg flex items-center justify-center">
                                <div className="flex items-end gap-1 h-16">
                                    {[...Array(40)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1.5 bg-green-500/50 rounded-full animate-pulse"
                                            style={{
                                                height: `${Math.random() * 100}%`,
                                                animationDelay: `${i * 50}ms`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Play/Pause */}
                                    <button
                                        onClick={togglePlay}
                                        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white transition-all"
                                    >
                                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                                    </button>

                                    {/* Speed Control */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowSettings(!showSettings)}
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Settings2 className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                        {showSettings && (
                                            <div className="flex items-center gap-2 bg-card/50 rounded-lg px-3 py-1">
                                                <span className="text-xs text-muted-foreground">速度:</span>
                                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => setPlaybackSpeed(speed)}
                                                        className={`px-2 py-1 text-xs rounded ${playbackSpeed === speed ? 'bg-green-500 text-white' : 'hover:bg-white/10'}`}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Download */}
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    下载音频
                                </button>
                            </div>

                            {/* Hidden Audio Element */}
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        </div>

                        {/* Info */}
                        <div className="mt-4 text-sm text-muted-foreground">
                            <p>音频 URL: <code className="bg-card/50 px-2 py-0.5 rounded text-xs">{audioUrl}</code></p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
