import { useState } from 'react';
import { Terminal, Settings, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from './utils/cn';

function App() {
  const [logs, setLogs] = useState<string[]>([
    'System initialized...',
    'Ready for automated tasks.'
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runAutomation = () => {
    setIsRunning(true);
    setLogs(prev => [...prev, '> Starting maintenance script...']);
    
    // Simulate steps
    setTimeout(() => {
      setLogs(prev => [...prev, '> Cleaning /dist folder...']);
      setTimeout(() => {
        setLogs(prev => [...prev, '> Checking dependencies...']);
        setTimeout(() => {
          setLogs(prev => [...prev, '> Running Vite build...']);
          setTimeout(() => {
            setLogs(prev => [...prev, '> Build complete! Application ready.']);
            setIsRunning(false);
          }, 1500);
        }, 1000);
      }, 800);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Automation Hub</h1>
              <p className="text-neutral-500 text-sm">Manage project scripts and workflows</p>
            </div>
          </div>
          <button 
            onClick={runAutomation}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all",
              isRunning 
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
            )}
          >
            <Play className="w-4 h-4 fill-current" />
            {isRunning ? 'Running...' : 'Run Maintenance'}
          </button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">Project Status</h2>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm">Scripts Validated</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm">Node Environment</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-500">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-neutral-700 animate-pulse" />
                  </div>
                  <span className="text-sm italic">Pending Build...</span>
                </li>
              </ul>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">Quick Links</h2>
              <div className="grid grid-cols-1 gap-2">
                <code className="bg-black/50 p-2 rounded text-xs text-blue-400">node scripts/maintain.js</code>
                <p className="text-[10px] text-neutral-600 italic">Run this command from terminal for real execution.</p>
              </div>
            </div>
          </div>

          {/* Console / Terminal Output */}
          <div className="md:col-span-2 bg-black rounded-xl border border-neutral-800 overflow-hidden flex flex-col h-[400px]">
            <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-mono text-neutral-400">console_output.log</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              </div>
            </div>
            <div className="p-4 font-mono text-sm overflow-y-auto flex-1 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={cn(
                  "opacity-0 animate-in fade-in fill-mode-forwards duration-500",
                  log.startsWith('>') ? "text-blue-400" : "text-neutral-500"
                )}>
                  {log}
                </div>
              ))}
              {isRunning && (
                <div className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle" />
              )}
            </div>
          </div>
        </main>

        <footer className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-neutral-600 bg-neutral-900/50 px-3 py-1.5 rounded-full border border-neutral-800/50">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Ensure you have execution permissions: <code className="text-neutral-400">chmod +x scripts/maintain.js</code></span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
