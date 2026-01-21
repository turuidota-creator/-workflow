
import React, { useState, useEffect } from 'react';
import { WorkflowProvider } from './context/WorkflowContext';
import { Sidebar } from './components/layout/Sidebar';
import { StepViewer } from './components/layout/StepViewer';
import { Settings } from './components/Settings';
import { DatabaseBrowser } from './components/DatabaseBrowser';

function App() {
    const [showSettings, setShowSettings] = useState(false);
    const [showDatabase, setShowDatabase] = useState(false);

    useEffect(() => {
        const settingsHandler = () => setShowSettings(true);
        const databaseHandler = () => setShowDatabase(true);
        window.addEventListener('OPEN_SETTINGS', settingsHandler);
        window.addEventListener('OPEN_DATABASE', databaseHandler);
        return () => {
            window.removeEventListener('OPEN_SETTINGS', settingsHandler);
            window.removeEventListener('OPEN_DATABASE', databaseHandler);
        };
    }, []);

    return (
        <WorkflowProvider>
            <div className="flex h-screen w-full bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground font-sans">
                <Sidebar />
                <div className="flex-1 flex flex-col h-full bg-background/50 relative">
                    {showSettings ? (
                        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
                            <div className="max-w-4xl mx-auto pt-10 px-6">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="mb-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                                >
                                    ← 返回工作流
                                </button>
                                <Settings />
                            </div>
                        </div>
                    ) : (
                        <StepViewer />
                    )}
                </div>
            </div>

            {/* Database Browser Modal */}
            {showDatabase && (
                <DatabaseBrowser onClose={() => setShowDatabase(false)} />
            )}
        </WorkflowProvider>
    );
}

export default App;

