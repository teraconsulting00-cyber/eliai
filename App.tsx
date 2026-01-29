
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ModelType, GenerationConfig, ChatSession, Attachment } from './types';
import { ASKAI, getActiveKeyInfo, ERROR, LASTANSWER } from './services/geminiService';

const STORAGE_KEY = 'eli_ai_perfect_v1';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [keyInfo, setKeyInfo] = useState(getActiveKeyInfo());
  const [theme, setTheme] = useState<'nuit' | 'jour'>('nuit');
  const [uiMode, setUiMode] = useState<'normal' | 'terminal'>('normal');
  const [uiError, setUiError] = useState<string>("");

  const [config, setConfig] = useState<GenerationConfig>({
    model: ModelType.FLASH_3,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 2048,
    thinkingBudget: 0,
    systemInstruction: "Tu es Eli*AI, un assistant professionnel. Style: Minimaliste, technique, sans emojis. Réponds toujours en Markdown structuré."
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.sessions) setSessions(data.sessions);
        if (data.config) setConfig(data.config);
        if (data.theme) setTheme(data.theme);
        if (data.uiMode) setUiMode(data.uiMode);
        if (data.currentSessionId) setCurrentSessionId(data.currentSessionId);
      } catch (e) { console.error(e); }
    }
    document.documentElement.classList.toggle('dark', theme === 'nuit');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'nuit');
    try {
      const state = { sessions, config, theme, uiMode, currentSessionId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      const light = sessions.map(s => ({ ...s, messages: s.messages.map(m => ({ ...m, attachments: [] })) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, sessions: light, theme, uiMode, currentSessionId }));
    }
  }, [sessions, config, theme, uiMode, currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, loading]);

  const createNewSession = (title?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: title || 'Analyse système',
      messages: [],
      lastModified: Date.now(),
      config: { ...config }
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const handleSend = async () => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || loading) return;

    setUiError("");
    let activeId = currentSessionId;
    let history: Message[] = [];
    
    if (!activeId) {
      const ns = createNewSession(content.slice(0, 30));
      activeId = ns.id;
    } else {
      const s = sessions.find(sess => sess.id === activeId);
      if (s) history = s.messages;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, attachments: [...attachments], timestamp: Date.now() };
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: [...s.messages, userMsg], lastModified: Date.now() } : s));
    
    setLoading(true);
    setInput('');
    setAttachments([]);

    try {
      const response = await ASKAI(content, userMsg.attachments || [], history, config);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response, timestamp: Date.now() };
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: [...s.messages, botMsg], lastModified: Date.now() } : s));
    } catch (err) {
      setUiError(ERROR);
    } finally {
      setLoading(false);
      setKeyInfo(getActiveKeyInfo());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newAtts: Attachment[] = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise<Attachment>((resolve) => {
        reader.onloadend = () => {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            mimeType: file.type,
            data: reader.result as string,
            previewUrl: file.type.startsWith('image/') ? (reader.result as string) : undefined
          });
        };
        reader.readAsDataURL(file);
      });
      newAtts.push(await promise);
    }
    setAttachments(prev => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isNight = theme === 'nuit';
  const radius = 'rounded-lg';

  const styles = {
    font: uiMode === 'terminal' ? 'terminal-font' : 'normal-font',
    bg: isNight ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900',
    sidebar: isNight ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-200',
    sidebarText: isNight ? 'text-zinc-400' : 'text-zinc-600',
    bubbleUser: isNight ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200/50',
    bubbleBot: isNight ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white border-zinc-200/80 shadow-sm',
    inputArea: isNight ? 'bg-zinc-900/60 border-transparent' : 'bg-zinc-100/60 border-transparent',
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  return (
    <div className={`flex h-screen ${styles.font} ${styles.bg} transition-all duration-300 overflow-hidden`}>
      
      {/* Sidebar Eli*AI - High Contrast */}
      <aside className={`w-72 border-r flex flex-col ${styles.sidebar} transition-all`}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-500/10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"></div>
            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Eli*AI</span>
          </div>
          <button 
            onClick={() => setTheme(isNight ? 'jour' : 'nuit')} 
            className={`p-2 rounded-full transition-all hover:scale-110 active:scale-90 ${isNight ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-gradient-to-tr from-orange-400 to-pink-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'}`}
          >
            {isNight ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zM2 13h2a1 1 0 100-2H2a1 1 0 100 2zm18 0h2a1 1 0 100-2h-2a1 1 0 100 2zM11 2v2a1 1 0 102 0V2a1 1 0 10-2 0zm0 18v2a1 1 0 102 0v-2a1 1 0 10-2 0zM5.99 4.58a1 1 0 111.41 1.41L6.18 7.21a1 1 0 01-1.41-1.41l1.22-1.22zm12.02 12.02a1 1 0 111.41 1.41l-1.22 1.22a1 1 0 11-1.41-1.41l1.22-1.22zM4.58 18.01a1 1 0 111.41-1.41l1.22 1.22a1 1 0 11-1.41 1.41l-1.22-1.22zM18.01 5.99a1 1 0 111.41 1.41l-1.22-1.22a1 1 0 111.41-1.41l1.22 1.22z" /></svg>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <button onClick={() => createNewSession()} className={`w-full py-3 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 ${radius} text-[10px] font-black uppercase tracking-[0.25em] transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-zinc-500/10`}>
            New Session
          </button>
          
          <div className="space-y-1">
            <h3 className={`text-[9px] font-black uppercase opacity-50 px-3 tracking-widest mb-3 ${styles.sidebarText}`}>Active Logs</h3>
            {sessions.map(s => (
              <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`group px-3 py-3 ${radius} cursor-pointer transition-all border flex items-center justify-between ${currentSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent opacity-60 hover:opacity-100 hover:bg-zinc-500/5'}`}>
                <span className="text-[11px] truncate">{s.title}</span>
                <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)); }} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-zinc-500/10 bg-zinc-500/5">
          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest mb-3 opacity-40">
            <span>Interface Flow</span>
            <span className="text-indigo-500">Node_0{keyInfo.index + 1}</span>
          </div>
          <div className="w-full bg-zinc-300 dark:bg-zinc-800 h-1 rounded-full overflow-hidden mb-5">
            <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${((keyInfo.index + 1) / keyInfo.total) * 100}%` }}></div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className={`w-full py-2.5 border ${isNight ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-300 hover:bg-zinc-200'} ${radius} text-[9px] font-black uppercase tracking-[0.2em] transition-all ${styles.sidebarText}`}>
            Configurations
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {uiError && <div className="absolute top-0 inset-x-0 z-50 bg-red-600 text-white text-[10px] font-black uppercase py-2 text-center animate-eli shadow-2xl">{uiError}</div>}
        
        <div className="flex-1 overflow-y-auto px-10 py-16 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 animate-eli">
              <div className="text-6xl font-black italic tracking-tighter opacity-10">ELI*AI</div>
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                 <span className="text-[9px] uppercase tracking-[1em] opacity-30">System Ready</span>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-16">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-eli`}>
                  <span className={`text-[8px] font-black uppercase tracking-[0.35em] mb-3 px-1 ${msg.role === 'user' ? 'opacity-40 text-right' : 'text-indigo-500'}`}>
                    {msg.role === 'user' ? 'Source_Entry' : 'System_Analytic'}
                  </span>
                  <div className={`p-7 ${radius} border ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot} prose-eli w-full transition-all hover:shadow-md`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-5 mb-8">
                        {msg.attachments.map(att => (
                          <div key={att.id} className="relative w-52 h-52 rounded border border-zinc-500/10 overflow-hidden bg-white shadow-sm transition-transform hover:scale-105">
                            {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] opacity-40 uppercase font-black">{att.name}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && <div className="flex gap-2 px-1"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div></div>}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Zero-Border Design */}
        <div className={`p-10 bg-transparent`}>
          <div className="max-w-4xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-5 animate-eli">
                {attachments.map(att => (
                  <div key={att.id} className="group relative w-14 h-14 bg-zinc-900 rounded border border-zinc-800 overflow-hidden shadow-2xl transition-all hover:translate-y-[-2px]">
                    {att.previewUrl ? <img src={att.previewUrl} className="w-full h-full object-cover" /> : <div className="text-[6px] p-1 truncate opacity-50">{att.name}</div>}
                    <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-black">✕</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative flex items-end gap-5">
              <div className={`flex-1 transition-all duration-300 ${styles.inputArea} ${radius} flex items-end p-2 eli-input-focus ring-2 ring-transparent`}>
                <button onClick={() => fileInputRef.current?.click()} className="p-3.5 opacity-40 hover:opacity-100 transition-all hover:text-indigo-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
                <textarea 
                  rows={1} 
                  value={input} 
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Initiate analysis..." 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] p-3.5 resize-none max-h-64 font-medium placeholder:opacity-40"
                />
              </div>
              <button 
                onClick={() => handleSend()} 
                disabled={loading || (!input.trim() && attachments.length === 0)} 
                className={`p-5 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 ${radius} shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-90 disabled:opacity-10 group`}
              >
                <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
          </div>
        </div>
      </main>

      {/* Advanced Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-xl p-6 animate-eli">
          <div className={`w-full max-w-2xl ${radius} shadow-2xl border ${isNight ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'} overflow-hidden`}>
            <div className="p-7 border-b border-zinc-500/10 flex justify-between items-center bg-zinc-500/5">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">System.Control_Panel</h2>
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="opacity-30 hover:opacity-100 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto">
              {/* UI MODE */}
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Workspace Perspective</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setUiMode('normal')} className={`py-4 ${radius} border text-[11px] font-black uppercase tracking-widest transition-all ${uiMode === 'normal' ? 'bg-zinc-950 text-white border-zinc-950 shadow-xl' : 'border-zinc-500/20 opacity-40 hover:opacity-100'}`}>Professional</button>
                  <button onClick={() => setUiMode('terminal')} className={`py-4 ${radius} border text-[11px] font-black uppercase tracking-widest transition-all ${uiMode === 'terminal' ? 'bg-zinc-950 text-white border-zinc-950 shadow-xl' : 'border-zinc-500/20 opacity-40 hover:opacity-100'}`}>Terminal Mono</button>
                </div>
              </div>

              {/* LLM PARAMETERS */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[9px] font-black uppercase opacity-40 tracking-widest">Global Intelligence Protocol</label>
                   <textarea value={config.systemInstruction} onChange={(e) => setConfig({...config, systemInstruction: e.target.value})} className={`w-full h-28 bg-zinc-500/5 border border-zinc-500/20 ${radius} p-5 text-[12px] font-medium outline-none focus:border-indigo-500 transition-all resize-none shadow-inner`} />
                </div>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                  <div className="space-y-5">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Temperature</span><span>{config.temperature}</span></div>
                    <input type="range" min="0" max="1" step="0.1" value={config.temperature} onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 cursor-pointer" />
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Top-P</span><span>{config.topP}</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={config.topP} onChange={(e) => setConfig({...config, topP: parseFloat(e.target.value)})} className="w-full accent-indigo-500 h-1.5 cursor-pointer" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Core Model</span></div>
                    <select value={config.model} onChange={(e) => setConfig({...config, model: e.target.value as ModelType})} className={`w-full bg-zinc-500/5 border border-zinc-500/20 ${radius} p-3.5 text-[11px] font-black outline-none focus:border-indigo-500 appearance-none cursor-pointer`}>
                      <option value={ModelType.FLASH_3}>Gemini 3 Flash</option>
                      <option value={ModelType.PRO}>Gemini 3 Pro</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Top-K</span></div>
                    <input type="number" value={config.topK} onChange={(e) => setConfig({...config, topK: parseInt(e.target.value)})} className={`w-full bg-zinc-500/5 border border-zinc-500/20 ${radius} p-3 text-[11px] font-black outline-none focus:border-indigo-500`} />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Max Output</span></div>
                    <input type="number" step="1024" value={config.maxOutputTokens} onChange={(e) => setConfig({...config, maxOutputTokens: parseInt(e.target.value)})} className={`w-full bg-zinc-500/5 border border-zinc-500/20 ${radius} p-3 text-[11px] font-black outline-none focus:border-indigo-500`} />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Thinking Budget</span></div>
                    <input type="number" step="1000" value={config.thinkingBudget} onChange={(e) => setConfig({...config, thinkingBudget: parseInt(e.target.value)})} className={`w-full bg-zinc-500/5 border border-zinc-500/20 ${radius} p-3 text-[11px] font-black outline-none focus:border-indigo-500`} />
                  </div>
                </div>
              </div>

              <div className={`p-8 ${radius} bg-indigo-500/5 border border-indigo-500/15 space-y-4`}>
                 <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">System Metadata</h4>
                 <div className="text-[11px] font-mono space-y-3 opacity-70">
                    <div className="truncate"><span className="text-indigo-500 font-black">L_ANSWER:</span> {LASTANSWER ? LASTANSWER.slice(0, 50) + '...' : "N/A"}</div>
                    <div className="text-red-500 font-black"><span className="opacity-50">S_STATUS:</span> {ERROR || "Operational"}</div>
                 </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-zinc-500/10 flex justify-end bg-zinc-500/5">
               <button onClick={() => setIsSettingsOpen(false)} className={`px-16 py-4 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 ${radius} text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:opacity-90 active:scale-95 transition-all`}>
                 Apply Protocol
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
