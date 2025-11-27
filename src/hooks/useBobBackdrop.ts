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
}

export const useBobBackdrop = () => {
  const queryClient = useQueryClient();

  // Fetch all backdrops
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

  // Get active backdrop
  const activeBackdrop = backdrops.find((b) => b.is_active);

  // Upload and create backdrop
  const uploadBackdrop = useMutation({
    mutationFn: async ({
      file,
      name,
    }: {
      file: File;
      name: string;
    }) => {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `backdrops/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bob-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("bob-images").getPublicUrl(filePath);

      // Insert into database
      const { data, error } = await supabase
        .from("bob_backdrops")
        .insert({
          name,
          image_url: publicUrl,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Backdrop uploaded successfully");
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Set active backdrop
  const setActiveBackdrop = useMutation({
    mutationFn: async (backdropId: string | null) => {
      // First deactivate all
      await supabase
        .from("bob_backdrops")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Then activate the selected one (if not null)
      if (backdropId) {
        const { error } = await supabase
          .from("bob_backdrops")
          .update({ is_active: true })
          .eq("id", backdropId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Backdrop updated");
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Delete backdrop
  const deleteBackdrop = useMutation({
    mutationFn: async (backdropId: string) => {
      const backdrop = backdrops.find((b) => b.id === backdropId);
      if (!backdrop) throw new Error("Backdrop not found");

      // Delete from storage
      const path = backdrop.image_url.split("/backdrops/")[1];
      if (path) {
        await supabase.storage.from("bob-images").remove([`backdrops/${path}`]);
      }

      // Delete from database
      const { error } = await supabase
        .from("bob_backdrops")
        .delete()
        .eq("id", backdropId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bob-backdrops"] });
      toast.success("Backdrop deleted");
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  return {
    backdrops,
    activeBackdrop,
    isLoading,
    uploadBackdrop: uploadBackdrop.mutate,
    setActiveBackdrop: setActiveBackdrop.mutate,
    deleteBackdrop: deleteBackdrop.mutate,
  };
};
