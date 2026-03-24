import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, CheckCircle2, List, Calendar, GripVertical } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categories = ["study", "fitness", "wellness", "productivity", "custom"];
const frequencies = ["daily", "weekdays", "weekends", "weekly"];

export default function RoutinesPage() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", steps: [""], category: "study", frequency: "daily" });
  const [logs, setLogs] = useState({});

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${API}/routines`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRoutines(data);
        // Fetch logs for each routine
        const logMap = {};
        for (const r of data) {
          const logRes = await fetch(`${API}/routines/${r.id}/logs?limit=7`, { credentials: "include" });
          if (logRes.ok) logMap[r.id] = await logRes.json();
        }
        setLogs(logMap);
      }
    } catch (err) { console.error(err); }
  };

  const createRoutine = async () => {
    if (!form.title.trim()) return;
    const steps = form.steps.filter((s) => s.trim());
    try {
      const res = await fetch(`${API}/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, steps }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: "", steps: [""], category: "study", frequency: "daily" });
        fetchRoutines();
      }
    } catch (err) { console.error(err); }
  };

  const deleteRoutine = async (id) => {
    await fetch(`${API}/routines/${id}`, { method: "DELETE", credentials: "include" });
    fetchRoutines();
  };

  const logCompletion = async (routineId) => {
    try {
      await fetch(`${API}/routines/${routineId}/log`, { method: "POST", credentials: "include" });
      fetchRoutines();
    } catch (err) { console.error(err); }
  };

  const addStep = () => setForm({ ...form, steps: [...form.steps, ""] });
  const updateStep = (idx, val) => {
    const newSteps = [...form.steps];
    newSteps[idx] = val;
    setForm({ ...form, steps: newSteps });
  };
  const removeStep = (idx) => {
    const newSteps = form.steps.filter((_, i) => i !== idx);
    setForm({ ...form, steps: newSteps.length > 0 ? newSteps : [""] });
  };

  const todayISO = new Date().toISOString().split("T")[0];
  const isCompletedToday = (routineId) => {
    const routineLogs = logs[routineId] || [];
    return routineLogs.some((l) => l.completed_at?.startsWith(todayISO));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button data-testid="routines-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Routines & Plans</span>
          </div>
          <Button data-testid="create-routine-btn" onClick={() => setShowCreate(!showCreate)} className="bg-[#3B82F6] text-black font-bold rounded-sm px-4 py-2 text-xs">
            <Plus className="w-3 h-3 mr-1" /> New Routine
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Create Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#0A0A0A] border border-[#3B82F6]/20 rounded-sm p-6 mb-6">
              <h3 className="text-base font-semibold tracking-tight mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Create Routine</h3>
              <div className="space-y-4">
                <input
                  data-testid="routine-title-input"
                  className="w-full bg-[#121212] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none"
                  placeholder="Routine name (e.g., Morning Study Routine)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <div>
                  <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Steps</label>
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-3 h-3 text-gray-600" />
                      <input
                        data-testid={`routine-step-${idx}`}
                        className="flex-1 bg-[#121212] border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none"
                        placeholder={`Step ${idx + 1}`}
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                      />
                      {form.steps.length > 1 && (
                        <button onClick={() => removeStep(idx)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addStep} className="text-xs text-[#3B82F6] hover:text-blue-400 mt-1">+ Add step</button>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Category</label>
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((c) => (
                        <button
                          key={c}
                          onClick={() => setForm({ ...form, category: c })}
                          className={`px-3 py-1.5 rounded-sm text-xs font-medium capitalize transition-all ${
                            form.category === c ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-400 border border-white/5 hover:border-white/20"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Frequency</label>
                    <div className="flex gap-2 flex-wrap">
                      {frequencies.map((f) => (
                        <button
                          key={f}
                          onClick={() => setForm({ ...form, frequency: f })}
                          className={`px-3 py-1.5 rounded-sm text-xs font-medium capitalize transition-all ${
                            form.frequency === f ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-400 border border-white/5 hover:border-white/20"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button data-testid="routine-save-btn" onClick={createRoutine} className="bg-[#3B82F6] text-black font-bold rounded-sm px-6 py-2 text-sm">Create</Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-400 text-sm">Cancel</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Routines List */}
        {routines.length > 0 ? (
          <div className="space-y-4">
            {routines.map((r, i) => {
              const done = isCompletedToday(r.id);
              const routineLogs = logs[r.id] || [];
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card data-testid={`routine-card-${r.id}`} className={`bg-[#0A0A0A] border rounded-sm p-5 transition-all ${done ? "border-[#10B981]/20" : "border-white/5"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{r.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] capitalize border-white/10">{r.category}</Badge>
                          <span className="text-[10px] font-mono text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>{r.frequency}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!done ? (
                          <Button data-testid={`routine-log-${r.id}`} onClick={() => logCompletion(r.id)} size="sm" className="bg-[#10B981] text-black text-xs font-bold rounded-sm px-3 py-1 hover:bg-emerald-400">
                            Done Today
                          </Button>
                        ) : (
                          <span className="text-xs text-[#10B981] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>
                        )}
                        <button onClick={() => deleteRoutine(r.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {r.steps && r.steps.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {r.steps.map((step, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="text-[10px] font-mono text-gray-600 w-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>{si + 1}.</span>
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Mini calendar for last 7 days */}
                    <div className="flex items-center gap-1 mt-3">
                      <Calendar className="w-3 h-3 text-gray-600 mr-1" />
                      {Array.from({ length: 7 }).map((_, di) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - di));
                        const dateStr = d.toISOString().split("T")[0];
                        const logged = routineLogs.some((l) => l.completed_at?.startsWith(dateStr));
                        return (
                          <div
                            key={di}
                            className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono ${
                              logged ? "bg-[#10B981] text-black" : "bg-[#121212] text-gray-600"
                            }`}
                            style={{ fontFamily: "JetBrains Mono, monospace" }}
                            title={dateStr}
                          >
                            {d.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : !showCreate ? (
          <div className="text-center py-16">
            <List className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>No routines yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create study plans, workout routines, or daily habits.</p>
            <Button data-testid="empty-create-routine-btn" onClick={() => setShowCreate(true)} className="bg-[#3B82F6] text-black font-bold rounded-sm px-6 py-2">
              Create Your First Routine
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
