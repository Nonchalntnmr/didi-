import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare, Video, VideoOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState("connecting"); // connecting, active, ended
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(20).fill(0.1));
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const waveIntervalRef = useRef(null);

  // Wave animation
  useEffect(() => {
    waveIntervalRef.current = setInterval(() => {
      setWaveAmplitudes((prev) =>
        prev.map(() => (isSpeaking || isListening ? 0.2 + Math.random() * 0.8 : 0.05 + Math.random() * 0.1))
      );
    }, 100);
    return () => clearInterval(waveIntervalRef.current);
  }, [isSpeaking, isListening]);

  // Connect call on mount
  useEffect(() => {
    const timer = setTimeout(() => setCallStatus("active"), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      synthRef.current.cancel();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setAiResponse("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      setTranscript(text);
      if (e.results[0].isFinal) {
        sendToAI(text);
      }
    };
    recognition.onerror = (e) => {
      console.error("Speech error:", e.error);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const sendToAI = async (text) => {
    setIsListening(false);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAiResponse(data.response);
      speak(data.response);
    } catch (err) {
      setAiResponse("Couldn't connect. Try again.");
      setIsSpeaking(false);
    }
  };

  const speak = (text) => {
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find((v) => v.name.includes("Google") && v.name.includes("Male")) || voices.find((v) => v.lang === "en-US" && v.name.includes("Male")) || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (!isMuted && callStatus === "active") {
        setTimeout(() => startListening(), 500);
      }
    };
    synthRef.current.speak(utterance);
  };

  const toggleMic = () => {
    if (isMuted) {
      setIsMuted(false);
      if (!isSpeaking) startListening();
    } else {
      setIsMuted(true);
      if (recognitionRef.current) recognitionRef.current.abort();
      setIsListening(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
  };

  const endCall = () => {
    synthRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.abort();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setCallStatus("ended");
    setTimeout(() => navigate("/dashboard"), 800);
  };

  const startConversation = () => {
    if (!isMuted) startListening();
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isSpeaking ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#3B82F6]/5 blur-[100px]" />
      </div>

      {/* Status */}
      <AnimatePresence>
        {callStatus === "connecting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-20 bg-[#050505]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#3B82F6]/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-2xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
              </div>
              <p className="text-sm font-mono text-gray-500 tracking-widest uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>Connecting...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar & Waveform */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: isSpeaking ? Infinity : 0, duration: 2 }}
          className="w-28 h-28 rounded-full bg-[#0A0A0A] border-2 border-[#3B82F6]/30 flex items-center justify-center mb-6"
        >
          <span className="text-4xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
        </motion.div>

        <p className="text-lg font-semibold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="call-bhaiya-label">Bhaiya</p>
        <p className="text-xs font-mono text-gray-500 tracking-widest uppercase mb-8" style={{ fontFamily: "JetBrains Mono, monospace" }} data-testid="call-status">
          {isListening ? "Listening..." : isSpeaking ? "Speaking..." : callStatus === "active" ? "Ready" : ""}
        </p>

        {/* Waveform */}
        <div className="flex items-center gap-1 h-16 mb-8" data-testid="call-waveform">
          {waveAmplitudes.map((amp, i) => (
            <motion.div
              key={i}
              animate={{ height: amp * 60 }}
              transition={{ duration: 0.1 }}
              className="w-1 rounded-full"
              style={{ backgroundColor: isSpeaking ? "#3B82F6" : isListening ? "#10B981" : "#27272A" }}
            />
          ))}
        </div>

        {/* AI Response text */}
        {aiResponse && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center px-6 mb-8">
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{aiResponse}</p>
          </motion.div>
        )}

        {/* Transcript */}
        {transcript && isListening && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md text-center px-6 mb-8">
            <p className="text-sm text-[#10B981] font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>"{transcript}"</p>
          </motion.div>
        )}

        {/* Start conversation button */}
        {callStatus === "active" && !isListening && !isSpeaking && !aiResponse && (
          <Button
            data-testid="start-conversation-btn"
            onClick={startConversation}
            className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-8 py-3 mb-8"
          >
            Tap to Talk
          </Button>
        )}
      </div>

      {/* Camera feed */}
      {isCameraOn && (
        <div className="absolute bottom-28 right-6 w-32 h-44 rounded-sm overflow-hidden border border-white/10 z-20">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-20">
        <div className="flex items-center justify-center gap-4">
          <Button
            data-testid="call-mute-btn"
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            data-testid="call-end-btn"
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-95"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            data-testid="call-camera-btn"
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isCameraOn ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30" : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
            }`}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            data-testid="call-switch-chat-btn"
            onClick={() => navigate("/chat")}
            className="w-14 h-14 rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
