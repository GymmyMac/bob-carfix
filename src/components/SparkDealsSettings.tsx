import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, TestTube, Timer, MessageSquare, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/backend/client";

interface SparkDealsSettingsState {
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

interface TestDeal {
  id: string;
  brand: string;
  product_name: string;
  price: number;
  original_price?: number;
}

export const SparkDealsSettings: React.FC = () => {
  const [settings, setSettings] = useState<SparkDealsSettingsState>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testDeals, setTestDeals] = useState<TestDeal[]>([]);
  const [testing, setTesting] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bob_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'spark_deals_%');

      if (error) throw error;

      if (data) {
        const settingsMap = new Map(data.map(s => [s.setting_key, s.setting_value]));
        setSettings({
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
        });
      }
    } catch (error) {
      console.error('Error fetching spark deals settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single setting
  const updateSetting = async (key: string, value: string | number | boolean) => {
    const dbKey = `spark_deals_${key}`;
    const dbValue = String(value);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bob_settings')
        .update({ setting_value: dbValue, updated_at: new Date().toISOString() })
        .eq('setting_key', dbKey);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Setting updated');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  // Test fetch spark deals
  const testFetchDeals = async () => {
    setTesting(true);
    setTestDeals([]);
    
    try {
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${projectUrl}/functions/v1/spark-deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });

      const data = await response.json();
      
      if (data.success && data.deals) {
        setTestDeals(data.deals);
        toast.success(`Fetched ${data.deals.length} deals from ${data.source}`);
      } else {
        toast.error(data.error || 'No deals found');
      }
    } catch (error) {
      console.error('Error testing spark deals:', error);
      toast.error('Failed to fetch deals');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading Spark Deals settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Spark Deals Configuration
          </CardTitle>
          <CardDescription>
            Configure how Spark Deals appear during product loading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div>
              <Label className="text-sm font-semibold">Enable Spark Deals</Label>
              <p className="text-xs text-muted-foreground">
                Show promotional deals during product research
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* Sub-settings (only shown if enabled) */}
          {settings.enabled && (
            <div className="space-y-4 pt-2">
              {/* In Rain Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm">Embed in Matrix Rain</Label>
                    <p className="text-xs text-muted-foreground">
                      Show deal words in falling rain
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.inRain}
                  onCheckedChange={(checked) => updateSetting('in_rain', checked)}
                  disabled={saving}
                />
              </div>

              {/* Rain Frequency Slider */}
              {settings.inRain && (
                <div className="pl-6 space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Rain Frequency</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(settings.rainFrequency * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.rainFrequency * 100]}
                    onValueChange={([v]) => updateSetting('rain_frequency', v / 100)}
                    min={5}
                    max={50}
                    step={5}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    How often deal words appear vs standard words
                  </p>
                </div>
              )}

              {/* Banner Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm">Show Banner</Label>
                    <p className="text-xs text-muted-foreground">
                      Scrolling deal banner at bottom
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.bannerEnabled}
                  onCheckedChange={(checked) => updateSetting('banner_enabled', checked)}
                  disabled={saving}
                />
              </div>

              {/* Timing Settings */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Timer className="w-4 h-4" />
                  Timing Controls
                </div>

                {/* Delay */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Delay Before First Deal</Label>
                    <span className="text-xs text-muted-foreground">
                      {(settings.delayMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    value={[settings.delayMs]}
                    onValueChange={([v]) => updateSetting('delay_ms', v)}
                    min={1000}
                    max={5000}
                    step={500}
                    disabled={saving}
                  />
                </div>

                {/* Scroll Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Banner Scroll Speed</Label>
                    <span className="text-xs text-muted-foreground">
                      {(settings.scrollSpeed / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    value={[settings.scrollSpeed]}
                    onValueChange={([v]) => updateSetting('scroll_speed', v)}
                    min={3000}
                    max={10000}
                    step={500}
                    disabled={saving}
                  />
                </div>

                {/* Max Per Session */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Max Deals Per Session</Label>
                    <span className="text-xs text-muted-foreground">
                      {settings.maxPerSession} deals
                    </span>
                  </div>
                  <Slider
                    value={[settings.maxPerSession]}
                    onValueChange={([v]) => updateSetting('max_per_session', v)}
                    min={1}
                    max={5}
                    step={1}
                    disabled={saving}
                  />
                </div>

                {/* Min Research Time */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Min Research Time for Deals</Label>
                    <span className="text-xs text-muted-foreground">
                      {(settings.minResearchTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    value={[settings.minResearchTime]}
                    onValueChange={([v]) => updateSetting('min_research_time', v)}
                    min={500}
                    max={5000}
                    step={250}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Don't show deals if search is faster than this
                  </p>
                </div>
              </div>

              {/* Bob Commentary Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-sm">Bob Commentary</Label>
                  <p className="text-xs text-muted-foreground">
                    Let Bob mention Spark Deals in conversation
                  </p>
                </div>
                <Switch
                  checked={settings.bobCommentary}
                  onCheckedChange={(checked) => updateSetting('bob_commentary', checked)}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Fetch Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Test Spark Deals API
          </CardTitle>
          <CardDescription>
            Fetch live deals from the CARFIX Partner API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testFetchDeals} 
            disabled={testing}
            className="w-full gap-2"
          >
            <Zap className="w-4 h-4" />
            {testing ? 'Fetching...' : 'Test Fetch Deals'}
          </Button>

          {testDeals.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {testDeals.length} Deals Found:
              </Label>
              <div className="space-y-2">
                {testDeals.map((deal) => (
                  <div 
                    key={deal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.brand} {deal.product_name}</p>
                      {deal.original_price && deal.original_price > deal.price && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {Math.round((1 - deal.price / deal.original_price) * 100)}% off
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {deal.original_price && deal.original_price > deal.price && (
                        <p className="text-xs text-muted-foreground line-through">
                          ${deal.original_price.toFixed(2)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-amber-600">
                        ${deal.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SparkDealsSettings;
