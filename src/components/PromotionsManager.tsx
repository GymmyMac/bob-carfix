import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Tag, Clock } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";

interface Promotion {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  sku_list: string[] | null;
  discount_percent: number | null;
  talk_track: string;
  priority: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export const PromotionsManager = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    brand: "",
    category: "",
    discount_percent: "",
    talk_track: "",
    priority: 20,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: "",
  });
  const { toast } = useToast();

  const fetchPromotions = async () => {
    const { data, error } = await supabase
      .from("bob_promotions")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ title: "Failed to load promotions", variant: "destructive" });
    } else {
      setPromotions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPromotions(); }, []);

  const handleCreate = async () => {
    if (!newItem.title || !newItem.talk_track || !newItem.valid_until) {
      toast({ title: "Title, talk track, and end date are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("bob_promotions").insert({
      title: newItem.title,
      brand: newItem.brand || null,
      category: newItem.category || null,
      discount_percent: newItem.discount_percent ? parseFloat(newItem.discount_percent) : null,
      talk_track: newItem.talk_track,
      priority: newItem.priority,
      valid_from: new Date(newItem.valid_from).toISOString(),
      valid_until: new Date(newItem.valid_until).toISOString(),
    });
    if (error) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Promotion created" });
      setShowNew(false);
      setNewItem({ title: "", brand: "", category: "", discount_percent: "", talk_track: "", priority: 20, valid_from: new Date().toISOString().slice(0, 10), valid_until: "" });
      fetchPromotions();
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    setSaving(id);
    await supabase.from("bob_promotions").update({ is_active }).eq("id", id);
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active } : p));
    setSaving(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bob_promotions").delete().eq("id", id);
    if (!error) {
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const getExpiryBadge = (validUntil: string, isActive: boolean) => {
    const until = new Date(validUntil);
    if (isPast(until)) return <Badge variant="destructive">Expired</Badge>;
    const days = differenceInDays(until, new Date());
    if (days <= 3) return <Badge variant="destructive">{days}d left</Badge>;
    if (days <= 7) return <Badge className="bg-amber-500 text-white">{days}d left</Badge>;
    return <Badge variant="secondary">{days}d left</Badge>;
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Promotions
              </CardTitle>
              <CardDescription>Time-limited deals that override default recommendations.</CardDescription>
            </div>
            <Button onClick={() => setShowNew(!showNew)} size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Add Promotion
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNew && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label>Title *</Label>
                  <Input placeholder="February Penrite Oil Sale" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Brand (optional)</Label>
                    <Input placeholder="PENRITE" value={newItem.brand} onChange={e => setNewItem(p => ({ ...p, brand: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Category (optional)</Label>
                    <Input placeholder="ENGINE OIL" value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Discount %</Label>
                    <Input type="number" placeholder="20" value={newItem.discount_percent} onChange={e => setNewItem(p => ({ ...p, discount_percent: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={newItem.valid_from} onChange={e => setNewItem(p => ({ ...p, valid_from: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" value={newItem.valid_until} onChange={e => setNewItem(p => ({ ...p, valid_until: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Input type="number" value={newItem.priority} onChange={e => setNewItem(p => ({ ...p, priority: parseInt(e.target.value) || 20 }))} />
                  </div>
                </div>
                <div>
                  <Label>Talk Track *</Label>
                  <Textarea placeholder="We've got 20% off Penrite this month" value={newItem.talk_track} onChange={e => setNewItem(p => ({ ...p, talk_track: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} size="sm"><Save className="w-4 h-4 mr-1" /> Save</Button>
                  <Button onClick={() => setShowNew(false)} variant="ghost" size="sm">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {promotions.length === 0 && !showNew && (
            <p className="text-center text-muted-foreground py-4">No promotions configured yet.</p>
          )}

          {promotions.map(p => (
            <Card key={p.id} className={!p.is_active || isPast(new Date(p.valid_until)) ? "opacity-60" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{p.title}</span>
                      {p.brand && <Badge variant="secondary">{p.brand}</Badge>}
                      {p.category && <Badge variant="outline">{p.category}</Badge>}
                      {p.discount_percent && <Badge className="bg-green-600 text-white">{p.discount_percent}% off</Badge>}
                      {getExpiryBadge(p.valid_until, p.is_active)}
                      <Badge variant="outline" className="text-xs">P{p.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{p.talk_track}"</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(p.valid_from), "dd MMM")} – {format(new Date(p.valid_until), "dd MMM yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={v => handleToggle(p.id, v)}
                      disabled={saving === p.id}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
