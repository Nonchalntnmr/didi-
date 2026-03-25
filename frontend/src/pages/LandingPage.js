import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Flame, Phone, Zap, Target, MessageSquare, Star, Crosshair, Trophy, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";

const fadeUp = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: "easeOut" } };
const stagger = { animate: { transition: { staggerChildren: 0.1 } } };

// Typewriter hook
function useTypewriter(texts, speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const text = texts[idx];
    const timer = setTimeout(() => {
      if (!deleting) {
        setDisplay(text.slice(0, charIdx + 1));
        if (charIdx + 1 === text.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setDisplay(text.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setIdx((idx + 1) % texts.length); }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? 30 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, texts, speed, pause]);
  return display;
}

// Conversation demo
const demoConvo = [
  { role: "user", text: "I want to get fit but I keep quitting after a week" },
  { role: "ai", text: "Real talk — you're not quitting because you're lazy. You're quitting because your plan is too aggressive. Let's build something you'll actually stick to. What's your schedule look like?" },
  { role: "user", text: "I'm free mornings before class" },
  { role: "ai", text: "Perfect. Here's your Week 1 plan — stupidly simple on purpose:\n\nMon/Wed/Fri: 20-min walk + 10 pushups\nTue/Thu: 15-min stretch\n\nThat's it. No gym. No protein shakes. Just build the habit first. I'll check in with you daily. Deal?" },
];

export default function LandingPage() {
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const [stats] = useState({ users: 2847, messages: 148000, modes: 7, languages: 25 });
  const typed = useTypewriter(["studying for exams", "building discipline", "getting fit", "managing stress", "finding direction"], 70, 1800);

  useEffect(() => {
    demoConvo.forEach((msg, i) => {
      setTimeout(() => setVisibleMsgs(prev => [...prev, msg]), 1500 + i * 2200);
    });
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Noise */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Dot grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-xl bg-[#050505]/70 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <Brain className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="brand-logo">BHAIYA</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-xs text-gray-500 hover:text-white transition-colors hidden md:block">See it in action</button>
            <Button data-testid="nav-login-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-95 rounded-sm px-5 py-2 text-sm">
              Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-8 md:pt-40 md:pb-16">
        <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-[#3B82F6]/[0.03] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-[#10B981]/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-4xl">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>Live &middot; {stats.languages} Languages</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold tracking-[-0.04em] leading-[0.9] mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Stop guessing.
            </motion.h1>
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold tracking-[-0.04em] leading-[0.9] mb-8">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 40%, #93C5FD 70%, #3B82F6 100%)", fontFamily: "Manrope, sans-serif" }}>Start improving.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base md:text-lg text-gray-400 max-w-lg leading-relaxed mb-4">
              Your AI mentor for <span className="text-white font-medium">{typed}<span className="animate-pulse text-[#3B82F6]">|</span></span>
            </motion.p>
            <motion.p variants={fadeUp} className="text-sm text-gray-500 max-w-lg mb-10">
              Not a chatbot. A real mentor you can text, voice call, and FaceTime — who remembers everything and holds you accountable.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 mb-12">
              <Button data-testid="hero-cta-btn" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 transition-all active:scale-95 rounded-sm px-8 py-3.5 text-base shadow-lg shadow-[#3B82F6]/20">
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5" /></div>
                See Bhaiya in action
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="flex items-center gap-8 pt-8 border-t border-white/[0.04]">
              {[
                { val: `${stats.modes}`, label: "AI Modes", color: "#3B82F6" },
                { val: `${stats.languages}`, label: "Languages", color: "#10B981" },
                { val: "FaceTime", label: "Voice Calls", color: "#F59E0B" },
                { val: "Memory", label: "Remembers You", color: "#A78BFA" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <p className="text-sm font-bold text-white">{s.val}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Live Preview</p>
              <h2 className="text-3xl md:text-4xl tracking-tighter font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>This is how Bhaiya talks</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-md">No corporate AI speak. No generic responses. Bhaiya talks like a real person who actually gives a damn about your progress.</p>
              <div className="space-y-3">
                {["Builds real plans, not generic advice", "References your past goals & progress", "Switches modes based on what you need", "Calls you out when you're slacking"].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Chat preview */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-sm border border-white/[0.06] bg-[#0A0A0A] overflow-hidden" data-testid="demo-chat">
              <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-[#3B82F6]">B</span>
                </div>
                <span className="text-xs font-semibold">Bhaiya</span>
                <span className="text-[9px] text-gray-600 font-mono ml-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>COACH MODE</span>
              </div>
              <div className="p-4 space-y-3 min-h-[320px]">
                {visibleMsgs.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-sm px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user" ? "bg-[#3B82F6] text-white" : "bg-[#121212] text-gray-300 border border-white/[0.04]"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
                {visibleMsgs.length < demoConvo.length && (
                  <div className="flex items-center gap-1.5 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-600 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Everything you need</p>
            <h2 className="text-3xl md:text-4xl tracking-tighter font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Built different</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Phone, title: "FaceTime Calls", desc: "Video call your AI mentor. Your camera on, Bhaiya listens and responds with voice. Like FaceTime with your smartest friend.", color: "#F59E0B", featured: true },
              { icon: Brain, title: "Memory System", desc: "Remembers your goals, habits, struggles. References them naturally. \"You said you wanted to wake up earlier — how's that going?\"", color: "#3B82F6" },
              { icon: Flame, title: "Daily Challenges", desc: "3 new challenges every day. Earn XP, build streaks. Gamified self-improvement that actually works.", color: "#EF4444" },
              { icon: Target, title: "Routines & Plans", desc: "Create study plans, workout routines, daily habits. Track completion with a 7-day calendar.", color: "#10B981" },
              { icon: Zap, title: "7 AI Modes", desc: "Educator, Coach, Wellness, Listener, Future You, Brutal Honesty. Auto-detects or manual switch.", color: "#A78BFA" },
              { icon: Crosshair, title: "Focus Mode", desc: "Pomodoro timer with Bhaiya tips. Track your deep work sessions. Build the focus muscle.", color: "#EC4899" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                data-testid={`feature-card-${i}`}
                className={`group relative rounded-sm p-6 transition-all hover:translate-y-[-2px] ${
                  f.featured ? "border border-[#F59E0B]/15 hover:border-[#F59E0B]/30 bg-gradient-to-b from-[#F59E0B]/[0.03] to-transparent" : "border border-white/[0.04] hover:border-white/10 bg-[#0A0A0A]"
                }`}>
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${f.color}10` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-semibold mb-1.5 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes */}
      <section className="py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-600 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Intelligence System</p>
              <h2 className="text-3xl tracking-tighter font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>One mentor,<br />seven modes</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">Bhaiya auto-detects what you need. Or switch manually. Each mode changes how Bhaiya thinks, talks, and responds.</p>
              <Button data-testid="modes-cta" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 rounded-sm px-6 py-3 text-sm shadow-lg shadow-[#3B82F6]/20">
                Try All Modes
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-2">
              {[
                { mode: "Educator", color: "#3B82F6", desc: "Breaks down concepts, teaches thinking" },
                { mode: "Performance Coach", color: "#F59E0B", desc: "Builds discipline, creates routines" },
                { mode: "Wellness Guide", color: "#10B981", desc: "Food, sleep, habits, practical advice" },
                { mode: "Listener", color: "#A78BFA", desc: "Emotional support, reflective talk" },
                { mode: "Future You", color: "#60A5FA", desc: "Speaks as your successful future self" },
                { mode: "Brutal Honesty", color: "#EF4444", desc: "Direct, no-BS, tough love" },
              ].map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 p-3 rounded-sm bg-[#0A0A0A] border border-white/[0.04] hover:border-white/10 transition-all group cursor-default">
                  <div className="w-1.5 h-8 rounded-full transition-all group-hover:h-10" style={{ backgroundColor: m.color }} />
                  <div>
                    <p className="text-sm font-semibold">{m.mode}</p>
                    <p className="text-[10px] text-gray-500">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Wrapped teaser */}
      <section className="py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-sm border border-white/[0.06] p-8 md:p-12" style={{ background: "linear-gradient(135deg, #0A0A0A, #111827, #0A0A0A)" }}>
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#F59E0B]/[0.04] rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 mb-4">
                  <Trophy className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>New</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tighter mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya Wrapped</h3>
                <p className="text-sm text-gray-400 leading-relaxed">Monthly AI-generated progress report. Like Spotify Wrapped but for your personal growth. Shareable, insightful, and brutally honest.</p>
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-64 rounded-sm bg-[#0A0A0A] border border-white/[0.06] p-4 flex flex-col items-center justify-center text-center rotate-3 shadow-2xl">
                  <Star className="w-6 h-6 text-[#F59E0B] mb-2" />
                  <p className="text-xs font-bold mb-1">Your Month</p>
                  <p className="text-[10px] text-gray-500 mb-3">AI-generated insights</p>
                  <div className="space-y-1 w-full">
                    <div className="h-1.5 bg-[#3B82F6]/20 rounded-full w-full" />
                    <div className="h-1.5 bg-[#10B981]/20 rounded-full w-3/4" />
                    <div className="h-1.5 bg-[#F59E0B]/20 rounded-full w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Your move.
            </h2>
            <p className="text-gray-400 mb-8 text-sm">
              Stop scrolling. Start building the life you actually want. Bhaiya's waiting.
            </p>
            <Button data-testid="cta-bottom-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-95 rounded-sm px-12 py-4 text-base shadow-xl">
              Get Started Free
            </Button>
            <p className="text-[10px] text-gray-600 mt-4 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>No credit card &middot; Works in {stats.languages} languages</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <span className="text-[7px] font-black text-black">B</span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>BHAIYA AI</span>
          </div>
          <p className="text-[10px] text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Built by Nishanth Revuri</p>
        </div>
      </footer>
    </div>
  );
}
