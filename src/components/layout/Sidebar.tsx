
import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Plus, Trash2, Circle, Clock, CheckCircle2, AlertCircle, PlayCircle, Settings as SettingsIcon, Database } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming I need a utils file for tailwind-merge

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'running': return <PlayCircle className="w-4 h-4 text-blue-400 animate-pulse" />;
        case 'waiting': return <Clock className="w-4 h-4 text-yellow-400" />;
        case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
        default: return <Circle className="w-4 h-4 text-slate-600" />;
    }
};


export const Sidebar: React.FC = () => {
    const { sessions, activeSessionId, createSession, switchSession, deleteSession } = useWorkflow();
    const [showDateModal, setShowDateModal] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);

    const handleCreateClick = () => {
        setShowDateModal(true);
    };

    const handleConfirmCreate = () => {
        createSession({ targetDate: selectedDate });
        setShowDateModal(false);
    };

    return (
        <div className="w-64 border-r border-white/10 bg-black/20 flex flex-col h-full backdrop-blur-sm relative">
            <div className="p-4 border-b border-white/5">
                <button
                    onClick={handleCreateClick}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-all active:scale-95 font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    New Workflow
                </button>
                <button
                    onClick={() => createSession({ isTestMode: true, title: '测试新闻工作流' })}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md transition-all active:scale-95 font-medium shadow-lg shadow-purple-500/20 mt-2"
                >
                    <Plus className="w-4 h-4" />
                    新增测试
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No active workflows
                    </div>
                )}

                {sessions.map(session => (
                    <div
                        key={session.id}
                        onClick={() => switchSession(session.id)}
                        className={cn(
                            "group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all border border-transparent",
                            activeSessionId === session.id
                                ? "bg-white/10 border-white/10 shadow-sm"
                                : "hover:bg-white/5 hover:border-white/5"
                        )}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <StatusIcon status={session.status} />
                            <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-medium text-slate-200">
                                    {session.title || 'Untitled Workflow'}
                                </span>
                                <span className="text-xs text-slate-500 truncate">
                                    {new Date(session.createdAt).toLocaleString('zh-CN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-2 border-t border-white/5 space-y-1">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('OPEN_DATABASE'))}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-medium">数据库</span>
                </button>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('OPEN_SETTINGS'))}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <SettingsIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Settings</span>
                </button>
                <div className="text-xs text-center text-slate-600 pb-2">
                    Content Workflow v0.1.0
                </div>
            </div>

            {/* Date Selection Modal */}
            {showDateModal && (
                <div className="absolute top-16 left-4 right-4 bg-slate-900 border border-white/10 shadow-xl rounded-lg p-4 z-50 animate-in zoom-in-95 duration-200">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        Select Topic Date
                    </h4>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white mb-4 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDateModal(false)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmCreate}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded transition-colors font-medium"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
