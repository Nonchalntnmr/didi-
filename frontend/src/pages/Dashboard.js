import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Phone, BookOpen, Heart, Target, Zap, LogOut, Settings, ChevronRight, Crosshair, Trophy, List, TrendingUp, Share2, Skull, Rocket } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [goals, setGoals] = useState([]);
  const [latestCheckin, setLatestCheckin] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinForm, setCheckinForm] = useState({ working_on: "", energy_level: 7, mood: "focused" });
  const [newGoal, setNewGoal] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, goalsRes, checkinRes] = await Promise.all([
        fetch(`${API}/stats`, { credentials: "include" }),
        fetch(`${API}/goals`, { credentials: "include" }),
        fetch(`${API}/checkin/latest`, { credentials: "include" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (checkinRes.ok) {
        const c = await checkinRes.json();
        if (c && c.id) setLatestCheckin(c);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const submitCheckin = async () => {
    try {
      const res = await fetch(`${API}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(checkinForm),
      });
      if (res.ok) {
        const data = await res.json();
        setLatestCheckin(data);
        setCheckinOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    try {
      const res = await fetch(`${API}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newGoal }),
      });
      if (res.ok) {
        setNewGoal("");
        setShowGoalInput(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleGoal = async (goalId, completed) => {
    await fetch(`${API}/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ completed: !completed }),
    });
    fetchData();
  };

  const moods = ["exhausted", "low", "neutral", "focused", "energized"];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>BHAIYA</span>
          <div className="flex items-center gap-3">
            <Button data-testid="settings-btn" variant="ghost" size="sm" onClick={() => navigate("/customize")} className="text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <Button data-testid="logout-btn" variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        {/* Greeting */}
        <motion.div {...fadeUp} className="mb-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Dashboard
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
            Hey, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-[#A1A1AA] mt-1">What are we working on today?</p>
        </motion.div>

        {/* Action Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: BookOpen, label: "Study", color: "#3B82F6", path: "/chat", mode: "educator", testId: "action-study" },
            { icon: Heart, label: "Health", color: "#10B981", path: "/chat", mode: "wellness", testId: "action-health" },
            { icon: MessageSquare, label: "Talk", color: "#A1A1AA", path: "/chat", mode: "general", testId: "action-talk" },
            { icon: Phone, label: "Call Bhaiya", color: "#F59E0B", path: "/call", testId: "action-call" },
            { icon: Crosshair, label: "Focus Mode", color: "#EF4444", path: "/focus", testId: "action-focus" },
            { icon: Trophy, label: "Challenges", color: "#A78BFA", path: "/challenges", testId: "action-challenges" },
            { icon: List, label: "Routines", color: "#EC4899", path: "/routines", testId: "action-routines" },
            { icon: Skull, label: "Brutal Honesty", color: "#EF4444", path: "/chat", mode: "brutal_honesty", testId: "action-brutal" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <Card
                data-testid={item.testId}
                className="group bg-[#0A0A0A] border border-white/5 rounded-sm p-5 cursor-pointer hover:border-white/20 transition-all active:scale-[0.98]"
                onClick={() => navigate(item.path, { state: { mode: item.mode } })}
              >
                <item.icon className="w-6 h-6 mb-3 transition-colors" style={{ color: item.color }} />
                <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{item.label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick links row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {[
            { icon: TrendingUp, label: "Weekly Summary", path: "/summary", testId: "quick-summary" },
            { icon: Share2, label: "Progress Card", path: "/progress", testId: "quick-progress" },
            { icon: Rocket, label: "Future You", path: "/chat", mode: "future_you", testId: "quick-future" },
          ].map((item, i) => (
            <button
              key={i}
              data-testid={item.testId}
              onClick={() => navigate(item.path, { state: { mode: item.mode } })}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#0A0A0A] border border-white/5 text-gray-400 hover:border-[#3B82F6]/30 hover:text-white transition-all text-xs"
            >
              <item.icon className="w-3 h-3" /> {item.label}
            </button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily Check-in */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Daily Check-in</p>
                  <h3 className="text-lg font-semibold tracking-tight mt-1" style={{ fontFamily: "Manrope, sans-serif" }}>How are you doing?</h3>
                </div>
                <Zap className="w-5 h-5 text-[#F59E0B]" />
              </div>

              {checkinOpen ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">What are you working on today?</label>
                    <input
                      data-testid="checkin-working-on"
                      className="w-full bg-[#121212] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none transition-colors"
                      placeholder="e.g., Studying for finals, building a project..."
                      value={checkinForm.working_on}
                      onChange={(e) => setCheckinForm({ ...checkinForm, working_on: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Energy Level: {checkinForm.energy_level}/10</label>
                    <input
                      data-testid="checkin-energy"
                      type="range"
                      min="1"
                      max="10"
                      value={checkinForm.energy_level}
                      onChange={(e) => setCheckinForm({ ...checkinForm, energy_level: parseInt(e.target.value) })}
                      className="w-full accent-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Mood</label>
                    <div className="flex gap-2 flex-wrap">
                      {moods.map((m) => (
                        <button
                          key={m}
                          data-testid={`mood-${m}`}
                          onClick={() => setCheckinForm({ ...checkinForm, mood: m })}
                          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                            checkinForm.mood === m ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-400 border border-white/5 hover:border-white/20"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button data-testid="checkin-submit" onClick={submitCheckin} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-6 py-2 text-sm" disabled={!checkinForm.working_on}>
                      Submit
                    </Button>
                    <Button variant="ghost" onClick={() => setCheckinOpen(false)} className="text-gray-400 rounded-sm px-4 py-2 text-sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : latestCheckin ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <p className="text-sm text-gray-300">{latestCheckin.working_on}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    <span>Energy: {latestCheckin.energy_level}/10</span>
                    <span>Mood: {latestCheckin.mood}</span>
                  </div>
                  <Button data-testid="checkin-update-btn" variant="ghost" onClick={() => setCheckinOpen(true)} className="text-[#3B82F6] text-xs mt-2 px-0 hover:text-blue-400">
                    Update check-in <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <Button data-testid="checkin-start-btn" onClick={() => setCheckinOpen(true)} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-6 py-2.5 text-sm w-full">
                  Start Today's Check-in
                </Button>
              )}
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6 h-full">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Progress</p>
              {stats ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Streak</span>
                      <span className="text-[#F59E0B] font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.streak} days</span>
                    </div>
                    <Progress value={(stats.streak / 7) * 100} className="h-1 bg-[#121212]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Goals</span>
                      <span className="text-white font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.completed_goals}/{stats.total_goals}</span>
                    </div>
                    <Progress value={stats.total_goals > 0 ? (stats.completed_goals / stats.total_goals) * 100 : 0} className="h-1 bg-[#121212]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Focus Time</span>
                      <span className="text-white font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.total_focus_minutes || 0}m</span>
                    </div>
                    <Progress value={Math.min((stats.total_focus_minutes || 0) / 120 * 100, 100)} className="h-1 bg-[#121212]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-sm font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.total_messages}</p>
                      <p className="text-[10px] text-gray-500">Messages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.total_challenges_completed || 0}</p>
                      <p className="text-[10px] text-gray-500">Challenges</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-[#121212] rounded-sm animate-pulse" />
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Goals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4">
          <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Goals</p>
              </div>
              <Button data-testid="add-goal-btn" variant="ghost" onClick={() => setShowGoalInput(!showGoalInput)} className="text-[#3B82F6] text-xs hover:text-blue-400 px-2">
                + Add Goal
              </Button>
            </div>

            {showGoalInput && (
              <div className="flex gap-2 mb-4">
                <input
                  data-testid="goal-input"
                  className="flex-1 bg-[#121212] border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none"
                  placeholder="What's your goal?"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                />
                <Button data-testid="goal-submit-btn" onClick={addGoal} className="bg-[#3B82F6] text-black font-bold rounded-sm px-4 text-sm">Add</Button>
              </div>
            )}

            {goals.length > 0 ? (
              <div className="space-y-2">
                {goals.slice(0, 8).map((g) => (
                  <div
                    key={g.id}
                    data-testid={`goal-item-${g.id}`}
                    className="flex items-center gap-3 p-3 rounded-sm bg-[#121212]/50 hover:bg-[#121212] transition-colors group"
                  >
                    <button
                      data-testid={`goal-toggle-${g.id}`}
                      onClick={() => toggleGoal(g.id, g.completed)}
                      className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${
                        g.completed ? "bg-[#10B981] border-[#10B981]" : "border-white/20 group-hover:border-white/40"
                      }`}
                    >
                      {g.completed && <span className="text-black text-[10px]">&#10003;</span>}
                    </button>
                    <span className={`text-sm flex-1 ${g.completed ? "text-gray-600 line-through" : "text-gray-300"}`}>{g.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-4">No goals yet. Add one to get started.</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
