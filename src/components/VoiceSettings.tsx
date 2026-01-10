import { useState, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/backend/client";
import { toast } from "sonner";

const MALE_VOICE_OPTIONS = [
  // Neural2 - Highest Quality
  { value: "en-AU-Neural2-B", label: "Australian Neural2-B", accent: "🇦🇺", quality: "Neural2", isDefault: true },
  { value: "en-AU-Neural2-D", label: "Australian Neural2-D", accent: "🇦🇺", quality: "Neural2" },
  { value: "en-GB-Neural2-B", label: "British Neural2-B", accent: "🇬🇧", quality: "Neural2" },
  { value: "en-GB-Neural2-D", label: "British Neural2-D", accent: "🇬🇧", quality: "Neural2" },
  { value: "en-US-Neural2-A", label: "American Neural2-A", accent: "🇺🇸", quality: "Neural2" },
  { value: "en-US-Neural2-D", label: "American Neural2-D", accent: "🇺🇸", quality: "Neural2" },
  // Wavenet - High Quality
  { value: "en-AU-Wavenet-B", label: "Australian Wavenet-B", accent: "🇦🇺", quality: "Wavenet" },
  { value: "en-AU-Wavenet-D", label: "Australian Wavenet-D", accent: "🇦🇺", quality: "Wavenet" },
  { value: "en-GB-Wavenet-B", label: "British Wavenet-B", accent: "🇬🇧", quality: "Wavenet" },
  { value: "en-GB-Wavenet-D", label: "British Wavenet-D", accent: "🇬🇧", quality: "Wavenet" },
  { value: "en-IN-Wavenet-B", label: "Indian Wavenet-B", accent: "🇮🇳", quality: "Wavenet" },
  { value: "en-IN-Wavenet-C", label: "Indian Wavenet-C", accent: "🇮🇳", quality: "Wavenet" },
  { value: "en-US-Wavenet-A", label: "American Wavenet-A", accent: "🇺🇸", quality: "Wavenet" },
  { value: "en-US-Wavenet-B", label: "American Wavenet-B", accent: "🇺🇸", quality: "Wavenet" },
  { value: "en-US-Wavenet-D", label: "American Wavenet-D", accent: "🇺🇸", quality: "Wavenet" },
];

const neural2Voices = MALE_VOICE_OPTIONS.filter(v => v.quality === "Neural2");
const wavenetVoices = MALE_VOICE_OPTIONS.filter(v => v.quality === "Wavenet");

export const VoiceSettings = () => {
  const [selectedVoice, setSelectedVoice] = useState("en-AU-Neural2-B");
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current voice setting
  useEffect(() => {
    const loadVoiceSetting = async () => {
      try {
        const { data, error } = await supabase
          .from("bob_settings")
          .select("setting_value")
          .eq("setting_key", "tts_voice")
          .maybeSingle();

        if (error) throw error;
        if (data?.setting_value) {
          setSelectedVoice(data.setting_value);
        }
      } catch (error) {
        console.error("Error loading voice setting:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoiceSetting();
  }, []);

  const handleVoiceChange = async (voice: string) => {
    setSelectedVoice(voice);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("bob_settings")
        .update({ setting_value: voice, updated_at: new Date().toISOString() })
        .eq("setting_key", "tts_voice");

      if (error) throw error;
      
      const voiceOption = MALE_VOICE_OPTIONS.find(v => v.value === voice);
      toast.success(`Voice changed to ${voiceOption?.label || voice}`);
    } catch (error) {
      console.error("Error saving voice setting:", error);
      toast.error("Failed to save voice setting");
    } finally {
      setIsSaving(false);
    }
  };

  const testVoice = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: "G'day mate! Bob from CARFIX here. How can I help ya today?",
            voice: selectedVoice 
          }),
        }
      );

      if (!response.ok) throw new Error("TTS request failed");

      const { audioContent } = await response.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      
      audio.onended = () => setIsTesting(false);
      audio.onerror = () => {
        setIsTesting(false);
        toast.error("Audio playback failed");
      };
      
      await audio.play();
    } catch (error) {
      console.error("Test voice error:", error);
      toast.error("Failed to test voice");
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading voice settings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Voice</label>
        <Select value={selectedVoice} onValueChange={handleVoiceChange} disabled={isSaving}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground font-semibold">
                Neural2 (Highest Quality)
              </SelectLabel>
              {neural2Voices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <span className="flex items-center gap-2">
                    <span>{voice.accent}</span>
                    <span>{voice.label}</span>
                    {voice.isDefault && (
                      <span className="text-xs text-primary font-medium">(Default)</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground font-semibold mt-2">
                Wavenet (High Quality)
              </SelectLabel>
              {wavenetVoices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <span className="flex items-center gap-2">
                    <span>{voice.accent}</span>
                    <span>{voice.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button 
        variant="outline" 
        onClick={testVoice} 
        disabled={isTesting}
        className="w-full"
      >
        {isTesting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Playing...
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 mr-2" />
            Test Voice
          </>
        )}
      </Button>
    </div>
  );
};
