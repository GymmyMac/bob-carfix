import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Palette, RotateCcw, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/backend/client";

interface ThemeSetting {
  id: string;
  setting_key: string;
  color_value: string;
  hex_preview: string | null;
  description: string | null;
}

interface ColorInputProps {
  label: string;
  value: string;
  hexValue: string;
  onChange: (hex: string, hsl: string) => void;
  description?: string;
}

// Convert hex to HSL string
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, hexValue, onChange, description }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => {
              const hex = e.target.value;
              const hsl = hexToHsl(hex);
              onChange(hex, hsl);
            }}
            className="w-10 h-10 rounded-lg border cursor-pointer"
          />
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {hexValue}
          </code>
        </div>
      </div>
    </div>
  );
};

// Default CARFIX theme values
const DEFAULT_THEME = {
  matrix_primary: { hsl: '216 100% 40%', hex: '#0066CC' },
  matrix_secondary: { hsl: '199 95% 74%', hex: '#7DD3FC' },
  matrix_success: { hsl: '33 100% 50%', hex: '#FF9500' },
  matrix_background: { hsl: '223 46% 13%', hex: '#111827' },
  matrix_spark_deal_color: { hsl: '33 100% 50%', hex: '#FF9500' },
};

export const ThemeSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<ThemeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Fetch theme settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bob_theme_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      
      setSettings(data || []);
      
      // Check background mode
      const modeRow = data?.find(s => s.setting_key === 'matrix_background_mode');
      setIsDarkMode(modeRow?.color_value !== 'light');
    } catch (error) {
      console.error('Error fetching theme settings:', error);
      toast.error('Failed to load theme settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single setting
  const updateSetting = async (key: string, colorValue: string, hexPreview: string | null) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bob_theme_settings')
        .update({ 
          color_value: colorValue, 
          hex_preview: hexPreview,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) throw error;
      
      // Update local state
      setSettings(prev => prev.map(s => 
        s.setting_key === key 
          ? { ...s, color_value: colorValue, hex_preview: hexPreview }
          : s
      ));
      
      toast.success(`${key.replace('matrix_', '').replace(/_/g, ' ')} updated`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  // Toggle background mode
  const toggleBackgroundMode = async () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    await updateSetting('matrix_background_mode', newMode, null);
    setIsDarkMode(!isDarkMode);
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    setSaving(true);
    try {
      for (const [key, values] of Object.entries(DEFAULT_THEME)) {
        await supabase
          .from('bob_theme_settings')
          .update({ 
            color_value: values.hsl, 
            hex_preview: values.hex,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);
      }
      
      await supabase
        .from('bob_theme_settings')
        .update({ color_value: 'dark', updated_at: new Date().toISOString() })
        .eq('setting_key', 'matrix_background_mode');

      toast.success('Theme reset to CARFIX defaults');
      fetchSettings();
    } catch (error) {
      console.error('Error resetting theme:', error);
      toast.error('Failed to reset theme');
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => settings.find(s => s.setting_key === key);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading theme settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Matrix Rain Theme
        </CardTitle>
        <CardDescription>
          Customise the CARFIX branded Matrix Rain loader colours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Background Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-blue-500" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <Label className="text-sm font-medium">Background Mode</Label>
              <p className="text-xs text-muted-foreground">
                {isDarkMode ? 'Navy background with light text' : 'White background with dark text'}
              </p>
            </div>
          </div>
          <Switch
            checked={isDarkMode}
            onCheckedChange={toggleBackgroundMode}
            disabled={saving}
          />
        </div>

        {/* Colour Pickers */}
        <div className="grid gap-4">
          <ColorInput
            label="Primary Colour"
            description="Main rain colour (Dark Blue)"
            value={getSetting('matrix_primary')?.color_value || DEFAULT_THEME.matrix_primary.hsl}
            hexValue={getSetting('matrix_primary')?.hex_preview || DEFAULT_THEME.matrix_primary.hex}
            onChange={(hex, hsl) => updateSetting('matrix_primary', hsl, hex)}
          />

          <ColorInput
            label="Secondary Colour"
            description="Loading phase colour (Light Blue)"
            value={getSetting('matrix_secondary')?.color_value || DEFAULT_THEME.matrix_secondary.hsl}
            hexValue={getSetting('matrix_secondary')?.hex_preview || DEFAULT_THEME.matrix_secondary.hex}
            onChange={(hex, hsl) => updateSetting('matrix_secondary', hsl, hex)}
          />

          <ColorInput
            label="Success Colour"
            description="Success flash colour (Gold)"
            value={getSetting('matrix_success')?.color_value || DEFAULT_THEME.matrix_success.hsl}
            hexValue={getSetting('matrix_success')?.hex_preview || DEFAULT_THEME.matrix_success.hex}
            onChange={(hex, hsl) => updateSetting('matrix_success', hsl, hex)}
          />

          <ColorInput
            label="Spark Deal Colour"
            description="Colour for Spark Deal highlights"
            value={getSetting('matrix_spark_deal_color')?.color_value || DEFAULT_THEME.matrix_spark_deal_color.hsl}
            hexValue={getSetting('matrix_spark_deal_color')?.hex_preview || DEFAULT_THEME.matrix_spark_deal_color.hex}
            onChange={(hex, hsl) => updateSetting('matrix_spark_deal_color', hsl, hex)}
          />
        </div>

        {/* Live Preview */}
        <div 
          className="h-32 rounded-lg overflow-hidden relative"
          style={{
            background: isDarkMode 
              ? `linear-gradient(135deg, #0f172a 0%, ${getSetting('matrix_background')?.hex_preview || '#111827'} 100%)`
              : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-2 items-end">
              {['primary', 'secondary', 'success', 'spark_deal_color'].map((type, idx) => (
                <div
                  key={type}
                  className="w-4 rounded-t animate-pulse"
                  style={{
                    height: `${40 + idx * 20}px`,
                    backgroundColor: getSetting(`matrix_${type}`)?.hex_preview || 
                      DEFAULT_THEME[`matrix_${type}` as keyof typeof DEFAULT_THEME]?.hex || '#0066CC',
                    animationDelay: `${idx * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="absolute bottom-2 left-2 text-xs font-mono opacity-60" 
               style={{ color: isDarkMode ? '#fff' : '#000' }}>
            Live Preview
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={saving}
          className="w-full gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to CARFIX Defaults
        </Button>
      </CardContent>
    </Card>
  );
};

export default ThemeSettingsPanel;
