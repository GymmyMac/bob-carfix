import { useState } from "react";
import { Plus, Trash2, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface BobLook {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface LooksManagerProps {
  looks: BobLook[];
  selectedLookId: string | null;
  onSelectLook: (lookId: string) => void;
  onRefresh: () => void;
}

export const LooksManager = ({
  looks,
  selectedLookId,
  onSelectLook,
  onRefresh,
}: LooksManagerProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLookName, setNewLookName] = useState("");
  const [newLookDescription, setNewLookDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const { toast } = useToast();

  const activeLook = looks.find((l) => l.is_active);
  const selectedLook = looks.find((l) => l.id === selectedLookId);

  const handleCreateLook = async () => {
    if (!newLookName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the new look.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const maxOrder = Math.max(...looks.map((l) => l.display_order), 0);
      
      const { data, error } = await supabase
        .from("bob_looks")
        .insert({
          name: newLookName.trim(),
          description: newLookDescription.trim() || null,
          display_order: maxOrder + 1,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Look created",
        description: `"${newLookName}" has been created. Start uploading images!`,
      });

      setNewLookName("");
      setNewLookDescription("");
      setCreateDialogOpen(false);
      onRefresh();
      
      // Auto-select the new look
      if (data) {
        onSelectLook(data.id);
      }
    } catch (error: any) {
      console.error("Error creating look:", error);
      toast({
        title: "Failed to create look",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLook = async (lookId: string) => {
    const look = looks.find((l) => l.id === lookId);
    if (!look) return;

    if (look.is_active) {
      toast({
        title: "Cannot delete active look",
        description: "Please activate a different look first.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete cascades to animation_states and bob_animations
      const { error } = await supabase
        .from("bob_looks")
        .delete()
        .eq("id", lookId);

      if (error) throw error;

      toast({
        title: "Look deleted",
        description: `"${look.name}" and all its states/images have been removed.`,
      });

      onRefresh();
      
      // If we deleted the selected look, select the active one
      if (selectedLookId === lookId && activeLook) {
        onSelectLook(activeLook.id);
      }
    } catch (error: any) {
      console.error("Error deleting look:", error);
      toast({
        title: "Failed to delete look",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetActiveLook = async (lookId: string) => {
    const look = looks.find((l) => l.id === lookId);
    if (!look || look.is_active) return;

    setIsActivating(true);
    try {
      // Deactivate all other looks
      const { error: deactivateError } = await supabase
        .from("bob_looks")
        .update({ is_active: false })
        .neq("id", lookId);

      if (deactivateError) throw deactivateError;

      // Activate the selected look
      const { error: activateError } = await supabase
        .from("bob_looks")
        .update({ is_active: true })
        .eq("id", lookId);

      if (activateError) throw activateError;

      toast({
        title: "Look activated",
        description: `"${look.name}" is now live on the site.`,
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error activating look:", error);
      toast({
        title: "Failed to activate look",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          Bob Looks Manager
        </CardTitle>
        <CardDescription>
          Create and manage different visual themes for Bob
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Look Selector */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium mb-1.5 block">Select Look to Edit</Label>
            <Select
              value={selectedLookId || ""}
              onValueChange={onSelectLook}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a look..." />
              </SelectTrigger>
              <SelectContent>
                {looks
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((look) => (
                    <SelectItem key={look.id} value={look.id}>
                      <div className="flex items-center gap-2">
                        <span>{look.name}</span>
                        {look.is_active && (
                          <Badge variant="default" className="text-xs px-1 py-0">
                            LIVE
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create New Look */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                New Look
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Bob Look</DialogTitle>
                <DialogDescription>
                  Create a new visual theme for Bob. You can upload images after creating the look.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="look-name">Name</Label>
                  <Input
                    id="look-name"
                    value={newLookName}
                    onChange={(e) => setNewLookName(e.target.value)}
                    placeholder="e.g., Christmas Bob, Summer Bob"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="look-description">Description (optional)</Label>
                  <Input
                    id="look-description"
                    value={newLookDescription}
                    onChange={(e) => setNewLookDescription(e.target.value)}
                    placeholder="e.g., Holiday themed Bob with Santa hat"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLook} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Look"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Set as Active */}
          {selectedLook && !selectedLook.is_active && (
            <Button
              variant="default"
              className="gap-2"
              onClick={() => handleSetActiveLook(selectedLookId!)}
              disabled={isActivating}
            >
              <Check className="w-4 h-4" />
              {isActivating ? "Activating..." : "Set as Live"}
            </Button>
          )}

          {/* Delete Look */}
          {selectedLook && !selectedLook.is_active && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{selectedLook.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this look and all its animation states and images.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteLook(selectedLookId!)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Look
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Active Look Status */}
        {activeLook && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Check className="w-4 h-4 text-green-500" />
            <span>
              Currently live: <strong className="text-foreground">{activeLook.name}</strong>
            </span>
            {selectedLook && selectedLook.id !== activeLook.id && (
              <span className="text-yellow-600">
                (editing: {selectedLook.name})
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
