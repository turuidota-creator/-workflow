
import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Terminal, Key } from 'lucide-react';

export const Settings = () => {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [testOutput, setTestOutput] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        // Load config on mount
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (data.GEMINI_API_KEY) setApiKey(data.GEMINI_API_KEY);
            })
            .catch(err => console.error("Failed to load config", err));
    }, []);

    const handleSave = async () => {
        setStatus('saving');
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ GEMINI_API_KEY: apiKey })
            });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestOutput('Sending request to Gemini...');
        try {
            const res = await fetch('/api/test-gemini', {
                method: 'POST'
            });
            const data = await res.json();
            setTestOutput(JSON.stringify(data, null, 2));
        } catch (e) {
            setTestOutput(JSON.stringify({ error: String(e) }, null, 2));
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto p-8">
            <div className="space-y-2">
                <h3 className="text-2xl font-bold">Settings</h3>
                <p className="text-muted-foreground">Configure global API keys and environment variables.</p>
            </div>

            <div className="glass-card p-6 rounded-xl space-y-6">
                <div className="space-y-4">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        Gemini API Key
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm"
                        />
                        <button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {status === 'saving' ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    {status === 'success' && <p className="text-xs text-green-400">Configuration saved to .env</p>}
                </div>

                <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" />
                            API Output Testing
                        </label>
                        <button
                            onClick={handleTest}
                            disabled={isTesting || !apiKey}
                            className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded border border-white/5 transition-colors"
                        >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute top-0 left-0 w-full h-8 bg-black/40 rounded-t-lg flex items-center px-4 border-b border-white/5">
                            <span className="text-[10px] text-muted-foreground font-mono">OUTPUT LOG</span>
                        </div>
                        <textarea
                            readOnly
                            value={testOutput}
                            className="w-full h-64 bg-black/40 border border-white/10 rounded-lg pt-10 pb-4 px-4 font-mono text-xs text-green-400 focus:outline-none resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
