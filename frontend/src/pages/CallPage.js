import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, MessageSquare, Video, VideoOff, Phone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function CallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState("idle"); // idle | connecting | active | ended
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [waveAmplitudes, setWaveAmplitudes] = useState(Array(32).fill(0.03));
  const [statusMsg, setStatusMsg] = useState("");

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const videoRef = useRef(null);
  const durationRef = useRef(null);
  const waveRef = useRef(null);

  // Waveform
  useEffect(() => {
    waveRef.current = setInterval(() => {
      setWaveAmplitudes(prev => prev.map(() => {
        if (callStatus !== "active") return 0.02 + Math.random() * 0.03;
        if (isAISpeaking) return 0.25 + Math.random() * 0.75;
        if (isUserSpeaking) return 0.1 + Math.random() * 0.45;
        return 0.03 + Math.random() * 0.06;
      }));
    }, 70);
    return () => clearInterval(waveRef.current);
  }, [callStatus, isAISpeaking, isUserSpeaking]);

  // Duration
  useEffect(() => {
    if (callStatus === "active") {
      durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [callStatus]);

  // Auto-hide controls
  useEffect(() => {
    if (callStatus === "active") {
      const t = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(t);
    }
  }, [callStatus, showControls]);

  // Cleanup
  useEffect(() => { return () => cleanup(); }, []);

  const cleanup = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); }
    if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(t => t.stop()); }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.srcObject = null; }
    clearInterval(durationRef.current);
  };

  // ═══ START CALL ═══
  const startCall = async () => {
    setCallStatus("connecting");
    setStatusMsg("Starting camera...");
    setCallDuration(0);

    try {
      // 1. Start camera
      try {
        const vidStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = vidStream;
        if (videoRef.current) videoRef.current.srcObject = vidStream;
      } catch {
        setIsCameraOn(false);
      }

      // 2. Get mic
      setStatusMsg("Getting microphone...");
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;

      // 3. Create Bhaiya voice session (with personality + voice)
      setStatusMsg("Calling Didi...");
      const sessionRes = await fetch(`${API}/voice/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!sessionRes.ok) throw new Error(`Session failed: ${sessionRes.status}`);
      const sessionData = await sessionRes.json();
      if (!sessionData.client_secret?.value) throw new Error("No session token");

      // 4. Create WebRTC peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Monitor connection
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("active");
          setStatusMsg("");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          endCall();
        }
      };

      // 5. Audio output from AI
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // 6. Add mic audio track to connection
      audioStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, audioStream);
      });

      // 7. Data channel for events (transcription, speaking status)
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("Data channel open — Didi is ready");
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // AI is generating audio
          if (msg.type === "response.audio_transcript.delta") {
            setAiText(prev => prev + (msg.delta || ""));
            setIsAISpeaking(true);
          }
          // AI finished speaking
          else if (msg.type === "response.audio_transcript.done" || msg.type === "response.done") {
            setIsAISpeaking(false);
          }
          // User started talking
          else if (msg.type === "input_audio_buffer.speech_started") {
            setIsUserSpeaking(true);
            setTranscript("");
            setAiText("");
          }
          // User stopped talking
          else if (msg.type === "input_audio_buffer.speech_stopped") {
            setIsUserSpeaking(false);
          }
          // User speech transcribed
          else if (msg.type === "conversation.item.input_audio_transcription.completed") {
            setTranscript(msg.transcript || "");
            setIsUserSpeaking(false);
          }
          // Response started (AI thinking)
          else if (msg.type === "response.created") {
            setIsAISpeaking(true);
          }
        } catch (e) { /* non-JSON */ }
      };

      // 8. Create offer
      setStatusMsg("Connecting...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates
      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") { resolve(); return; }
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        setTimeout(resolve, 4000);
      });

      // 9. Negotiate with backend
      const negRes = await fetch(`${API}/v1/realtime/negotiate`, {
        method: "POST",
        body: pc.localDescription.sdp,
        headers: { "Content-Type": "application/sdp" },
        credentials: "include",
      });
      if (!negRes.ok) throw new Error(`Negotiate failed: ${negRes.status}`);
      const { sdp } = await negRes.json();
      if (!sdp || sdp.includes('"error"')) throw new Error("Invalid SDP answer");

      // 10. Set remote description — connection established
      await pc.setRemoteDescription({ type: "answer", sdp });
      setCallStatus("active");
      setStatusMsg("");

    } catch (err) {
      console.error("Call failed:", err);
      setStatusMsg("Couldn't connect. Check mic permissions.");
      setTimeout(() => { setCallStatus("idle"); setStatusMsg(""); }, 3000);
    }
  };

  const endCall = () => {
    cleanup();
    setCallStatus("ended");
    setTimeout(() => navigate("/dashboard"), 500);
  };

  const toggleMute = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !isCameraOn; });
    }
    setIsCameraOn(!isCameraOn);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-[#FFFBF5] text-[#1e293b] overflow-hidden select-none" onClick={() => callStatus === "active" && setShowControls(true)}>

      {/* ═══ DIDI'S SCREEN ═══ */}
      <div className="absolute inset-0 bg-[#FFFBF5] flex items-center justify-center">
        <div className={`absolute w-[600px] h-[600px] rounded-full transition-all duration-500 ${
          isAISpeaking ? "bg-blue-100/60 scale-110" : isUserSpeaking ? "bg-emerald-100/40 scale-100" : "bg-gray-100/20 scale-90"
        }`} style={{ filter: "blur(120px)" }} />

        <div className="relative flex flex-col items-center z-10 max-w-lg">
          {/* Avatar */}
          <motion.div
            animate={{
              scale: isAISpeaking ? [1, 1.07, 1.03, 1.06, 1] : 1,
              borderColor: isAISpeaking ? "#3B82F6" : isUserSpeaking ? "#10B981" : "rgba(255,255,255,0.06)"
            }}
            transition={{ repeat: isAISpeaking ? Infinity : 0, duration: 1.8, ease: "easeInOut" }}
            style={{ borderColor: isAISpeaking ? "#3B82F6" : isUserSpeaking ? "#10B981" : "#e5e7eb" }}
            className="w-36 h-36 md:w-48 md:h-48 rounded-full border-[3px] flex items-center justify-center relative bg-white shadow-lg overflow-hidden"
          >
            <img src="https://customer-assets.emergentagent.com/job_mentor-live-1/artifacts/h9sfa3l8_Attachment-1.jpeg" alt="Anushka Didi" className="w-full h-full object-cover rounded-full" />
            {isAISpeaking && (
              <>
                <motion.div animate={{ scale: [1, 1.5], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/30" />
                <motion.div animate={{ scale: [1, 1.8], opacity: [0.15, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="absolute inset-0 rounded-full border border-[#3B82F6]/15" />
              </>
            )}
            {isUserSpeaking && (
              <motion.div animate={{ scale: [1, 1.3], opacity: [0.25, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-0 rounded-full border border-[#10B981]/30" />
            )}
          </motion.div>

          <p className="text-lg font-extrabold mt-5 tracking-tight" style={{ fontFamily: "Nunito, sans-serif" }}>Anushka Didi</p>
          {callStatus === "active" && (
            <p className="text-xs font-mono mt-1" style={{ fontFamily: "JetBrains Mono, monospace", color: isAISpeaking ? "#3B82F6" : isUserSpeaking ? "#10B981" : "#9CA3AF" }}>
              {isAISpeaking ? "Speaking..." : isUserSpeaking ? "Listening..." : fmt(callDuration)}
            </p>
          )}

          {/* Waveform */}
          {callStatus === "active" && (
            <div className="flex items-end gap-[2px] h-8 mt-4">
              {waveAmplitudes.map((amp, i) => (
                <motion.div key={i} animate={{ height: amp * 28 }} transition={{ duration: 0.06 }}
                  className="w-[2px] rounded-full"
                  style={{ backgroundColor: isAISpeaking ? "#3B82F6" : isUserSpeaking ? "#10B981" : "#E5E7EB" }}
                />
              ))}
            </div>
          )}

          {/* Live captions */}
          {callStatus === "active" && (
            <div className="mt-6 w-full max-w-md space-y-2 px-4">
              {transcript && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className="text-[10px] text-[#10B981] font-mono uppercase tracking-wider mb-0.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>You</p>
                  <p className="text-sm text-gray-600" data-testid="live-transcript">"{transcript}"</p>
                </motion.div>
              )}
              {aiText && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className="text-[10px] text-[#3B82F6] font-mono uppercase tracking-wider mb-0.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>Didi</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{aiText.length > 300 ? "..." + aiText.slice(-300) : aiText}</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ USER CAMERA PIP ═══ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 z-30 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-xl"
        style={{ width: "140px", height: "200px" }}
      >
        {isCameraOn ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-gray-300" />
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <p className="text-[9px] font-semibold text-white bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-center truncate">
            {user?.name?.split(" ")[0] || "You"}
          </p>
        </div>
        {isUserSpeaking && <div className="absolute top-2 left-2"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" /></div>}
      </motion.div>

      {/* ═══ IDLE ═══ */}
      {callStatus === "idle" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FFFBF5]">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 mx-auto mb-6">
              <img src="https://customer-assets.emergentagent.com/job_mentor-live-1/artifacts/h9sfa3l8_Attachment-1.jpeg" alt="Anushka Didi" className="w-full h-full object-cover" />
            </div>
            <p className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Anushka Didi</p>
            <p className="text-xs text-gray-400 mb-8">AI Voice &middot; Your caring older sister</p>
            {statusMsg && <p className="text-xs text-red-400 mb-4">{statusMsg}</p>}
            <button
              data-testid="start-call-btn"
              onClick={startCall}
              className="bg-[#10B981] hover:bg-emerald-400 text-black font-bold rounded-full px-10 py-4 text-base active:scale-95 transition-all shadow-lg shadow-[#10B981]/20 inline-flex items-center gap-2"
            >
              <Phone className="w-5 h-5" /> FaceTime
            </button>
            <div className="mt-6">
              <button onClick={() => navigate("/dashboard")} className="text-xs text-gray-600 hover:text-gray-400">Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONNECTING ═══ */}
      <AnimatePresence>
        {callStatus === "connecting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-[#FFFBF5]/90 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-[#10B981]" />
              </motion.div>
              <p className="text-lg font-extrabold mb-1" style={{ fontFamily: "Nunito, sans-serif" }}>Calling Didi...</p>
              <p className="text-xs text-gray-400 font-mono" style={{ fontFamily: "JetBrains Mono, monospace" }}>{statusMsg || "Connecting"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONTROLS ═══ */}
      <AnimatePresence>
        {callStatus === "active" && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-24"
            style={{ background: "linear-gradient(to top, rgba(255,251,245,0.9) 0%, transparent 100%)" }}
          >
            <div className="flex items-center justify-center gap-5">
              <button data-testid="call-camera-btn" onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md ${!isCameraOn ? "bg-gray-200 text-gray-600" : "bg-white text-gray-500 border border-gray-200"}`}>
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button data-testid="call-mute-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md ${isMuted ? "bg-red-100 text-red-500" : "bg-white text-gray-500 border border-gray-200"}`}>
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button data-testid="call-end-btn" onClick={(e) => { e.stopPropagation(); endCall(); }}
                className="w-[68px] h-[68px] rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-red-200">
                <PhoneOff className="w-7 h-7" />
              </button>
              <button data-testid="call-switch-chat-btn" onClick={(e) => { e.stopPropagation(); navigate("/chat"); }}
                className="w-14 h-14 rounded-full bg-white text-gray-500 border border-gray-200 flex items-center justify-center transition-all shadow-md">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
