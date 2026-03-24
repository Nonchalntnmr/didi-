import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, Phone, BookOpen, Heart, Target, Zap, LogOut, Settings,
  ChevronRight, Crosshair, Trophy, List, TrendingUp, Share2, Skull, Rocket,
  Clock, Flame, Star, ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, goalsRes, checkinRes] = await Promise.all([
        fetch(`${API}/stats`, { credentials: "include" }),
        fetch(`${API}/goals`, { credentials: "include" }),
        fetch(`${API}/checkin/latest`, { credentials: "include" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (checkinRes.ok) { const c = await checkinRes.json(); if (c && c.id) setLatestCheckin(c); }
    } catch (err) { console.error(err); }
  };

  const submitCheckin = async () => {
    try {
      const res = await fetch(`${API}/checkin`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(checkinForm) });
      if (res.ok) { const data = await res.json(); setLatestCheckin(data); setCheckinOpen(false); fetchData(); }
    } catch (err) { console.error(err); }
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    try {
      const res = await fetch(`${API}/goals`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: newGoal }) });
      if (res.ok) { setNewGoal(""); setShowGoalInput(false); fetchData(); }
    } catch (err) { console.error(err); }
  };

  const toggleGoal = async (goalId, completed) => {
    await fetch(`${API}/goals/${goalId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ completed: !completed }) });
    fetchData();
  };

  const moods = ["exhausted", "low", "neutral", "focused", "energized"];
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <span className="text-[10px] font-black text-black">B</span>
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>BHAIYA</span>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="progress-card-nav" variant="ghost" size="sm" onClick={() => navigate("/progress")} className="text-gray-500 hover:text-white text-xs gap-1"><Share2 className="w-3 h-3" /></Button>
            <Button data-testid="settings-btn" variant="ghost" size="sm" onClick={() => navigate("/customize")} className="text-gray-500 hover:text-white"><Settings className="w-4 h-4" /></Button>
            <Button data-testid="logout-btn" variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-white"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 space-y-6">
        {/* Hero greeting */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-sm p-8 md:p-10 border border-white/5" style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #111827 50%, #0A0A0A 100%)" }}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#3B82F6]/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                Hey, {firstName}
              </h1>
              <p className="text-[#A1A1AA] text-sm md:text-base">What are we working on today?</p>
            </div>
            {stats && (
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#F59E0B]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.streak}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Streak</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.total_messages}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Messages</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#10B981]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{stats.completed_goals}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Goals Done</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Call Bhaiya - Signature Feature */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div
            data-testid="action-call"
            onClick={() => navigate("/call")}
            className="relative overflow-hidden rounded-sm p-6 md:p-8 cursor-pointer group border border-[#F59E0B]/20 hover:border-[#F59E0B]/40 transition-all active:scale-[0.995]"
            style={{ background: "linear-gradient(135deg, #1a1500 0%, #0A0A0A 60%)" }}
          >
            <div className="absolute top-0 right-0 w-60 h-60 bg-[#F59E0B]/5 rounded-full blur-[80px] group-hover:bg-[#F59E0B]/10 transition-all pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Call Bhaiya</h3>
                  <p className="text-xs text-gray-500">Voice call your AI mentor anytime</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#F59E0B]/50 group-hover:text-[#F59E0B] group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </motion.div>

        {/* Main action grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: "Study", desc: "Learn & understand", color: "#3B82F6", bg: "#3B82F6", path: "/chat", mode: "educator", testId: "action-study" },
            { icon: Heart, label: "Health", desc: "Wellness & habits", color: "#10B981", bg: "#10B981", path: "/chat", mode: "wellness", testId: "action-health" },
            { icon: MessageSquare, label: "Talk", desc: "Just chat", color: "#A1A1AA", bg: "#A1A1AA", path: "/chat", mode: "general", testId: "action-talk" },
            { icon: Crosshair, label: "Focus", desc: "Deep work timer", color: "#EF4444", bg: "#EF4444", path: "/focus", testId: "action-focus" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
              <div
                data-testid={item.testId}
                onClick={() => navigate(item.path, { state: { mode: item.mode } })}
                className="group relative overflow-hidden rounded-sm p-5 cursor-pointer border border-white/5 hover:border-white/15 transition-all active:scale-[0.97] h-full"
                style={{ background: `linear-gradient(180deg, ${item.bg}08 0%, #0A0A0A 100%)` }}
              >
                <item.icon className="w-5 h-5 mb-3 transition-all group-hover:scale-110" style={{ color: item.color }} />
                <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{item.label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mode shortcuts */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { icon: Trophy, label: "Challenges", color: "#A78BFA", path: "/challenges", testId: "action-challenges" },
            { icon: List, label: "Routines", color: "#EC4899", path: "/routines", testId: "action-routines" },
            { icon: Skull, label: "Brutal Mode", color: "#EF4444", path: "/chat", mode: "brutal_honesty", testId: "action-brutal" },
            { icon: Rocket, label: "Future You", color: "#3B82F6", path: "/chat", mode: "future_you", testId: "action-future" },
            { icon: TrendingUp, label: "Weekly", color: "#10B981", path: "/summary", testId: "action-summary" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
              <button
                data-testid={item.testId}
                onClick={() => navigate(item.path, { state: { mode: item.mode } })}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-sm bg-[#0A0A0A] border border-white/5 hover:border-white/15 text-gray-400 hover:text-white transition-all text-xs group"
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0 transition-all group-hover:scale-110" style={{ color: item.color }} />
                <span className="truncate">{item.label}</span>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Check-in */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-5">
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Check-in</p>
                </div>
                {latestCheckin && <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#10B981]/10 text-[#10B981]">Active</span>}
              </div>
              {checkinOpen ? (
                <div className="space-y-4">
                  <input data-testid="checkin-working-on" className="w-full bg-[#121212] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none" placeholder="What are you working on today?" value={checkinForm.working_on} onChange={(e) => setCheckinForm({ ...checkinForm, working_on: e.target.value })} />
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Energy: {checkinForm.energy_level}/10</label>
                    <input data-testid="checkin-energy" type="range" min="1" max="10" value={checkinForm.energy_level} onChange={(e) => setCheckinForm({ ...checkinForm, energy_level: parseInt(e.target.value) })} className="w-full accent-[#3B82F6]" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {moods.map((m) => (
                      <button key={m} data-testid={`mood-${m}`} onClick={() => setCheckinForm({ ...checkinForm, mood: m })} className={`px-3 py-1 rounded-sm text-[10px] font-medium transition-all ${checkinForm.mood === m ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-500 border border-white/5"}`}>{m}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button data-testid="checkin-submit" onClick={submitCheckin} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-5 py-2 text-xs" disabled={!checkinForm.working_on}>Submit</Button>
                    <Button variant="ghost" onClick={() => setCheckinOpen(false)} className="text-gray-500 text-xs">Cancel</Button>
                  </div>
                </div>
              ) : latestCheckin ? (
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-gray-300 leading-relaxed">{latestCheckin.working_on}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    <span>Energy {latestCheckin.energy_level}/10</span>
                    <span className="text-gray-700">|</span>
                    <span className="capitalize">{latestCheckin.mood}</span>
                  </div>
                  <button data-testid="checkin-update-btn" onClick={() => setCheckinOpen(true)} className="text-[#3B82F6] text-[10px] hover:text-blue-400 flex items-center gap-1">Update <ChevronRight className="w-2.5 h-2.5" /></button>
                </div>
              ) : (
                <Button data-testid="checkin-start-btn" onClick={() => setCheckinOpen(true)} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm py-3 text-sm w-full">Start Check-in</Button>
              )}
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-3">
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6 h-full">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Stats</p>
              {stats ? (
                <div className="space-y-3">
                  {[
                    { label: "Streak", value: `${stats.streak}d`, color: "#F59E0B", pct: (stats.streak / 7) * 100 },
                    { label: "Goals", value: `${stats.completed_goals}/${stats.total_goals}`, color: "#10B981", pct: stats.total_goals > 0 ? (stats.completed_goals / stats.total_goals) * 100 : 0 },
                    { label: "Focus", value: `${stats.total_focus_minutes || 0}m`, color: "#3B82F6", pct: Math.min((stats.total_focus_minutes || 0) / 60 * 100, 100) },
                    { label: "Challenges", value: stats.total_challenges_completed || 0, color: "#A78BFA", pct: Math.min((stats.total_challenges_completed || 0) * 10, 100) },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-mono font-medium" style={{ color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</span>
                      </div>
                      <div className="w-full h-1 bg-[#121212] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(s.pct, 100)}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-6 bg-[#121212] rounded-sm animate-pulse" />)}</div>
              )}
            </Card>
          </motion.div>

          {/* Goals */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-4">
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Goals</p>
                </div>
                <button data-testid="add-goal-btn" onClick={() => setShowGoalInput(!showGoalInput)} className="text-[#3B82F6] text-[10px] hover:text-blue-400">+ Add</button>
              </div>
              {showGoalInput && (
                <div className="flex gap-2 mb-3">
                  <input data-testid="goal-input" className="flex-1 bg-[#121212] border border-white/10 rounded-sm px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none" placeholder="New goal..." value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
                  <Button data-testid="goal-submit-btn" onClick={addGoal} className="bg-[#3B82F6] text-black font-bold rounded-sm px-3 text-xs">Add</Button>
                </div>
              )}
              {goals.length > 0 ? (
                <div className="space-y-1.5">
                  {goals.slice(0, 6).map((g) => (
                    <div key={g.id} data-testid={`goal-item-${g.id}`} className="flex items-center gap-2.5 p-2 rounded-sm hover:bg-[#121212]/50 transition-colors group">
                      <button data-testid={`goal-toggle-${g.id}`} onClick={() => toggleGoal(g.id, g.completed)} className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${g.completed ? "bg-[#10B981] border-[#10B981]" : "border-white/20"}`}>
                        {g.completed && <span className="text-black text-[8px]">&#10003;</span>}
                      </button>
                      <span className={`text-xs flex-1 truncate ${g.completed ? "text-gray-600 line-through" : "text-gray-300"}`}>{g.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 text-center py-6">No goals yet</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
