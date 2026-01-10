/**
 * useBobBackdrop - Full-featured demo app hook with CRUD operations
 * This is a standalone hook for the demo app, NOT a re-export from widget
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BobBackdrop {
  id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  counter_overlay_url: string | null;
  counter_height_percent: number | null;
}

export const useBobBackdrop = () => {
  const queryClient = useQueryClient();

  const { data: backdrops = [], isLoading } = useQuery({
    queryKey: ["bob-backdrops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bob_backdrops")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as BobBackdrop[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const activeBackdrop = backdrops.find((b) => b.is_active);

  const uploadBackdropMutation = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `backdrops/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bob-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("bob-assets")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("bob_backdrops")
        .insert({
          name,
          image_url: publicUrl,
          is_active: false,
          display_order: backdrops.length,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Backdrop uploaded successfully");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload backdrop");
    },
  });

  const setActiveBackdropMutation = useMutation({
    mutationFn: async (id: string | null) => {
      // First, set all backdrops to inactive
      await supabase
        .from("bob_backdrops")
        .update({ is_active: false })
        .neq("id", "");

      // Then set the selected one as active
      if (id) {
        const { error } = await supabase
          .from("bob_backdrops")
          .update({ is_active: true })
          .eq("id", id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Active backdrop updated");
    },
    onError: (error) => {
      console.error("Set active error:", error);
      toast.error("Failed to update active backdrop");
    },
  });

  const deleteBackdropMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bob_backdrops")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Backdrop deleted");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete backdrop");
    },
  });

  return {
    backdrops,
    activeBackdrop,
    isLoading,
    uploadBackdrop: uploadBackdropMutation.mutate,
    setActiveBackdrop: setActiveBackdropMutation.mutate,
    deleteBackdrop: deleteBackdropMutation.mutate,
  };
};
