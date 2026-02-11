
import React, { useState, useRef, useEffect } from 'react';
import { askAIAssistant } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Assistant active. How can I assist with your data calibration today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);
    const aiResponse = await askAIAssistant(userMessage);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="w-full h-[600px] flex flex-col bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_#f97316]"></div>
          <span className="font-semibold text-white">System Guide</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">AI Active</span>
      </div>
      
      <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-900/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              m.role === 'user' 
                ? 'bg-orange-500 text-white rounded-tr-none shadow-lg shadow-orange-500/10' 
                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none shadow-md'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command input..."
            className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
          />
          <button type="submit" disabled={loading} className="bg-orange-500 text-white px-4 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
