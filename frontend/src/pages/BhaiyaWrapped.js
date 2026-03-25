import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, Star, Target, Clock, MessageSquare, Brain, Zap, Trophy, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const modeLabels = {
  educator: "Educator",
  coach: "Coach",
  wellness: "Wellness",
  listener: "Listener",
  general: "General",
  future_you: "Future You",
  brutal_honesty: "Brutal Honesty",
};

const modeColors = {
  educator: "#3B82F6",
  coach: "#F59E0B",
  wellness: "#10B981",
  listener: "#A78BFA",
  general: "#A1A1AA",
  future_you: "#3B82F6",
  brutal_honesty: "#EF4444",
};

export default function BhaiyaWrapped() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => { fetchWrapped(); }, []);

  const fetchWrapped = async () => {
    try {
      const res = await fetch(`${API}/wrapped`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const shareWrapped = () => {
    const text = data ? `My Didi AI Wrapped:\n${data.month_messages} messages | ${data.completed_goals} goals | ${data.focus_minutes_month}m focus | ${data.total_xp} XP\nStreak: ${data.streak} days\n\n#DidiAI #AnushkaDidi` : "";
    if (navigator.share) {
      navigator.share({ title: "My Didi Wrapped", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const slides = data ? [
    // Slide 1: Overview
    {
      bg: "from-[#0A0A0A] via-[#111827] to-[#0A0A0A]",
      content: (
        <div className="text-center">
          <p className="text-xs font-mono text-[#3B82F6] tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Your Monthly Wrapped</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>{data.name}'s Month</h2>
          <p className="text-sm text-gray-500 mb-8">{data.period}</p>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[
              { icon: MessageSquare, val: data.month_messages, label: "Messages", color: "#3B82F6" },
              { icon: Target, val: data.completed_goals, label: "Goals Done", color: "#10B981" },
              { icon: Clock, val: `${data.focus_minutes_month}m`, label: "Focus Time", color: "#F59E0B" },
              { icon: Star, val: data.total_xp, label: "Total XP", color: "#A78BFA" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 rounded-sm border border-white/5 bg-black/30">
                <s.icon className="w-4 h-4 mx-auto mb-2" style={{ color: s.color }} />
                <p className="text-2xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.val}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 2: Personality
    {
      bg: "from-[#0A0A0A] via-[#0f1a0a] to-[#0A0A0A]",
      content: (
        <div className="text-center">
          <Brain className="w-10 h-10 text-[#10B981] mx-auto mb-4" />
          <p className="text-xs font-mono text-[#10B981] tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Your Didi Personality</p>
          <h3 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>You're a {data.top_mode === "educator" ? "Knowledge Seeker" : data.top_mode === "coach" ? "Performance Machine" : data.top_mode === "wellness" ? "Wellness Warrior" : data.top_mode === "listener" ? "Deep Thinker" : "Versatile Player"}</h3>
          <div className="space-y-2 max-w-sm mx-auto">
            {Object.entries(data.mode_breakdown || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([mode, count], i) => {
              const total = Object.values(data.mode_breakdown).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <motion.div key={mode} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 p-2">
                  <div className="w-2 h-6 rounded-full" style={{ backgroundColor: modeColors[mode] || "#A1A1AA" }} />
                  <span className="text-xs text-gray-400 w-24 text-left capitalize">{modeLabels[mode] || mode}</span>
                  <div className="flex-1 h-2 bg-[#121212] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full" style={{ backgroundColor: modeColors[mode] || "#A1A1AA" }} />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-10 text-right" style={{ fontFamily: "JetBrains Mono, monospace" }}>{pct}%</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )
    },
    // Slide 3: Energy & Mood
    {
      bg: "from-[#0A0A0A] via-[#1a0f0a] to-[#0A0A0A]",
      content: (
        <div className="text-center">
          <Zap className="w-10 h-10 text-[#F59E0B] mx-auto mb-4" />
          <p className="text-xs font-mono text-[#F59E0B] tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Energy & Vibes</p>
          <div className="flex items-center justify-center gap-8 mb-8">
            <div>
              <p className="text-5xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{data.avg_energy}</p>
              <p className="text-[10px] text-gray-500 uppercase mt-1">Avg Energy</p>
            </div>
            <div className="w-px h-16 bg-white/10" />
            <div>
              <p className="text-5xl font-bold capitalize" style={{ fontFamily: "JetBrains Mono, monospace" }}>{data.streak}</p>
              <p className="text-[10px] text-gray-500 uppercase mt-1">Day Streak</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-4">Top mood: <span className="text-white capitalize font-semibold">{data.top_mood}</span></p>
          <div className="flex justify-center gap-2">
            {Object.entries(data.mood_breakdown || {}).map(([mood, count]) => (
              <div key={mood} className="px-3 py-1.5 rounded-sm bg-white/5 border border-white/5">
                <p className="text-[10px] text-gray-400 capitalize">{mood}</p>
                <p className="text-sm font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{count}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 4: AI Summary
    {
      bg: "from-[#0A0A0A] via-[#0a0f1a] to-[#0A0A0A]",
      content: (
        <div className="text-center max-w-md mx-auto">
          <Trophy className="w-10 h-10 text-[#3B82F6] mx-auto mb-4" />
          <p className="text-xs font-mono text-[#3B82F6] tracking-[0.3em] uppercase mb-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>Didi's Take</p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" data-testid="wrapped-ai-text">{data.ai_wrapped}</p>
        </div>
      )
    },
  ] : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button data-testid="wrapped-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Didi Wrapped</span>
          </div>
          {data && (
            <Button data-testid="share-wrapped-btn" onClick={shareWrapped} variant="ghost" size="sm" className="text-[#3B82F6] hover:text-blue-400 text-xs gap-1">
              <Share2 className="w-3 h-3" /> Share
            </Button>
          )}
        </div>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-gray-500 tracking-widest uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>Generating your wrapped...</p>
          </div>
        </div>
      ) : data ? (
        <div className="max-w-lg mx-auto px-6 py-8">
          {/* Slide content */}
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`rounded-sm border border-white/5 p-8 md:p-10 min-h-[400px] flex items-center justify-center bg-gradient-to-br ${slides[activeSlide]?.bg || "from-[#0A0A0A] to-[#0A0A0A]"}`}
          >
            {slides[activeSlide]?.content}
          </motion.div>

          {/* Slide dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                data-testid={`wrapped-slide-${i}`}
                onClick={() => setActiveSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? "bg-[#3B82F6] w-6" : "bg-gray-700 hover:bg-gray-500"}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {activeSlide > 0 && (
              <Button variant="ghost" onClick={() => setActiveSlide(activeSlide - 1)} className="flex-1 text-gray-400 border border-white/5 rounded-sm py-3">Back</Button>
            )}
            {activeSlide < slides.length - 1 ? (
              <Button onClick={() => setActiveSlide(activeSlide + 1)} className="flex-1 bg-[#3B82F6] text-black font-bold rounded-sm py-3">Next</Button>
            ) : (
              <Button onClick={shareWrapped} className="flex-1 bg-[#3B82F6] text-black font-bold rounded-sm py-3 flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share Wrapped
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">Not enough data yet. Keep talking to Didi to generate your Wrapped!</p>
        </div>
      )}
    </div>
  );
}
