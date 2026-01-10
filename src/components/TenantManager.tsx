import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Key, Globe, RefreshCw, Plus, Trash2 } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
}

interface LLMConfig {
  id: string;
  tenant_id: string;
  provider: string;
  model: string;
  api_key_secret_name: string | null;
  endpoint: string | null;
  is_active: boolean;
}

interface APIConfig {
  id: string;
  tenant_id: string;
  endpoint_type: string;
  base_url: string;
  api_key_secret_name: string | null;
  is_active: boolean;
}

/**
 * TenantManager - Phase 7: Multi-Tenant Admin Dashboard
 * 
 * Features:
 * - Tenant list with status toggles
 * - LLM configuration per tenant
 * - API endpoints table per tenant
 */
export const TenantManager: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [apiConfigs, setAPIConfigs] = useState<APIConfig[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New tenant form
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantCode, setNewTenantCode] = useState("");
  const [newTenantDomain, setNewTenantDomain] = useState("");
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('bob_tenants')
        .select('*')
        .order('created_at', { ascending: true });

      if (tenantsError) throw tenantsError;
      setTenants(tenantsData || []);

      // Auto-select first tenant
      if (tenantsData && tenantsData.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsData[0].id);
      }

      // Fetch LLM configs
      const { data: llmData, error: llmError } = await supabase
        .from('bob_llm_config')
        .select('*');

      if (llmError) throw llmError;
      setLLMConfigs(llmData || []);

      // Fetch API configs
      const { data: apiData, error: apiError } = await supabase
        .from('bob_api_config')
        .select('*')
        .order('endpoint_type', { ascending: true });

      if (apiError) throw apiError;
      setAPIConfigs(apiData || []);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      toast.error('Failed to load tenant data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTenantActive = async (tenantId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bob_tenants')
        .update({ is_active: isActive })
        .eq('id', tenantId);

      if (error) throw error;
      
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, is_active: isActive } : t
      ));
      toast.success(`Tenant ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantName || !newTenantCode) {
      toast.error('Name and code are required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bob_tenants')
        .insert({
          name: newTenantName,
          code: newTenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          domain: newTenantDomain || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setTenants(prev => [...prev, data]);
      setNewTenantName("");
      setNewTenantCode("");
      setNewTenantDomain("");
      setShowNewTenantForm(false);
      toast.success('Tenant created');
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast.error(error.message || 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This will also delete all associated LLM and API configurations.')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bob_tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;

      setTenants(prev => prev.filter(t => t.id !== tenantId));
      setLLMConfigs(prev => prev.filter(c => c.tenant_id !== tenantId));
      setAPIConfigs(prev => prev.filter(c => c.tenant_id !== tenantId));
      
      if (selectedTenant === tenantId) {
        setSelectedTenant(tenants[0]?.id || null);
      }
      
      toast.success('Tenant deleted');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    } finally {
      setSaving(false);
    }
  };

  const selectedTenantData = tenants.find(t => t.id === selectedTenant);
  const selectedLLMConfig = llmConfigs.find(c => c.tenant_id === selectedTenant);
  const selectedAPIConfigs = apiConfigs.filter(c => c.tenant_id === selectedTenant);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Tenants
              </CardTitle>
              <CardDescription>
                Manage Bob widget tenants and their configurations
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewTenantForm(!showNewTenantForm)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Tenant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Tenant Form */}
          {showNewTenantForm && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tenant-name">Name</Label>
                  <Input
                    id="tenant-name"
                    value={newTenantName}
                    onChange={e => setNewTenantName(e.target.value)}
                    placeholder="ACME Parts"
                  />
                </div>
                <div>
                  <Label htmlFor="tenant-code">Code</Label>
                  <Input
                    id="tenant-code"
                    value={newTenantCode}
                    onChange={e => setNewTenantCode(e.target.value)}
                    placeholder="acme"
                  />
                </div>
                <div>
                  <Label htmlFor="tenant-domain">Domain (optional)</Label>
                  <Input
                    id="tenant-domain"
                    value={newTenantDomain}
                    onChange={e => setNewTenantDomain(e.target.value)}
                    placeholder="acme.com"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateTenant} disabled={saving}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewTenantForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Tenant List */}
          <div className="space-y-2">
            {tenants.map(tenant => (
              <div
                key={tenant.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTenant === tenant.id 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedTenant(tenant.id)}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.code} {tenant.domain && `• ${tenant.domain}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={tenant.is_active ? "default" : "secondary"}>
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Switch
                    checked={tenant.is_active}
                    onCheckedChange={(checked) => handleToggleTenantActive(tenant.id, checked)}
                    onClick={e => e.stopPropagation()}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTenant(tenant.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Tenant Details */}
      {selectedTenantData && (
        <>
          {/* LLM Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="w-4 h-4" />
                LLM Configuration - {selectedTenantData.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLLMConfig ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <p className="font-medium">{selectedLLMConfig.provider}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <p className="font-medium">{selectedLLMConfig.model}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">API Key Secret</Label>
                    <p className="font-medium font-mono text-sm">
                      {selectedLLMConfig.api_key_secret_name || '(Using Lovable AI)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={selectedLLMConfig.is_active ? "default" : "secondary"}>
                      {selectedLLMConfig.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No LLM configuration found. Using default Lovable AI.
                </p>
              )}
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4" />
                API Endpoints - {selectedTenantData.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAPIConfigs.length > 0 ? (
                <div className="space-y-2">
                  {selectedAPIConfigs.map(config => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-2 rounded border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{config.endpoint_type}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {config.base_url}
                        </p>
                      </div>
                      <Badge variant={config.is_active ? "outline" : "secondary"} className="ml-2">
                        {config.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No API endpoints configured.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
