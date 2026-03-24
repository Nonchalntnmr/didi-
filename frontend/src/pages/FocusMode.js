import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, Square, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESETS = [
  { label: "Short Focus", minutes: 15 },
  { label: "Pomodoro", minutes: 25 },
  { label: "Deep Work", minutes: 50 },
  { label: "Marathon", minutes: 90 },
];

export default function FocusMode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [duration, setDuration] = useState(25);
  const [task, setTask] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [tip, setTip] = useState("");
  const [sessions, setSessions] = useState([]);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            handleComplete();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/focus/sessions?limit=10`, { credentials: "include" });
      if (res.ok) setSessions(await res.json());
    } catch (err) { console.error(err); }
  };

  const startSession = async () => {
    try {
      const res = await fetch(`${API}/focus/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration_minutes: duration, task }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        setTip(data.tip);
        setTimeLeft(duration * 60);
        setIsRunning(true);
        setCompleted(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleComplete = useCallback(async () => {
    setIsRunning(false);
    setCompleted(true);
    if (sessionId) {
      await fetch(`${API}/focus/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId, completed: true }),
      });
      fetchSessions();
    }
  }, [sessionId]);

  const stopSession = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    if (sessionId) {
      await fetch(`${API}/focus/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId, completed: false }),
      });
      fetchSessions();
    }
  };

  const resetSession = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setCompleted(false);
    setSessionId(null);
    setTimeLeft(0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = isRunning || completed ? ((duration * 60 - timeLeft) / (duration * 60)) * 100 : 0;
  const circumference = 2 * Math.PI * 120;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button data-testid="focus-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Focus Mode</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer */}
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-8 flex flex-col items-center">
              {!isRunning && !completed ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-3 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESETS.map((p) => (
                        <button
                          key={p.minutes}
                          data-testid={`focus-preset-${p.minutes}`}
                          onClick={() => setDuration(p.minutes)}
                          className={`px-4 py-2 rounded-sm text-xs font-medium transition-all ${
                            duration === p.minutes ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-400 border border-white/5 hover:border-white/20"
                          }`}
                        >
                          {p.label} ({p.minutes}m)
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Task (optional)</label>
                    <input
                      data-testid="focus-task-input"
                      className="w-full bg-[#121212] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#3B82F6] focus:outline-none"
                      placeholder="What are you focusing on?"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                    />
                  </div>
                  <Button
                    data-testid="focus-start-btn"
                    onClick={startSession}
                    className="w-full bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm py-3 text-base flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" /> Start Focus Session
                  </Button>
                </motion.div>
              ) : completed ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-[#10B981] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Session Complete!</h3>
                  <p className="text-gray-400 text-sm mb-6">{duration} minutes of focused work. Your future self thanks you.</p>
                  <Button data-testid="focus-reset-btn" onClick={resetSession} className="bg-[#3B82F6] text-black font-bold rounded-sm px-8 py-3">
                    <RotateCcw className="w-4 h-4 mr-2" /> Start Another
                  </Button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  {/* Circle timer */}
                  <div className="relative w-64 h-64 mx-auto mb-6">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                      <circle cx="128" cy="128" r="120" fill="none" stroke="#121212" strokeWidth="4" />
                      <circle
                        cx="128" cy="128" r="120" fill="none"
                        stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (progress / 100) * circumference}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-5xl font-bold tracking-tighter" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="focus-timer">
                        {formatTime(timeLeft)}
                      </p>
                      {task && <p className="text-xs text-gray-500 mt-2 max-w-[180px] truncate">{task}</p>}
                    </div>
                  </div>
                  {tip && (
                    <p className="text-sm text-[#3B82F6]/80 mb-6 max-w-sm mx-auto italic">"{tip}"</p>
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      data-testid="focus-pause-btn"
                      onClick={() => { setIsPaused(!isPaused); if (isPaused) clearInterval(intervalRef.current); }}
                      className="w-12 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
                    >
                      {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </Button>
                    <Button
                      data-testid="focus-stop-btn"
                      onClick={stopSession}
                      className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      <Square className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </div>

          {/* History */}
          <div>
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <Clock className="w-3 h-3 inline mr-1" /> Recent Sessions
              </p>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 text-xs" data-testid={`focus-session-${s.id}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.completed ? "bg-[#10B981]" : "bg-gray-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 truncate">{s.task || "Focus session"}</p>
                        <p className="text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.duration_minutes}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 text-center py-4">No sessions yet</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
