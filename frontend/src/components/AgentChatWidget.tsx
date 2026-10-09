'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  X, 
  Send, 
  Loader2, 
  MessageSquare, 
  BrainCircuit, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import cn from 'clsx';

export default function AgentChatWidget() {
  const { data: session } = useSession();
  
  // Use session data, fallback to defaults
  const userId = session?.user?.id || 'guest';
  const userRole = (session?.user as any)?.role || 'student';
  const startupId = (session?.user as any)?.startupId || undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearChat } = useAgentChat(userId, userRole, startupId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={toggleOpen}
            className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-colors z-50 flex items-center justify-center group"
          >
            <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-6 bottom-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 z-50 flex flex-col transition-all duration-300",
              isExpanded ? "w-[80vw] h-[85vh] max-w-4xl" : "w-96 h-[600px] max-h-[85vh]"
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Incubation AI Assistant</h3>
                  <p className="text-blue-100 text-xs">Multi-Agent System Active</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={toggleExpand}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={toggleOpen}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-950/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-6">
                  <MessageSquare className="w-12 h-12 mb-4 text-blue-300 dark:text-blue-900" />
                  <p className="text-sm">Hi! I'm your AI assistant powered by a team of specialized agents. How can I help with your startup journey today?</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-3.5 rounded-2xl text-sm",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-br-sm" 
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-sm shadow-sm"
                    )}>
                      {msg.role === 'agent' && msg.agentName && (
                         <div className="text-[10px] font-semibold text-blue-500 mb-1 flex items-center gap-1">
                           <Loader2 className="w-3 h-3 animate-spin" />
                           {msg.agentName.toUpperCase()} AGENT THINKING...
                         </div>
                      )}
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.isStreaming && !msg.agentName && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-center">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all overflow-hidden">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask about validation, pitch decks, or incubation..."
                    className="w-full max-h-32 min-h-[44px] p-3 bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-200"
                    rows={1}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shrink-0 flex items-center justify-center"
                >
                  {isLoading && messages[messages.length - 1]?.isStreaming ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
