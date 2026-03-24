import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare, Video, VideoOff, Phone } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(32).fill(0.05));
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const videoRef = useRef(null);
  const waveIntervalRef = useRef(null);
  const durationRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const controlsTimerRef = useRef(null);

  // Wave animation
  useEffect(() => {
    waveIntervalRef.current = setInterval(() => {
      const active = callStatus === "active" || callStatus === "fallback";
      setWaveAmplitudes(prev =>
        prev.map(() => {
          if (!active) return 0.02 + Math.random() * 0.03;
          if (isAISpeaking) return 0.2 + Math.random() * 0.8;
          if (isListening) return 0.1 + Math.random() * 0.35;
          return 0.03 + Math.random() * 0.08;
        })
      );
    }, 60);
    return () => clearInterval(waveIntervalRef.current);
  }, [callStatus, isAISpeaking, isListening]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === "active" || callStatus === "fallback") {
      durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [callStatus]);

  // Auto-hide controls
  useEffect(() => {
    const active = callStatus === "active" || callStatus === "fallback";
    if (active) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 5000);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [callStatus, showControls]);

  useEffect(() => { return () => cleanup(); }, []);

  const cleanup = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); }
    if (audioRef.current) { audioRef.current.srcObject = null; }
    if (recognitionRef.current) { recognitionRef.current.abort(); }
    synthRef.current.cancel();
    clearInterval(durationRef.current);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsCameraOn(false);
        return stream;
      } catch (e) {
        throw new Error("No mic access");
      }
    }
  };

  const startCall = async () => {
    setCallStatus("connecting");
    setStatusMsg("Starting camera...");
    setCallDuration(0);

    try {
      const stream = await startCamera();
      setStatusMsg("Connecting to Bhaiya...");

      // Try WebRTC first
      const tokenRes = await fetch(`${API}/v1/realtime/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!tokenRes.ok) throw new Error("Session failed");
      const tokenData = await tokenRes.json();
      if (!tokenData.client_secret?.value) throw new Error("No token");

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("active");
          setStatusMsg("");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanup();
          startFallbackMode();
        }
      };

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; setIsAISpeaking(true); };

      // Only add audio tracks to WebRTC (video stays local)
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "response.audio_transcript.delta") { setAiText(prev => prev + (msg.delta || "")); setIsAISpeaking(true); }
          else if (msg.type === "response.audio_transcript.done" || msg.type === "response.done") { setIsAISpeaking(false); }
          else if (msg.type === "input_audio_buffer.speech_started") { setTranscript(""); setAiText(""); setIsListening(true); }
          else if (msg.type === "input_audio_buffer.speech_stopped") { setIsListening(false); }
          else if (msg.type === "conversation.item.input_audio_transcription.completed") { setTranscript(msg.transcript || ""); setIsListening(false); }
        } catch (e) {}
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise(r => {
        if (pc.iceGatheringState === "complete") { r(); return; }
        const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); r(); } };
        pc.addEventListener("icegatheringstatechange", check);
        setTimeout(r, 3000);
      });

      const negRes = await fetch(`${API}/v1/realtime/negotiate`, {
        method: "POST", body: pc.localDescription.sdp,
        headers: { "Content-Type": "application/sdp" }, credentials: "include",
      });
      if (!negRes.ok) throw new Error("Negotiate failed");
      const { sdp } = await negRes.json();
      if (!sdp || sdp.includes('"error"')) throw new Error("Bad SDP");
      await pc.setRemoteDescription({ type: "answer", sdp });
      setCallStatus("active");
      setStatusMsg("");
    } catch (err) {
      console.error("WebRTC failed:", err);
      startFallbackMode();
    }
  };

  const startFallbackMode = () => {
    setCallStatus("fallback");
    setStatusMsg("");
    beginListening();
  };

  const beginListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => {
      const text = Array.from(e.results).map(x => x[0].transcript).join("");
      setTranscript(text); setIsListening(true);
      if (e.results[0].isFinal) { setIsListening(false); sendToChat(text); }
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start(); setIsListening(true);
  }, []);

  const sendToChat = async (text) => {
    try {
      const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ message: text }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiText(data.response);
      const utt = new SpeechSynthesisUtterance(data.response);
      utt.rate = 1; utt.pitch = 0.9;
      const voices = synthRef.current.getVoices();
      const v = voices.find(x => x.lang === "en-US") || voices[0];
      if (v) utt.voice = v;
      utt.onstart = () => setIsAISpeaking(true);
      utt.onend = () => { setIsAISpeaking(false); if (!isMuted) setTimeout(beginListening, 400); };
      synthRef.current.speak(utt);
    } catch { setAiText("Connection issue. Try again."); }
  };

  const endCall = () => { cleanup(); setCallStatus("ended"); setTimeout(() => navigate("/dashboard"), 400); };

  const toggleMute = () => {
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    if (isMuted && callStatus === "fallback" && !isAISpeaking) beginListening();
    else if (!isMuted && recognitionRef.current) { recognitionRef.current.abort(); setIsListening(false); }
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !isCameraOn; });
    }
    setIsCameraOn(!isCameraOn);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const activeCall = callStatus === "active" || callStatus === "fallback";

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none" onClick={() => activeCall && setShowControls(true)}>
      {/* ─── BHAIYA'S "VIDEO" ─── Full screen animated avatar background */}
      <div className="absolute inset-0 bg-[#050505] flex items-center justify-center">
        {/* Ambient reactive glow */}
        <div className={`absolute w-[500px] h-[500px] rounded-full transition-all duration-700 ${isAISpeaking ? "bg-[#3B82F6]/12 scale-110" : isListening ? "bg-[#10B981]/8 scale-100" : "bg-white/[0.02] scale-90"}`} style={{ filter: "blur(100px)" }} />

        {/* Avatar circle */}
        <div className="relative flex flex-col items-center z-10">
          <motion.div
            animate={{
              scale: isAISpeaking ? [1, 1.08, 1.02, 1.06, 1] : 1,
              borderColor: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "rgba(255,255,255,0.08)"
            }}
            transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 2, ease: "easeInOut" }}
            className="w-40 h-40 md:w-52 md:h-52 rounded-full border-[3px] flex items-center justify-center relative"
            style={{ background: "radial-gradient(circle at 40% 35%, #111827, #050505)" }}
          >
            <span className="text-6xl md:text-7xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>

            {/* Pulse rings when speaking */}
            {isAISpeaking && (
              <>
                <motion.div animate={{ scale: [1, 1.4], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/30" />
                <motion.div animate={{ scale: [1, 1.6], opacity: [0.2, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/20" />
              </>
            )}
            {isListening && (
              <motion.div animate={{ scale: [1, 1.3], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="absolute inset-0 rounded-full border border-[#10B981]/30" />
            )}
          </motion.div>

          {/* Name & status */}
          <p className="text-lg font-bold mt-5 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya</p>
          {activeCall && (
            <p className="text-xs font-mono mt-1 tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace", color: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "#A1A1AA" }}>
              {isAISpeaking ? "Speaking" : isListening ? "Listening" : fmt(callDuration)}
            </p>
          )}

          {/* Waveform bar under avatar */}
          {activeCall && (
            <div className="flex items-end gap-[2px] h-10 mt-4">
              {waveAmplitudes.map((amp, i) => (
                <motion.div
                  key={i}
                  animate={{ height: amp * 36 }}
                  transition={{ duration: 0.06 }}
                  className="w-[2px] rounded-full origin-bottom"
                  style={{ backgroundColor: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : "#1a1a1a" }}
                />
              ))}
            </div>
          )}

          {/* Captions */}
          {aiText && activeCall && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg text-center mt-4 px-6">
              <p className="text-sm text-white/70 leading-relaxed">{aiText.slice(-200)}</p>
            </motion.div>
          )}
          {transcript && isListening && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <p className="text-xs text-[#10B981]/60 font-mono italic" style={{ fontFamily: "JetBrains Mono, monospace" }}>"{transcript}"</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── USER CAMERA PIP ─── Corner video feed */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 right-6 z-30 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl"
        style={{ width: "160px", height: "220px" }}
      >
        {isCameraOn ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        ) : (
          <div className="w-full h-full bg-[#121212] flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-gray-600" />
          </div>
        )}
        {/* Name label */}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[10px] font-medium text-white bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-center truncate">
            {user?.name?.split(" ")[0] || "You"}
          </p>
        </div>
      </motion.div>

      {/* ─── CONNECTING OVERLAY ─── */}
      <AnimatePresence>
        {callStatus === "connecting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mx-auto mb-6"
              >
                <Phone className="w-10 h-10 text-[#3B82F6]" />
              </motion.div>
              <p className="text-lg font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Calling Bhaiya...</p>
              <p className="text-xs text-gray-500 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{statusMsg || "Connecting"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <button onClick={() => navigate("/dashboard")} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTROLS BAR ─── FaceTime-style bottom controls */}
      <AnimatePresence>
        {activeCall && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-20"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
          >
            {/* Tap to talk for fallback */}
            {callStatus === "fallback" && !isAISpeaking && !isListening && (
              <div className="text-center mb-6">
                <button
                  data-testid="tap-to-talk-btn"
                  onClick={(e) => { e.stopPropagation(); beginListening(); }}
                  className="text-xs text-[#10B981] border border-[#10B981]/30 rounded-full px-6 py-2 hover:bg-[#10B981]/10 transition-all"
                >
                  Tap to speak
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-5">
              {/* Camera toggle */}
              <button
                data-testid="call-camera-btn"
                onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                  !isCameraOn ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                }`}
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Mute */}
              <button
                data-testid="call-mute-btn"
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                  isMuted ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* End call */}
              <button
                data-testid="call-end-btn"
                onClick={(e) => { e.stopPropagation(); endCall(); }}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* Switch to chat */}
              <button
                data-testid="call-switch-chat-btn"
                onClick={(e) => { e.stopPropagation(); navigate("/chat"); }}
                className="w-14 h-14 rounded-full bg-white/10 text-white/80 flex items-center justify-center transition-all backdrop-blur-sm"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
