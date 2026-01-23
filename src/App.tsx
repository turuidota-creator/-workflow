
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
                    {showSettings && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                            <div className="w-[95vw] h-[90vh] bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                                    <h2 className="font-semibold text-lg flex items-center gap-2">
                                        <span className="text-primary">⚙️</span> 设置 (Settings)
                                    </h2>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        关闭 (Close)
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Settings />
                                </div>
                            </div>
                        </div>
                    )}
                    {!showSettings && <StepViewer />}
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

