
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowSession, INITIAL_STEPS } from '../types/workflow';

interface WorkflowContextType {
    sessions: WorkflowSession[];
    activeSessionId: string | null;
    createSession: (initialContext?: Record<string, any>) => void;
    switchSession: (id: string) => void;
    updateSession: (id: string, updates: Partial<WorkflowSession> | ((prev: WorkflowSession) => Partial<WorkflowSession>)) => void;
    deleteSession: (id: string) => void;
    getActiveSession: () => WorkflowSession | undefined;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const useWorkflow = () => {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within a WorkflowProvider');
    }
    return context;
};

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sessions, setSessions] = useState<WorkflowSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const saveTimers = useRef<Map<string, number>>(new Map());
    const pendingSaves = useRef<Map<string, WorkflowSession>>(new Map());

    const serializeSession = useCallback((session: WorkflowSession) => {
        // Clone context to avoid mutating original
        const contextClone = { ...session.context };

        // Extract fields to be stored in separate DB columns
        const context2 = contextClone.generationState?.B ?? undefined;
        const context_7 = contextClone.articleJson7 ?? undefined;
        const podcast_script_wf = contextClone.podcastScript ?? undefined;
        const podcast_script_wf_7 = contextClone.podcastScript7 ?? undefined;

        // Remove offloaded fields from main context to save space
        if (contextClone.generationState) {
            const { B, ...restGenState } = contextClone.generationState;
            contextClone.generationState = Object.keys(restGenState).length > 0 ? restGenState as any : undefined;
        }
        delete contextClone.articleJson7;
        delete contextClone.podcastScript7;
        // Keep podcastScript in context for backward compatibility reads, but also store in dedicated field

        return {
            title: session.title,
            status: session.status,
            currentStepId: session.currentStepId,
            steps: session.steps,
            context: contextClone,
            createdAt: session.createdAt,
            // New distributed fields
            context2,
            context_7,
            podcast_script_wf,
            podcast_script_wf_7
        };
    }, []);

    const deserializeSession = useCallback((record: any): WorkflowSession => {
        const createdAt = typeof record.createdAt === 'number'
            ? record.createdAt
            : record.created
                ? new Date(record.created).getTime()
                : Date.now();
        const context = record.context ?? {};

        // Reassemble distributed fields back into context
        // podcast_script_wf -> podcastScript
        if (!context.podcastScript && record.podcast_script_wf) {
            context.podcastScript = record.podcast_script_wf;
        }
        // podcast_script_wf_7 -> podcastScript7
        if (!context.podcastScript7 && record.podcast_script_wf_7) {
            context.podcastScript7 = record.podcast_script_wf_7;
        }
        // context_7 -> articleJson7
        if (!context.articleJson7 && record.context_7) {
            context.articleJson7 = record.context_7;
        }
        // context2 -> generationState.B
        if (record.context2) {
            context.generationState = context.generationState ?? {};
            if (!context.generationState.B) {
                context.generationState.B = record.context2;
            }
        }

        return {
            id: record.id,
            title: record.title ?? 'New Workflow',
            status: record.status ?? 'idle',
            currentStepId: record.currentStepId ?? 'topic-discovery',
            steps: Array.isArray(record.steps) ? record.steps : JSON.parse(JSON.stringify(INITIAL_STEPS)),
            context,
            createdAt
        };
    }, []);

    const request = useCallback(async (url: string, options: RequestInit) => {
        const headers = new Headers(options.headers);
        const rawAuth = window.localStorage.getItem('pb_auth');
        if (rawAuth) {
            try {
                const auth = JSON.parse(rawAuth) as { token?: string };
                if (auth?.token && !headers.has('Authorization')) {
                    headers.set('Authorization', auth.token);
                }
            } catch {
                // ignore malformed auth
            }
        }
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed (${response.status}): ${errorText}`);
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    }, []);

    const scheduleSave = useCallback((session: WorkflowSession) => {
        pendingSaves.current.set(session.id, session);
        const existing = saveTimers.current.get(session.id);
        if (existing) {
            window.clearTimeout(existing);
        }
        const timer = window.setTimeout(async () => {
            const latest = pendingSaves.current.get(session.id);
            if (!latest) return;
            pendingSaves.current.delete(session.id);
            saveTimers.current.delete(session.id);
            try {
                await request(`/api/workflow-sessions/${session.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serializeSession(latest))
                });
            } catch (error) {
                console.error('Failed to save workflow session', error);
            }
        }, 800);
        saveTimers.current.set(session.id, timer);
    }, [request, serializeSession]);

    // Load from PocketBase on mount
    useEffect(() => {
        let isMounted = true;
        const loadSessions = async () => {
            try {
                const data = await request('/api/workflow-sessions?sort=-updated', { method: 'GET' });
                const records = Array.isArray(data?.items) ? data.items : [];
                if (!isMounted) return;
                const loadedSessions = records.map(deserializeSession);
                setSessions(loadedSessions);
                if (loadedSessions.length > 0) {
                    setActiveSessionId(loadedSessions[0].id);
                }
            } catch (error) {
                console.error('Failed to load workflow sessions', error);
            }
        };
        void loadSessions();
        return () => {
            isMounted = false;
            saveTimers.current.forEach(timer => window.clearTimeout(timer));
            saveTimers.current.clear();
            pendingSaves.current.clear();
        };
    }, [deserializeSession, request]);

    const createSession = useCallback((initialContext: Record<string, any> = {}) => {
        const newSession: WorkflowSession = {
            id: '',
            title: 'New Workflow',
            createdAt: Date.now(),
            status: 'idle',
            currentStepId: 'topic-discovery',
            steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
            context: initialContext
        };

        void (async () => {
            try {
                const record = await request('/api/workflow-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serializeSession(newSession))
                });
                const savedSession = deserializeSession(record);
                setSessions(prev => [savedSession, ...prev]);
                setActiveSessionId(savedSession.id);
            } catch (error) {
                console.error('Failed to create workflow session', error);
                alert('Failed to create workflow session. Make sure "workflow_sessions" collection exists in PocketBase.\n' + (error instanceof Error ? error.message : String(error)));
            }
        })();
    }, [deserializeSession, request, serializeSession]);

    const switchSession = useCallback((id: string) => {
        setActiveSessionId(id);
    }, []);

    const updateSession = useCallback((id: string, updates: Partial<WorkflowSession> | ((prev: WorkflowSession) => Partial<WorkflowSession>)) => {
        setSessions(prev => prev.map(session => {
            if (session.id !== id) return session;
            const newValues = typeof updates === 'function' ? updates(session) : updates;
            const updatedSession = { ...session, ...newValues };
            scheduleSave(updatedSession);
            return updatedSession;
        }));
    }, [scheduleSave]);

    const deleteSession = useCallback((id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
            setActiveSessionId(null);
        }
        const existing = saveTimers.current.get(id);
        if (existing) {
            window.clearTimeout(existing);
            saveTimers.current.delete(id);
        }
        pendingSaves.current.delete(id);
        void (async () => {
            try {
                await request(`/api/workflow-sessions/${id}`, { method: 'DELETE' });
            } catch (error) {
                console.error('Failed to delete workflow session', error);
            }
        })();
    }, [activeSessionId, request]);

    const getActiveSession = useCallback(() => {
        return sessions.find(s => s.id === activeSessionId);
    }, [sessions, activeSessionId]);

    return (
        <WorkflowContext.Provider value={{
            sessions,
            activeSessionId,
            createSession,
            switchSession,
            updateSession,
            deleteSession,
            getActiveSession
        }}>
            {children}
        </WorkflowContext.Provider>
    );
};
