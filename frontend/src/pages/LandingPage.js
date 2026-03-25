import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Flame, Phone, Zap, Target, MessageSquare, Star, Crosshair, Trophy, Sparkles, Globe, Lock, Heart } from "lucide-react";
import { Button } from "../components/ui/button";

function useTypewriter(texts, speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const text = texts[idx];
    const timer = setTimeout(() => {
      if (!deleting) { setDisplay(text.slice(0, charIdx + 1)); if (charIdx + 1 === text.length) setTimeout(() => setDeleting(true), pause); else setCharIdx(c => c + 1); }
      else { setDisplay(text.slice(0, charIdx)); if (charIdx === 0) { setDeleting(false); setIdx((idx + 1) % texts.length); } else setCharIdx(c => c - 1); }
    }, deleting ? 25 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx, texts, speed, pause]);
  return display;
}

const AVATAR = "https://customer-assets.emergentagent.com/job_mentor-live-1/artifacts/h9sfa3l8_Attachment-1.jpeg";

const demoMsgs = [
  { role: "user", text: "Didi, I don't understand this math problem" },
  { role: "ai", text: "Show me which one! I bet we can figure it out together. What part is confusing you?" },
  { role: "user", text: "I don't know how to do fractions" },
  { role: "ai", text: "Okay! Think of a pizza cut into 4 slices. If you eat 1, you ate 1/4 of the pizza! The bottom number = total pieces, top = what you have. Want to try one together?" },
];

export default function LandingPage() {
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const typed = useTypewriter(["homework help", "feeling lonely", "learning new things", "building confidence", "making friends", "dreaming big"], 65, 1800);

  useEffect(() => { demoMsgs.forEach((msg, i) => { setTimeout(() => setVisibleMsgs(prev => [...prev, msg]), 800 + i * 2000); }); }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#1e293b] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-40 backdrop-blur-xl bg-[#FFFBF5]/80 border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm"><img src={AVATAR} alt="Didi" className="w-full h-full object-cover" /></div>
            <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: "Nunito, sans-serif" }} data-testid="brand-logo">Didi</span>
          </div>
          <Button data-testid="nav-login-btn" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 active:scale-95 rounded-full px-6 py-2 text-sm shadow-md shadow-blue-200">
            Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-8 md:pt-36 md:pb-12">
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-blue-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Live &middot; 25 Languages</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1] mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
                Every child deserves
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1] mb-6 text-[#3B82F6]" style={{ fontFamily: "Nunito, sans-serif" }}>
                an older sister.
              </h1>
              <p className="text-sm md:text-base text-gray-500 max-w-md leading-relaxed mb-2">
                Meet Anushka Didi — your AI big sister for <span className="text-[#1e293b] font-bold">{typed}<span className="animate-pulse text-[#3B82F6]">|</span></span>
              </p>
              <p className="text-xs text-gray-400 max-w-md mb-8">Text, voice call, and FaceTime a caring mentor who remembers you and believes in you.</p>
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Button data-testid="hero-cta-btn" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 active:scale-95 rounded-full px-8 py-3.5 text-sm shadow-lg shadow-blue-200">
                  Start Free <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-gray-400 hover:text-[#1e293b] text-xs flex items-center gap-2 transition-colors">
                  <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center bg-white"><Sparkles className="w-3 h-3 text-amber-400" /></div>
                  See it in action
                </button>
              </div>
              <div className="flex items-center gap-6">
                {[
                  { val: "7", label: "AI Modes", color: "#3B82F6" },
                  { val: "25", label: "Languages", color: "#10B981" },
                  { val: "Voice", label: "FaceTime Calls", color: "#F59E0B" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: s.color }} />
                    <div><p className="text-xs font-bold">{s.val}</p><p className="text-[9px] text-gray-400">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Phone mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hidden lg:block relative">
              <div className="relative mx-auto" style={{ width: "360px" }}>
                <div className="absolute -inset-8 bg-blue-100/40 rounded-full blur-[50px]" />
                <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-gray-200/50">
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full overflow-hidden"><img src={AVATAR} alt="" className="w-full h-full object-cover" /></div>
                      <span className="text-[10px] font-bold text-[#1e293b]">Anushka Didi</span>
                    </div>
                    <span className="text-[8px] font-mono text-[#10B981] bg-green-50 px-2 py-0.5 rounded-full" style={{ fontFamily: "JetBrains Mono, monospace" }}>TEACHER</span>
                  </div>
                  <div className="p-4 space-y-3 min-h-[340px] max-h-[340px] overflow-hidden bg-[#FAFAFA]">
                    {visibleMsgs.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                          msg.role === "user" ? "bg-[#3B82F6] text-white rounded-br-sm" : "bg-white text-[#1e293b] border border-gray-100 rounded-bl-sm shadow-sm"
                        }`}>{msg.text}</div>
                      </motion.div>
                    ))}
                    {visibleMsgs.length < demoMsgs.length && (
                      <div className="flex gap-1 px-1">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 bg-white">
                    <div className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-[10px] text-gray-400 border border-gray-100">Talk to Didi...</div>
                    <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center shadow-sm"><ArrowRight className="w-3 h-3 text-white" /></div>
                  </div>
                </div>
                {/* Floating badges */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute -right-10 top-16 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#10B981]" /><span className="text-[9px] font-bold">FaceTime</span></div>
                </motion.div>
                <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }}
                  className="absolute -left-8 bottom-24 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-[#F59E0B]" /><span className="text-[9px] font-bold">25 Languages</span></div>
                </motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                  className="absolute -right-6 bottom-12 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2"><Heart className="w-3 h-3 text-pink-400" /><span className="text-[9px] font-bold">Memory</span></div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-center gap-8 md:gap-16 text-center">
          {[{ val: "7", label: "AI Modes" }, { val: "25", label: "Languages" }, { val: "24/7", label: "Always Available" }, { val: "100%", label: "Safe & Private" }].map((s, i) => (
            <div key={i}>
              <p className="text-lg md:text-xl font-extrabold text-[#1e293b]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{s.val}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="demo" className="py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#3B82F6] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>How Didi helps</p>
            <h2 className="text-3xl md:text-4xl tracking-tight font-extrabold" style={{ fontFamily: "Nunito, sans-serif" }}>Like a real older sister</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Phone, title: "FaceTime Calls", desc: "Camera on. Didi listens and responds with a warm voice. Like FaceTiming your older sister.", color: "#10B981" },
              { icon: Brain, title: "Remembers You", desc: "\"You told me you wanted to read more — did you finish that chapter?\" Didi tracks your goals.", color: "#3B82F6" },
              { icon: Flame, title: "Daily Challenges", desc: "3 fun challenges every day. Earn stars, build streaks. Learning should be fun!", color: "#EF4444" },
              { icon: Target, title: "Routines & Plans", desc: "Study plans, daily habits, homework schedules. Didi helps you stay on track.", color: "#10B981" },
              { icon: Zap, title: "7 AI Modes", desc: "Teacher, Cheerleader, Care, Listener, Dreams, Real Talk. She knows what you need.", color: "#A78BFA" },
              { icon: Crosshair, title: "Focus Timer", desc: "Pomodoro timer for homework and study sessions. Track your focused hours.", color: "#EC4899" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                data-testid={`feature-card-${i}`}
                className="group rounded-2xl p-6 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${f.color}10` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold mb-1.5 tracking-tight" style={{ fontFamily: "Nunito, sans-serif" }}>{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>Every child matters.</h2>
            <p className="text-gray-400 mb-8 text-sm">Give them a Didi who listens, teaches, and never gives up on them.</p>
            <Button data-testid="cta-bottom-btn" onClick={handleLogin} className="bg-[#3B82F6] text-white font-bold hover:bg-blue-500 active:scale-95 rounded-full px-12 py-4 text-base shadow-lg shadow-blue-200">Get Started Free</Button>
            <p className="text-[10px] text-gray-400 mt-4 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>No credit card &middot; 25 languages</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden"><img src={AVATAR} alt="" className="w-full h-full object-cover" /></div>
            <span className="text-[10px] text-gray-400 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>ANUSHKA DIDI AI</span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Built by Nishanth Revuri</p>
        </div>
      </footer>
    </div>
  );
}
