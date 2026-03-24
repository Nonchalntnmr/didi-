import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Flame, Zap, CheckCircle2, Circle, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryColors = {
  study: "#3B82F6",
  fitness: "#10B981",
  wellness: "#F59E0B",
  mindset: "#A78BFA",
  discipline: "#EF4444",
  social: "#EC4899",
};

const difficultyBadge = {
  easy: { label: "Easy", color: "text-[#10B981] bg-[#10B981]/10" },
  medium: { label: "Medium", color: "text-[#F59E0B] bg-[#F59E0B]/10" },
  hard: { label: "Hard", color: "text-[#EF4444] bg-[#EF4444]/10" },
};

export default function ChallengePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [streakData, setStreakData] = useState({ streak: 0, total_xp: 0, total_completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [chRes, strRes] = await Promise.all([
        fetch(`${API}/challenges/today`, { credentials: "include" }),
        fetch(`${API}/challenges/streak`, { credentials: "include" }),
      ]);
      if (chRes.ok) setChallenges(await chRes.json());
      if (strRes.ok) setStreakData(await strRes.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const completeChallenge = async (challengeId) => {
    try {
      const res = await fetch(`${API}/challenges/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challenge_id: challengeId }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = challenges.filter((c) => c.completed).length;
  const allDone = completedCount === challenges.length && challenges.length > 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button data-testid="challenges-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Daily Challenges</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-4 text-center">
            <Flame className="w-5 h-5 text-[#F59E0B] mx-auto mb-2" />
            <p className="text-2xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="challenge-streak">{streakData.streak}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>Day Streak</p>
          </Card>
          <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-4 text-center">
            <Star className="w-5 h-5 text-[#3B82F6] mx-auto mb-2" />
            <p className="text-2xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="challenge-xp">{streakData.total_xp}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>Total XP</p>
          </Card>
          <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-4 text-center">
            <Trophy className="w-5 h-5 text-[#10B981] mx-auto mb-2" />
            <p className="text-2xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="challenge-total">{streakData.total_completed}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>Completed</p>
          </Card>
        </motion.div>

        {/* Today's progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Today's Progress</p>
            <p className="text-xs font-mono text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{completedCount}/{challenges.length}</p>
          </div>
          <Progress value={challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0} className="h-2 bg-[#121212]" />
        </motion.div>

        {/* Challenges */}
        <div className="space-y-3">
          {allDone && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 mb-4">
              <Trophy className="w-12 h-12 text-[#F59E0B] mx-auto mb-3" />
              <h3 className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>All Done!</h3>
              <p className="text-sm text-gray-400">You crushed today's challenges. Come back tomorrow for more.</p>
            </motion.div>
          )}

          {challenges.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <Card
                data-testid={`challenge-card-${ch.id}`}
                className={`bg-[#0A0A0A] border rounded-sm p-5 transition-all ${
                  ch.completed ? "border-[#10B981]/20 opacity-70" : "border-white/5 hover:border-white/15"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    data-testid={`challenge-complete-${ch.id}`}
                    onClick={() => !ch.completed && completeChallenge(ch.id)}
                    disabled={ch.completed}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {ch.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-600 hover:text-[#3B82F6] transition-colors" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${ch.completed ? "line-through text-gray-500" : "text-white"}`}>{ch.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-sm font-medium capitalize"
                        style={{ color: categoryColors[ch.category] || "#A1A1AA", backgroundColor: `${categoryColors[ch.category] || "#A1A1AA"}15` }}
                      >
                        {ch.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${difficultyBadge[ch.difficulty]?.color || ""}`}>
                        {difficultyBadge[ch.difficulty]?.label || ch.difficulty}
                      </span>
                      <span className="text-[10px] font-mono text-[#F59E0B]" style={{ fontFamily: "JetBrains Mono, monospace" }}>+{ch.xp} XP</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
