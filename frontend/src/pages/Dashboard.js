import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, Phone, BookOpen, Heart, Target, Zap, LogOut, Settings,
  ChevronRight, Crosshair, Trophy, List, TrendingUp, Share2, Skull, Rocket,
  Star, ArrowRight, Send
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Night owl mode";
};

const motivational = [
  "Small consistent effort beats occasional heroics.",
  "You're one decision away from a completely different life.",
  "Discipline is choosing between what you want now and what you want most.",
  "The best time to start was yesterday. The second best time is now.",
  "Progress, not perfection.",
  "Your future self is watching. Make them proud.",
];

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
  const [quickMsg, setQuickMsg] = useState("");
  const [quote] = useState(motivational[Math.floor(Math.random() * motivational.length)]);

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
    const res = await fetch(`${API}/checkin`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(checkinForm) });
    if (res.ok) { const data = await res.json(); setLatestCheckin(data); setCheckinOpen(false); fetchData(); }
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const res = await fetch(`${API}/goals`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: newGoal }) });
    if (res.ok) { setNewGoal(""); setShowGoalInput(false); fetchData(); }
  };

  const toggleGoal = async (id, done) => {
    await fetch(`${API}/goals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ completed: !done }) });
    fetchData();
  };

  const quickChat = () => {
    if (quickMsg.trim()) navigate("/chat", { state: { initialMsg: quickMsg } });
  };

  const moods = ["exhausted", "low", "neutral", "focused", "energized"];
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-[#3B82F6] flex items-center justify-center"><span className="text-[10px] font-black text-black">B</span></div>
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>BHAIYA</span>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="wrapped-nav" variant="ghost" size="sm" onClick={() => navigate("/wrapped")} className="text-[#F59E0B] hover:text-yellow-300 text-xs gap-1 hidden md:flex"><Star className="w-3 h-3" /> Wrapped</Button>
            <Button data-testid="progress-card-nav" variant="ghost" size="sm" onClick={() => navigate("/progress")} className="text-gray-500 hover:text-white"><Share2 className="w-3.5 h-3.5" /></Button>
            <Button data-testid="settings-btn" variant="ghost" size="sm" onClick={() => navigate("/customize")} className="text-gray-500 hover:text-white"><Settings className="w-4 h-4" /></Button>
            <Button data-testid="logout-btn" variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-white"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 space-y-5">
        {/* Hero greeting */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-sm p-7 md:p-8 border border-white/[0.04]" style={{ background: "linear-gradient(145deg, #0A0A0A 0%, #0f172a 60%, #0A0A0A 100%)" }}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#3B82F6]/[0.06] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {timeGreeting()} &middot; {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {firstName}, let's get it
                </h1>
              </div>
              {stats && (
                <div className="hidden md:flex items-center gap-5">
                  {[
                    { val: stats.streak, label: "Streak", color: "#F59E0B", suffix: "d" },
                    { val: stats.total_messages, label: "Chats", color: "#3B82F6" },
                    { val: stats.completed_goals, label: "Goals", color: "#10B981" },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.val}{s.suffix || ""}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quote */}
            <p className="text-xs text-gray-500 italic mb-4">"{quote}"</p>

            {/* Quick chat */}
            <div className="flex items-center gap-2">
              <input
                data-testid="quick-chat-input"
                className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-sm px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6]/50 focus:outline-none transition-colors"
                placeholder="Quick message to Bhaiya..."
                value={quickMsg}
                onChange={(e) => setQuickMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && quickChat()}
              />
              <Button data-testid="quick-chat-send" onClick={quickChat} disabled={!quickMsg.trim()} className="bg-[#3B82F6] text-black rounded-sm px-3 py-2.5 disabled:opacity-20">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* FaceTime card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          data-testid="action-call"
          onClick={() => navigate("/call")}
          className="relative overflow-hidden rounded-sm p-5 md:p-6 cursor-pointer group border border-[#10B981]/15 hover:border-[#10B981]/30 transition-all active:scale-[0.997]"
          style={{ background: "linear-gradient(135deg, #052e16 0%, #0A0A0A 50%)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#10B981]/[0.05] rounded-full blur-[60px] group-hover:bg-[#10B981]/[0.08] transition-all pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>FaceTime Bhaiya</h3>
                <p className="text-[10px] text-gray-500">Camera on, voice conversation, live captions</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#10B981]/40 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* Action grid */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { icon: BookOpen, label: "Study", color: "#3B82F6", path: "/chat", mode: "educator", id: "action-study" },
            { icon: Heart, label: "Health", color: "#10B981", path: "/chat", mode: "wellness", id: "action-health" },
            { icon: MessageSquare, label: "Talk", color: "#A1A1AA", path: "/chat", mode: "general", id: "action-talk" },
            { icon: Crosshair, label: "Focus", color: "#EF4444", path: "/focus", id: "action-focus" },
            { icon: Trophy, label: "Challenges", color: "#A78BFA", path: "/challenges", id: "action-challenges" },
            { icon: List, label: "Routines", color: "#EC4899", path: "/routines", id: "action-routines" },
            { icon: Skull, label: "Brutal", color: "#EF4444", path: "/chat", mode: "brutal_honesty", id: "action-brutal" },
            { icon: Rocket, label: "Future", color: "#60A5FA", path: "/chat", mode: "future_you", id: "action-future" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }}>
              <button
                data-testid={item.id}
                onClick={() => navigate(item.path, { state: { mode: item.mode } })}
                className="w-full flex flex-col items-center gap-1.5 p-3 rounded-sm bg-[#0A0A0A] border border-white/[0.04] hover:border-white/10 transition-all group active:scale-95"
              >
                <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: item.color }} />
                <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors">{item.label}</span>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { icon: TrendingUp, label: "Weekly Summary", path: "/summary", id: "quick-summary" },
            { icon: Star, label: "Bhaiya Wrapped", path: "/wrapped", color: "#F59E0B", id: "quick-wrapped" },
            { icon: Share2, label: "Progress Card", path: "/progress", id: "quick-progress" },
          ].map((item, i) => (
            <button key={i} data-testid={item.id} onClick={() => navigate(item.path)}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-sm bg-[#0A0A0A] border border-white/[0.04] hover:border-white/10 text-gray-500 hover:text-white transition-all text-[10px]">
              <item.icon className="w-3 h-3" style={item.color ? { color: item.color } : {}} /> {item.label}
            </button>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Check-in */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-5">
            <Card className="bg-[#0A0A0A] border border-white/[0.04] rounded-sm p-5 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Check-in</p>
                </div>
                {latestCheckin && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#10B981]">Done</span>}
              </div>
              {checkinOpen ? (
                <div className="space-y-3">
                  <input data-testid="checkin-working-on" className="w-full bg-[#121212] border border-white/[0.06] rounded-sm px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:border-[#3B82F6]/50 focus:outline-none" placeholder="What are you working on?" value={checkinForm.working_on} onChange={(e) => setCheckinForm({ ...checkinForm, working_on: e.target.value })} />
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1.5 block">Energy: {checkinForm.energy_level}/10</label>
                    <input data-testid="checkin-energy" type="range" min="1" max="10" value={checkinForm.energy_level} onChange={(e) => setCheckinForm({ ...checkinForm, energy_level: parseInt(e.target.value) })} className="w-full accent-[#3B82F6]" />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {moods.map((m) => (
                      <button key={m} data-testid={`mood-${m}`} onClick={() => setCheckinForm({ ...checkinForm, mood: m })} className={`px-2.5 py-1 rounded-sm text-[9px] font-medium transition-all ${checkinForm.mood === m ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-500 border border-white/[0.04]"}`}>{m}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button data-testid="checkin-submit" onClick={submitCheckin} className="bg-[#3B82F6] text-black font-bold rounded-sm px-4 py-2 text-[10px]" disabled={!checkinForm.working_on}>Submit</Button>
                    <Button variant="ghost" onClick={() => setCheckinOpen(false)} className="text-gray-500 text-[10px]">Cancel</Button>
                  </div>
                </div>
              ) : latestCheckin ? (
                <div>
                  <p className="text-xs text-gray-300 mb-2">{latestCheckin.working_on}</p>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    <span>Energy {latestCheckin.energy_level}/10</span><span className="text-gray-700">|</span><span className="capitalize">{latestCheckin.mood}</span>
                  </div>
                  <button data-testid="checkin-update-btn" onClick={() => setCheckinOpen(true)} className="text-[#3B82F6] text-[9px] hover:text-blue-400 flex items-center gap-0.5">Update <ChevronRight className="w-2.5 h-2.5" /></button>
                </div>
              ) : (
                <Button data-testid="checkin-start-btn" onClick={() => setCheckinOpen(true)} className="bg-[#3B82F6] text-black font-bold rounded-sm py-2.5 text-xs w-full">Start Check-in</Button>
              )}
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-3">
            <Card className="bg-[#0A0A0A] border border-white/[0.04] rounded-sm p-5 h-full">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Progress</p>
              {stats ? (
                <div className="space-y-2.5">
                  {[
                    { label: "Streak", value: `${stats.streak}d`, color: "#F59E0B", pct: Math.min(stats.streak / 7 * 100, 100) },
                    { label: "Goals", value: `${stats.completed_goals}/${stats.total_goals}`, color: "#10B981", pct: stats.total_goals > 0 ? (stats.completed_goals / stats.total_goals) * 100 : 0 },
                    { label: "Focus", value: `${stats.total_focus_minutes || 0}m`, color: "#3B82F6", pct: Math.min((stats.total_focus_minutes || 0) / 60 * 100, 100) },
                    { label: "XP", value: stats.total_challenges_completed || 0, color: "#A78BFA", pct: Math.min((stats.total_challenges_completed || 0) * 15, 100) },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-mono font-medium" style={{ color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</span>
                      </div>
                      <div className="w-full h-[3px] bg-[#121212] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(s.pct, 100)}%` }} transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full" style={{ backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-5 bg-[#121212] rounded-sm animate-pulse" />)}</div>
              )}
            </Card>
          </motion.div>

          {/* Goals */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-4">
            <Card className="bg-[#0A0A0A] border border-white/[0.04] rounded-sm p-5 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-[#3B82F6]" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Goals</p>
                </div>
                <button data-testid="add-goal-btn" onClick={() => setShowGoalInput(!showGoalInput)} className="text-[#3B82F6] text-[9px] hover:text-blue-400">+ Add</button>
              </div>
              {showGoalInput && (
                <div className="flex gap-1.5 mb-2">
                  <input data-testid="goal-input" className="flex-1 bg-[#121212] border border-white/[0.06] rounded-sm px-3 py-1.5 text-[10px] text-white placeholder:text-gray-600 focus:border-[#3B82F6]/50 focus:outline-none" placeholder="New goal..." value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
                  <Button data-testid="goal-submit-btn" onClick={addGoal} className="bg-[#3B82F6] text-black font-bold rounded-sm px-2.5 text-[10px]">Add</Button>
                </div>
              )}
              {goals.length > 0 ? (
                <div className="space-y-1">
                  {goals.slice(0, 6).map((g) => (
                    <div key={g.id} data-testid={`goal-item-${g.id}`} className="flex items-center gap-2 p-1.5 rounded-sm hover:bg-[#121212]/50 transition-colors group">
                      <button data-testid={`goal-toggle-${g.id}`} onClick={() => toggleGoal(g.id, g.completed)} className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${g.completed ? "bg-[#10B981] border-[#10B981]" : "border-white/15"}`}>
                        {g.completed && <span className="text-black text-[7px]">&#10003;</span>}
                      </button>
                      <span className={`text-[10px] flex-1 truncate ${g.completed ? "text-gray-600 line-through" : "text-gray-300"}`}>{g.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 text-center py-4">No goals yet</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
