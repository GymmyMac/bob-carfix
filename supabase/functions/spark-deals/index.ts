import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SparkDeal {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const partnerApiKey = Deno.env.get('CARFIX_PARTNER_API_KEY');
    
    if (!partnerApiKey) {
      console.error('CARFIX_PARTNER_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Partner API not configured',
          deals: [] 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body for optional filters
    let body: { category?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine
    }

    const limit = body.limit || 5;
    const category = body.category || null;

    console.log(`Fetching spark deals: limit=${limit}, category=${category || 'all'}`);

    // Call CARFIX Partner API for spark deals
    const partnerApiUrl = 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api';
    
    const response = await fetch(partnerApiUrl, {
      method: 'POST',
      headers: {
        'X-Partner-Key': partnerApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_spark_deals',
        limit,
        category,
      }),
    });

    if (!response.ok) {
      // If Partner API doesn't have spark deals endpoint yet, return mock data
      console.log('Partner API spark deals not available, returning featured products');
      
      // Fallback: fetch featured products instead
      const fallbackResponse = await fetch(partnerApiUrl, {
        method: 'POST',
        headers: {
          'X-Partner-Key': partnerApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_featured_products',
          limit,
        }),
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const deals: SparkDeal[] = (fallbackData.products || []).slice(0, limit).map((p: any, idx: number) => ({
          id: p.id || `deal-${idx}`,
          brand: p.brand || 'CARFIX',
          product_name: p.name || p.description || 'Featured Product',
          price: p.price || 0,
          original_price: p.original_price || null,
          image_url: p.image_url || null,
          sku: p.sku || `SKU-${idx}`,
          category: p.category || 'Featured',
        }));

        return new Response(
          JSON.stringify({ success: true, deals, source: 'featured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If all else fails, return demo deals
      const demoDeals: SparkDeal[] = [
        {
          id: 'spark-1',
          brand: 'CRC',
          product_name: 'Fuel System Clean Kit',
          price: 29.99,
          original_price: 39.99,
          sku: 'CRC-FSK-001',
          category: 'Maintenance',
        },
        {
          id: 'spark-2',
          brand: 'RYCO',
          product_name: 'Premium Oil Filter',
          price: 18.50,
          sku: 'RYCO-Z89A',
          category: 'Filters',
        },
        {
          id: 'spark-3',
          brand: 'BOSCH',
          product_name: 'Platinum Spark Plugs (4pk)',
          price: 45.00,
          original_price: 59.00,
          sku: 'BOSCH-SP4-PLAT',
          category: 'Ignition',
        },
      ];

      return new Response(
        JSON.stringify({ success: true, deals: demoDeals.slice(0, limit), source: 'demo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const deals: SparkDeal[] = (data.deals || data.products || []).map((d: any) => ({
      id: d.id || d.sku,
      brand: d.brand || 'CARFIX',
      product_name: d.product_name || d.name || d.description,
      price: d.price || d.sale_price || 0,
      original_price: d.original_price || d.rrp || null,
      image_url: d.image_url || d.image || null,
      sku: d.sku,
      category: d.category || null,
      valid_until: d.valid_until || d.expires || null,
    }));

    console.log(`Returning ${deals.length} spark deals`);

    return new Response(
      JSON.stringify({ success: true, deals, source: 'partner_api' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching spark deals:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        deals: [] 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
