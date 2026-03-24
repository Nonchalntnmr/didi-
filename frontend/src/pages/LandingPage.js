import { motion } from "framer-motion";
import { ArrowRight, Brain, Flame, Phone, Zap, Target, Shield, MessageSquare, Star } from "lucide-react";
import { Button } from "../components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

export default function LandingPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Noise */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-xl bg-[#050505]/70 border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <Brain className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="brand-logo">BHAIYA</span>
          </div>
          <Button data-testid="nav-login-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-95 rounded-sm px-5 py-2 text-sm">
            Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-12 md:pt-44 md:pb-24">
        {/* Background elements */}
        <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-[#3B82F6]/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-[#F59E0B]/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-4xl">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#3B82F6]/10 border border-[#3B82F6]/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>AI-Powered Mentorship</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8" style={{ fontFamily: "Manrope, sans-serif" }}>
              Stop guessing.<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #3B82F6 100%)" }}>Start improving.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base md:text-lg text-[#A1A1AA] max-w-lg leading-relaxed mb-10">
              Your personal AI mentor that actually pushes you forward. Text, voice call, or just talk — Bhaiya remembers your goals, tracks your progress, and holds you accountable.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              <Button data-testid="hero-cta-btn" onClick={handleLogin} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 transition-all active:scale-95 rounded-sm px-8 py-3.5 text-base">
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button data-testid="hero-learn-more-btn" variant="ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-400 hover:text-white text-base px-4">
                See what Bhaiya can do
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 mt-12 pt-8 border-t border-white/5">
              {[
                { icon: MessageSquare, val: "7 Modes", desc: "AI conversation modes" },
                { icon: Phone, val: "Voice Call", desc: "Talk, don't type" },
                { icon: Brain, val: "Memory", desc: "Remembers everything" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-xs font-semibold text-white">{item.val}</p>
                    <p className="text-[10px] text-gray-600">{item.desc}</p>
                  </div>
                  {i < 2 && <div className="w-px h-8 bg-white/5 ml-4" />}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-600 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>What makes Bhaiya different</p>
            <h2 className="text-3xl md:text-4xl tracking-tighter font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Not just another AI tool</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Phone, title: "Call Bhaiya", desc: "Voice call your AI mentor. Real conversations, real feedback. Not typed prompts.", color: "#F59E0B", featured: true },
              { icon: Brain, title: "Memory System", desc: "Remembers your goals, struggles, and progress. References them naturally in conversation.", color: "#3B82F6" },
              { icon: Flame, title: "Daily Challenges", desc: "3 new challenges every day. Earn XP, build streaks, push your limits.", color: "#EF4444" },
              { icon: Target, title: "Goal Tracking", desc: "Set goals, break them into steps. Bhaiya follows up and pushes consistency.", color: "#10B981" },
              { icon: Zap, title: "7 AI Modes", desc: "Educator, Coach, Wellness, Listener, Future You, Brutal Honesty — auto-detects what you need.", color: "#A78BFA" },
              { icon: Star, title: "Focus Mode", desc: "Guided deep work sessions with Pomodoro timer. Track your focused hours.", color: "#EC4899" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                data-testid={`feature-card-${i}`}
                className={`group relative overflow-hidden border rounded-sm p-6 transition-all ${
                  f.featured
                    ? "border-[#F59E0B]/20 hover:border-[#F59E0B]/40 md:col-span-2 lg:col-span-1"
                    : "border-white/[0.04] hover:border-white/10"
                }`}
                style={f.featured ? { background: "linear-gradient(180deg, #1a150008 0%, #0A0A0A 100%)" } : { background: "#0A0A0A" }}
              >
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}10` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-semibold mb-1.5 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes section */}
      <section className="py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-600 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Intelligence System</p>
              <h2 className="text-3xl tracking-tighter font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>One mentor,<br />seven personalities</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">Bhaiya auto-detects what you need and switches modes. Or pick one yourself.</p>
              <Button data-testid="modes-cta" onClick={handleLogin} className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-6 py-3 text-sm">
                Try All Modes
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-2">
              {[
                { mode: "Educator", color: "#3B82F6", desc: "Breaks down concepts, teaches thinking" },
                { mode: "Coach", color: "#F59E0B", desc: "Builds discipline, pushes consistency" },
                { mode: "Wellness", color: "#10B981", desc: "Food, sleep, habits, practical advice" },
                { mode: "Listener", color: "#A78BFA", desc: "Emotional support, reflective talk" },
                { mode: "Future You", color: "#3B82F6", desc: "Speaks as your successful future self" },
                { mode: "Brutal Honesty", color: "#EF4444", desc: "Direct, no-BS, tough love" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-sm bg-[#0A0A0A] border border-white/[0.04] hover:border-white/10 transition-all group">
                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: m.color }} />
                  <div>
                    <p className="text-sm font-semibold">{m.mode}</p>
                    <p className="text-[10px] text-gray-500">{m.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Ready to level up?
            </h2>
            <p className="text-[#A1A1AA] mb-8 text-sm">
              Stop scrolling. Start building the life you actually want.
            </p>
            <Button data-testid="cta-bottom-btn" onClick={handleLogin} className="bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-95 rounded-sm px-10 py-3.5 text-base">
              Get Started Free
            </Button>
            <p className="text-[10px] text-gray-600 mt-4 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>No credit card required</p>
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
