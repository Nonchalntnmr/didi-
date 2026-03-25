import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, MessageSquare, Target, Brain, Flame, Zap, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WeeklySummary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API}/summary/weekly`, { credentials: "include" });
      if (res.ok) setSummary(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const moodColors = {
    focused: "#3B82F6",
    energized: "#10B981",
    neutral: "#A1A1AA",
    low: "#F59E0B",
    exhausted: "#EF4444",
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button data-testid="summary-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Weekly Summary</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#0A0A0A] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Period header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Week in Review
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
                {summary.period}
              </h1>
            </motion.div>

            {/* Stats Grid */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: MessageSquare, label: "Messages", value: summary.messages_sent, color: "#3B82F6" },
                { icon: Target, label: "Goals", value: `${summary.goals_completed}/${summary.goals_total}`, color: "#10B981" },
                { icon: Clock, label: "Focus", value: `${summary.focus_minutes}m`, color: "#F59E0B" },
                { icon: Flame, label: "Challenges", value: summary.challenges_completed, color: "#EF4444" },
              ].map((s, i) => (
                <Card key={i} className="bg-[#0A0A0A] border border-white/5 rounded-sm p-4">
                  <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} />
                  <p className="text-xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid={`summary-stat-${i}`}>{s.value}</p>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.label}</p>
                </Card>
              ))}
            </motion.div>

            {/* Energy & Mood */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Avg Energy</p>
                </div>
                <p className="text-4xl font-bold mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="summary-energy">{summary.avg_energy}</p>
                <Progress value={summary.avg_energy * 10} className="h-1.5 bg-[#121212]" />
                <p className="text-[10px] text-gray-500 mt-2">out of 10</p>
              </Card>

              <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-[#A78BFA]" />
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Mood Breakdown</p>
                </div>
                {summary.mood_breakdown && Object.keys(summary.mood_breakdown).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(summary.mood_breakdown).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                      <div key={mood} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: moodColors[mood] || "#A1A1AA" }} />
                        <span className="text-xs text-gray-400 capitalize flex-1">{mood}</span>
                        <span className="text-xs font-mono text-white" style={{ fontFamily: "JetBrains Mono, monospace" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No mood data this week</p>
                )}
              </Card>
            </motion.div>

            {/* AI Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-[#0A0A0A] border border-[#3B82F6]/10 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Didi's Take</p>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" data-testid="summary-ai-text">{summary.ai_summary}</p>
              </Card>
            </motion.div>

            {/* Check-ins count */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Consistency</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{summary.checkins_count}</p>
                  <p className="text-sm text-gray-400">check-ins this week</p>
                </div>
                <Progress value={(summary.checkins_count / 7) * 100} className="h-1.5 bg-[#121212] mt-3" />
                <p className="text-[10px] text-gray-500 mt-2">Goal: 7/7 days</p>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No data available yet. Keep talking to Didi to see your weekly summary!</p>
          </div>
        )}
      </div>
    </div>
  );
}
