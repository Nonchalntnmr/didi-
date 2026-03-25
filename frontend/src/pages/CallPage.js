import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare, Video, VideoOff, Phone } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(32).fill(0.03));

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const durationRef = useRef(null);
  const waveRef = useRef(null);
  const shouldListenRef = useRef(true);
  const isMutedRef = useRef(false);

  // Keep muted ref in sync
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Waveform animation
  useEffect(() => {
    waveRef.current = setInterval(() => {
      const active = callStatus === "active";
      setWaveAmplitudes(prev => prev.map(() => {
        if (!active) return 0.02 + Math.random() * 0.03;
        if (isAISpeaking) return 0.25 + Math.random() * 0.75;
        if (isListening) return 0.1 + Math.random() * 0.4;
        return 0.03 + Math.random() * 0.06;
      }));
    }, 70);
    return () => clearInterval(waveRef.current);
  }, [callStatus, isAISpeaking, isListening]);

  // Duration timer
  useEffect(() => {
    if (callStatus === "active") {
      durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [callStatus]);

  // Auto-hide controls
  useEffect(() => {
    if (callStatus === "active") {
      const t = setTimeout(() => setShowControls(false), 6000);
      return () => clearTimeout(t);
    }
  }, [callStatus, showControls]);

  // Cleanup
  useEffect(() => { return () => endCallCleanup(); }, []);

  const endCallCleanup = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
    if (synthRef.current) synthRef.current.cancel();
    clearInterval(durationRef.current);
    shouldListenRef.current = false;
  };

  // ─── START CALL ───
  const startCall = async () => {
    setCallStatus("connecting");
    setCallDuration(0);
    setConversation([]);
    shouldListenRef.current = true;

    try {
      // Get camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() =>
        navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { setIsCameraOn(false); return s; })
      );
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Small delay for camera to initialize
      await new Promise(r => setTimeout(r, 800));
      setCallStatus("active");

      // Start listening automatically
      setTimeout(() => startListeningLoop(), 500);
    } catch (err) {
      console.error("Failed to start call:", err);
      setCallStatus("idle");
    }
  };

  // ─── CONTINUOUS LISTENING ───
  const startListeningLoop = useCallback(() => {
    if (!shouldListenRef.current || isMutedRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.error("No speech recognition"); return; }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let silenceTimer = null;
    let finalText = "";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      finalText = "";
    };

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      const display = final || interim;
      setTranscript(display);
      if (final) finalText = final;

      // Reset silence timer — wait for user to finish talking
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (finalText.trim().length > 1) {
          try { recognition.stop(); } catch(e) {}
        }
      }, 1200); // Wait 1.2s of silence before processing
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer);
      setIsListening(false);
      if (finalText && finalText.trim().length > 1) {
        processUserSpeech(finalText.trim());
      } else {
        // No speech detected, wait then restart
        if (shouldListenRef.current && !isMutedRef.current) {
          setTimeout(() => startListeningLoop(), 800);
        }
      }
    };

    recognition.onerror = (e) => {
      clearTimeout(silenceTimer);
      setIsListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("Speech error:", e.error);
      }
      if (shouldListenRef.current && !isMutedRef.current) {
        setTimeout(() => startListeningLoop(), 1000);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch(e) { console.error("Recognition start error:", e); }
  }, []);

  // ─── PROCESS SPEECH → CLAUDE → SPEAK BACK ───
  const processUserSpeech = async (text) => {
    if (!text || text.trim().length < 2) {
      if (shouldListenRef.current && !isMutedRef.current) startListeningLoop();
      return;
    }

    // Add user message to conversation
    setConversation(prev => [...prev.slice(-6), { role: "user", text }]);
    setTranscript("");
    setAiText("");

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, voice: true }),
      });

      if (!res.ok) throw new Error("Chat API failed");
      const data = await res.json();
      const response = data.response;

      setAiText(response);
      setConversation(prev => [...prev.slice(-6), { role: "ai", text: response }]);

      // Speak the response
      await speakResponse(response);

      // Wait a beat before listening again — don't rush the user
      if (shouldListenRef.current && !isMutedRef.current) {
        setTimeout(() => startListeningLoop(), 1500);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setAiText("Having trouble connecting. Say something again.");
      if (shouldListenRef.current && !isMutedRef.current) {
        setTimeout(() => startListeningLoop(), 1500);
      }
    }
  };

  // ─── TEXT TO SPEECH ───
  const speakResponse = (text) => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }
      synthRef.current.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.15;
      utt.pitch = 0.95;
      utt.volume = 1;

      // Try to get a good voice
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
                        voices.find(v => v.lang.startsWith("en-US") && !v.name.includes("Female")) ||
                        voices.find(v => v.lang.startsWith("en")) ||
                        voices[0];
      if (preferred) utt.voice = preferred;

      utt.onstart = () => setIsAISpeaking(true);
      utt.onend = () => { setIsAISpeaking(false); resolve(); };
      utt.onerror = () => { setIsAISpeaking(false); resolve(); };

      synthRef.current.speak(utt);
    });
  };

  // ─── END CALL ───
  const endCall = () => {
    shouldListenRef.current = false;
    endCallCleanup();
    setCallStatus("ended");
    setTimeout(() => navigate("/dashboard"), 400);
  };

  // ─── TOGGLE MIC ───
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    if (newMuted) {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
      setIsListening(false);
    } else {
      if (callStatus === "active" && !isAISpeaking) {
        setTimeout(() => startListeningLoop(), 300);
      }
    }
  };

  // ─── TOGGLE CAMERA ───
  const toggleCamera = () => {
    if (streamRef.current) streamRef.current.getVideoTracks().forEach(t => { t.enabled = !isCameraOn; });
    setIsCameraOn(!isCameraOn);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none" onClick={() => callStatus === "active" && setShowControls(true)}>

      {/* ─── BHAIYA'S SCREEN ─── */}
      <div className="absolute inset-0 bg-[#050505] flex items-center justify-center">
        {/* Ambient glow */}
        <div className={`absolute w-[600px] h-[600px] rounded-full transition-all duration-500 ${
          isAISpeaking ? "bg-[#3B82F6]/10 scale-110" : isListening ? "bg-[#10B981]/6 scale-100" : "bg-white/[0.01] scale-90"
        }`} style={{ filter: "blur(120px)" }} />

        <div className="relative flex flex-col items-center z-10 max-w-lg">
          {/* Avatar */}
          <motion.div
            animate={{
              scale: isAISpeaking ? [1, 1.07, 1.03, 1.06, 1] : 1,
              borderColor: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "rgba(255,255,255,0.06)"
            }}
            transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 1.8, ease: "easeInOut" }}
            className="w-36 h-36 md:w-48 md:h-48 rounded-full border-[3px] flex items-center justify-center relative"
            style={{ background: "radial-gradient(circle at 40% 35%, #111827, #050505)" }}
          >
            <span className="text-5xl md:text-6xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
            {isAISpeaking && (
              <>
                <motion.div animate={{ scale: [1, 1.5], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/30" />
                <motion.div animate={{ scale: [1, 1.8], opacity: [0.15, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/15" />
              </>
            )}
            {isListening && (
              <motion.div animate={{ scale: [1, 1.3], opacity: [0.25, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-0 rounded-full border border-[#10B981]/30" />
            )}
          </motion.div>

          {/* Name & status */}
          <p className="text-lg font-bold mt-5 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya</p>
          {callStatus === "active" && (
            <p className="text-xs font-mono mt-1" style={{ fontFamily: "JetBrains Mono, monospace", color: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "#666" }}>
              {isAISpeaking ? "Speaking..." : isListening ? "Listening..." : fmt(callDuration)}
            </p>
          )}

          {/* Waveform */}
          {callStatus === "active" && (
            <div className="flex items-end gap-[2px] h-8 mt-4">
              {waveAmplitudes.map((amp, i) => (
                <motion.div key={i} animate={{ height: amp * 28 }} transition={{ duration: 0.06 }}
                  className="w-[2px] rounded-full"
                  style={{ backgroundColor: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "#1a1a1a" }}
                />
              ))}
            </div>
          )}

          {/* ─── LIVE CAPTIONS ─── */}
          {callStatus === "active" && (
            <div className="mt-6 w-full max-w-md space-y-3 px-4">
              {/* What user is saying RIGHT NOW */}
              {transcript && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className="text-[10px] text-[#10B981] font-mono uppercase tracking-wider mb-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>You</p>
                  <p className="text-sm text-white/80" data-live-transcript data-testid="live-transcript">"{transcript}"</p>
                </motion.div>
              )}

              {/* Bhaiya's response */}
              {aiText && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className="text-[10px] text-[#3B82F6] font-mono uppercase tracking-wider mb-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>Bhaiya</p>
                  <p className="text-sm text-white/60 leading-relaxed">{aiText.length > 300 ? "..." + aiText.slice(-300) : aiText}</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── USER CAMERA PIP ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 z-30 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl"
        style={{ width: "140px", height: "200px" }}
      >
        {isCameraOn ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        ) : (
          <div className="w-full h-full bg-[#121212] flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-gray-600" />
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <p className="text-[9px] font-medium text-white bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-center truncate">
            {user?.name?.split(" ")[0] || "You"}
          </p>
        </div>
        {isListening && (
          <div className="absolute top-2 left-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
          </div>
        )}
      </motion.div>

      {/* ─── IDLE SCREEN ─── */}
      {callStatus === "idle" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050505]">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-[#0A0A0A] border-2 border-white/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
            </div>
            <p className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya</p>
            <p className="text-xs text-gray-500 mb-8">Your AI mentor is ready</p>
            <Button
              data-testid="start-call-btn"
              onClick={startCall}
              className="bg-[#10B981] hover:bg-emerald-400 text-black font-bold rounded-full px-10 py-4 text-base active:scale-95 transition-all shadow-lg shadow-[#10B981]/20"
            >
              <Phone className="w-5 h-5 mr-2" /> FaceTime
            </Button>
            <div className="mt-6">
              <button onClick={() => navigate("/dashboard")} className="text-xs text-gray-600 hover:text-gray-400">Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONNECTING ─── */}
      <AnimatePresence>
        {callStatus === "connecting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center">
            <div className="text-center">
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-[#10B981]" />
              </motion.div>
              <p className="text-lg font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Calling Bhaiya...</p>
              <p className="text-xs text-gray-500 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Setting up camera & mic</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FACETIME CONTROLS ─── */}
      <AnimatePresence>
        {callStatus === "active" && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-24"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
          >
            <div className="flex items-center justify-center gap-5">
              <button data-testid="call-camera-btn" onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${!isCameraOn ? "bg-white/25 text-white" : "bg-white/10 text-white/70"}`}>
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button data-testid="call-mute-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${isMuted ? "bg-red-500/30 text-red-300" : "bg-white/10 text-white/70"}`}>
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button data-testid="call-end-btn" onClick={(e) => { e.stopPropagation(); endCall(); }}
                className="w-[68px] h-[68px] rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-red-500/30">
                <PhoneOff className="w-7 h-7" />
              </button>

              <button data-testid="call-switch-chat-btn" onClick={(e) => { e.stopPropagation(); navigate("/chat"); }}
                className="w-14 h-14 rounded-full bg-white/10 text-white/70 flex items-center justify-center transition-all backdrop-blur-md">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
