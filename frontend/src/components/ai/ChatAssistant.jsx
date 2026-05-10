import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageSquare, Bot, User, RefreshCw, AlertCircle } from "lucide-react";
import aiService from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import Logo from "../common/Logo";

const TypewriterText = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 15);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <span>{displayedText}</span>;
};

const ChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your StudySniper AI. How can I help you prepare today?", isNew: false }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input, isNew: false };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await aiService.chat([...chatHistory, { role: "user", content: currentInput }], user?.uid || "guest");
      setMessages(prev => [...prev, { role: "assistant", content: response.response, isNew: true }]);
      setIsHealthy(true);
    } catch (error) {
      console.error("Chat Error Details:", error);
      setIsHealthy(false);
      let errorMsg = "Neural Link offline. Please RESTART both backend and frontend.";
      if (error.code === 'ECONNABORTED') errorMsg = "The AI is taking too long to respond. Please try a simpler question.";
      setMessages(prev => [...prev, { role: "assistant", content: `System Alert: ${errorMsg}`, isNew: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypewriterComplete = (index) => {
    setMessages(prev => prev.map((msg, i) => i === index ? { ...msg, isNew: false } : msg));
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl flex items-center justify-center z-50 border border-white/20"
      >
        <MessageSquare size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-[#09090b]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center p-2">
                  <Logo className="w-full h-full text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm tracking-tighter uppercase leading-none">
                    <span className="font-black text-white">STUDY</span>
                    <span className="font-light text-zinc-400"> SNIPER</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      {isHealthy ? 'Neural Engine Active' : 'Neural Link Severed'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.role === "user" ? "bg-blue-600/20 text-blue-400" : "bg-purple-600/20 text-purple-400"
                    } border border-white/5 shadow-lg`}>
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none shadow-blue-500/10" 
                        : "bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none"
                    } shadow-xl`}>
                      {msg.isNew && msg.role === "assistant" ? (
                        <TypewriterText text={msg.content} onComplete={() => handleTypewriterComplete(i)} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!isHealthy && (
                <div className="flex justify-center p-4">
                   <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs">
                      <AlertCircle size={16} />
                      <p>Backend unreachable. Restart the server.</p>
                   </div>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-white/5">
                      <Bot size={14} />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-none flex gap-1.5 items-center">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/2">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask study questions..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all pr-14 group-hover:border-white/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                 <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Neural Engine v2.1</p>
                 <button onClick={() => window.location.reload()} className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-widest font-bold transition-all">
                    <RefreshCw size={10} /> Sync
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
