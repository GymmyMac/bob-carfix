import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, Brain, Sparkles, Loader2 } from "lucide-react";

const AVAILABLE_MODELS = [
  {
    value: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Balanced speed & quality — current default",
    tier: "recommended",
  },
  {
    value: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash (Preview)",
    description: "Next-gen speed & capability",
    tier: "new",
  },
  {
    value: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Strongest reasoning & complex queries",
    tier: "premium",
  },
  {
    value: "google/gemini-3-pro-preview",
    label: "Gemini 3 Pro (Preview)",
    description: "Next-gen pro reasoning",
    tier: "new",
  },
  {
    value: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    description: "Fastest & cheapest — simple workloads",
    tier: "economy",
  },
  {
    value: "openai/gpt-5",
    label: "GPT-5",
    description: "Powerful all-rounder, excellent reasoning",
    tier: "premium",
  },
  {
    value: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    description: "Strong performance at lower cost",
    tier: "recommended",
  },
  {
    value: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    description: "Speed & cost optimised for high-volume",
    tier: "economy",
  },
  {
    value: "openai/gpt-5.2",
    label: "GPT-5.2",
    description: "Latest with enhanced reasoning",
    tier: "new",
  },
] as const;

const tierColors: Record<string, string> = {
  recommended: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  premium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  economy: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  new: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function LLMModelSelector() {
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentModel();
  }, []);

  const loadCurrentModel = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bob_llm_config")
      .select("id, model")
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      setCurrentModel(data.model);
      setSelectedModel(data.model || "");
      setConfigId(data.id);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!configId || selectedModel === currentModel) return;
    setSaving(true);

    const { error } = await supabase
      .from("bob_llm_config")
      .update({ model: selectedModel, updated_at: new Date().toISOString() })
      .eq("id", configId);

    if (error) {
      toast({ title: "Failed to update model", description: error.message, variant: "destructive" });
    } else {
      setCurrentModel(selectedModel);
      toast({ title: "AI model updated", description: `Bob is now powered by ${AVAILABLE_MODELS.find(m => m.value === selectedModel)?.label}` });
    }
    setSaving(false);
  };

  const hasChanges = selectedModel !== currentModel;
  const selectedInfo = AVAILABLE_MODELS.find(m => m.value === selectedModel);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Model
        </CardTitle>
        <CardDescription>
          Choose which AI model powers Bob's conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex items-center gap-2">
                  <span>{model.label}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tierColors[model.tier]}`}>
                    {model.tier}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedInfo && (
          <p className="text-sm text-muted-foreground">
            {selectedInfo.description}
          </p>
        )}

        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {saving ? "Updating..." : "Apply Model Change"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
