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

// ElevenLabs voice options - curated for Bob's friendly Kiwi character
const ELEVENLABS_VOICES = [
  // Recommended for Bob
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George", description: "Warm & friendly", isDefault: true, category: "recommended" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian", description: "Deep & authoritative", category: "recommended" },
  { value: "iP95p4xoKVk53GoZ742B", label: "Chris", description: "Casual & approachable", category: "recommended" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", description: "Clear & professional", category: "recommended" },
  // Additional male voices
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam", description: "Young & energetic", category: "additional" },
  { value: "bIHbv24MWmeRgasZH58o", label: "Will", description: "Confident & smooth", category: "additional" },
  { value: "cjVigY5qzO86Huf0OWal", label: "Eric", description: "Friendly & conversational", category: "additional" },
  { value: "pqHfZKP75CvOlQylNhV4", label: "Bill", description: "Mature & trustworthy", category: "additional" },
  // Character voices (fun options)
  { value: "N2lVS1w4EtoT3dr4eOWO", label: "Callum", description: "British charm", category: "character" },
  { value: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger", description: "Refined & eloquent", category: "character" },
];

const recommendedVoices = ELEVENLABS_VOICES.filter(v => v.category === "recommended");
const additionalVoices = ELEVENLABS_VOICES.filter(v => v.category === "additional");
const characterVoices = ELEVENLABS_VOICES.filter(v => v.category === "character");

export const VoiceSettings = () => {
  const [selectedVoice, setSelectedVoice] = useState("JBFqnCBsd6RMkjVDRZzb");
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
      const { data, error } = await supabase
        .from("bob_settings")
        .update({ setting_value: voice, updated_at: new Date().toISOString() })
        .eq("setting_key", "tts_voice")
        .select();

      if (error) throw error;
      
      // Check if any row was actually updated
      if (!data || data.length === 0) {
        toast.error('Voice setting not found or not permitted');
        return;
      }
      
      const voiceOption = ELEVENLABS_VOICES.find(v => v.value === voice);
      toast.success(`Voice changed to ${voiceOption?.label || voice}`);
    } catch (error) {
      console.error("Error saving voice setting:", error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save voice setting: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const testVoice = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-tts-elevenlabs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: "G'day mate! Bob from CARFIX here. How can I help ya today?",
            voiceId: selectedVoice 
          }),
        }
      );

      if (!response.ok) throw new Error("TTS request failed");

      // ElevenLabs returns audio blob directly
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsTesting(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsTesting(false);
        URL.revokeObjectURL(audioUrl);
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
        <label className="text-sm font-medium">Voice (ElevenLabs)</label>
        <Select value={selectedVoice} onValueChange={handleVoiceChange} disabled={isSaving}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground font-semibold">
                ⭐ Recommended for Bob
              </SelectLabel>
              {recommendedVoices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{voice.label}</span>
                    <span className="text-xs text-muted-foreground">- {voice.description}</span>
                    {voice.isDefault && (
                      <span className="text-xs text-primary font-medium">(Default)</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground font-semibold mt-2">
                Additional Voices
              </SelectLabel>
              {additionalVoices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{voice.label}</span>
                    <span className="text-xs text-muted-foreground">- {voice.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground font-semibold mt-2">
                Character Voices
              </SelectLabel>
              {characterVoices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{voice.label}</span>
                    <span className="text-xs text-muted-foreground">- {voice.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Powered by ElevenLabs • Ultra-low latency streaming
        </p>
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
