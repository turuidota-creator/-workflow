
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

    return (
        <div className="w-64 border-r border-white/10 bg-black/20 flex flex-col h-full backdrop-blur-sm">
            <div className="p-4 border-b border-white/5">
                <button
                    onClick={createSession}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-all active:scale-95 font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    New Workflow
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
                                    {new Date(session.createdAt).toLocaleTimeString()}
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
        </div>
    );
};
