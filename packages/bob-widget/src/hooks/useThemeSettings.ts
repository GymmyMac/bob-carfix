import { useQuery } from "@tanstack/react-query";
import { useBobSupabase } from "../BobProvider";

export interface ThemeSetting {
  id: string;
  setting_key: string;
  color_value: string;
  hex_preview: string | null;
  description: string | null;
}

export interface MatrixTheme {
  primary: string;       // HSL: "216 100% 40%"
  secondary: string;     // HSL: "199 95% 74%"
  success: string;       // HSL: "33 100% 50%"
  background: string;    // HSL: "223 46% 13%"
  backgroundMode: 'dark' | 'light';
  sparkDealColor: string; // HSL: "33 100% 50%"
  // Computed hex values for canvas
  primaryHex: string;
  secondaryHex: string;
  successHex: string;
  backgroundHex: string;
  sparkDealHex: string;
}

// Default CARFIX theme
const DEFAULT_THEME: MatrixTheme = {
  primary: '216 100% 40%',
  secondary: '199 95% 74%',
  success: '33 100% 50%',
  background: '223 46% 13%',
  backgroundMode: 'dark',
  sparkDealColor: '33 100% 50%',
  primaryHex: '#0066CC',
  secondaryHex: '#7DD3FC',
  successHex: '#FF9500',
  backgroundHex: '#111827',
  sparkDealHex: '#FF9500',
};

// HSL string to hex converter
function hslToHex(hsl: string): string {
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return '#000000';
  
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function useThemeSettings() {
  const supabase = useBobSupabase();

  return useQuery<MatrixTheme>({
    queryKey: ['bob-theme-settings'],
    queryFn: async () => {
      if (!supabase) {
        console.log('[useThemeSettings] No supabase client, using defaults');
        return DEFAULT_THEME;
      }

      const { data, error } = await supabase
        .from('bob_theme_settings')
        .select('setting_key, color_value, hex_preview')
        .in('setting_key', [
          'matrix_primary',
          'matrix_secondary', 
          'matrix_success',
          'matrix_background',
          'matrix_background_mode',
          'matrix_spark_deal_color'
        ]);

      if (error) {
        console.error('[useThemeSettings] Error fetching:', error);
        return DEFAULT_THEME;
      }

      if (!data || data.length === 0) {
        return DEFAULT_THEME;
      }

      const settingsMap = new Map(data.map(s => [s.setting_key, s]));

      const primary = settingsMap.get('matrix_primary')?.color_value || DEFAULT_THEME.primary;
      const secondary = settingsMap.get('matrix_secondary')?.color_value || DEFAULT_THEME.secondary;
      const success = settingsMap.get('matrix_success')?.color_value || DEFAULT_THEME.success;
      const background = settingsMap.get('matrix_background')?.color_value || DEFAULT_THEME.background;
      const sparkDealColor = settingsMap.get('matrix_spark_deal_color')?.color_value || DEFAULT_THEME.sparkDealColor;
      const backgroundMode = (settingsMap.get('matrix_background_mode')?.color_value || 'dark') as 'dark' | 'light';

      return {
        primary,
        secondary,
        success,
        background,
        backgroundMode,
        sparkDealColor,
        primaryHex: settingsMap.get('matrix_primary')?.hex_preview || hslToHex(primary),
        secondaryHex: settingsMap.get('matrix_secondary')?.hex_preview || hslToHex(secondary),
        successHex: settingsMap.get('matrix_success')?.hex_preview || hslToHex(success),
        backgroundHex: settingsMap.get('matrix_background')?.hex_preview || hslToHex(background),
        sparkDealHex: settingsMap.get('matrix_spark_deal_color')?.hex_preview || hslToHex(sparkDealColor),
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Export helper for getting CSS variables
export function getThemeCssVars(theme: MatrixTheme): Record<string, string> {
  return {
    '--matrix-primary': theme.primary,
    '--matrix-secondary': theme.secondary,
    '--matrix-success': theme.success,
    '--matrix-background': theme.background,
    '--matrix-spark-deal': theme.sparkDealColor,
  };
}
