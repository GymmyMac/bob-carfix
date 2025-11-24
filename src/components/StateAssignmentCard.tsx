import { useState } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimationState } from "@/hooks/useBobAnimation";
import { BobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useToast } from "@/hooks/use-toast";

interface StateAssignmentCardProps {
  state: AnimationState;
  title: string;
  description: string;
  assignments: BobAnimationConfig[];
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onReorder: (id: string, newOrder: number) => Promise<void>;
}

export const StateAssignmentCard = ({
  state,
  title,
  description,
  assignments,
  onDelete,
  onToggleActive,
  onReorder,
}: StateAssignmentCardProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    setLoading(id);
    try {
      await onDelete(id);
      toast({ title: "Image removed" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setLoading(id);
    try {
      await onToggleActive(id, !currentActive);
      toast({
        title: currentActive ? "Image deactivated" : "Image activated",
      });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({
        title: "Failed to update",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = assignments.findIndex((a) => a.id === id);
    if (currentIndex === -1) return;

    const newOrder =
      direction === "up"
        ? assignments[currentIndex].sequence_order - 1
        : assignments[currentIndex].sequence_order + 1;

    if (newOrder < 1 || newOrder > assignments.length) return;

    setLoading(id);
    try {
      await onReorder(id, newOrder);
    } catch (error) {
      console.error("Reorder error:", error);
      toast({
        title: "Failed to reorder",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No images assigned to this state
          </p>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id}
                className={`flex items-center gap-4 p-4 border rounded-lg transition-opacity ${
                  !assignment.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={assignment.image_url}
                    alt={`${state} ${assignment.sequence_order}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Sequence {assignment.sequence_order}
                  </p>
                  {assignment.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {assignment.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {assignment.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {assignments.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReorder(assignment.id, "up")}
                        disabled={index === 0 || loading === assignment.id}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReorder(assignment.id, "down")}
                        disabled={
                          index === assignments.length - 1 ||
                          loading === assignment.id
                        }
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleToggleActive(assignment.id, assignment.is_active)
                    }
                    disabled={loading === assignment.id}
                  >
                    <span className="text-xs">
                      {assignment.is_active ? "Hide" : "Show"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(assignment.id)}
                    disabled={loading === assignment.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
