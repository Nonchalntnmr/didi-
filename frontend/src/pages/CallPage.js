import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState("idle"); // idle, connecting, active, ended, error, fallback
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(24).fill(0.05));
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const waveIntervalRef = useRef(null);
  // Fallback refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Wave animation
  useEffect(() => {
    waveIntervalRef.current = setInterval(() => {
      const active = callStatus === "active" || callStatus === "fallback";
      setWaveAmplitudes(prev =>
        prev.map(() => active ? (isAISpeaking ? 0.3 + Math.random() * 0.7 : isListening ? 0.15 + Math.random() * 0.4 : 0.05 + Math.random() * 0.1) : 0.03 + Math.random() * 0.04)
      );
    }, 80);
    return () => clearInterval(waveIntervalRef.current);
  }, [callStatus, isAISpeaking, isListening]);

  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  const cleanup = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (audioRef.current) { audioRef.current.srcObject = null; }
    if (recognitionRef.current) { recognitionRef.current.abort(); }
    synthRef.current.cancel();
  };

  const startCall = async () => {
    setCallStatus("connecting");
    setStatusMsg("Getting session...");

    try {
      // Step 1: Get session
      const tokenRes = await fetch(`${API}/v1/realtime/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!tokenRes.ok) throw new Error(`Session failed: ${tokenRes.status}`);
      const tokenData = await tokenRes.json();
      if (!tokenData.client_secret?.value) throw new Error("No client secret in session response");
      
      setStatusMsg("Setting up audio...");

      // Step 2: Get mic access
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.error("Mic error:", micErr);
        setStatusMsg("Mic access denied. Trying fallback...");
        startFallbackCall();
        return;
      }
      localStreamRef.current = stream;

      setStatusMsg("Connecting to Bhaiya...");

      // Step 3: Create peer connection with ICE servers
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setCallStatus("active");
          setStatusMsg("");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.log("WebRTC connection failed, falling back...");
          cleanup();
          startFallbackCall();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState);
      };

      // Setup audio output
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
        setIsAISpeaking(true);
      };

      // Add local audio tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Setup data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => console.log("Data channel open");
      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "response.audio_transcript.delta") {
            setAiText(prev => prev + (msg.delta || ""));
            setIsAISpeaking(true);
          } else if (msg.type === "response.audio_transcript.done") {
            setIsAISpeaking(false);
          } else if (msg.type === "response.done") {
            setIsAISpeaking(false);
          } else if (msg.type === "input_audio_buffer.speech_started") {
            setTranscript("");
            setAiText("");
            setIsListening(true);
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            setIsListening(false);
          } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
            setTranscript(msg.transcript || "");
            setIsListening(false);
          }
        } catch (e) { /* non-JSON message */ }
      };

      // Step 4: Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering
      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") { resolve(); return; }
        const checkState = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", checkState);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", checkState);
        // Timeout after 3 seconds
        setTimeout(resolve, 3000);
      });

      const finalOffer = pc.localDescription;

      // Step 5: Negotiate with backend
      const negotiateRes = await fetch(`${API}/v1/realtime/negotiate`, {
        method: "POST",
        body: finalOffer.sdp,
        headers: { "Content-Type": "application/sdp" },
        credentials: "include",
      });
      if (!negotiateRes.ok) throw new Error(`Negotiate failed: ${negotiateRes.status}`);
      const { sdp: answerSdp } = await negotiateRes.json();
      if (!answerSdp || answerSdp.includes('"error"')) {
        throw new Error("Invalid SDP answer from server");
      }

      // Step 6: Set remote description
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setCallStatus("active");
      setStatusMsg("");
      console.log("WebRTC call established!");

    } catch (err) {
      console.error("Call setup failed:", err);
      setStatusMsg(`Connection issue. Switching to voice mode...`);
      cleanup();
      setTimeout(() => startFallbackCall(), 500);
    }
  };

  // ─── Fallback: Browser Speech API ───
  const startFallbackCall = () => {
    setCallStatus("fallback");
    setStatusMsg("");
    startListening();
  };

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setStatusMsg("Speech not supported in this browser. Try Chrome.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join("");
      setTranscript(text);
      setIsListening(true);
      if (e.results[0].isFinal) {
        setIsListening(false);
        sendToChat(text);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const sendToChat = async (text) => {
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setAiText(data.response);
      speakText(data.response);
    } catch (err) {
      setAiText("Couldn't connect. Try again.");
    }
  };

  const speakText = (text) => {
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0; utt.pitch = 0.9;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name.includes("Google") && v.lang === "en-US") || voices.find(v => v.lang === "en-US") || voices[0];
    if (pref) utt.voice = pref;
    utt.onstart = () => setIsAISpeaking(true);
    utt.onend = () => {
      setIsAISpeaking(false);
      if (!isMuted && callStatus === "fallback") setTimeout(() => startListening(), 400);
    };
    synthRef.current.speak(utt);
  };

  const endCall = () => {
    cleanup();
    setCallStatus("ended");
    setTimeout(() => navigate("/dashboard"), 500);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    }
    if (isMuted && callStatus === "fallback" && !isAISpeaking) {
      startListening();
    } else if (!isMuted && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
    setIsMuted(!isMuted);
  };

  const activeCall = callStatus === "active" || callStatus === "fallback";

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${isAISpeaking ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#3B82F6]/6 blur-[120px]" />
      </div>

      {/* Connecting overlay */}
      <AnimatePresence>
        {callStatus === "connecting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-20 bg-[#050505]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#3B82F6]/10 flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-mono text-gray-400 tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {statusMsg || "Connecting..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ scale: isAISpeaking ? [1, 1.06, 1] : 1 }}
          transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 1.5 }}
          className="w-32 h-32 rounded-full bg-[#0A0A0A] border-2 flex items-center justify-center mb-6 relative"
          style={{ borderColor: isAISpeaking ? "#3B82F6" : activeCall ? "#10B981" : "rgba(255,255,255,0.1)" }}
        >
          <span className="text-5xl font-bold text-[#3B82F6]" style={{ fontFamily: "Manrope, sans-serif" }}>B</span>
          {isAISpeaking && <div className="absolute -inset-3 rounded-full border border-[#3B82F6]/20 animate-ping" style={{ animationDuration: "2s" }} />}
        </motion.div>

        <p className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="call-bhaiya-label">Bhaiya</p>
        <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ fontFamily: "JetBrains Mono, monospace", color: activeCall ? "#10B981" : "#A1A1AA" }} data-testid="call-status">
          {!activeCall ? "Ready" : isAISpeaking ? "Speaking" : isListening ? "Listening" : "Connected"}
        </p>
        {callStatus === "fallback" && (
          <p className="text-[10px] text-gray-600 mb-4 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>Voice Mode</p>
        )}
        {statusMsg && activeCall && <p className="text-[10px] text-gray-500 mb-4">{statusMsg}</p>}

        {/* Waveform */}
        <div className="flex items-center gap-[3px] h-20 mb-6" data-testid="call-waveform">
          {waveAmplitudes.map((amp, i) => (
            <motion.div
              key={i}
              animate={{ height: amp * 72 }}
              transition={{ duration: 0.08 }}
              className="w-[3px] rounded-full"
              style={{ backgroundColor: isAISpeaking ? "#3B82F6" : isListening ? "#10B981" : activeCall ? "#27272A" : "#141414" }}
            />
          ))}
        </div>

        {/* AI response text */}
        {aiText && activeCall && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center px-6 mb-3">
            <p className="text-sm text-gray-400 leading-relaxed">{aiText.slice(-250)}</p>
          </motion.div>
        )}

        {/* Transcript */}
        {transcript && activeCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md text-center px-6 mb-6">
            <p className="text-xs text-[#10B981]/60 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>"{transcript}"</p>
          </motion.div>
        )}

        {/* Start button */}
        {callStatus === "idle" && (
          <Button
            data-testid="start-call-btn"
            onClick={startCall}
            className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-10 py-3.5 text-base mb-4 active:scale-95 transition-all"
          >
            Call Bhaiya
          </Button>
        )}

        {/* Tap to talk for fallback */}
        {callStatus === "fallback" && !isAISpeaking && !isListening && (
          <Button
            data-testid="tap-to-talk-btn"
            onClick={() => startListening()}
            className="bg-[#10B981] text-black font-bold hover:bg-emerald-400 rounded-sm px-8 py-3 mb-4"
          >
            Tap to Talk
          </Button>
        )}
      </div>

      {/* Controls */}
      {activeCall && (
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
