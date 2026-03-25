import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Flame, Phone, Zap, Target, MessageSquare, Star, Crosshair, Trophy, Sparkles, Globe, Lock } from "lucide-react";
import { Button } from "../components/ui/button";

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
    }, deleting ? 25 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, texts, speed, pause]);
  return display;
}

const demoMsgs = [
  { role: "user", text: "I keep procrastinating on my coding project" },
  { role: "ai", text: "Let's be real — you're not procrastinating, you're overwhelmed. Break it into 30-min blocks. What's the ONE smallest thing you can do right now?" },
  { role: "user", text: "I guess set up the project folder structure" },
  { role: "ai", text: "That's it. Do that in the next 15 minutes. Don't touch anything else. I'll check back. Go." },
];

export default function LandingPage() {
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const typed = useTypewriter(["studying for exams", "building discipline", "getting fit", "managing stress", "finding direction", "learning to code"], 65, 1800);

  useEffect(() => {
    demoMsgs.forEach((msg, i) => {
      setTimeout(() => setVisibleMsgs(prev => [...prev, msg]), 800 + i * 2000);
    });
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.012] z-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-xl bg-[#050505]/70 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center"><Brain className="w-4 h-4 text-black" /></div>
            <span className="font-bold text-base tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="brand-logo">BHAIYA</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-xs text-gray-500 hover:text-white transition-colors hidden md:block">See it in action</button>
            <Button data-testid="nav-login-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 active:scale-95 rounded-sm px-5 py-2 text-sm">
              Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ Split layout with app preview */}
      <section className="relative pt-28 pb-8 md:pt-36 md:pb-12">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#3B82F6]/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>Live &middot; 25 Languages</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em] leading-[0.92] mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
                Stop guessing.
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em] leading-[0.92] mb-6">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #3B82F6 100%)", fontFamily: "Manrope, sans-serif" }}>Start improving.</span>
              </h1>
              <p className="text-sm md:text-base text-gray-400 max-w-md leading-relaxed mb-2">
                Your AI mentor for <span className="text-white font-medium">{typed}<span className="animate-pulse text-[#3B82F6]">|</span></span>
              </p>
              <p className="text-xs text-gray-500 max-w-md mb-8">Text, voice call, and FaceTime a mentor who remembers everything about you.</p>
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Button data-testid="hero-cta-btn" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 active:scale-95 rounded-sm px-7 py-3 text-sm shadow-lg shadow-[#3B82F6]/25">
                  Start Free <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-400 hover:text-white text-xs flex items-center gap-2 transition-colors">
                  <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center"><Sparkles className="w-3 h-3" /></div>
                  See it in action
                </button>
              </div>
              <div className="flex items-center gap-6">
                {[
                  { val: "7", label: "AI Modes", color: "#3B82F6" },
                  { val: "25", label: "Languages", color: "#10B981" },
                  { val: "FaceTime", label: "Voice Calls", color: "#F59E0B" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: s.color }} />
                    <div>
                      <p className="text-xs font-bold">{s.val}</p>
                      <p className="text-[9px] text-gray-600">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - App Preview Mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative">
              <div className="relative mx-auto" style={{ width: "380px" }}>
                {/* Glow behind */}
                <div className="absolute -inset-8 bg-[#3B82F6]/[0.06] rounded-full blur-[60px]" />

                {/* Phone frame */}
                <div className="relative rounded-2xl border border-white/[0.08] bg-[#0A0A0A] overflow-hidden shadow-2xl">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-sm bg-[#3B82F6] flex items-center justify-center"><span className="text-[6px] font-black text-black">B</span></div>
                      <span className="text-[10px] font-bold">Bhaiya</span>
                    </div>
                    <span className="text-[8px] font-mono text-[#10B981]" style={{ fontFamily: "JetBrains Mono, monospace" }}>COACH MODE</span>
                  </div>

                  {/* Chat messages */}
                  <div className="p-4 space-y-3 min-h-[360px] max-h-[360px] overflow-hidden">
                    {visibleMsgs.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                          msg.role === "user" ? "bg-[#3B82F6] text-white rounded-br-sm" : "bg-[#161616] text-gray-300 border border-white/[0.04] rounded-bl-sm"
                        }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    {visibleMsgs.length < demoMsgs.length && (
                      <div className="flex gap-1 px-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                      </div>
                    )}
                  </div>

                  {/* Input bar */}
                  <div className="px-4 py-3 border-t border-white/[0.04] flex items-center gap-2">
                    <div className="flex-1 bg-[#161616] rounded-full px-4 py-2 text-[10px] text-gray-500">Talk to Bhaiya...</div>
                    <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center"><ArrowRight className="w-3 h-3 text-black" /></div>
                  </div>
                </div>

                {/* Floating badges */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute -right-12 top-16 bg-[#0A0A0A] border border-white/[0.06] rounded-lg px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[9px] font-medium">FaceTime</span>
                  </div>
                </motion.div>
                <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -left-10 bottom-24 bg-[#0A0A0A] border border-white/[0.06] rounded-lg px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-[#F59E0B]" />
                    <span className="text-[9px] font-medium">25 Languages</span>
                  </div>
                </motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                  className="absolute -right-8 bottom-12 bg-[#0A0A0A] border border-white/[0.06] rounded-lg px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3 text-[#A78BFA]" />
                    <span className="text-[9px] font-medium">Memory</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="py-8 border-y border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-center gap-8 md:gap-16 text-center">
          {[
            { val: "7", label: "AI Conversation Modes" },
            { val: "25", label: "Languages Supported" },
            { val: "24/7", label: "Always Available" },
            { val: "100%", label: "Private & Safe" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-lg md:text-xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.val}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DEMO SECTION ═══ */}
      <section id="demo" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>How Bhaiya talks</p>
            <h2 className="text-3xl md:text-4xl tracking-tighter font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>No corporate AI speak</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">Real conversations. Actual plans. Someone who remembers what you said last week.</p>
          </motion.div>

          {/* Bento feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Large - FaceTime */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-3 group relative rounded-sm p-8 border border-[#10B981]/15 hover:border-[#10B981]/30 transition-all overflow-hidden"
              style={{ background: "linear-gradient(160deg, #052e16 0%, #0A0A0A 60%)" }} data-testid="feature-card-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#10B981]/[0.05] rounded-full blur-[60px] pointer-events-none" />
              <Phone className="w-8 h-8 text-[#10B981] mb-4" />
              <h3 className="text-xl font-bold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>FaceTime Calls</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm">Your camera on. Bhaiya listens in real-time, responds with voice. Live captions. Like calling your smartest friend.</p>
            </motion.div>
            {/* Large - Memory */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
              className="md:col-span-3 group relative rounded-sm p-8 border border-[#3B82F6]/15 hover:border-[#3B82F6]/30 transition-all overflow-hidden"
              style={{ background: "linear-gradient(160deg, #0c1a3a 0%, #0A0A0A 60%)" }} data-testid="feature-card-1">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#3B82F6]/[0.05] rounded-full blur-[60px] pointer-events-none" />
              <Brain className="w-8 h-8 text-[#3B82F6] mb-4" />
              <h3 className="text-xl font-bold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Remembers Everything</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm">"You said last week you wanted to wake up earlier — how's that going?" Bhaiya tracks your goals, habits, and struggles.</p>
            </motion.div>
            {/* Small cards */}
            {[
              { icon: Flame, title: "Daily Challenges", desc: "3 new daily. Earn XP. Build streaks.", color: "#EF4444", bg: "#1a0505" },
              { icon: Target, title: "Routines & Plans", desc: "Study plans. Workout routines. Track daily.", color: "#10B981", bg: "#051a0f" },
              { icon: Zap, title: "7 AI Modes", desc: "Educator. Coach. Brutal Honesty. Auto-detect.", color: "#A78BFA", bg: "#0f051a" },
              { icon: Crosshair, title: "Focus Mode", desc: "Pomodoro timer. Deep work. Track hours.", color: "#EC4899", bg: "#1a0515" },
              { icon: Star, title: "Bhaiya Wrapped", desc: "Monthly AI progress report. Shareable.", color: "#F59E0B", bg: "#1a1005" },
              { icon: Lock, title: "Safe & Private", desc: "No harmful advice. Escalates serious issues.", color: "#6B7280", bg: "#0A0A0A" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 * i }}
                data-testid={`feature-card-${i + 2}`}
                className="md:col-span-2 group rounded-sm p-5 border border-white/[0.04] hover:border-white/10 transition-all"
                style={{ background: `linear-gradient(180deg, ${f.bg} 0%, #0A0A0A 100%)` }}>
                <f.icon className="w-5 h-5 mb-3 group-hover:scale-110 transition-transform" style={{ color: f.color }} />
                <h3 className="text-sm font-semibold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                <p className="text-[10px] text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MODES ═══ */}
      <section className="py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-600 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Intelligence System</p>
              <h2 className="text-3xl tracking-tighter font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>One mentor,<br />seven modes</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">Auto-detects what you need. Or switch manually. Each mode changes how Bhaiya thinks and talks.</p>
              <Button data-testid="modes-cta" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 rounded-sm px-6 py-3 text-sm shadow-lg shadow-[#3B82F6]/20">Try All Modes</Button>
            </motion.div>
            <div className="space-y-2">
              {[
                { mode: "Educator", color: "#3B82F6", desc: "Breaks down concepts, teaches thinking" },
                { mode: "Coach", color: "#F59E0B", desc: "Builds discipline, creates routines" },
                { mode: "Wellness", color: "#10B981", desc: "Food, sleep, habits, practical advice" },
                { mode: "Listener", color: "#A78BFA", desc: "Emotional support, reflective talk" },
                { mode: "Future You", color: "#60A5FA", desc: "Speaks as your successful future self" },
                { mode: "Brutal Honesty", color: "#EF4444", desc: "Direct, no-BS, tough love" },
              ].map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-sm bg-[#0A0A0A] border border-white/[0.04] hover:border-white/10 transition-all group">
                  <div className="w-1.5 h-8 rounded-full group-hover:h-10 transition-all" style={{ backgroundColor: m.color }} />
                  <div><p className="text-sm font-semibold">{m.mode}</p><p className="text-[10px] text-gray-500">{m.desc}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-28 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Your move.</h2>
            <p className="text-gray-400 mb-8 text-sm">Stop scrolling. Start building the life you actually want.</p>
            <Button data-testid="cta-bottom-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 active:scale-95 rounded-sm px-12 py-4 text-base shadow-xl">Get Started Free</Button>
            <p className="text-[10px] text-gray-600 mt-4 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>No credit card &middot; Works in 25 languages</p>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.03] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-[#3B82F6] flex items-center justify-center"><span className="text-[7px] font-black text-black">B</span></div>
            <span className="text-[10px] text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>BHAIYA AI</span>
          </div>
          <p className="text-[10px] text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Built by Nishanth Revuri</p>
        </div>
      </footer>
    </div>
  );
}
