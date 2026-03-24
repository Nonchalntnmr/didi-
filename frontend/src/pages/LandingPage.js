import { motion } from "framer-motion";
import { ArrowRight, Brain, Flame, Phone, Zap, Target, Shield } from "lucide-react";
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
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="brand-logo">BHAIYA</span>
          </div>
          <Button
            data-testid="nav-login-btn"
            onClick={handleLogin}
            className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 transition-all active:scale-95 rounded-sm px-5 py-2 text-sm"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-4xl">
            <motion.p variants={fadeUp} className="text-xs font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              AI-Powered Mentorship
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.95] mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
              Stop guessing.<br />
              <span className="text-[#3B82F6]">Start improving.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-[#A1A1AA] max-w-xl leading-relaxed mb-10">
              Your personal AI mentor that actually pushes you forward. Not a chatbot. A real mentor you can talk to, text, and voice call - who helps you improve your life.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Button
                data-testid="hero-cta-btn"
                onClick={handleLogin}
                className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 transition-all active:scale-95 rounded-sm px-8 py-3 text-base flex items-center gap-2"
              >
                Start Now <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                data-testid="hero-learn-more-btn"
                variant="outline"
                className="bg-transparent border border-white/10 text-white hover:bg-white/5 transition-all rounded-sm px-8 py-3 text-base"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                How it works
              </Button>
            </motion.div>
          </motion.div>

          {/* Hero glow */}
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#3B82F6]/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Features</p>
            <h2 className="text-3xl tracking-tight font-semibold" style={{ fontFamily: "Manrope, sans-serif" }}>Not just another AI tool</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Phone, title: "Call Bhaiya", desc: "Voice call your AI mentor anytime. Real conversations, not typed prompts.", accent: true },
              { icon: Brain, title: "Remembers You", desc: "Bhaiya remembers your goals, struggles, and progress. References them naturally." },
              { icon: Flame, title: "Daily Check-ins", desc: "Start every day with accountability. Track energy, mood, and what you're working on." },
              { icon: Target, title: "Goal Tracking", desc: "Set goals, break them into steps. Bhaiya follows up and pushes consistency." },
              { icon: Zap, title: "Auto Mode", desc: "Switches between educator, coach, wellness guide, and listener based on what you need." },
              { icon: Shield, title: "Safe & Private", desc: "No harmful advice. No medical diagnoses. Serious issues get escalated properly." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                data-testid={`feature-card-${i}`}
                className={`group relative overflow-hidden border rounded-sm p-6 transition-all cursor-default ${
                  f.accent
                    ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 md:col-span-2 lg:col-span-1 hover:border-[#3B82F6]/60"
                    : "bg-[#0A0A0A] border-white/5 hover:border-[#3B82F6]/30"
                }`}
              >
                <f.icon className={`w-6 h-6 mb-4 ${f.accent ? "text-[#3B82F6]" : "text-gray-500 group-hover:text-[#3B82F6] transition-colors"}`} />
                <h3 className="text-lg font-semibold mb-2 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Ready to level up?
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-md mx-auto">
              Join the mentorship that actually holds you accountable.
            </p>
            <Button
              data-testid="cta-bottom-btn"
              onClick={handleLogin}
              className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 transition-all active:scale-95 rounded-sm px-10 py-3 text-base"
            >
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <p className="text-xs text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>BHAIYA AI</p>
          <p className="text-xs text-gray-600 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Built by Nishanth Revuri</p>
        </div>
      </footer>
    </div>
  );
}
