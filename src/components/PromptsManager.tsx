import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/backend/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, RefreshCw, FileText, AlertCircle, ChevronDown, ChevronUp, Download, Upload, Copy } from "lucide-react";
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
  tenant_id: string | null;
}

interface Tenant {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, Partial<BobPrompt>>>({});
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from("bob_tenants")
        .select("id, name, code, is_active")
        .order("name");
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bob_prompts")
        .select("*")
        .order("display_order", { ascending: true });
      
      // Filter by tenant
      if (selectedTenantId === "default") {
        query = query.is("tenant_id", null);
      } else {
        query = query.eq("tenant_id", selectedTenantId);
      }

      const { data, error } = await query;

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
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [selectedTenantId]);

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

  // Export prompts as JSON
  const exportPrompts = () => {
    const exportData = prompts.map(({ id, created_at, updated_at, tenant_id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bob-prompts-${selectedTenantId === "default" ? "defaults" : tenants.find(t => t.id === selectedTenantId)?.code || selectedTenantId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Prompts exported");
  };

  // Import prompts from JSON
  const importPrompts = async (file: File) => {
    try {
      const text = await file.text();
      const importedPrompts = JSON.parse(text) as Array<{
        prompt_key: string;
        title: string;
        description?: string;
        content: string;
        category: string;
        display_order: number;
        is_active: boolean;
      }>;
      
      const tenantIdToUse = selectedTenantId === "default" ? null : selectedTenantId;
      
      for (const prompt of importedPrompts) {
        // Check if exists first
        const { data: existing } = await supabase
          .from("bob_prompts")
          .select("id")
          .eq("prompt_key", prompt.prompt_key)
          .eq("tenant_id", tenantIdToUse as string)
          .maybeSingle();
        
        if (existing) {
          // Update existing
          await supabase.from("bob_prompts").update({
            ...prompt,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          // Insert new
          await supabase.from("bob_prompts").insert({
            ...prompt,
            tenant_id: tenantIdToUse,
          });
        }
      }
      
      toast.success(`Imported ${importedPrompts.length} prompts`);
      fetchPrompts();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import prompts");
    }
  };

  // Copy defaults to current tenant
  const copyFromDefaults = async () => {
    if (selectedTenantId === "default") {
      toast.error("Already viewing defaults");
      return;
    }
    
    try {
      // Fetch default prompts
      const { data: defaults, error: fetchError } = await supabase
        .from("bob_prompts")
        .select("*")
        .is("tenant_id", null);
      
      if (fetchError) throw fetchError;
      
      // Insert as tenant-specific
      for (const prompt of defaults || []) {
        const { id, created_at, updated_at, tenant_id, ...rest } = prompt;
        await supabase.from("bob_prompts").insert({
          ...rest,
          tenant_id: selectedTenantId,
        });
      }
      
      toast.success(`Copied ${defaults?.length || 0} prompts from defaults`);
      fetchPrompts();
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy prompts");
    }
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

  const selectedTenantName = selectedTenantId === "default" 
    ? "Default Templates" 
    : tenants.find(t => t.id === selectedTenantId)?.name || "Unknown";

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
              {/* Tenant Selector */}
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Template</Badge>
                      Default Templates
                    </span>
                  </SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant={tenant.is_active ? "default" : "secondary"} className="text-xs">
                          {tenant.code}
                        </Badge>
                        {tenant.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
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
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportPrompts}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && importPrompts(e.target.files[0])}
                  />
                </label>
              </Button>
              {selectedTenantId !== "default" && (
                <Button variant="outline" size="sm" onClick={copyFromDefaults}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Defaults
                </Button>
              )}
              {totalChanges > 0 && (
                <Button onClick={saveAllChanges} size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  Save All ({totalChanges})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Info Banner */}
      {selectedTenantId !== "default" && prompts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No custom prompts for <strong>{selectedTenantName}</strong>. 
              This tenant will use the default templates.
            </p>
            <Button onClick={copyFromDefaults}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Defaults to Create Custom Prompts
            </Button>
          </CardContent>
        </Card>
      )}

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
              <p className="font-medium mb-1">How multi-tenant prompts work:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Default Templates</strong> (tenant_id = NULL) apply to all tenants without custom prompts</li>
                <li>Tenant-specific prompts override defaults for that tenant only</li>
                <li>Use <strong>Export/Import</strong> to sync prompts between Lovable instances</li>
                <li>Use <strong>Copy Defaults</strong> to create tenant-specific copies you can customize</li>
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
