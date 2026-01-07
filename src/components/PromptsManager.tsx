import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RefreshCw, FileText, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BobPrompt {
  id: string;
  prompt_key: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  personality: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  rules: "bg-red-500/20 text-red-700 border-red-500/30",
  workflow: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  sales: "bg-green-500/20 text-green-700 border-green-500/30",
  general: "bg-gray-500/20 text-gray-700 border-gray-500/30",
};

export const PromptsManager: React.FC = () => {
  const [prompts, setPrompts] = useState<BobPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, Partial<BobPrompt>>>({});
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bob_prompts")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPrompts(data || []);
      setEditedPrompts({});
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleEdit = (id: string, field: keyof BobPrompt, value: string | boolean) => {
    setEditedPrompts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getEditedValue = (prompt: BobPrompt, field: keyof BobPrompt) => {
    return editedPrompts[prompt.id]?.[field] ?? prompt[field];
  };

  const hasChanges = (id: string) => {
    return Object.keys(editedPrompts[id] || {}).length > 0;
  };

  const savePrompt = async (prompt: BobPrompt) => {
    if (!hasChanges(prompt.id)) return;

    setSaving(prompt.id);
    try {
      const updates = editedPrompts[prompt.id];
      const { error } = await supabase
        .from("bob_prompts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", prompt.id);

      if (error) throw error;

      // Update local state
      setPrompts((prev) =>
        prev.map((p) => (p.id === prompt.id ? { ...p, ...updates } : p))
      );
      setEditedPrompts((prev) => {
        const newState = { ...prev };
        delete newState[prompt.id];
        return newState;
      });

      toast.success(`Saved "${prompt.title}"`);
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error("Failed to save prompt");
    } finally {
      setSaving(null);
    }
  };

  const saveAllChanges = async () => {
    const changedPrompts = prompts.filter((p) => hasChanges(p.id));
    for (const prompt of changedPrompts) {
      await savePrompt(prompt);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPrompts(new Set(prompts.map((p) => p.id)));
  };

  const collapseAll = () => {
    setExpandedPrompts(new Set());
  };

  const totalChanges = Object.keys(editedPrompts).filter(
    (id) => Object.keys(editedPrompts[id]).length > 0
  ).length;

  // Group prompts by category
  const groupedPrompts = prompts.reduce((acc, prompt) => {
    const category = prompt.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(prompt);
    return acc;
  }, {} as Record<string, BobPrompt[]>);

  const categoryOrder = ["personality", "rules", "workflow", "sales", "general"];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading prompts...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Bob's Prompts & Instructions
              </CardTitle>
              <CardDescription>
                Edit Bob's personality, rules, and sales behaviors. Changes take effect immediately.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              <Button variant="outline" size="sm" onClick={fetchPrompts}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              {totalChanges > 0 && (
                <Button onClick={saveAllChanges} size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  Save All ({totalChanges})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Prompts by Category */}
      {categoryOrder.map((category) => {
        const categoryPrompts = groupedPrompts[category];
        if (!categoryPrompts || categoryPrompts.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`capitalize ${CATEGORY_COLORS[category] || CATEGORY_COLORS.general}`}
              >
                {category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {categoryPrompts.length} prompt{categoryPrompts.length !== 1 ? "s" : ""}
              </span>
            </div>

            {categoryPrompts.map((prompt) => (
              <Collapsible
                key={prompt.id}
                open={expandedPrompts.has(prompt.id)}
                onOpenChange={() => toggleExpanded(prompt.id)}
              >
                <Card className={hasChanges(prompt.id) ? "ring-2 ring-primary/50" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedPrompts.has(prompt.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {getEditedValue(prompt, "title") as string}
                              {hasChanges(prompt.id) && (
                                <Badge variant="secondary" className="text-xs">
                                  Unsaved
                                </Badge>
                              )}
                              {!prompt.is_active && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Disabled
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {prompt.description || prompt.prompt_key}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {prompt.prompt_key}
                          </code>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <Separator />

                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={getEditedValue(prompt, "is_active") as boolean}
                              onCheckedChange={(checked) =>
                                handleEdit(prompt.id, "is_active", checked)
                              }
                            />
                            <Label className="text-sm">Active</Label>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Updated: {new Date(prompt.updated_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`title-${prompt.id}`}>Title</Label>
                          <Input
                            id={`title-${prompt.id}`}
                            value={getEditedValue(prompt, "title") as string}
                            onChange={(e) => handleEdit(prompt.id, "title", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`desc-${prompt.id}`}>Description</Label>
                          <Input
                            id={`desc-${prompt.id}`}
                            value={(getEditedValue(prompt, "description") as string) || ""}
                            onChange={(e) => handleEdit(prompt.id, "description", e.target.value)}
                            placeholder="Brief description of this prompt section"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`content-${prompt.id}`}>Content</Label>
                          <Textarea
                            id={`content-${prompt.id}`}
                            value={getEditedValue(prompt, "content") as string}
                            onChange={(e) => handleEdit(prompt.id, "content", e.target.value)}
                            className="min-h-[200px] font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            This content is appended to Bob's system prompt.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        {hasChanges(prompt.id) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setEditedPrompts((prev) => {
                                  const newState = { ...prev };
                                  delete newState[prompt.id];
                                  return newState;
                                })
                              }
                            >
                              Discard
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => savePrompt(prompt)}
                              disabled={saving === prompt.id}
                            >
                              {saving === prompt.id ? "Saving..." : "Save Changes"}
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        );
      })}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">How prompts work:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>All active prompts are combined into Bob's system instructions</li>
                <li>The order is determined by display_order (lower = first)</li>
                <li>Disable a prompt to temporarily remove it without deleting</li>
                <li>Changes take effect on the next conversation (no page refresh needed)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptsManager;
