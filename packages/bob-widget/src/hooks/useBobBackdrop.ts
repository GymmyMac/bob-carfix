import { useQuery } from "@tanstack/react-query";
import { useBobSupabaseSafe } from "../BobProvider";

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
  const supabase = useBobSupabaseSafe();

  const { data: backdrops = [], isLoading } = useQuery({
    queryKey: ["bob-backdrops"],
    queryFn: async () => {
      if (!supabase) {
        console.log('[useBobBackdrop] No supabase client, returning empty');
        return [];
      }

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

  return {
    backdrops,
    activeBackdrop,
    isLoading,
  };
};
