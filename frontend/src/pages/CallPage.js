import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState("idle"); // idle, connecting, active, ended, error
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(24).fill(0.05));
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const waveIntervalRef = useRef(null);

  // Wave animation
  useEffect(() => {
    waveIntervalRef.current = setInterval(() => {
      setWaveAmplitudes(prev =>
        prev.map(() => callStatus === "active" ? (isAISpeaking ? 0.3 + Math.random() * 0.7 : 0.05 + Math.random() * 0.15) : 0.03 + Math.random() * 0.05)
      );
    }, 80);
    return () => clearInterval(waveIntervalRef.current);
  }, [callStatus, isAISpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const startCall = async () => {
    setCallStatus("connecting");
    try {
      // Get session from backend
      const tokenRes = await fetch(`${API}/v1/realtime/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      // Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Setup audio element for AI voice
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
        setIsAISpeaking(true);
        // Detect when audio ends
        const track = event.streams[0].getAudioTracks()[0];
        if (track) {
          track.onended = () => setIsAISpeaking(false);
        }
      };

      // Setup local audio (mic)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Setup data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "response.audio_transcript.delta") {
            setAiText(prev => prev + (data.delta || ""));
            setIsAISpeaking(true);
          } else if (data.type === "response.audio_transcript.done") {
            setIsAISpeaking(false);
          } else if (data.type === "input_audio_buffer.speech_started") {
            setTranscript("");
            setAiText("");
          } else if (data.type === "conversation.item.input_audio_transcription.completed") {
            setTranscript(data.transcript || "");
          }
        } catch (e) { /* ignore non-JSON */ }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const negotiateRes = await fetch(`${API}/v1/realtime/negotiate`, {
        method: "POST",
        body: offer.sdp,
        headers: { "Content-Type": "application/sdp" },
        credentials: "include",
      });
      const { sdp: answerSdp } = await negotiateRes.json();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setCallStatus("active");
    } catch (err) {
      console.error("Call setup failed:", err);
      setCallStatus("error");
      // Fallback to browser speech
      setTimeout(() => setCallStatus("idle"), 2000);
    }
  };

  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setCallStatus("ended");
    setTimeout(() => navigate("/dashboard"), 600);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isAISpeaking ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#3B82F6]/5 blur-[100px]" />
      </div>

      {/* Status overlay */}
      <AnimatePresence>
        {(callStatus === "connecting" || callStatus === "error") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-20 bg-[#050505]">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${callStatus === "error" ? "bg-red-500/10" : "bg-[#3B82F6]/10 animate-pulse"}`}>
                <span className="text-2xl font-bold" style={{ color: callStatus === "error" ? "#EF4444" : "#3B82F6", fontFamily: "Manrope, sans-serif" }}>B</span>
              </div>
              <p className="text-sm font-mono text-gray-500 tracking-widest uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {callStatus === "error" ? "Connection failed" : "Connecting..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar */}
        <motion.div
          animate={{ scale: isAISpeaking ? [1, 1.06, 1] : 1 }}
          transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 1.5 }}
          className="w-32 h-32 rounded-full bg-[#0A0A0A] border-2 flex items-center justify-center mb-6 relative"
          style={{ borderColor: isAISpeaking ? "#3B82F6" : "rgba(255,255,255,0.1)" }}
        >
          <span className="text-5xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
          {isAISpeaking && (
            <div className="absolute -inset-2 rounded-full border border-[#3B82F6]/30 animate-ping" style={{ animationDuration: "2s" }} />
          )}
        </motion.div>

        <p className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="call-bhaiya-label">Bhaiya</p>
        <p className="text-xs font-mono tracking-widest uppercase mb-8" style={{ color: callStatus === "active" ? "#10B981" : "#A1A1AA", fontFamily: "JetBrains Mono, monospace" }} data-testid="call-status">
          {callStatus === "idle" ? "Ready to call" : callStatus === "active" ? (isAISpeaking ? "Speaking" : "Listening") : callStatus === "connecting" ? "Connecting" : ""}
        </p>

        {/* Waveform */}
        <div className="flex items-center gap-[3px] h-20 mb-6" data-testid="call-waveform">
          {waveAmplitudes.map((amp, i) => (
            <motion.div
              key={i}
              animate={{ height: amp * 72 }}
              transition={{ duration: 0.08 }}
              className="w-[3px] rounded-full"
              style={{ backgroundColor: isAISpeaking ? "#3B82F6" : callStatus === "active" ? "#10B981" : "#1a1a1a" }}
            />
          ))}
        </div>

        {/* AI response text */}
        {aiText && callStatus === "active" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center px-6 mb-4">
            <p className="text-sm text-gray-400 leading-relaxed">{aiText.slice(-200)}</p>
          </motion.div>
        )}

        {/* User transcript */}
        {transcript && callStatus === "active" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md text-center px-6 mb-6">
            <p className="text-xs text-[#10B981]/70 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>You: "{transcript}"</p>
          </motion.div>
        )}

        {/* Start call button */}
        {callStatus === "idle" && (
          <Button
            data-testid="start-call-btn"
            onClick={startCall}
            className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-10 py-3.5 text-base mb-6 active:scale-95 transition-all"
          >
            Call Bhaiya
          </Button>
        )}
      </div>

      {/* Controls */}
      {callStatus === "active" && (
        <div className="absolute bottom-10 left-0 right-0 z-20">
          <div className="flex items-center justify-center gap-5">
            <Button
              data-testid="call-mute-btn"
              onClick={toggleMute}
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
              data-testid="call-switch-chat-btn"
              onClick={() => navigate("/chat")}
              className="w-14 h-14 rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
