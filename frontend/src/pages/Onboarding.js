import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Heart, MessageSquare, Crosshair, Trophy, Rocket, Sparkles, Phone, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AVATAR = "https://customer-assets.emergentagent.com/job_mentor-live-1/artifacts/h9sfa3l8_Attachment-1.jpeg";

const interests = [
  { id: "study", icon: BookOpen, label: "Help with studies", color: "#3B82F6", emoji: "books" },
  { id: "health", icon: Heart, label: "Stay healthy", color: "#10B981", emoji: "heart" },
  { id: "talk", icon: MessageSquare, label: "Someone to talk to", color: "#A78BFA", emoji: "chat" },
  { id: "focus", icon: Crosshair, label: "Stay focused", color: "#EF4444", emoji: "target" },
  { id: "challenges", icon: Trophy, label: "Fun challenges", color: "#F59E0B", emoji: "trophy" },
  { id: "dreams", icon: Rocket, label: "Dream big", color: "#EC4899", emoji: "rocket" },
];

const ageGroups = ["8-10", "11-13", "14-16"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(user?.name?.split(" ")[0] || "");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (id) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname, age_group: selectedAge, interests: selectedInterests }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const slides = [
    // Slide 0: Hello!
    {
      content: (
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-36 h-36 rounded-full overflow-hidden shadow-xl shadow-blue-100 mb-8 border-4 border-white"
          >
            <img src={AVATAR} alt="Anushka Didi" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
              Hi there! <span className="text-[#3B82F6]">I'm Anushka Didi</span>
            </h1>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
              I'm your AI older sister! I'm here to help you with homework, listen when you need to talk, and cheer you on every single day.
            </p>
          </motion.div>
        </div>
      )
    },
    // Slide 1: What should I call you?
    {
      content: (
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-[#3B82F6]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "Nunito, sans-serif" }}>
              What should I call you?
            </h2>
            <p className="text-gray-400 text-sm mb-6">Pick a name you like! This is what Didi will call you.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full max-w-xs">
            <input
              data-testid="onboarding-nickname"
              className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-center text-lg font-bold text-[#1e293b] placeholder:text-gray-300 focus:border-[#3B82F6] focus:outline-none shadow-sm transition-colors"
              placeholder="Your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
          </motion.div>
        </div>
      )
    },
    // Slide 2: How old are you?
    {
      content: (
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "Nunito, sans-serif" }}>
              How old are you, {nickname || "friend"}?
            </h2>
            <p className="text-gray-400 text-sm mb-8">This helps Didi talk to you in the right way!</p>
          </motion.div>
          <div className="flex gap-4">
            {ageGroups.map((age, i) => (
              <motion.button
                key={age}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                data-testid={`onboarding-age-${age}`}
                onClick={() => setSelectedAge(age)}
                className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  selectedAge === age
                    ? "bg-[#3B82F6] text-white shadow-lg shadow-blue-200 scale-105"
                    : "bg-white border-2 border-gray-100 text-gray-600 hover:border-blue-200"
                }`}
              >
                <span className="text-xl font-extrabold">{age}</span>
                <span className="text-[9px] font-semibold opacity-70">years</span>
              </motion.button>
            ))}
          </div>
        </div>
      )
    },
    // Slide 3: What do you want to do?
    {
      content: (
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-[#10B981]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "Nunito, sans-serif" }}>
              What do you want Didi to help with?
            </h2>
            <p className="text-gray-400 text-sm mb-8">Pick as many as you want!</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-md">
            {interests.map((item, i) => {
              const selected = selectedInterests.includes(item.id);
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  data-testid={`onboarding-interest-${item.id}`}
                  onClick={() => toggleInterest(item.id)}
                  className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 ${
                    selected
                      ? "bg-white border-2 shadow-lg scale-[1.03]"
                      : "bg-white border-2 border-gray-100 hover:border-gray-200"
                  }`}
                  style={selected ? { borderColor: item.color, boxShadow: `0 4px 20px ${item.color}20` } : {}}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}12` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <span className={`text-xs font-bold ${selected ? "text-[#1e293b]" : "text-gray-500"}`}>{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )
    },
    // Slide 4: Let's go!
    {
      content: (
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-28 h-28 rounded-full overflow-hidden shadow-xl shadow-blue-100 mb-6 border-4 border-white"
          >
            <img src={AVATAR} alt="Didi" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
              Yay! We're all set, <span className="text-[#3B82F6]">{nickname || "friend"}</span>!
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed mb-2">
              I'm so excited to be your Didi! Remember — you can talk to me anytime about anything. I'll always be here for you.
            </p>
            <p className="text-gray-400 text-xs max-w-xs mx-auto">
              You can text me, call me, or even FaceTime me. Let's make every day a great day!
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex gap-3">
            <Button
              data-testid="onboarding-facetime"
              onClick={() => { completeOnboarding().then(() => navigate("/call")); }}
              className="bg-[#10B981] text-white font-bold rounded-full px-6 py-3 shadow-md shadow-emerald-100 flex items-center gap-2"
            >
              <Phone className="w-4 h-4" /> FaceTime Didi
            </Button>
            <Button
              data-testid="onboarding-chat"
              onClick={() => { completeOnboarding().then(() => navigate("/chat")); }}
              className="bg-white text-[#1e293b] font-bold rounded-full px-6 py-3 border-2 border-gray-200 hover:border-[#3B82F6] flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Chat with Didi
            </Button>
          </motion.div>
        </div>
      )
    },
  ];

  const canProceed = () => {
    if (step === 1) return nickname.trim().length > 0;
    if (step === 2) return selectedAge !== "";
    if (step === 3) return selectedInterests.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#1e293b] flex flex-col">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-[#3B82F6]" : i < step ? "w-4 bg-blue-200" : "w-4 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            {slides[step].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {step < slides.length - 1 && (
        <div className="flex items-center justify-between px-8 pb-10 max-w-lg mx-auto w-full">
          {step > 0 ? (
            <button
              data-testid="onboarding-back"
              onClick={() => setStep(step - 1)}
              className="text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <Button
            data-testid="onboarding-next"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="bg-[#3B82F6] text-white font-bold rounded-full px-8 py-3 shadow-md shadow-blue-200 disabled:opacity-30 flex items-center gap-2"
          >
            {step === 0 ? "Let's meet!" : "Next"} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
