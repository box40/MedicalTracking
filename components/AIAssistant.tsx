import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { Pill, LogEntry } from '../types';
import { analyzeHistory, parseNaturalLanguageLog } from '../services/geminiService';

interface AIAssistantProps {
  logs: LogEntry[];
  pills: Pill[];
  onAddLog: (log: LogEntry) => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ logs, pills, onAddLog }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I can help you analyze your history or log medications. Try saying 'I took 2 Ibuprofen just now' or 'How much Caffeine did I have yesterday?'" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      // Heuristic: Check if user is trying to LOG something or ASK something
      const isLogIntent = /took|swallowed|ate|had|logging/i.test(userText);
      
      let aiResponse = "";

      if (isLogIntent) {
        const parsed = await parseNaturalLanguageLog(userText, pills);
        if (parsed && parsed.pillsTaken.length > 0) {
          // Construct the log entry
          const newEntry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            pillsTaken: parsed.pillsTaken,
            pillIds: parsed.pillsTaken.map(p => p.pillId), // Legacy support
            notes: parsed.notes
          };
          onAddLog(newEntry);
          
          const pillSummary = parsed.pillsTaken.map(item => {
             const name = pills.find(p => p.id === item.pillId)?.name;
             return `${item.quantity}x ${name}`;
          }).join(", ");
          
          aiResponse = `I've logged that for you: ${pillSummary}.`;
        } else {
          aiResponse = "I couldn't identify the specific pills from your cabinet. Please make sure the name matches what you've saved in the Cabinet tab.";
        }
      } else {
        // Analysis Intent
        aiResponse = await analyzeHistory(userText, logs, pills);
      }

      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I had trouble connecting to my brain. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex items-center space-x-2">
        <Sparkles size={20} className="text-yellow-300" />
        <h2 className="font-bold">Health Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-700' : 'bg-indigo-100'}`}>
                {m.role === 'user' ? <UserIcon size={14} className="text-white" /> : <Bot size={16} className="text-indigo-600" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
              }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="flex flex-row items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-indigo-600" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center space-x-2">
                   <Loader2 size={16} className="animate-spin text-indigo-600" />
                   <span className="text-xs text-slate-500">Thinking...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Log a pill or ask about your history..."
            className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
