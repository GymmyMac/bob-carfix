import { useQuery } from "@tanstack/react-query";
import { useBobSupabase } from "../BobProvider";

export interface SparkDeal {
  id: string;
  brand: string;
  product_name: string;
  price: number;
  original_price?: number;
  image_url?: string;
  sku: string;
  category?: string;
  valid_until?: string;
}

interface SparkDealsResponse {
  success: boolean;
  deals: SparkDeal[];
  source?: 'partner_api' | 'featured' | 'demo';
  error?: string;
}

interface SparkDealsSettings {
  enabled: boolean;
  inRain: boolean;
  rainFrequency: number;
  primingEnabled: boolean;
  bannerEnabled: boolean;
  delayMs: number;
  scrollSpeed: number;
  maxPerSession: number;
  minResearchTime: number;
  bobCommentary: boolean;
}

const DEFAULT_SETTINGS: SparkDealsSettings = {
  enabled: true,
  inRain: true,
  rainFrequency: 0.15,
  primingEnabled: true,
  bannerEnabled: true,
  delayMs: 2000,
  scrollSpeed: 5000,
  maxPerSession: 3,
  minResearchTime: 1500,
  bobCommentary: false,
};

export function useSparkDealsSettings() {
  const supabase = useBobSupabase();

  return useQuery<SparkDealsSettings>({
    queryKey: ['spark-deals-settings'],
    queryFn: async () => {
      if (!supabase) {
        return DEFAULT_SETTINGS;
      }

      const { data, error } = await supabase
        .from('bob_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'spark_deals_%');

      if (error) {
        console.error('[useSparkDealsSettings] Error:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data || data.length === 0) {
        return DEFAULT_SETTINGS;
      }

      const settingsMap = new Map(data.map(s => [s.setting_key, s.setting_value]));

      return {
        enabled: settingsMap.get('spark_deals_enabled') === 'true',
        inRain: settingsMap.get('spark_deals_in_rain') === 'true',
        rainFrequency: parseFloat(settingsMap.get('spark_deals_rain_frequency') || '0.15'),
        primingEnabled: settingsMap.get('spark_deals_priming_enabled') === 'true',
        bannerEnabled: settingsMap.get('spark_deals_banner_enabled') === 'true',
        delayMs: parseInt(settingsMap.get('spark_deals_delay_ms') || '2000', 10),
        scrollSpeed: parseInt(settingsMap.get('spark_deals_scroll_speed') || '5000', 10),
        maxPerSession: parseInt(settingsMap.get('spark_deals_max_per_session') || '3', 10),
        minResearchTime: parseInt(settingsMap.get('spark_deals_min_research_time') || '1500', 10),
        bobCommentary: settingsMap.get('spark_deals_bob_commentary') === 'true',
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSparkDeals(enabled: boolean = true) {
  const supabase = useBobSupabase();

  return useQuery<SparkDeal[]>({
    queryKey: ['spark-deals'],
    queryFn: async () => {
      if (!supabase) {
        console.log('[useSparkDeals] No supabase client');
        return [];
      }

      try {
        const projectUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!projectUrl) {
          console.error('[useSparkDeals] Missing VITE_SUPABASE_URL');
          return [];
        }

        const response = await fetch(`${projectUrl}/functions/v1/spark-deals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ limit: 5 }),
        });

        if (!response.ok) {
          console.error('[useSparkDeals] Fetch failed:', response.status);
          return [];
        }

        const data: SparkDealsResponse = await response.json();
        
        if (!data.success) {
          console.error('[useSparkDeals] API error:', data.error);
          return [];
        }

        console.log(`[useSparkDeals] Loaded ${data.deals.length} deals from ${data.source}`);
        return data.deals;
      } catch (error) {
        console.error('[useSparkDeals] Error:', error);
        return [];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// Helper to extract words for matrix rain
export function getSparkDealWords(deals: SparkDeal[]): string[] {
  const words: string[] = [];
  deals.forEach(deal => {
    // Price
    words.push(`$${deal.price.toFixed(0)}`);
    // Brand (uppercase for visibility)
    if (deal.brand) {
      words.push(deal.brand.toUpperCase());
    }
    // First word of product name
    const firstWord = deal.product_name.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      words.push(firstWord.toUpperCase());
    }
  });
  return words;
}
