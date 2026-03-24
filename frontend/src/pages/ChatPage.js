import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Phone, Trash2, Sparkles, BookOpen, Flame, Heart, Headphones, Skull, Rocket } from "lucide-react";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const modeConfig = {
  educator: { icon: BookOpen, label: "Educator", color: "#3B82F6" },
  coach: { icon: Flame, label: "Coach", color: "#F59E0B" },
  wellness: { icon: Heart, label: "Wellness", color: "#10B981" },
  listener: { icon: Headphones, label: "Listener", color: "#A78BFA" },
  general: { icon: Sparkles, label: "General", color: "#A1A1AA" },
  future_you: { icon: Rocket, label: "Future You", color: "#3B82F6" },
  brutal_honesty: { icon: Skull, label: "Brutal Honesty", color: "#EF4444" },
};

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState(location.state?.mode || "general");
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingText]);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/chat/history?limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg = { id: Date.now(), role: "user", content: msg, mode: currentMode, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setIsTyping(true);
    setTypingText("");

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, mode: currentMode }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setCurrentMode(data.mode);

      // Typing animation
      const fullText = data.response;
      let i = 0;
      const interval = setInterval(() => {
        i += 3;
        if (i >= fullText.length) {
          clearInterval(interval);
          setTypingText("");
          setIsTyping(false);
          setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: fullText, mode: data.mode, created_at: new Date().toISOString() }]);
        } else {
          setTypingText(fullText.slice(0, i));
        }
      }, 15);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "Something went wrong. Let me try again.", mode: "general", created_at: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    await fetch(`${API}/chat/history`, { method: "DELETE", credentials: "include" });
    setMessages([]);
  };

  const quickActions = [
    { label: "Explain simpler", msg: "Can you explain that in a simpler way?" },
    { label: "Challenge me", msg: "Give me a challenge to push myself today" },
    { label: "Give me a plan", msg: "Create an actionable plan for me" },
    { label: "Build my routine", msg: "Help me build a daily routine for my goals" },
    { label: "Review my week", msg: "Can you review how my week has been going?" },
  ];

  const modes = Object.entries(modeConfig);
  const ModeIcon = modeConfig[currentMode]?.icon || Sparkles;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 backdrop-blur-xl bg-[#050505]/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button data-testid="chat-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${modeConfig[currentMode]?.color}20` }}>
                <ModeIcon className="w-4 h-4" style={{ color: modeConfig[currentMode]?.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya</p>
                <p className="text-[10px] font-mono tracking-wider text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="current-mode">
                  {modeConfig[currentMode]?.label} MODE
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="chat-call-btn" variant="ghost" size="sm" onClick={() => navigate("/call")} className="text-[#F59E0B] hover:text-yellow-300">
              <Phone className="w-4 h-4" />
            </Button>
            <Button data-testid="chat-clear-btn" variant="ghost" size="sm" onClick={clearHistory} className="text-gray-500 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Mode selector */}
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-1.5 overflow-x-auto">
          {modes.map(([key, cfg]) => (
            <button
              key={key}
              data-testid={`mode-btn-${key}`}
              onClick={() => setCurrentMode(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-medium transition-all ${
                currentMode === key
                  ? "text-black font-bold"
                  : "bg-transparent text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/15"
              }`}
              style={currentMode === key ? { backgroundColor: cfg.color } : {}}
            >
              <cfg.icon className="w-3 h-3" /> {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-y-auto" data-testid="chat-messages-area">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <div className="w-16 h-16 rounded-sm bg-[#3B82F6]/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                What's on your mind?
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Talk to Bhaiya about anything - studying, goals, habits, or just need someone to listen.
              </p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  data-testid={`chat-msg-${msg.role}-${i}`}
                  className={`max-w-[80%] rounded-sm px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#3B82F6] text-black font-medium"
                      : "bg-[#0A0A0A] border border-white/5 text-gray-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && msg.mode && (
                    <p className="text-[10px] mt-2 opacity-50 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {modeConfig[msg.mode]?.label || msg.mode}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="max-w-[80%] rounded-sm px-4 py-3 text-sm leading-relaxed bg-[#0A0A0A] border border-white/5 text-gray-300">
                <p className="whitespace-pre-wrap">{typingText}<span className="inline-block w-0.5 h-4 bg-[#3B82F6] ml-0.5 animate-pulse" /></p>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="flex-shrink-0 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                data-testid={`quick-action-${i}`}
                onClick={() => sendMessage(qa.msg)}
                className="flex-shrink-0 px-4 py-2 rounded-sm text-xs font-medium bg-[#0A0A0A] border border-white/5 text-gray-400 hover:border-[#3B82F6]/30 hover:text-white transition-all"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[#050505]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              data-testid="chat-input"
              className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none transition-colors"
              placeholder="Talk to Bhaiya..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <Button
              data-testid="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-[#3B82F6] text-black hover:bg-blue-400 rounded-sm px-4 py-3 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
