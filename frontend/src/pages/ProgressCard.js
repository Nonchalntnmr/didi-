import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Share2, MessageSquare, Target, Clock, Flame, Star, Trophy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProgressCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);

  useEffect(() => {
    fetchCard();
  }, []);

  const fetchCard = async () => {
    try {
      const res = await fetch(`${API}/progress-card`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const shareCard = async () => {
    const text = data
      ? `Check out my progress on Bhaiya AI!\n\nStreak: ${data.streak} days\nGoals: ${data.completed_goals}/${data.total_goals}\nFocus: ${data.total_focus_minutes} min\nXP: ${data.total_xp}\n\n#BhaiyaAI #SelfImprovement`
      : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Bhaiya AI Progress", text });
      } catch (err) { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      alert("Progress copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button data-testid="progress-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Progress Card</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {loading ? (
          <div className="h-96 bg-[#0A0A0A] rounded-sm animate-pulse" />
        ) : data ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* The Card */}
            <div ref={cardRef} className="relative overflow-hidden rounded-sm border border-white/10" data-testid="progress-card">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#0A0A0A] to-[#3B82F6]/10" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-[80px]" />

              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-full bg-[#121212] border border-white/10 flex items-center justify-center overflow-hidden">
                    {data.picture ? (
                      <img src={data.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-[#3B82F6]">{data.name?.[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{data.name}</p>
                    <p className="text-[10px] font-mono text-gray-500 tracking-wider uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      Member since {data.member_since ? new Date(data.member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "2026"}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: Flame, value: data.streak, label: "Day Streak", color: "#F59E0B" },
                    { icon: Star, value: data.total_xp, label: "Total XP", color: "#3B82F6" },
                    { icon: Trophy, value: data.completed_goals, label: "Goals Done", color: "#10B981" },
                  ].map((s, i) => (
                    <div key={i} className="text-center p-3 rounded-sm bg-black/30 border border-white/5">
                      <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                      <p className="text-xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.value}</p>
                      <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: MessageSquare, value: data.total_messages, label: "Messages", color: "#3B82F6" },
                    { icon: Clock, value: `${data.total_focus_minutes}m`, label: "Focus Time", color: "#F59E0B" },
                    { icon: Target, value: `${data.completed_goals}/${data.total_goals}`, label: "Goals", color: "#10B981" },
                    { icon: Flame, value: data.total_checkins, label: "Check-ins", color: "#EF4444" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-sm bg-black/20 border border-white/5">
                      <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                      <div>
                        <p className="text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.value}</p>
                        <p className="text-[8px] font-mono text-gray-500 uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-sm bg-[#3B82F6] flex items-center justify-center">
                      <span className="text-[8px] font-bold text-black">B</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>BHAIYA AI</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-600" style={{ fontFamily: "JetBrains Mono, monospace" }}>bhaiya.ai</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                data-testid="share-progress-btn"
                onClick={shareCard}
                className="flex-1 bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm py-3 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Progress
              </Button>
            </div>
          </motion.div>
        ) : (
          <p className="text-center text-gray-500 py-16">No data yet</p>
        )}
      </div>
    </div>
  );
}
