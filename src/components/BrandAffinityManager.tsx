import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Heart } from "lucide-react";

interface BrandAffinity {
  id: string;
  brand: string;
  category: string | null;
  affinity_level: string;
  talk_track: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export const BrandAffinityManager = () => {
  const [affinities, setAffinities] = useState<BrandAffinity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({
    brand: "",
    category: "",
    affinity_level: "preferred",
    talk_track: "",
    priority: 10,
  });
  const { toast } = useToast();

  const fetchAffinities = async () => {
    const { data, error } = await supabase
      .from("bob_brand_affinity")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ title: "Failed to load brand affinities", variant: "destructive" });
    } else {
      setAffinities(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAffinities(); }, []);

  const handleCreate = async () => {
    if (!newItem.brand || !newItem.talk_track) {
      toast({ title: "Brand and talk track are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("bob_brand_affinity").insert({
      brand: newItem.brand.toUpperCase(),
      category: newItem.category || null,
      affinity_level: newItem.affinity_level,
      talk_track: newItem.talk_track,
      priority: newItem.priority,
    });
    if (error) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Brand affinity created" });
      setShowNew(false);
      setNewItem({ brand: "", category: "", affinity_level: "preferred", talk_track: "", priority: 10 });
      fetchAffinities();
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    setSaving(id);
    await supabase.from("bob_brand_affinity").update({ is_active }).eq("id", id);
    setAffinities(prev => prev.map(a => a.id === id ? { ...a, is_active } : a));
    setSaving(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bob_brand_affinity").delete().eq("id", id);
    if (!error) {
      setAffinities(prev => prev.filter(a => a.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<BrandAffinity>) => {
    setSaving(id);
    const { error } = await supabase.from("bob_brand_affinity").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      fetchAffinities();
      toast({ title: "Updated" });
    }
    setSaving(null);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Brand Affinity
              </CardTitle>
              <CardDescription>Always-on preferred brands. Bob leans into these across all conversations.</CardDescription>
            </div>
            <Button onClick={() => setShowNew(!showNew)} size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Add Brand
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNew && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand *</Label>
                    <Input placeholder="RDA" value={newItem.brand} onChange={e => setNewItem(p => ({ ...p, brand: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Category (optional)</Label>
                    <Input placeholder="BRAKE ROTORS" value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Affinity Level</Label>
                    <Select value={newItem.affinity_level} onValueChange={v => setNewItem(p => ({ ...p, affinity_level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preferred">Preferred</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="house_brand">House Brand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Input type="number" value={newItem.priority} onChange={e => setNewItem(p => ({ ...p, priority: parseInt(e.target.value) || 10 }))} />
                  </div>
                </div>
                <div>
                  <Label>Talk Track *</Label>
                  <Textarea placeholder="RDA are our pick for rotors -- precision-machined and built to last" value={newItem.talk_track} onChange={e => setNewItem(p => ({ ...p, talk_track: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} size="sm"><Save className="w-4 h-4 mr-1" /> Save</Button>
                  <Button onClick={() => setShowNew(false)} variant="ghost" size="sm">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {affinities.length === 0 && !showNew && (
            <p className="text-center text-muted-foreground py-4">No brand affinities configured yet.</p>
          )}

          {affinities.map(a => (
            <Card key={a.id} className={!a.is_active ? "opacity-60" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{a.brand}</span>
                      {a.category && <Badge variant="secondary">{a.category}</Badge>}
                      <Badge variant="outline">{a.affinity_level}</Badge>
                      <Badge variant="outline" className="text-xs">P{a.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{a.talk_track}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={v => handleToggle(a.id, v)}
                      disabled={saving === a.id}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
