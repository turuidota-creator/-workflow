
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WorkflowSession, WorkflowStatus, INITIAL_STEPS, StepId } from '../types/workflow';
import { v4 as uuidv4 } from 'uuid'; // Need to generate IDs, will implement a simple helper if uuid not installed

// Simple UUID generator if package not available
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface WorkflowContextType {
    sessions: WorkflowSession[];
    activeSessionId: string | null;
    createSession: () => void;
    switchSession: (id: string) => void;
    updateSession: (id: string, updates: Partial<WorkflowSession>) => void;
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

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('cw_sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSessions(parsed);
                if (parsed.length > 0) setActiveSessionId(parsed[0].id);
            } catch (e) {
                console.error("Failed to load sessions", e);
            }
        }
    }, []);

    // Save to localStorage whenever sessions change
    useEffect(() => {
        localStorage.setItem('cw_sessions', JSON.stringify(sessions));
    }, [sessions]);

    const createSession = useCallback(() => {
        const newSession: WorkflowSession = {
            id: generateId(),
            title: 'New Workflow',
            createdAt: Date.now(),
            status: 'idle',
            currentStepId: 'topic-discovery',
            steps: JSON.parse(JSON.stringify(INITIAL_STEPS)), // Deep copy
            context: {}
        };

        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    }, []);

    const switchSession = useCallback((id: string) => {
        setActiveSessionId(id);
    }, []);

    const updateSession = useCallback((id: string, updates: Partial<WorkflowSession>) => {
        setSessions(prev => prev.map(session =>
            session.id === id ? { ...session, ...updates } : session
        ));
    }, []);

    const deleteSession = useCallback((id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
            setActiveSessionId(null);
        }
    }, [activeSessionId]);

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
