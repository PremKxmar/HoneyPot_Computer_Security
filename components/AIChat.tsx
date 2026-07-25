
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ShieldCheck, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Sentinel System Online. Ready to analyze threat vectors.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(scrollToBottom, 100);

    const responseText = await sendMessageToGemini(input);
    
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[90vw] md:w-96 bg-[#0f0f1a]/95 backdrop-blur-xl border border-[#4fb7b3]/30 rounded-lg overflow-hidden shadow-2xl shadow-cyan-900/20"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#4fb7b3] animate-pulse" />
                <h3 className="font-heading font-bold text-white tracking-wider text-sm">SENTINEL AI</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white" data-hover="true">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="h-64 md:h-80 overflow-y-auto p-4 space-y-3 scroll-smooth font-mono"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded text-xs ${
                      msg.role === 'user'
                        ? 'bg-[#4fb7b3]/20 text-[#a8fbd3] border border-[#4fb7b3]/30'
                        : 'bg-white/5 text-gray-300 border border-white/10'
                    }`}
                  >
                    <span className="opacity-50 mr-2">{msg.role === 'user' ? '>' : '#'}</span>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-3 rounded flex gap-1 items-center">
                    <span className="text-xs text-gray-500 font-mono">Processing</span>
                    <span className="w-1 h-1 bg-[#4fb7b3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-[#4fb7b3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-[#4fb7b3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-black/40">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Query threat database..."
                  className="flex-1 bg-transparent text-white placeholder-white/30 text-xs font-mono focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="text-[#4fb7b3] hover:text-white transition-colors disabled:opacity-50"
                  data-hover="true"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1f2048] flex items-center justify-center shadow-lg shadow-[#4fb7b3]/20 border border-[#4fb7b3]/50 z-50 group"
        data-hover="true"
      >
        {isOpen ? (
          <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
        ) : (
          <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#4fb7b3] group-hover:text-white transition-colors" />
        )}
      </motion.button>
    </div>
  );
};

export default AIChat;
