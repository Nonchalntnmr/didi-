import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const facePresets = ["default", "sharp", "rounded", "angular"];
const skinTones = ["light", "medium", "tan", "dark"];
const hairstyles = ["short", "medium", "long", "buzz", "curly"];
const outfits = ["hoodie", "formal", "gym", "casual", "tech"];
const voiceTypes = ["calm", "energetic", "deep"];

export default function AvatarCustomize() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState({
    face_preset: "default",
    skin_tone: "medium",
    hairstyle: "short",
    outfit: "hoodie",
    strict_level: 5,
    humor_level: 5,
    verbosity_level: 5,
    voice_type: "calm",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/avatar`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          face_preset: data.face_preset || "default",
          skin_tone: data.skin_tone || "medium",
          hairstyle: data.hairstyle || "short",
          outfit: data.outfit || "hoodie",
          strict_level: data.strict_level ?? 5,
          humor_level: data.humor_level ?? 5,
          verbosity_level: data.verbosity_level ?? 5,
          voice_type: data.voice_type || "calm",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/avatar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const SelectGrid = ({ label, options, value, onChange, testId }) => (
    <div className="mb-6">
      <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500 mb-3 block" style={{ fontFamily: "JetBrains Mono, monospace" }}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            data-testid={`${testId}-${opt}`}
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-sm text-xs font-medium capitalize transition-all ${
              value === opt ? "bg-[#3B82F6] text-black" : "bg-[#121212] text-gray-400 border border-white/5 hover:border-white/20"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button data-testid="customize-back-btn" variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Customize Bhaiya</p>
          </div>
          <Button
            data-testid="save-avatar-btn"
            onClick={saveConfig}
            disabled={saving}
            className="bg-[#3B82F6] text-black font-bold hover:bg-blue-400 rounded-sm px-5 py-2 text-sm flex items-center gap-2"
          >
            <Save className="w-3 h-3" /> {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-8 flex flex-col items-center sticky top-24">
              <div className="w-32 h-32 rounded-full bg-[#121212] border-2 border-[#3B82F6]/30 flex items-center justify-center mb-4 relative overflow-hidden">
                <User className="w-12 h-12 text-[#3B82F6]/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#3B82F6]/10 to-transparent" />
              </div>
              <p className="text-lg font-bold tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Bhaiya</p>
              <div className="text-[10px] font-mono text-gray-500 space-y-1 mt-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                <p>FACE: {config.face_preset}</p>
                <p>SKIN: {config.skin_tone}</p>
                <p>HAIR: {config.hairstyle}</p>
                <p>FIT: {config.outfit}</p>
                <p>VOICE: {config.voice_type}</p>
              </div>
            </Card>
          </motion.div>

          {/* Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
            {/* Visual */}
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
              <h3 className="text-base font-semibold tracking-tight mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>Appearance</h3>
              <SelectGrid label="Face" options={facePresets} value={config.face_preset} onChange={(v) => setConfig({ ...config, face_preset: v })} testId="face" />
              <SelectGrid label="Skin Tone" options={skinTones} value={config.skin_tone} onChange={(v) => setConfig({ ...config, skin_tone: v })} testId="skin" />
              <SelectGrid label="Hairstyle" options={hairstyles} value={config.hairstyle} onChange={(v) => setConfig({ ...config, hairstyle: v })} testId="hair" />
              <SelectGrid label="Outfit" options={outfits} value={config.outfit} onChange={(v) => setConfig({ ...config, outfit: v })} testId="outfit" />
            </Card>

            {/* Personality */}
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
              <h3 className="text-base font-semibold tracking-tight mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>Personality</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Strictness</label>
                    <span className="text-xs font-mono text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{config.strict_level}/10</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-600">Chill</span>
                    <Slider
                      data-testid="slider-strict"
                      value={[config.strict_level]}
                      onValueChange={(v) => setConfig({ ...config, strict_level: v[0] })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-gray-600">Strict</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Humor</label>
                    <span className="text-xs font-mono text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{config.humor_level}/10</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-600">Serious</span>
                    <Slider
                      data-testid="slider-humor"
                      value={[config.humor_level]}
                      onValueChange={(v) => setConfig({ ...config, humor_level: v[0] })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-gray-600">Funny</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-mono uppercase tracking-[0.2em] text-gray-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>Verbosity</label>
                    <span className="text-xs font-mono text-[#3B82F6]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{config.verbosity_level}/10</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-600">Concise</span>
                    <Slider
                      data-testid="slider-verbosity"
                      value={[config.verbosity_level]}
                      onValueChange={(v) => setConfig({ ...config, verbosity_level: v[0] })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-gray-600">Talkative</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Voice */}
            <Card className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6">
              <h3 className="text-base font-semibold tracking-tight mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>Voice</h3>
              <SelectGrid label="Voice Type" options={voiceTypes} value={config.voice_type} onChange={(v) => setConfig({ ...config, voice_type: v })} testId="voice" />
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
