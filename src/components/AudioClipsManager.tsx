import React, { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Volume2, Play, Pause, Upload, Trash2, Edit2, Plus, Save, X, Music } from "lucide-react";

interface AudioClip {
  id: string;
  clip_key: string;
  audio_url: string;
  transcript: string;
  is_active: boolean;
  animation_state_id: string | null;
  chat_trigger: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface AnimationState {
  id: string;
  state_key: string;
  title: string;
}

const CHAT_TRIGGERS = [
  { value: "page_load", label: "🎬 Page Load" },
  { value: "awaiting_input", label: "⏸️ Awaiting Input" },
  { value: "processing_input", label: "🔍 Processing Input" },
  { value: "streaming_response", label: "💬 Streaming Response" },
  { value: "response_complete", label: "✅ Response Complete" },
];

export const AudioClipsManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for new/edit
  const [formData, setFormData] = useState({
    clip_key: "",
    transcript: "",
    chat_trigger: "",
    animation_state_id: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch audio clips
  const { data: clips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ["bob_audio_clips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bob_audio_clips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AudioClip[];
    },
  });

  // Fetch animation states for dropdown
  const { data: animationStates = [] } = useQuery({
    queryKey: ["animation_states_for_audio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animation_states")
        .select("id, state_key, title")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as AnimationState[];
    },
  });

  const handlePlayPause = useCallback((clip: AudioClip) => {
    if (playingClipId === clip.id) {
      audioRef.current?.pause();
      setPlayingClipId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(clip.audio_url);
      audio.onended = () => setPlayingClipId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingClipId(clip.id);
    }
  }, [playingClipId]);

  const handleToggleActive = useCallback(async (clip: AudioClip) => {
    try {
      const { error } = await supabase
        .from("bob_audio_clips")
        .update({ is_active: !clip.is_active })
        .eq("id", clip.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bob_audio_clips"] });
      toast({ title: clip.is_active ? "Clip disabled" : "Clip enabled" });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({ title: "Failed to update clip", variant: "destructive" });
    }
  }, [queryClient, toast]);

  const handleDelete = useCallback(async (clip: AudioClip) => {
    if (!confirm(`Delete audio clip "${clip.clip_key}"?`)) return;
    try {
      const { error } = await supabase
        .from("bob_audio_clips")
        .delete()
        .eq("id", clip.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bob_audio_clips"] });
      toast({ title: "Clip deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Failed to delete clip", variant: "destructive" });
    }
  }, [queryClient, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setSelectedFile(file);
      // Auto-fill clip_key from filename
      const clipKey = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
      setFormData(prev => ({ ...prev, clip_key: clipKey }));
    } else {
      toast({ title: "Please select an audio file", variant: "destructive" });
    }
  }, [toast]);

  const handleSaveNew = useCallback(async () => {
    if (!selectedFile || !formData.clip_key || !formData.transcript) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileName = `${formData.clip_key}_${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bob-images")
        .upload(`audio/${fileName}`, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("bob-images")
        .getPublicUrl(`audio/${fileName}`);

      // Insert record
      const { error: insertError } = await supabase
        .from("bob_audio_clips")
        .insert({
          clip_key: formData.clip_key,
          audio_url: publicUrl,
          transcript: formData.transcript,
          chat_trigger: formData.chat_trigger || null,
          animation_state_id: formData.animation_state_id || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["bob_audio_clips"] });
      toast({ title: "Audio clip added successfully" });
      setIsAddingNew(false);
      setSelectedFile(null);
      setFormData({ clip_key: "", transcript: "", chat_trigger: "", animation_state_id: "" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload audio clip", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [selectedFile, formData, queryClient, toast]);

  const handleUpdateClip = useCallback(async (clip: AudioClip) => {
    try {
      const { error } = await supabase
        .from("bob_audio_clips")
        .update({
          transcript: formData.transcript,
          chat_trigger: formData.chat_trigger || null,
          animation_state_id: formData.animation_state_id || null,
        })
        .eq("id", clip.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bob_audio_clips"] });
      toast({ title: "Clip updated" });
      setEditingClipId(null);
    } catch (error) {
      console.error("Update error:", error);
      toast({ title: "Failed to update clip", variant: "destructive" });
    }
  }, [formData, queryClient, toast]);

  const startEditing = useCallback((clip: AudioClip) => {
    setEditingClipId(clip.id);
    setFormData({
      clip_key: clip.clip_key,
      transcript: clip.transcript,
      chat_trigger: clip.chat_trigger || "",
      animation_state_id: clip.animation_state_id || "",
    });
  }, []);

  const getStateName = useCallback((stateId: string | null) => {
    if (!stateId) return null;
    const state = animationStates.find(s => s.id === stateId);
    return state?.title || state?.state_key || null;
  }, [animationStates]);

  const getTriggerLabel = useCallback((trigger: string | null) => {
    if (!trigger) return null;
    return CHAT_TRIGGERS.find(t => t.value === trigger)?.label || trigger;
  }, []);

  if (clipsLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading audio clips...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Pre-recorded Audio Clips
              </CardTitle>
              <CardDescription>
                Manage Bob's pre-recorded audio for faster responses
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddingNew(true)} disabled={isAddingNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Clip
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Form */}
          {isAddingNew && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  New Audio Clip
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Audio File (MP3)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile ? selectedFile.name : "Choose File"}
                    </Button>
                  </div>
                </div>

                {/* Clip Key */}
                <div className="space-y-2">
                  <Label htmlFor="clip_key">Clip Key *</Label>
                  <Input
                    id="clip_key"
                    value={formData.clip_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, clip_key: e.target.value }))}
                    placeholder="greeting_welcome"
                  />
                </div>

                {/* Transcript */}
                <div className="space-y-2">
                  <Label htmlFor="transcript">Transcript *</Label>
                  <Input
                    id="transcript"
                    value={formData.transcript}
                    onChange={(e) => setFormData(prev => ({ ...prev, transcript: e.target.value }))}
                    placeholder="G'day! Bob from CARFIX here..."
                  />
                </div>

                {/* Chat Trigger */}
                <div className="space-y-2">
                  <Label>Chat Trigger (optional)</Label>
                  <Select
                    value={formData.chat_trigger || "none"}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, chat_trigger: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(none)</SelectItem>
                      {CHAT_TRIGGERS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Animation State */}
                <div className="space-y-2">
                  <Label>Animation State (optional)</Label>
                  <Select
                    value={formData.animation_state_id || "none"}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, animation_state_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(none)</SelectItem>
                      {animationStates.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleSaveNew} disabled={uploading} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Save Clip"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAddingNew(false);
                    setSelectedFile(null);
                    setFormData({ clip_key: "", transcript: "", chat_trigger: "", animation_state_id: "" });
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clips List */}
          {clips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No audio clips configured yet
            </p>
          ) : (
            <div className="space-y-3">
              {clips.map((clip) => (
                <Card key={clip.id} className={!clip.is_active ? "opacity-60" : ""}>
                  <CardContent className="py-3">
                    {editingClipId === clip.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Transcript</Label>
                          <Input
                            value={formData.transcript}
                            onChange={(e) => setFormData(prev => ({ ...prev, transcript: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Chat Trigger</Label>
                            <Select
                              value={formData.chat_trigger || "none"}
                              onValueChange={(v) => setFormData(prev => ({ ...prev, chat_trigger: v === "none" ? "" : v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">(none)</SelectItem>
                                {CHAT_TRIGGERS.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Animation State</Label>
                            <Select
                              value={formData.animation_state_id || "none"}
                              onValueChange={(v) => setFormData(prev => ({ ...prev, animation_state_id: v === "none" ? "" : v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">(none)</SelectItem>
                                {animationStates.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateClip(clip)}>
                            <Save className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingClipId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center gap-3">
                        {/* Play Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => handlePlayPause(clip)}
                        >
                          {playingClipId === clip.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                              {clip.clip_key}
                            </code>
                            {getTriggerLabel(clip.chat_trigger) && (
                              <Badge variant="secondary" className="text-xs">
                                {getTriggerLabel(clip.chat_trigger)}
                              </Badge>
                            )}
                            {getStateName(clip.animation_state_id) && (
                              <Badge variant="outline" className="text-xs">
                                {getStateName(clip.animation_state_id)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {clip.transcript}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={clip.is_active}
                            onCheckedChange={() => handleToggleActive(clip)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(clip)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(clip)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
