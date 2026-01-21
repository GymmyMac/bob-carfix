import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= DYNAMIC PROMPT LOADING =============
interface BobPrompt {
  prompt_key: string;
  content: string;
  is_active: boolean;
  display_order: number;
  tenant_id: string | null;
}

// Cache for prompts (refreshed every 5 minutes) - keyed by tenant
const promptCache: Map<string, { prompts: BobPrompt[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchPromptsFromDB(tenantId: string | null = null): Promise<BobPrompt[]> {
  const cacheKey = tenantId || 'default';
  const cached = promptCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`Using cached prompts for tenant: ${cacheKey}`);
    return cached.prompts;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials for prompt loading');
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First try tenant-specific prompts
    let prompts: BobPrompt[] = [];
    
    if (tenantId) {
      const { data: tenantPrompts, error: tenantError } = await supabase
        .from('bob_prompts')
        .select('prompt_key, content, is_active, display_order, tenant_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (!tenantError && tenantPrompts && tenantPrompts.length > 0) {
        prompts = tenantPrompts;
        console.log(`Loaded ${prompts.length} tenant-specific prompts for: ${tenantId}`);
      }
    }
    
    // Fall back to default prompts (tenant_id IS NULL)
    if (prompts.length === 0) {
      const { data: defaultPrompts, error: defaultError } = await supabase
        .from('bob_prompts')
        .select('prompt_key, content, is_active, display_order, tenant_id')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (defaultError) {
        console.error('Error fetching default prompts:', defaultError);
        return cached?.prompts || [];
      }
      
      prompts = defaultPrompts || [];
      console.log(`Loaded ${prompts.length} default prompts (fallback)`);
    }

    promptCache.set(cacheKey, { prompts, timestamp: now });
    return prompts;
  } catch (err) {
    console.error('Failed to fetch prompts:', err);
    return cached?.prompts || [];
  }
}

function buildSystemPromptFromDB(prompts: BobPrompt[]): string {
  if (prompts.length === 0) {
    console.log('No DB prompts, using fallback');
    return FALLBACK_SYSTEM_PROMPT;
  }
  
  return prompts.map(p => p.content).join('\n\n');
}

const tools = [
  {
    type: "function",
    function: {
      name: "lookup_vehicle",
      description: "Look up a vehicle by NZ license plate (REGO) or by make/model/year. Use when customer provides registration or describes their car.",
      parameters: {
        type: "object",
        properties: {
          plate: { type: "string", description: "NZ registration plate (e.g., 'PSU690', 'PDZ676')" },
          make: { type: "string", description: "Vehicle make (e.g., 'Toyota', 'Audi')" },
          model: { type: "string", description: "Vehicle model (e.g., 'Corolla', 'A4')" },
          year: { type: "number", description: "Vehicle year of manufacture" },
          cc_rating: { type: "number", description: "Engine capacity in cc" },
          fuel_type: { type: "string", description: "Fuel type (petrol, diesel, hybrid, electric)" },
          body_style: { type: "string", description: "Body style (Sedan, Hatchback, SUV, Ute, Wagon)" },
          engine_number: { type: "string", description: "Engine code for disambiguation" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web to research vehicle details like VIN decoder results, engine codes, or variant specifications. Use this when you need to disambiguate between multiple vehicle matches with the same score.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g., 'CDN-297102 Audi engine code specifications' or 'WAUZZZ8K3DA119102 VIN decoder')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "retrieve_parts",
      description: "Look up ALL available parts for a confirmed vehicle. IMPORTANT: Call this ONCE without any filter when vehicle is first confirmed - all parts will be loaded and displayed on the customer's shelf. DO NOT call again with a part_type filter - the customer already sees all parts. Instead, just mention the category name to guide them to the right section.",
      parameters: {
        type: "object",
        properties: {
          vehicleid: { type: "number", description: "The vehicle ID from a previous lookup_vehicle result (found in the 'id' field)" },
          part_type: { type: "string", description: "DEPRECATED - Do not use. All parts are loaded on first call. Filtering replaces the full display with a subset which is undesirable." }
        },
        required: ["vehicleid"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "retrieve_service_packages",
      description: "Fetch pre-configured CFX Service Packs with preparedTiers from the calculate-service-bundles API. Returns standardized service bundles with Economy/Standard/Premium/Performance tiers ready for display. CALL THIS FIRST when customer asks about brakes, filters, oil, wipers, or any regular maintenance parts. Service packages offer better value than individual parts.",
      parameters: {
        type: "object",
        properties: {
          vehicleid: { type: "number", description: "The vehicle ID for vehicle-specific packages (REQUIRED for accurate service bundle pricing)" }
        },
        required: ["vehicleid"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_general_products",
      description: "Search for general automotive products that do NOT require a vehicle. Use for consumables, accessories, cleaning products, tools, and universal items. Examples: tire shine, windscreen wash, car wash, polish, air fresheners, cleaning cloths, WD-40, engine degreaser, tool kits, jump leads, etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term for general products (e.g., 'tire shine', 'windscreen wash', 'car polish')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add products to the customer's cart. Use when customer confirms they want to purchase a product (says 'add to cart', 'I'll take it', 'buy it', etc). Requires customer email.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "Customer's email address" },
          items: { 
            type: "array",
            description: "Products to add to cart",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Product SKU" },
                product_name: { type: "string", description: "Product name" },
                quantity: { type: "number", description: "Quantity to add" },
                unit_price: { type: "number", description: "Price per unit" },
                vehicle_id: { type: "string", description: "Vehicle ID if vehicle-specific" }
              }
            }
          }
        },
        required: ["user_email", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cart",
      description: "Get the customer's current cart contents. Use to show what they've added before checkout.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "Customer's email address" }
        },
        required: ["user_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_checkout",
      description: "Create a Stripe checkout URL for the customer to complete their purchase. Use when customer is ready to pay.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "Customer's email address" }
        },
        required: ["user_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_context",
      description: "Get customer profile, saved vehicles, recent orders. Use at start of conversation to personalize (e.g., 'Welcome back! Still driving the Corolla?') or when customer asks about their orders.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "Customer's email address" }
        },
        required: ["user_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get full product information by SKU including description, pricing, features, installation tips, and images. Use when customer asks for more details about a specific product.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Product SKU code" }
        },
        required: ["sku"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search for products by keyword, SKU, or part number. Can optionally filter by vehicle fitment. Use for finding products when customer describes what they need.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (keyword, SKU, or part number)" },
          vehicle_id: { type: "string", description: "Optional vehicle ID to filter by fitment" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_vehicle_fitment",
      description: "Verify if a specific product (by SKU) fits a particular vehicle. Use when customer asks 'will this fit my car?' or before adding vehicle-specific parts to cart.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Product SKU to check" },
          vehicle_id: { type: "string", description: "Vehicle ID to check fitment against" }
        },
        required: ["sku", "vehicle_id"]
      }
    }
  }
];

// Parts that truly don't require vehicle - very limited list (washer fluid, number plate lights)
// NOTE: Wipers, cabin filters, and bulbs are NOW vehicle-specific (removed from this list)
const UNIVERSAL_PART_TYPES = [
  'WASHER FLUID', 'WINDSCREEN WASH',
  'NUMBER PLATE', 'LICENSE PLATE',
];

// Fallback prompt used when database prompts are unavailable
const FALLBACK_SYSTEM_PROMPT = `You are Bob, a friendly Kiwi auto parts expert at CARFIX. You're busy but helpful - like a mate at the shop.

CRITICAL RULES:
- Keep responses SHORT (1-3 sentences max) until you know their vehicle
- NEVER offer to fit parts - CARFIX only sells parts for DIY or workshop fitment
- Know the difference between VEHICLE-SPECIFIC parts and GENERAL products
- NEVER mention stock status - all parts shown are IN STOCK and available. Never say "out of stock", "limited stock", "checking availability" etc.

ANTI-HALLUCINATION RULES (MANDATORY):
- ONLY mention products, brands, SKUs, and prices that appear in tool responses with success: true
- If a tool returns success: false or error, DO NOT invent alternatives or make up products
- NEVER guess or hallucinate product names, prices, or brand names from your general knowledge
- If you don't have real product data, say: "I don't have that in my system right now - check carfix.co.nz"
- For general products (tire shine, car wash, etc.), if search fails, direct customer to browse the website
- ALL product recommendations MUST come from retrieve_parts, search_products, or search_general_products results

GENERAL PRODUCTS vs VEHICLE-SPECIFIC PARTS:
GENERAL PRODUCTS (NO vehicle needed):
- Cleaning products: tire shine, windscreen wash, car wash, polish, wax, interior cleaner
- Accessories: air fresheners, phone holders, seat covers, floor mats (universal)
- Chemicals: WD-40, CRC, engine degreaser, brake cleaner, rust converter
- Tools: tool kits, jump leads, tire gauges, funnels, oil drain pans
- Consumables: rags, microfiber cloths, masking tape
- For these → Use search_general_products tool IMMEDIATELY. NO vehicle lookup needed!

VEHICLE-SPECIFIC PARTS (need vehicle first):
- Filters: oil filter, air filter, cabin filter, fuel filter
- Brakes: brake pads, brake rotors, brake fluid
- Engine: spark plugs, timing belt, water pump, thermostat
- Suspension: shocks, struts, control arms, ball joints
- For these → Get vehicle details first

DECISION LOGIC:
1. Customer asks for something → Decide: general or vehicle-specific?
2. If GENERAL → Use search_general_products immediately, no vehicle questions
3. If VEHICLE-SPECIFIC → Get their REGO OR make/model/year/engine details

VEHICLE LOOKUP WORKFLOW:
PRIMARY: Ask for REGO (license plate) - gives exact match
FALLBACK: If no REGO, collect make + model + year + engine size (cc) and use lookup_vehicle

USING lookup_vehicle:
- With REGO: Use plate parameter for exact match
- Without REGO: Use make, model, year, cc_rating parameters - this returns MULTIPLE candidate vehicles

HANDLING LOOKUP RESULTS:
1. SINGLE MATCH with vehicle ID: AUTO-CONFIRM immediately!
   - Do NOT ask customer to confirm - the rego gives an exact match
   - Emit VEHICLE_CONFIRMED marker immediately
   - Parts and packages are ALREADY loading in the background
   - Just acknowledge: "Sweet, got your [Year Make Model] - what do you need today?"
   - NEVER say "Is this your vehicle?" for single rego matches
   
2. MULTIPLE MATCHES (vehicles array): 
   - For UNIVERSAL parts (wipers, cabin filters, bulbs): Pick ANY vehicle from the matches and proceed - these parts are the same across variants
   - For CRITICAL parts (brakes, engine, suspension): Present options and ask customer to confirm which variant
   
3. NO vehicle ID in result: The match was too vague - ask for more details or REGO

UNIVERSAL vs CRITICAL PARTS:
UNIVERSAL (same across variants - no disambiguation needed):
- Wiper blades, cabin/pollen filters, interior bulbs, number plate lights
- If customer asks for these with multiple matches → Pick the first match and proceed

CRITICAL (different per variant - must confirm):
- Brake pads, brake rotors, oil filters, air filters, spark plugs, timing belts
- Suspension parts, engine parts, clutch kits
- If customer asks for these with multiple matches → Ask customer to confirm variant

CRITICAL VEHICLE DATA ACCURACY:
When emitting VEHICLE_CONFIRMED, you MUST copy the EXACT vehicle data from the lookup_vehicle result.
- NEVER invent or hallucinate vehicle details (make, model, year, variant, engine)
- NEVER confuse one vehicle lookup result with another
- If lookup returned "BMW 335i", you MUST say "BMW 335i" - NEVER say "BMW X5" or any other model
- The vehicle_id, rego, make, model, year, vin, engine_no MUST all come DIRECTLY from the API response fields
- Before emitting VEHICLE_CONFIRMED, double-check the make and model match what the API returned

IMPORTANT - VEHICLE CONFIRMATION:
When a single vehicle is found OR the customer confirms a specific vehicle, emit the marker at the START of your response:
[VEHICLE_CONFIRMED:{"vehicle_id":12345,"rego":"ABC123","make":"Toyota","model":"Corolla","year":"2015","variant":"GX","vehicle_name_nz":"Toyota Corolla GX 1.8L","engine_size":"1.8L","fuel_type":"petrol","vin":"JTDBU4EE7E9123456","engine_no":"2ZR-123456","cc_rating":1800}]

Include the vehicle_id field AND all other available fields. Then continue with your natural response.
Emit VEHICLE_CONFIRMED when:
- lookup_vehicle returns a SINGLE match with a valid id (auto-confirm, no customer confirmation needed)
- Customer confirms a specific variant from multiple matches
- You're proceeding with a universal part from multiple matches

EXAMPLE RESPONSES:
- "Got any tire shine?" → Use search_general_products("tire shine") immediately
- "Need brake pads for my Toyota" → "Sweet, what's your rego? Or if you don't have it handy, the year and model?"
- "It's a 2006 Toyota Vitz 1.3" → Use lookup_vehicle with make="Toyota", model="Vitz", year=2006, cc_rating=1.3
- Multiple matches, customer asks for WIPERS → Pick first match, emit VEHICLE_CONFIRMED, proceed
- Multiple matches, customer asks for BRAKE PADS → "Found a few Vitz options - is yours the SCP90 1.3L petrol or the NCP91 1.5L?"
- Customer confirms "the 1.3L" → Emit VEHICLE_CONFIRMED with that vehicle's ID and proceed

CRITICAL - INVENTORY-ONLY RECOMMENDATIONS:
- ONLY recommend products and brands that appear in retrieve_parts results
- NEVER suggest brands from your general automotive knowledge (no Bendix, Bosch, TRW unless they're in the results)
- If a brand doesn't appear in the parts results, you DON'T stock it
- All product names, SKUs, prices MUST come from retrieve_parts - never invent them
- If customer asks about a brand not in results: "Let me check what we've got in stock for that..."

ACCURACY GUARDRAIL - CRITICAL:
- ONLY quote prices that were returned in tool results
- ONLY mention products/packages that exist in your tool results
- If a tool returned empty/no results, say "I couldn't find [item] for your vehicle" - don't make up alternatives
- If you're unsure about a price, say "prices start from around $X" with a real number from results
- NEVER invent SKUs, part numbers, or exact prices
- Service packages displayed to customer are provided in [CUSTOMER DISPLAY STATE] context - ONLY reference those packages

SMART SALES SPEECH - PRODUCT RECOMMENDATIONS:
When presenting products, follow these rules:

PRICING STRATEGY:
- NEVER recommend the CHEAPEST option first - it has lowest margin and lowest quality
- ALWAYS recommend a MID-PRICED product as "best value" or "good quality"
- Structure: "Prices start from $X, go up to $Y. I'd go with the [MidBrand] at $[MidPrice] - solid quality."

VERBOSITY RULES:
- NEVER list more than 2-3 products by name in speech
- Let the visual shelf do the work: "Check out the options on your right there"
- If many options exist, summarize: "Got a few brands - [LIST ONLY BRANDS FROM RESULTS] - prices from $X to $Y"

PARTSLOT NAMING - USE EXACT CATEGORY NAMES:
When mentioning products, use the exact partslot category name to help customers find them:
- "Looking at WIPER BLADE FRONT options..."
- "For your BRAKE PAD KIT, I'd suggest..."
- "Under OIL FILTER, you've got..."
- "Check out AIR FILTER on the shelf..."
This triggers auto-scroll to that section on the shelf.

EXAMPLE GOOD RESPONSE:
"Sweet as, got your wipers sorted. Prices run $20 to $78 on WIPER BLADE FRONT - I'd go with the TRICO at $69, solid brand. Have a look on the shelf there."

EXAMPLE BAD RESPONSE (TOO VERBOSE - NEVER DO THIS):
"Here's all your options: BOSCH AP600U $20, NAPA NFB24 $39, REPCO RFB24-S $50, TRICO TEC610 $78, TRICO TF610 $69..."

SMART SALES WORKFLOW (after vehicle confirmed WITH vehicle_id):

STEP 1 - LOAD ALL PARTS (once only):
- Call retrieve_parts with NO filter to load ALL available parts for the vehicle
- This happens automatically via session handoff OR when you first confirm the vehicle
- The customer sees ALL available parts on their shelf

STEP 2 - WHEN CUSTOMER ASKS ABOUT SPECIFIC PARTS (e.g., "spark plugs", "brake pads"):
- DO NOT call retrieve_parts again - all parts are already loaded and displayed
- The shelf auto-scrolls when you mention the partslot category name
- Just mention the exact category name to guide them: "Looking at SPARK PLUG SET on your shelf..."
- Recommend a MID-PRICED option, never the cheapest
- Example: "Right there under BRAKE PAD KIT FRONT, I'd go with the [Brand] at $X"

SERVICE PACKAGES - MANDATORY FIRST RECOMMENDATION:
====================================================
RULE: When customer asks about ANY maintenance parts (brakes, filters, oil, wipers), you MUST:

STEP 1 - ALWAYS CALL retrieve_service_packages FIRST
- This is NOT optional - do it BEFORE discussing individual parts
- Check if a service package matches their request

STEP 2 - MATCH REQUEST TO PACKAGE:
- Brakes/brake pads/rotors → Brake Service Package
- Oil/oil filter/oil change → Oil Service Package
- Air filter/cabin filter → Filter Service Package  
- Wipers/wiper blades → Wiper Service Package

STEP 3 - STRUCTURE YOUR RESPONSE (packages FIRST):
- IF matching package exists: "For that, I'd actually recommend our [Package Name] - $X gets you [contents]. Great value, mate. Or if you just want the [individual part], check the shelf there."
- ONLY IF no package matches: Recommend individual parts

NEVER skip straight to individual parts when a service package applies!
The package recommendation MUST come first in your response.

STEP 3 - CHECK SERVICE PACKAGES for better value:
- Use retrieve_service_packages to see if a bundle covers their needs
- Proactively recommend relevant packages

CRITICAL - NEVER RE-FETCH PARTS WITH FILTER:
- After vehicle confirmation, ALL parts are ALREADY loaded and visible on the shelf
- NEVER call retrieve_parts with a part_type filter - it will return empty or partial results
- The customer already sees everything - just SAY THE CATEGORY NAME to guide them
- If you call retrieve_parts with a filter and get 0 results, you're doing it WRONG
- Example: Customer asks for "brake pads" → Say "Looking at BRAKE PAD KIT FRONT on your shelf there, mate..."
- DO NOT DO THIS: retrieve_parts(vehicleid: 123, part_type: "brake pads") ❌
- CORRECT: Just mention the category name in your response to scroll them there ✓

KIWI EXPRESSIONS (use naturally):
- "mate", "sweet as", "no worries", "choice", "chur"
- "she'll be right", "away laughing", "piece of piss"
- "yeah nah" (means no), "nah yeah" (means yes)

// SALES_SKILL: SEAMLESS CART (for session users with email)
When customer wants to add to cart and you have their email:
1. Confirm choice: "Sweet, the [Brand] [Product] at $X - adding that now!"
2. Use add_to_cart tool immediately with their email
3. Confirm success: "Done! It's in your cart. Need anything else, or ready to checkout?"

// SALES_SKILL: EMAIL COLLECTION (for direct visitors without session email)
If customer wants to add to cart but you DON'T have their email:
1. Keep it casual: "Just need your email to save that to your cart, mate"
2. After email provided → Proceed with cart add
3. Never ask for email if customerEmail was provided in session context

// SALES_SKILL: UPSELLING (after cart add - ONE suggestion only)
After adding to cart, suggest ONE related item only:
- Brake pads → "Need rotors too? They often get changed together"
- Oil filter → "Grab the oil while you're at it?"
- Air filter → "How about the cabin filter for inside the car?"
- Wipers → "Windscreen wash to keep 'em working smooth?"
Be natural, not pushy - if they decline, move on immediately.

SHOPPING CART & CHECKOUT:
- When customer says "add to cart", "I'll take it", "buy it", "purchase" → Use add_to_cart with their email
- If customerEmail is provided in the session context, use it directly - don't ask again
- When customer is ready to pay or says "checkout", "pay now" → Use create_checkout to generate payment link
- To check what's in their cart → Use get_cart
- At conversation start, if you have their email → Consider using get_customer_context to personalize
- When checkout URL is returned, present it naturally: "Choice! Here's your checkout link: [URL]. Click through to complete payment."
- ALWAYS confirm what was added: "Added [product] to your cart. Anything else, or ready to checkout?"

VEHICLE CONTEXT RULES:
1. If a vehicle is already in session (PRE-CONFIRMED VEHICLE SESSION exists above), use that vehicle_id directly for retrieve_parts and retrieve_service_packages
2. If NO vehicle is known (no session vehicle, no confirmed lookup):
   - DO NOT call lookup_vehicle until customer provides REGO OR make/model/year
   - DO NOT call retrieve_parts or retrieve_service_packages until vehicle_id is confirmed
   - Keep response SHORT: ask for REGO in 1-2 sentences max
   - Example: "Just need your rego first, mate - what's the plate number?"
3. For GENERAL products (tire shine, windscreen wash, cleaning products), you CAN use search_general_products WITHOUT a vehicle

TONE: Relaxed, efficient, knowledgeable. Match their energy.`;

// ============= MULTI-TENANT API CONFIGURATION =============
// Default API config for CARFIX (fallback when no hostConfig provided)
const DEFAULT_API_CONFIG = {
  baseUrl: "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1",
  getApiKey: () => Deno.env.get("CARFIX_SERVICE_ROLE_KEY") || "",
  partnerCode: "CARFIX",
};

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  partnerCode?: string;
  customHeaders?: Record<string, string>;
}

interface HostConfig {
  baseUrl: string;
  apiKey: string;
  partnerCode?: string;
  customHeaders?: Record<string, string>;
}

interface HostContext {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    phone?: string;
    isAuthenticated?: boolean;
  };
  vehicle?: {
    selectedVehicle?: Record<string, unknown>;
    garageVehicles?: Array<Record<string, unknown>>;
    recentSearches?: Array<Record<string, unknown>>;
  };
  cart?: {
    items?: Array<Record<string, unknown>>;
    savedItems?: Array<Record<string, unknown>>;
    totalValue?: number;
    itemCount?: number;
  };
  history?: {
    purchases?: Array<Record<string, unknown>>;
    lastOrderDate?: string;
    lifetimeSpend?: number;
  };
  currentPage?: string;
  metadata?: Record<string, unknown>;
}

// Build API config from hostConfig or use defaults
function buildApiConfig(hostConfig?: HostConfig): ApiConfig {
  if (hostConfig?.baseUrl && hostConfig?.apiKey) {
    console.log('Using host-provided API config:', hostConfig.baseUrl, 'partner:', hostConfig.partnerCode);
    return {
      baseUrl: hostConfig.baseUrl,
      apiKey: hostConfig.apiKey,
      partnerCode: hostConfig.partnerCode,
      customHeaders: hostConfig.customHeaders,
    };
  }
  console.log('Using default CARFIX API config');
  return {
    baseUrl: DEFAULT_API_CONFIG.baseUrl,
    apiKey: DEFAULT_API_CONFIG.getApiKey(),
    partnerCode: DEFAULT_API_CONFIG.partnerCode,
  };
}

async function lookupVehicle(args: Record<string, unknown>, apiConfig: ApiConfig): Promise<unknown> {
  console.log('Looking up vehicle with args:', JSON.stringify(args));
  
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiConfig.apiKey}`,
      ...apiConfig.customHeaders,
    };
    
    const response = await fetch(
      `${apiConfig.baseUrl}/retrieve-vehicle-info`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(args)
      }
    );
    
    if (response.status === 404) {
      console.log('Vehicle not found (404)');
      return { success: false, error: "Vehicle not found in database" };
    }
    
    if (!response.ok) {
      console.error('Vehicle lookup failed:', response.status);
      return { success: false, error: `Lookup failed with status ${response.status}` };
    }
    
    const data = await response.json();
    console.log('Vehicle lookup result (full):', JSON.stringify(data));
    
    // PRIORITY ORDER: Check for confirmed single match BEFORE checking multiple matches
    // The CARFIX API returns BOTH data.vehicle (plate info) AND data.vehicles (TecDoc variants)
    // For REGO lookups: if there's exactly 1 variant, auto-confirm it
    
    // Case 1: Single vehicle variant - AUTO-CONFIRM (most common for REGO lookups)
    if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length === 1) {
      const confirmedVehicle = data.vehicles[0];
      console.log('Single vehicle variant match - AUTO-CONFIRMING:', confirmedVehicle.vehicle_id || confirmedVehicle.id);
      return { 
        success: true, 
        vehicle: { ...data.vehicle, ...confirmedVehicle },
        vehicle_id: confirmedVehicle.vehicle_id || confirmedVehicle.id,
        auto_confirmed: true,
        message: "Single match found - vehicle auto-confirmed for parts lookup."
      };
    }
    
    // Case 2: Multiple vehicle variants - need customer selection
    if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 1) {
      console.log(`Found ${data.vehicles.length} vehicle candidates - needs customer selection`);
      return { 
        success: true, 
        multiple_matches: true,
        vehicles: data.vehicles,
        plate_info: data.vehicle,
        message: `Found ${data.vehicles.length} variants for this ${data.vehicle?.make || ''} ${data.vehicle?.model || ''}. Ask customer which one matches.`
      };
    }
    
    // Case 3: Direct vehicle object with ID (legacy format or direct match)
    if (data.vehicle && (data.vehicle.id || data.vehicle.vehicle_id)) {
      console.log('Direct vehicle match with ID:', data.vehicle.id || data.vehicle.vehicle_id);
      return { 
        success: true, 
        vehicle: data.vehicle,
        vehicle_id: data.vehicle.id || data.vehicle.vehicle_id
      };
    }
    
    // Case 4: Top-level vehicle data
    if (data.id || data.vehicle_id) {
      console.log('Top-level vehicle with ID:', data.id || data.vehicle_id);
      return { success: true, vehicle: data, vehicle_id: data.id || data.vehicle_id };
    }
    
    // Case 5: Vehicle info without usable ID - need more details
    if (data.vehicle) {
      console.log('Vehicle info found but no usable ID - may need more details');
      return { 
        success: true, 
        vehicle: data.vehicle,
        needs_clarification: true,
        message: "Found vehicle info but couldn't match to specific variant. Ask for more details (engine size, year, etc)."
      };
    }
    
    return data;
  } catch (error) {
    console.error('Vehicle lookup error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function searchWeb(query: string): Promise<unknown> {
  console.log('Searching web for:', query);
  
  try {
    // Use DuckDuckGo instant answers API (free, no API key required)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    
    if (!response.ok) {
      console.error('Web search failed:', response.status);
      return { success: false, error: "Web search failed" };
    }
    
    const data = await response.json();
    console.log('Web search result:', JSON.stringify(data).substring(0, 500));
    
    // Extract useful information from DuckDuckGo response
    const result: Record<string, unknown> = { success: true };
    
    if (data.Abstract) {
      result.summary = data.Abstract;
      result.source = data.AbstractSource;
      result.url = data.AbstractURL;
    }
    
    if (data.Answer) {
      result.answer = data.Answer;
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      result.related = data.RelatedTopics.slice(0, 5).map((topic: { Text?: string; FirstURL?: string }) => ({
        text: topic.Text,
        url: topic.FirstURL
      })).filter((t: { text?: string }) => t.text);
    }
    
    // If no useful info found
    if (!result.summary && !result.answer && (!result.related || (result.related as unknown[]).length === 0)) {
      result.note = "No detailed information found. You may need to ask the customer directly.";
    }
    
    return result;
  } catch (error) {
    console.error('Web search error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function retrieveParts(vehicleId: number, apiConfig: ApiConfig, partType?: string): Promise<{ success: boolean; parts?: unknown[]; total_found?: number; filter_applied?: string; error?: string }> {
  if (DEBUG) console.log('[DEBUG] Retrieving parts for vehicle:', vehicleId, 'part_type:', partType);
  
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiConfig.apiKey}`,
      ...apiConfig.customHeaders,
    };
    
    const response = await fetch(
      `${apiConfig.baseUrl}/retrieve-parts`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          vehicleid: String(vehicleId),
          page_size: 500,  // Increased from 200 to get more parts
          ...(partType && { part_type: partType })
        })
      }
    );
    
    if (!response.ok) {
      console.error('Parts lookup failed:', response.status);
      return { success: false, error: `Parts lookup failed with status ${response.status}` };
    }
    
    const data = await response.json();
    if (DEBUG) console.log('[DEBUG] Parts lookup result:', JSON.stringify(data).substring(0, 500));
    
    return { 
      success: true, 
      parts: data.parts || [],
      total_found: (data.parts || []).length,
      ...(partType && { filter_applied: partType })
    };
  } catch (error) {
    console.error('Parts lookup error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Debug flag - controlled by environment variable
const DEBUG = Deno.env.get("BOB_DEBUG") === "true";

// ============= SINGLE SOURCE OF TRUTH: Package Validation =============
// These helpers ensure AI only sees packages that will actually display to the customer

function calculatePackageMinPriceEarly(partslots: any[]): number {
  if (!partslots || !Array.isArray(partslots) || partslots.length === 0) {
    return 0;
  }
  
  let total = 0;
  const tierOrder = ['Standard', 'Economy', 'Premium', 'Performance'];
  
  for (const slot of partslots) {
    const tiers = slot?.products?.quality_tiers;
    if (!tiers) continue;
    
    for (const tier of tierOrder) {
      const products = tiers[tier];
      if (products && Array.isArray(products) && products.length > 0) {
        const validPrices = products.map((p: any) => p.price || 0).filter((price: number) => price > 0);
        if (validPrices.length > 0) {
          total += Math.min(...validPrices);
          break;
        }
      }
    }
  }
  
  return total;
}

// Validate a single package - returns true if displayable
function isPackageDisplayable(pkg: any): boolean {
  if (!pkg || !pkg.id) return false;
  
  // Modern format: Check preparedTiers (from calculate-service-bundles API)
  if (pkg.preparedTiers && Array.isArray(pkg.preparedTiers) && pkg.preparedTiers.length > 0) {
    // Check if any tier has valid pricing
    const hasValidTier = pkg.preparedTiers.some((tier: any) => 
      tier.totalPrice > 0 || (tier.products && tier.products.length > 0)
    );
    if (hasValidTier) return true;
  }
  
  // Legacy format: If from_price is set and > 0, also verify partslots have valid products
  if (pkg.from_price && pkg.from_price > 0) {
    if (pkg.partslots && Array.isArray(pkg.partslots)) {
      const hasValidProducts = pkg.partslots.some((slot: any) => {
        const tiers = slot?.products?.quality_tiers;
        if (!tiers) return false;
        return Object.values(tiers).some((products: any) => 
          Array.isArray(products) && products.some((p: any) => p.price > 0)
        );
      });
      return hasValidProducts;
    }
    return true; // Has from_price, no partslots to validate
  }
  
  // No from_price - calculate from partslots
  const calculatedPrice = calculatePackageMinPriceEarly(pkg.partslots);
  return calculatedPrice > 0;
}

// Filter packages to only displayable ones - CRITICAL for AI/Display sync
function filterDisplayablePackages(packages: any[]): any[] {
  if (!packages || !Array.isArray(packages)) return [];
  
  return packages.filter((pkg) => {
    const displayable = isPackageDisplayable(pkg);
    if (!displayable) {
      console.log(`[Package Filter] Removing "${pkg?.title}" - not displayable (no valid price/products)`);
    } else {
      // Ensure from_price is set for displayable packages
      if (!pkg.from_price || pkg.from_price === 0) {
        pkg.from_price = calculatePackageMinPriceEarly(pkg.partslots);
      }
    }
    return displayable;
  });
}

// PRIMARY SERVICE PACKAGE API: Uses calculate-service-bundles for preparedTiers format
async function fetchPreparedServiceBundles(vehicleId: number | undefined, apiConfig: ApiConfig): Promise<unknown> {
  console.log('[ServiceBundles] Fetching preparedTiers from calculate-service-bundles API for vehicle:', vehicleId);
  
  if (!vehicleId || !Number.isFinite(vehicleId) || vehicleId <= 0) {
    console.log('[ServiceBundles] Invalid vehicleId - cannot fetch bundles without vehicle');
    return { 
      success: false, 
      error: "Vehicle ID required for service package pricing",
      packages: []
    };
  }
  
  try {
    // Use 'vehicleId' (camelCase) as NUMBER - required by calculate-service-bundles API
    const body = { vehicleId: vehicleId };
    
    // Use CARFIX anon key specifically for calculate-service-bundles endpoint
    const CARFIX_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHpqYmFzZHNmd29lcnV5eGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTIwNzQsImV4cCI6MjA3MTIyODA3NH0.wKoJ51_VPro_BrJz-A-NRpSmUW0XBP-7TJJcrhvYwxE";
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": CARFIX_ANON_KEY,
    };
    
    const response = await fetch(
      `${apiConfig.baseUrl}/calculate-service-bundles`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[ServiceBundles] API failed:', response.status, errorBody);
      
      // Handle 500 errors gracefully - CARFIX API may be temporarily unavailable
      if (response.status === 500) {
        return { 
          success: false, 
          error: "Service packages temporarily unavailable. Individual parts are still available.",
          packages: [],
          retryable: true,
          api_status: 500
        };
      }
      
      return { success: false, error: `Service bundles API returned ${response.status}`, packages: [] };
    }
    
    const data = await response.json();
    console.log('[ServiceBundles] API response (truncated):', JSON.stringify(data).substring(0, 500));
    
    // Extract packages from calculate-service-bundles response format
    const packages = data.servicePackages || data.data?.servicePackages || [];
    console.log('[ServiceBundles] Extracted', Array.isArray(packages) ? packages.length : 0, 'packages with preparedTiers');
    
    return { 
      success: true, 
      packages: packages,
      total_found: Array.isArray(packages) ? packages.length : 0
    };
  } catch (error) {
    console.error('[ServiceBundles] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", packages: [] };
  }
}

// Backward compatibility alias
const retrieveServicePackages = fetchPreparedServiceBundles;

async function searchGeneralProducts(query: string): Promise<{ success: boolean; products?: unknown[]; total_found?: number; error?: string; ai_instruction?: string }> {
  console.log('Searching general products for:', query);
  
  // Try Partner API search_products for general (non-vehicle) products
  const partnerApiKey = Deno.env.get("CARFIX_PARTNER_API_KEY");
  
  if (partnerApiKey) {
    try {
      console.log('Attempting Partner API search for general products:', query);
      const result = await callPartnerAPI("search_products", { 
        query,
        filter: "general"
      }) as { success?: boolean; products?: unknown[]; total?: number };
      
      if (result && result.success && result.products && Array.isArray(result.products) && result.products.length > 0) {
        console.log(`Partner API returned ${result.products.length} general products`);
        return {
          success: true,
          products: result.products,
          total_found: result.products.length
        };
      }
      console.log('Partner API search returned no results for general products');
    } catch (err) {
      console.error('Partner API general products search failed:', err);
    }
  }
  
  // General products search not available - return clear anti-hallucination message
  return {
    success: false,
    error: "General products search is not currently available through Bob.",
    products: [],
    total_found: 0,
    ai_instruction: "CRITICAL: DO NOT invent or guess products. Tell the customer: 'For accessories, cleaning products, and car care items, check out carfix.co.nz directly - heaps of good stuff there.' Do NOT mention any specific product names, brands, or prices."
  };
}

// CARFIX Partner API integration for cart, checkout, and customer context
const PARTNER_API_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api";

async function callPartnerAPI(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const partnerApiKey = Deno.env.get("CARFIX_PARTNER_API_KEY");
  
  if (!partnerApiKey) {
    console.error('CARFIX_PARTNER_API_KEY not configured');
    return { success: false, error: "Partner API key not configured" };
  }
  
  try {
    console.log(`Calling Partner API: ${action}`, JSON.stringify(payload));
    
    const response = await fetch(PARTNER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Partner-Key": partnerApiKey
      },
      body: JSON.stringify({ action, ...payload })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Partner API error (${response.status}):`, errorText);
      return { success: false, error: `API error: ${response.status}`, details: errorText };
    }
    
    const data = await response.json();
    console.log(`Partner API ${action} result:`, JSON.stringify(data).substring(0, 500));
    return { success: true, ...data };
  } catch (error) {
    console.error(`Partner API ${action} error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  vehicle_id?: string;
}

async function addToCart(userEmail: string, items: CartItem[]): Promise<unknown> {
  console.log(`Adding ${items.length} items to cart for:`, userEmail);
  return callPartnerAPI("add_to_cart", { user_email: userEmail, items });
}

async function getCart(userEmail: string): Promise<unknown> {
  console.log('Getting cart for:', userEmail);
  return callPartnerAPI("get_cart", { user_email: userEmail });
}

async function createCheckout(userEmail: string): Promise<unknown> {
  console.log('Creating checkout for:', userEmail);
  return callPartnerAPI("create_checkout", { user_email: userEmail });
}

async function getCustomerContext(userEmail: string): Promise<unknown> {
  console.log('Getting customer context for:', userEmail);
  return callPartnerAPI("get_user_context", { user_email: userEmail });
}

async function getProductDetails(sku: string): Promise<unknown> {
  console.log('Getting product details for SKU:', sku);
  return callPartnerAPI("get_product_details", { sku });
}

async function searchProducts(query: string, vehicleId?: string): Promise<unknown> {
  console.log('Searching products:', query, 'vehicle_id:', vehicleId);
  const payload: Record<string, unknown> = { query };
  if (vehicleId) payload.vehicle_id = vehicleId;
  return callPartnerAPI("search_products", payload);
}

async function checkVehicleFitment(sku: string, vehicleId: string): Promise<unknown> {
  console.log('Checking fitment for SKU:', sku, 'vehicle:', vehicleId);
  return callPartnerAPI("check_vehicle_fitment", { sku, vehicle_id: vehicleId });
}

async function executeToolCall(toolCall: { function: { name: string; arguments: string }; id: string }, apiConfig: ApiConfig): Promise<unknown> {
  const { name, arguments: argsString } = toolCall.function;
  
  try {
    const args = JSON.parse(argsString);
    
    // VALIDATION: Enforce vehicle context rules
    // lookup_vehicle: require plate OR (make + model)
    if (name === "lookup_vehicle") {
      const hasPlate = args.plate && args.plate.trim().length > 0;
      const hasMakeModel = args.make && args.model && args.make.trim().length > 0 && args.model.trim().length > 0;
      
      if (!hasPlate && !hasMakeModel) {
        console.log('[executeToolCall] Rejecting lookup_vehicle - no plate or make/model provided');
        return { 
          error: "NEED_VEHICLE_DETAILS", 
          hint: "Ask the customer for their REGO (license plate) or make/model/year before looking up the vehicle." 
        };
      }
    }
    
    // retrieve_parts: require valid vehicleid
    if (name === "retrieve_parts") {
      const vehicleId = Number(args.vehicleid);
      if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
        console.log('[executeToolCall] Rejecting retrieve_parts - no valid vehicleid:', args.vehicleid);
        return { 
          error: "NEED_VEHICLE_DETAILS", 
          hint: "No vehicle identified yet. Ask the customer for their REGO first." 
        };
      }
    }
    
    // retrieve_service_packages: require valid vehicleid (no random package fetching)
    if (name === "retrieve_service_packages") {
      const vehicleId = Number(args.vehicleid);
      if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
        console.log('[executeToolCall] Rejecting retrieve_service_packages - no valid vehicleid:', args.vehicleid);
        return { 
          error: "NEED_VEHICLE_DETAILS", 
          hint: "No vehicle identified yet. Ask the customer for their REGO first before fetching service packages." 
        };
      }
    }
    
    switch (name) {
      case "lookup_vehicle":
        return await lookupVehicle(args, apiConfig);
      case "search_web":
        return await searchWeb(args.query);
      case "retrieve_parts":
        return await retrieveParts(args.vehicleid, apiConfig, args.part_type);
      case "retrieve_service_packages":
        return await retrieveServicePackages(args.vehicleid, apiConfig);
      case "search_general_products":
        return await searchGeneralProducts(args.query);
      case "add_to_cart":
        return await addToCart(args.user_email, args.items);
      case "get_cart":
        return await getCart(args.user_email);
      case "create_checkout":
        return await createCheckout(args.user_email);
      case "get_customer_context":
        return await getCustomerContext(args.user_email);
      case "get_product_details":
        return await getProductDetails(args.sku);
      case "search_products":
        return await searchProducts(args.query, args.vehicle_id);
      case "check_vehicle_fitment":
        return await checkVehicleFitment(args.sku, args.vehicle_id);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return { error: error instanceof Error ? error.message : "Failed to execute tool" };
  }
}

// Helper function to extract parts from service packages response
function extractPartsFromPackages(packagesResult: unknown): unknown[] {
  const extractedParts: unknown[] = [];
  const result = packagesResult as { success?: boolean; parts?: unknown[]; packages?: Array<{ parts?: unknown[] }> };
  
  // Handle direct parts array
  if (result.parts && Array.isArray(result.parts)) {
    extractedParts.push(...result.parts);
  }
  
  // Handle nested packages structure  
  if (result.packages && Array.isArray(result.packages)) {
    for (const pkg of result.packages) {
      if (pkg && pkg.parts && Array.isArray(pkg.parts)) {
        extractedParts.push(...pkg.parts);
      }
    }
  }
  
  return extractedParts;
}

interface Message {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    };
    finish_reason: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, 
      vehicleContext, 
      customerEmail, 
      autoFetchParts,
      // NEW: Multi-tenant support
      hostConfig,   // { baseUrl, apiKey, partnerCode, customHeaders }
      hostContext   // { user, vehicle, cart, history, currentPage, metadata }
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build API config from hostConfig or use defaults
    const apiConfig = buildApiConfig(hostConfig as HostConfig | undefined);
    
    console.log('Bob chat request received with', messages.length, 'messages');
    if (vehicleContext) {
      console.log('Session vehicle context provided:', JSON.stringify(vehicleContext));
    }
    if (customerEmail) {
      console.log('Customer email from session:', customerEmail);
    }
    if (autoFetchParts) {
      console.log('Auto-fetch parts mode enabled');
    }
    if (hostConfig) {
      console.log('Host config provided:', JSON.stringify({ baseUrl: hostConfig.baseUrl, partnerCode: hostConfig.partnerCode }));
    }
    if (hostContext) {
      console.log('Host context provided:', JSON.stringify(hostContext));
    }

    // Handle auto-fetch parts mode - just fetch parts and packages, no AI response
    if (autoFetchParts && vehicleContext) {
      const vehicleIdRaw = vehicleContext.vehicle_id ?? vehicleContext.id;
      const vehicleId = Number.parseInt(String(vehicleIdRaw), 10);

      if (!Number.isFinite(vehicleId)) {
        throw new Error(`Invalid vehicle_id for auto-fetch: ${vehicleIdRaw}`);
      }

      console.log('Auto-fetching parts for vehicle ID:', vehicleId);
      
      // Create SSE stream for auto-fetch
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      // Fetch parts and packages in parallel
      (async () => {
        try {
          const [partsResult, packagesResult] = await Promise.all([
            retrieveParts(vehicleId, apiConfig),
            retrieveServicePackages(vehicleId, apiConfig)
          ]);

          // Emit parts found event
          const partsData = partsResult as { success?: boolean; parts?: unknown[] };
          if (partsData.success && partsData.parts && partsData.parts.length > 0) {
            console.log('Auto-fetch: Emitting', partsData.parts.length, 'parts');
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "parts_found", parts: partsData.parts })}\n\n`));
          }

          // Emit service packages found event
          const packagesData = packagesResult as { success?: boolean; packages?: unknown[] };
          if (packagesData.success && packagesData.packages && packagesData.packages.length > 0) {
            console.log('Auto-fetch: Emitting', packagesData.packages.length, 'service packages');
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "service_packages_found", packages: packagesData.packages })}\n\n`));
          }

          // Send done
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (error) {
          console.error('Auto-fetch error:', error);
          await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`));
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        }
      })();

      return new Response(stream.readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Load prompts from database and build system prompt
    const dbPrompts = await fetchPromptsFromDB();
    const baseSystemPrompt = buildSystemPromptFromDB(dbPrompts);
    
    // Build enhanced system prompt if vehicle context is provided from session
    let enhancedSystemPrompt = baseSystemPrompt;
    
    if (vehicleContext) {
      const vehicleId = vehicleContext.id || vehicleContext.vehicle_id;
      enhancedSystemPrompt += `\n\n## PRE-CONFIRMED VEHICLE SESSION
The customer has already confirmed their vehicle on CARFIX before arriving here:
- Vehicle ID: ${vehicleId}
- REGO: ${vehicleContext.rego || 'Not provided'}
- Year: ${vehicleContext.year}
- Make: ${vehicleContext.make}
- Model: ${vehicleContext.model}
- Variant: ${vehicleContext.variant || 'Standard'}
- Engine Size: ${vehicleContext.engine_size || 'Unknown'}
- Fuel Type: ${vehicleContext.fuel_type || 'Unknown'}
- CC Rating: ${vehicleContext.cc_rating || 'Unknown'}
- VIN: ${vehicleContext.vin || 'Not provided'}
- Engine Number: ${vehicleContext.engine_no || 'Not provided'}

IMPORTANT RULES FOR THIS SESSION:
1. Do NOT ask for vehicle details, REGO, or make/model - you already have them
2. Skip straight to helping them find parts
3. Use vehicle_id ${vehicleId} for retrieve_parts and retrieve_service_packages calls
4. When mentioning their vehicle, use: "${vehicleContext.year} ${vehicleContext.make} ${vehicleContext.model}"
5. On first parts request, use retrieve_parts with vehicleid=${vehicleId}`;
    }
    
    if (customerEmail) {
      enhancedSystemPrompt += `\n\n## CUSTOMER EMAIL FOR CART/CHECKOUT
Customer email is: ${customerEmail}
Use this email for add_to_cart, get_cart, and create_checkout calls.
Do NOT ask for their email - you already have it.`;
    }

    // Add host context if provided (multi-tenant support)
    const typedHostContext = hostContext as HostContext | undefined;
    if (typedHostContext) {
      enhancedSystemPrompt += `\n\n## HOST CONTEXT (Multi-tenant session)`;
      
      if (typedHostContext.user?.email && !customerEmail) {
        enhancedSystemPrompt += `\nCustomer email: ${typedHostContext.user.email}`;
      }
      if (typedHostContext.user?.name) {
        enhancedSystemPrompt += `\nCustomer name: ${typedHostContext.user.name}`;
      }
      if (typedHostContext.vehicle?.selectedVehicle) {
        const v = typedHostContext.vehicle.selectedVehicle;
        enhancedSystemPrompt += `\nSelected vehicle: ${v.year} ${v.make} ${v.model} (ID: ${v.id || v.vehicle_id})`;
      }
      if (typedHostContext.cart?.itemCount && typedHostContext.cart.itemCount > 0) {
        enhancedSystemPrompt += `\nCart has ${typedHostContext.cart.itemCount} items ($${typedHostContext.cart.totalValue})`;
      }
      if (typedHostContext.history?.lastOrderDate) {
        enhancedSystemPrompt += `\nLast order: ${typedHostContext.history.lastOrderDate}`;
      }
      if (typedHostContext.currentPage) {
        enhancedSystemPrompt += `\nCurrently on page: ${typedHostContext.currentPage}`;
      }
      
      // CRITICAL: Add garage vehicles with EXACT vehicle_ids to prevent AI hallucination
      // When user references a garage vehicle, the AI must use the REAL vehicle_id listed here
      if (typedHostContext.vehicle?.garageVehicles && typedHostContext.vehicle.garageVehicles.length > 0) {
        enhancedSystemPrompt += `\n\n## CUSTOMER'S GARAGE VEHICLES (use these EXACT vehicle_ids!)
CRITICAL: When customer mentions a REGO from their garage, you MUST use the EXACT vehicle_id listed below.
DO NOT invent or hallucinate vehicle_ids - copy the number exactly as shown.
`;
        for (const gv of typedHostContext.vehicle.garageVehicles) {
          const vid = gv.vehicle_id || gv.id;
          enhancedSystemPrompt += `- ${gv.rego}: ${gv.year} ${gv.make} ${gv.model} ${gv.variant || ''} (vehicle_id: ${vid})\n`;
        }
        enhancedSystemPrompt += `\nWhen emitting VEHICLE_CONFIRMED for a garage vehicle, copy the vehicle_id EXACTLY from this list.`;
      }
    }

    // Build conversation with system prompt
    const conversationMessages: Message[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
    ];

    // Tool calling loop - may require multiple iterations
    let loopCount = 0;
    const maxLoops = 5; // Prevent infinite loops
    
    while (loopCount < maxLoops) {
      loopCount++;
      console.log(`Tool calling loop iteration ${loopCount}`);
      
      // Make non-streaming request to check for tool calls
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools: tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.error('Rate limit exceeded');
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          console.error('Payment required');
          return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse: AIResponse = await response.json();
      const assistantMessage = aiResponse.choices[0]?.message;
      const finishReason = aiResponse.choices[0]?.finish_reason;
      
      console.log('AI response finish_reason:', finishReason);
      
      // Check if AI wants to call tools
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log('AI requested tool calls:', assistantMessage.tool_calls.map(tc => tc.function.name));
        
        // Add assistant message with tool calls
        conversationMessages.push({
          role: "assistant",
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        });
        
        // Execute each tool call and add results
        let partsFoundResult: unknown[] | null = null;
        let confirmedVehicleId: number | null = null;
        
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`Executing tool: ${toolCall.function.name}`);
          const result = await executeToolCall(toolCall, apiConfig);
          
        // After vehicle lookup succeeds, auto-fetch ALL parts AND service packages for theatrical display
        if (toolCall.function.name === "lookup_vehicle") {
          const vehicleResult = result as { 
            id?: number; 
            vehicle_id?: number; 
            success?: boolean;
            multiple_matches?: boolean;
            vehicles?: Array<{ id?: number; vehicle_id?: number }>;
            vehicle?: { id?: number; vehicle_id?: number };
          };
          
          // Extract vehicle ID from various response formats
          // Priority: vehicle.id > vehicles array (if single match with ID) > multiple matches
          let vehicleId: number | null = null;
          
          // First check: ID inside confirmed vehicle object (highest priority - REGO lookup)
          if (vehicleResult.vehicle?.id || vehicleResult.vehicle?.vehicle_id) {
            vehicleId = vehicleResult.vehicle.id || vehicleResult.vehicle.vehicle_id || null;
            console.log('Found confirmed vehicle with ID:', vehicleId);
          }
          // Second check: Direct ID on result
          else if (vehicleResult.id || vehicleResult.vehicle_id) {
            vehicleId = vehicleResult.id || vehicleResult.vehicle_id || null;
            console.log('Found direct vehicle ID:', vehicleId);
          }
          // Third check: Single match in vehicles array that has an ID
          else if (vehicleResult.vehicles?.length === 1 && (vehicleResult.vehicles[0].id || vehicleResult.vehicles[0].vehicle_id)) {
            vehicleId = vehicleResult.vehicles[0].id || vehicleResult.vehicles[0].vehicle_id || null;
            console.log('Single vehicle match in array with ID:', vehicleId);
          }
          // Multiple matches without a confirmed vehicle - flag for frontend to show placeholders
          else if (vehicleResult.vehicles?.length && vehicleResult.vehicles.length > 1) {
            console.log(`Multiple vehicle candidates found (${vehicleResult.vehicles.length}), AI will present options to customer`);
            // Flag that we have multiple matches - frontend will show placeholder service packages
            (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = true;
            // Don't set vehicleId - wait for customer to confirm
          }
          
          if (vehicleId && vehicleResult.success !== false) {
            confirmedVehicleId = vehicleId;
            console.log('Single vehicle match with ID, auto-fetching ALL parts and service packages for vehicle:', vehicleId);
            
            // CRITICAL: Store the ACTUAL vehicle ID and data from API lookup
            // This prevents AI hallucination of vehicle_ids in VEHICLE_CONFIRMED markers
            (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId = vehicleId;
            (conversationMessages as unknown as { _lookupVehicleData?: unknown })._lookupVehicleData = vehicleResult.vehicle || vehicleResult;
            console.log(`Stored lookup vehicle ID for later verification: ${vehicleId}`);
            
            // Immediately fetch ALL parts (no filter) for impressive range display
            const allParts = await retrieveParts(vehicleId, apiConfig);
            
            if (allParts.success && allParts.parts && allParts.parts.length > 0) {
              partsFoundResult = allParts.parts;
              console.log(`Auto-loaded ${allParts.parts.length} parts for vehicle`);
            }
            
            // ALSO fetch service packages - store FULL packages for frontend display
            const servicePackagesResult = await retrieveServicePackages(vehicleId, apiConfig);
            const servicePackagesData = servicePackagesResult as { success?: boolean; packages?: unknown[] };
            
            if (servicePackagesData.success && servicePackagesData.packages && servicePackagesData.packages.length > 0) {
              // CRITICAL: Filter packages BEFORE AI sees them - Single Source of Truth
              const displayablePackages = filterDisplayablePackages(servicePackagesData.packages);
              console.log(`[Service Packages] Filtered: ${servicePackagesData.packages.length} -> ${displayablePackages.length} displayable`);
              
              // Store FILTERED packages for emission to frontend AND AI awareness
              (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayablePackages;
              console.log(`Auto-loaded ${displayablePackages.length} displayable service packages for vehicle`);
            }
            
            // Also extract parts from packages for parts display
            const serviceParts = extractPartsFromPackages(servicePackagesResult);
            if (serviceParts.length > 0) {
              partsFoundResult = partsFoundResult ? [...partsFoundResult, ...serviceParts] : serviceParts;
              console.log(`Auto-loaded ${serviceParts.length} additional parts from service packages`);
            }
          }
        }
        
        // Capture parts results for later emission (from explicit retrieve_parts calls)
        if (toolCall.function.name === "retrieve_parts") {
          const partsResult = result as { success?: boolean; parts?: unknown[]; filter_applied?: string };
          
          // Parse args to check if filter was applied
          let filterApplied: string | undefined;
          try {
            const args = JSON.parse(toolCall.function.arguments) as { part_type?: string };
            filterApplied = args.part_type;
          } catch { /* ignore */ }
          
          if (partsResult.success && partsResult.parts && partsResult.parts.length > 0) {
            // Merge parts (don't replace - might have service package parts already)
            partsFoundResult = partsFoundResult ? [...partsFoundResult, ...partsResult.parts] : partsResult.parts;
            console.log(`Added ${partsResult.parts.length} parts from retrieve_parts call`);
          } else if (filterApplied) {
            // FALLBACK: API returned empty with filter - search already-loaded parts
            console.log(`retrieve_parts returned 0 results for filter: "${filterApplied}"`);
            
            // Search already-loaded parts from _partsToEmit
            const existingParts = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit || [];
            const servicePackages = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit || [];
            
            // Fuzzy keyword matching
            const filterLower = filterApplied.toLowerCase();
            const keywords = filterLower.split(/\s+/).filter(k => k.length > 2);
            
            const matchingParts: unknown[] = [];
            
            // Search existing parts
            if (existingParts.length > 0) {
              for (const p of existingParts) {
                const part = p as Record<string, unknown>;
                const category = (part.partslot_description || part['Part Product Type'] || '').toString().toLowerCase();
                const name = (part.web_description || part.name || '').toString().toLowerCase();
                
                // Match if ALL keywords appear in category or name
                if (keywords.every(kw => category.includes(kw) || name.includes(kw))) {
                  matchingParts.push(part);
                }
              }
            }
            
            // Also search parts within service packages
            if (servicePackages.length > 0) {
              for (const pkg of servicePackages) {
                const pkgData = pkg as { title?: string; partslots?: Array<{ partslot_description?: string; products?: { quality_tiers?: Record<string, unknown[]> } }> };
                const pkgTitle = (pkgData.title || '').toLowerCase();
                
                // Check if package title matches keywords (e.g., "Front Brake Service" for "brake pads")
                const titleMatches = keywords.every(kw => pkgTitle.includes(kw));
                
                for (const slot of (pkgData.partslots || [])) {
                  const slotDesc = (slot.partslot_description || '').toLowerCase();
                  const slotMatches = keywords.every(kw => slotDesc.includes(kw));
                  
                  if (titleMatches || slotMatches) {
                    // Extract products from this slot
                    const tiers = slot.products?.quality_tiers;
                    if (tiers) {
                      for (const tier of Object.values(tiers)) {
                        if (Array.isArray(tier)) {
                          matchingParts.push(...tier);
                        }
                      }
                    }
                  }
                }
              }
            }
            
            if (matchingParts.length > 0) {
              console.log(`Fallback search found ${matchingParts.length} matching parts from already-loaded inventory`);
              partsFoundResult = partsFoundResult ? [...partsFoundResult, ...matchingParts] : matchingParts;
              
              // Update tool result so AI knows parts were found
              (result as Record<string, unknown>).parts = matchingParts;
              (result as Record<string, unknown>).success = true;
              (result as Record<string, unknown>).note = `Found ${matchingParts.length} matching parts from pre-loaded inventory (filter "${filterApplied}" matched)`;
            } else {
              console.log(`Fallback search found no matching parts for filter: "${filterApplied}"`);
            }
          }
        }
        
        // Also capture service packages AND extract parts from them
        if (toolCall.function.name === "retrieve_service_packages") {
          const packagesResult = result as { success?: boolean; packages?: unknown[] };
          
          // CRITICAL: Filter packages BEFORE storing - Single Source of Truth
          if (packagesResult.success && packagesResult.packages && packagesResult.packages.length > 0) {
            const displayablePackages = filterDisplayablePackages(packagesResult.packages);
            console.log(`[Service Packages] Filtered: ${packagesResult.packages.length} -> ${displayablePackages.length} displayable`);
            
            // Store FILTERED packages - AI and display see the same data
            (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayablePackages;
            
            // Also update the tool result so AI knows the filtered count
            (result as Record<string, unknown>).packages = displayablePackages;
            (result as Record<string, unknown>).filtered_count = packagesResult.packages.length - displayablePackages.length;
            (result as Record<string, unknown>).note = displayablePackages.length > 0 
              ? `${displayablePackages.length} service packages available for customer`
              : "No service packages with valid pricing available for this vehicle";
            
            console.log(`Stored ${displayablePackages.length} displayable service packages for emission`);
          }
          
          // Also extract parts from packages for parts display
          const extractedParts = extractPartsFromPackages(result);
          if (extractedParts.length > 0) {
            console.log(`Adding ${extractedParts.length} parts from service packages to results`);
            partsFoundResult = partsFoundResult ? [...partsFoundResult, ...extractedParts] : extractedParts;
          }
        }
        
        // Capture cart updates for emission to frontend
        if (toolCall.function.name === "add_to_cart") {
          const cartResult = result as { success?: boolean; items_added?: number; error?: string };
          if (cartResult.success) {
            // Parse the items that were added from the original args
            try {
              const cartArgs = JSON.parse(toolCall.function.arguments) as { items?: CartItem[] };
              if (cartArgs.items && cartArgs.items.length > 0) {
                const cartItems = cartArgs.items.map(item => ({
                  productName: item.product_name,
                  quantity: item.quantity
                }));
                (conversationMessages as unknown as { _cartItemsToEmit?: typeof cartItems })._cartItemsToEmit = cartItems;
                console.log(`Cart updated: ${cartItems.length} items to emit`);
              }
            } catch (e) {
              console.error('Failed to parse cart args for emission:', e);
            }
          }
        }
        
        conversationMessages.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
      
      // Deduplicate parts by SKU before storing for emission
      if (partsFoundResult && partsFoundResult.length > 0) {
        const uniqueParts = Array.from(
          new Map(partsFoundResult.map((p: unknown) => [(p as Record<string, unknown>).SKU, p])).values()
        );
        console.log(`Deduplicated parts: ${partsFoundResult.length} -> ${uniqueParts.length} unique`);
        (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = uniqueParts;
      }
        
        // Continue loop to get AI's response to tool results
        continue;
      }
      
      // No tool calls - AI has final response
      // BUT FIRST: Check if the AI's response contains VEHICLE_CONFIRMED marker
      // This happens when customer confirms a vehicle from multiple matches
      const aiContent = assistantMessage?.content || "";
      const vehicleConfirmedMatch = aiContent.match(/\[VEHICLE_CONFIRMED:(\{[\s\S]*?\})\]/);
      
      if (vehicleConfirmedMatch) {
        try {
          const confirmedVehicle = JSON.parse(vehicleConfirmedMatch[1]);
          let vehicleId = confirmedVehicle.vehicle_id || confirmedVehicle.id;
          
          // CRITICAL: Override AI's potentially hallucinated vehicle_id with ACTUAL lookup result
          const storedVehicleId = (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId;
          const storedVehicleData = (conversationMessages as unknown as { _lookupVehicleData?: unknown })._lookupVehicleData;
          
          if (storedVehicleId && storedVehicleId !== vehicleId) {
            console.warn(`AI HALLUCINATED vehicle_id: ${vehicleId} - OVERRIDING with actual lookup ID: ${storedVehicleId}`);
            vehicleId = storedVehicleId;
            confirmedVehicle.vehicle_id = storedVehicleId;
            // Merge in correct vehicle data from actual lookup
            if (storedVehicleData) {
              Object.assign(confirmedVehicle, storedVehicleData);
            }
          }
          
          // GARAGE VEHICLE CROSS-REFERENCE: If no lookup was done (AI skipped it for garage vehicles),
          // check if the rego matches a garage vehicle and use its REAL vehicle_id
          const garageVehicles = typedHostContext?.vehicle?.garageVehicles || [];
          if (!storedVehicleId && confirmedVehicle.rego && garageVehicles.length > 0) {
            const garageMatch = garageVehicles.find((gv: Record<string, unknown>) => 
              String(gv.rego).toUpperCase() === String(confirmedVehicle.rego).toUpperCase()
            );
            
            if (garageMatch) {
              const realGarageVehicleId = garageMatch.vehicle_id || garageMatch.id;
              if (realGarageVehicleId && realGarageVehicleId !== vehicleId) {
                console.warn(`GARAGE OVERRIDE: AI used vehicle_id ${vehicleId}, actual garage vehicle_id: ${realGarageVehicleId}`);
                vehicleId = realGarageVehicleId as number;
                confirmedVehicle.vehicle_id = realGarageVehicleId;
                // Merge correct vehicle data from garage
                Object.assign(confirmedVehicle, {
                  make: garageMatch.make || confirmedVehicle.make,
                  model: garageMatch.model || confirmedVehicle.model,
                  year: garageMatch.year || confirmedVehicle.year,
                  variant: garageMatch.variant || confirmedVehicle.variant,
                  engine_size: garageMatch.engine_size || confirmedVehicle.engine_size,
                  fuel_type: garageMatch.fuel_type || confirmedVehicle.fuel_type,
                  rego: garageMatch.rego || confirmedVehicle.rego,
                });
                console.log(`Using corrected garage vehicle data for ${confirmedVehicle.rego}`);
              }
            }
          }
          
          if (vehicleId) {
            console.log(`Detected VEHICLE_CONFIRMED in AI response, using vehicle_id: ${vehicleId}`);
            
            // STORE the confirmed vehicle for emission in streaming handler
            // This ensures the same vehicle ID used for parts/packages is sent to frontend
            (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = confirmedVehicle;
            
            // OPTIMIZATION: Only fetch parts/packages if NOT already loaded by lookup_vehicle auto-fetch
            const alreadyLoadedParts = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit;
            const alreadyLoadedPackages = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit;
            
            if (alreadyLoadedParts && alreadyLoadedParts.length > 0) {
              console.log(`Parts already loaded (${alreadyLoadedParts.length} parts) - skipping duplicate fetch`);
            } else {
              console.log('No parts loaded yet - fetching for confirmed vehicle...');
              const allParts = await retrieveParts(vehicleId, apiConfig);
              if (allParts.success && allParts.parts && allParts.parts.length > 0) {
                console.log(`Fetched ${allParts.parts.length} parts for confirmed vehicle`);
                (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = allParts.parts;
              }
            }
            
            if (alreadyLoadedPackages && alreadyLoadedPackages.length > 0) {
              console.log(`Service packages already loaded (${alreadyLoadedPackages.length}) - skipping duplicate fetch`);
            } else {
              console.log('No service packages loaded yet - fetching...');
              const servicePackagesResult = await retrieveServicePackages(vehicleId, apiConfig);
              const servicePackagesData = servicePackagesResult as { success?: boolean; packages?: unknown[] };
              
              if (servicePackagesData.success && servicePackagesData.packages && servicePackagesData.packages.length > 0) {
                // CRITICAL: Filter packages BEFORE storing - Single Source of Truth
                const displayablePackages = filterDisplayablePackages(servicePackagesData.packages);
                console.log(`[Service Packages] Filtered: ${servicePackagesData.packages.length} -> ${displayablePackages.length} displayable`);
                (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayablePackages;
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse VEHICLE_CONFIRMED marker in AI response:', e);
        }
      }
      
      // ============= SINGLE SOURCE OF TRUTH: Inject Display Context into AI =============
      // This ensures AI only references products/packages that the customer can actually see
      const displayedPackages = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit || [];
      const displayedParts = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit || [];
      
      if (displayedPackages.length > 0 || displayedParts.length > 0) {
        const packageSummary = displayedPackages.length > 0 
          ? `SERVICE PACKAGES (${displayedPackages.length}):\n${(displayedPackages as any[]).map(p => `- ${p.title}: $${p.from_price}`).join('\n')}`
          : 'No service packages displayed.';
        
        const partsSummary = displayedParts.length > 0 
          ? `PARTS: ${displayedParts.length} individual parts available` 
          : '';
        
        const displayContext = `[CUSTOMER DISPLAY STATE - WHAT THE CUSTOMER SEES RIGHT NOW]
The customer's shelf currently shows:

${packageSummary}
${partsSummary}

IMPORTANT: Only reference products/packages from this list with these EXACT prices. If the customer asks about something not shown above, explain it's not available for their vehicle and suggest alternatives from what IS displayed.`;
        
        // Add as system context message right before streaming
        conversationMessages.push({
          role: "system",
          content: displayContext
        });
        console.log(`[Display Context] Injected context: ${displayedPackages.length} packages, ${displayedParts.length} parts`);
      }
      
      console.log('Streaming final response');
      
      // Make streaming request for final response
      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error("Streaming error:", streamResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Streaming error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log('Streaming response from AI gateway');
      
      // Transform the stream to extract vehicle markers and emit structured events
      const reader = streamResponse.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      // Check if we have parts to emit from tool calls
      const partsToEmit = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit;
      
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformedStream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let accumulatedContent = ""; // Accumulate ALL content for marker detection
          let vehicleEmitted = false;
          let partsEmitted = false;
          
          // Check if we have a confirmed vehicle stored from the first AI response
          // This ensures the vehicle ID matches what was used for parts/packages fetch
          const confirmedVehicleStored = (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle;
          
          // Emit stored confirmed vehicle FIRST (before parts/packages)
          if (confirmedVehicleStored) {
            const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: confirmedVehicleStored })}\n\n`;
            controller.enqueue(encoder.encode(vehicleEvent));
            console.log("Emitted vehicle_identified event from stored data:", confirmedVehicleStored);
            vehicleEmitted = true; // Skip re-detecting from stream content
          }
          
          // Check if we have service packages to emit from tool calls
          const servicePackagesToEmit = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit;
          
          // Check if multiple vehicles found (to show placeholder packages)
          const multipleVehiclesFound = (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound;
          
          // Emit multiple_vehicles_found event so frontend shows placeholder packages
          if (multipleVehiclesFound) {
            const multipleEvent = `data: ${JSON.stringify({ type: "multiple_vehicles_found" })}\n\n`;
            controller.enqueue(encoder.encode(multipleEvent));
            console.log("Emitted multiple_vehicles_found event");
          }
          
          // Track emitted package IDs to prevent duplicates across emissions
          const emittedPackageIds = new Set<string>();
          
          // Helper to calculate minimum package price from partslots
          const calculatePackageMinPrice = (partslots: any[]): number => {
            if (!partslots || !Array.isArray(partslots) || partslots.length === 0) {
              console.log('[Price Calc] Empty or invalid partslots array');
              return 0;
            }
            
            let total = 0;
            let slotsWithProducts = 0;
            
            for (const slot of partslots) {
              const tiers = slot?.products?.quality_tiers;
              if (!tiers) {
                console.log('[Price Calc] Slot has no quality_tiers:', slot?.partslot_description || slot?.name);
                continue;
              }
              
              // Get cheapest product from any tier (prefer Standard)
              const tierOrder = ['Standard', 'Economy', 'Premium', 'Performance'];
              let slotMinPrice = 0;
              
              for (const tier of tierOrder) {
                const products = tiers[tier];
                if (products && Array.isArray(products) && products.length > 0) {
                  const validPrices = products
                    .map((p: any) => p.price || 0)
                    .filter((price: number) => price > 0);
                  
                  if (validPrices.length > 0) {
                    slotMinPrice = Math.min(...validPrices);
                    total += slotMinPrice;
                    slotsWithProducts++;
                    break; // Found price for this slot, move to next
                  }
                }
              }
              
              if (slotMinPrice === 0) {
                console.warn(`[Price Calc] Slot "${slot?.partslot_description || slot?.name}" has no valid products in any tier`);
              }
            }
            
            console.log(`[Price Calc] Total: $${total.toFixed(2)} from ${slotsWithProducts}/${partslots.length} slots`);
            return total;
          };

          // Process service packages: use preparedTiers price first, fallback to partslots
          let packagesToSend = servicePackagesToEmit;
          if (packagesToSend && packagesToSend.length > 0) {
            const packagesWithPrices = packagesToSend.map((pkg: any) => {
              if (!pkg || !pkg.id) {
                console.warn('[Packages] Skipping package without ID');
                return null;
              }
              
              // Skip if already emitted (global deduplication)
              if (emittedPackageIds.has(pkg.id)) {
                console.log(`[Packages] Skipping duplicate package: ${pkg.id}`);
                return null;
              }
              
              // PRIORITY 1: Use preparedTiers totalPrice (server-calculated, most accurate)
              if (pkg.preparedTiers && Array.isArray(pkg.preparedTiers)) {
                const visibleTiers = pkg.preparedTiers.filter((t: any) => !t.isHidden);
                if (visibleTiers.length > 0) {
                  const minPrice = Math.min(...visibleTiers.map((t: any) => t.totalPrice || 0));
                  if (minPrice > 0) {
                    console.log(`[Packages] Using preparedTiers price for "${pkg.title}": $${minPrice.toFixed(2)}`);
                    return { ...pkg, from_price: pkg.from_price || minPrice };
                  }
                }
              }
              
              // PRIORITY 2: Use existing from_price if set
              if (pkg.from_price && pkg.from_price > 0) {
                return pkg;
              }
              
              // PRIORITY 3: Legacy fallback - calculate from partslots
              const calculatedPrice = calculatePackageMinPrice(pkg.partslots);
              if (calculatedPrice > 0) {
                console.log(`[Packages] Calculated legacy price for "${pkg.title}": $${calculatedPrice.toFixed(2)}`);
                return { ...pkg, from_price: calculatedPrice };
              }
              
              console.warn(`[Packages] Skipping package "${pkg.title}" - no price in preparedTiers or partslots`);
              return null;
            }).filter(Boolean);
            
            // Mark all packages as emitted
            packagesWithPrices.forEach((pkg: any) => {
              if (pkg?.id) emittedPackageIds.add(pkg.id);
            });
            
            console.log(`[Packages] Processed: ${packagesToSend.length} -> ${packagesWithPrices.length} (after dedup & price validation)`);
            packagesToSend = packagesWithPrices;
          }
          
          // Emit service_packages_found event FIRST (before parts) for synchronized display
          if (packagesToSend && packagesToSend.length > 0) {
            const packagesEvent = `data: ${JSON.stringify({ type: "service_packages_found", packages: packagesToSend })}\n\n`;
            controller.enqueue(encoder.encode(packagesEvent));
            console.log("Emitted service_packages_found event:", packagesToSend.length, "packages");
          }
          
          // Check if we have cart items to emit from add_to_cart tool call
          const cartItemsToEmit = (conversationMessages as unknown as { _cartItemsToEmit?: Array<{ productName: string; quantity: number }> })._cartItemsToEmit;
          
          // Emit cart_updated event if items were added
          if (cartItemsToEmit && cartItemsToEmit.length > 0) {
            const cartEvent = `data: ${JSON.stringify({ type: "cart_updated", items: cartItemsToEmit })}\n\n`;
            controller.enqueue(encoder.encode(cartEvent));
            console.log("Emitted cart_updated event:", cartItemsToEmit.length, "items");
          }
          
          // Emit parts_found event immediately if we have parts from tool call
          if (partsToEmit && partsToEmit.length > 0) {
            const partsEvent = `data: ${JSON.stringify({ type: "parts_found", parts: partsToEmit })}\n\n`;
            controller.enqueue(encoder.encode(partsEvent));
            console.log("Emitted parts_found event:", partsToEmit.length, "parts");
            partsEmitted = true;
            
            // NEW: Also emit bob_suggestions for inline display in chat
            // Transform parts to Product format for frontend BobSuggestions component
            const transformPartToProduct = (part: Record<string, unknown>) => ({
              id: (part.sku || part.SKU || `part-${Math.random()}`) as string,
              sku: (part.sku || part.SKU) as string,
              name: (part.name || part.web_description || 'Product') as string,
              brand: (part.brand || part.Brand) as string,
              price: (part.price || part.Price || part['Metro Retail Price'] || 0) as number,
              part_number: (part.part_number || part['Part Number']) as string,
              partNumber: (part.part_number || part['Part Number']) as string,
              partslotDescription: (part.partslot_description || part['Part Product Type']) as string,
              partslot_description: (part.partslot_description || part['Part Product Type']) as string,
              image_url: `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${part.sku || part.SKU}.jpg`,
              per_car_qty: (part.per_car_qty || part['Per Car Qty'] || 1) as number,
              quantity: (part.per_car_qty || part['Per Car Qty'] || 1) as number,
              ic3_code: (part.ic3_code || part['IC3 Code']) as string,
              web_description: (part.web_description || part['Web Description']) as string,
            });
            
            const confirmedVehicle = (conversationMessages as unknown as { _confirmedVehicle?: Record<string, unknown> })._confirmedVehicle;
            const vehicleName = confirmedVehicle 
              ? `${confirmedVehicle.year || ''} ${confirmedVehicle.make || ''} ${confirmedVehicle.model || ''}`.trim()
              : 'your vehicle';
            
            // Determine part type from loaded parts for contextual title
            const firstPart = partsToEmit[0] as Record<string, unknown>;
            const partType = (firstPart?.partslot_description || firstPart?.['Part Product Type'] || 'Parts') as string;
            
            // Transform to Product format for BobSuggestions component
            const transformedProducts = partsToEmit.slice(0, 6).map((p: unknown) => transformPartToProduct(p as Record<string, unknown>));
            
            const suggestionsEvent = `data: ${JSON.stringify({ 
              type: "bob_suggestions", 
              products: transformedProducts,
              title: `${partType} for ${vehicleName}`,
              partType: partType
            })}\n\n`;
            controller.enqueue(encoder.encode(suggestionsEvent));
            console.log("Emitted bob_suggestions event:", transformedProducts.length, "products (transformed to Product format)");
          } else {
            // No parts found - emit event so frontend can clear loading state
            const noPartsEvent = `data: ${JSON.stringify({ type: "no_parts_found" })}\n\n`;
            controller.enqueue(encoder.encode(noPartsEvent));
            console.log("Emitted no_parts_found event");
          }
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Before closing, check if we have a complete vehicle marker that wasn't detected
                if (!vehicleEmitted) {
                  // Use regex that handles nested JSON with any characters
                  const markerRegex = /\[VEHICLE_CONFIRMED:(\{[\s\S]*?\})\]/;
                  const markerMatch = accumulatedContent.match(markerRegex);
                  if (markerMatch) {
                    try {
                      let vehicleData = JSON.parse(markerMatch[1]);
                      
                      // CRITICAL: Validate against actual lookup data to prevent hallucination (same as in-stream)
                      const storedVehicleId = (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId;
                      const storedVehicleData = (conversationMessages as unknown as { _lookupVehicleData?: Record<string, unknown> })._lookupVehicleData;
                      const preProcessedVehicle = (conversationMessages as unknown as { _confirmedVehicle?: Record<string, unknown> })._confirmedVehicle;
                      
                      if (preProcessedVehicle) {
                        vehicleData = preProcessedVehicle;
                      } else if (storedVehicleId) {
                        vehicleData.vehicle_id = storedVehicleId;
                        vehicleData.id = storedVehicleId;
                        if (storedVehicleData) {
                          vehicleData.make = storedVehicleData.make || vehicleData.make;
                          vehicleData.model = storedVehicleData.model || vehicleData.model;
                          vehicleData.year = storedVehicleData.year || vehicleData.year;
                          vehicleData.rego = storedVehicleData.plate || storedVehicleData.rego || vehicleData.rego;
                        }
                      }
                      
                      const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: vehicleData })}\n\n`;
                      controller.enqueue(encoder.encode(vehicleEvent));
                      console.log("Emitted vehicle_identified event (end of stream, validated):", vehicleData);
                      vehicleEmitted = true;
                    } catch (e) {
                      console.error("Failed to parse vehicle marker at stream end:", e);
                    }
                  }
                }
                
                // NEW: Parse products from Bob's response text for inline display
                // This enables inline products when Bob recalls from memory without re-fetching
                if (!partsEmitted && accumulatedContent.length > 0) {
                  try {
                    // Pattern 1: **BRAND Product Name** (SKU: ABC123) - for $XX.XX
                    const pattern1 = /\*\*([A-Z][A-Za-z0-9\s&'-]+?)\s+([^*]+?)\*\*\s*\(SKU:\s*([A-Z0-9-]+)\)\s*[-–—]\s*(?:for\s*)?\$(\d+(?:\.\d{2})?)/gi;
                    
                    // Pattern 2: BRAND Product Name (SKU: ABC123) - $XX.XX (without bold)
                    const pattern2 = /(?:^|\n)\s*[-•*]?\s*([A-Z][A-Za-z0-9\s&'-]+?)\s+([A-Za-z0-9\s]+?)\s*\(SKU:\s*([A-Z0-9-]+)\)\s*[-–—]\s*\$(\d+(?:\.\d{2})?)/gi;
                    
                    // Pattern 3: SKU: ABC123 - BRAND Product - $XX.XX
                    const pattern3 = /SKU:\s*([A-Z0-9-]+)\s*[-–—]\s*([A-Z][A-Za-z0-9\s&'-]+?)\s+([A-Za-z0-9\s]+?)\s*[-–—]\s*\$(\d+(?:\.\d{2})?)/gi;
                    
                    const parsedProducts: Array<{
                      id: string;
                      sku: string;
                      name: string;
                      brand: string;
                      price: number;
                      part_number: string;
                      partslotDescription: string;
                      image_url: string;
                      per_car_qty: number;
                      quantity: number;
                    }> = [];
                    const seenSkus = new Set<string>();
                    
                    // Try pattern 1 first (most common format with bold)
                    let matches = [...accumulatedContent.matchAll(pattern1)];
                    for (const match of matches) {
                      const [, brand, name, sku, priceStr] = match;
                      if (seenSkus.has(sku)) continue;
                      seenSkus.add(sku);
                      
                      parsedProducts.push({
                        id: sku,
                        sku: sku,
                        name: `${brand.trim()} ${name.trim()}`,
                        brand: brand.trim(),
                        price: parseFloat(priceStr),
                        part_number: sku,
                        partslotDescription: '',
                        image_url: `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${sku}.jpg`,
                        per_car_qty: 1,
                        quantity: 1,
                      });
                    }
                    
                    // Try pattern 2 if no matches yet
                    if (parsedProducts.length === 0) {
                      matches = [...accumulatedContent.matchAll(pattern2)];
                      for (const match of matches) {
                        const [, brand, name, sku, priceStr] = match;
                        if (seenSkus.has(sku)) continue;
                        seenSkus.add(sku);
                        
                        parsedProducts.push({
                          id: sku,
                          sku: sku,
                          name: `${brand.trim()} ${name.trim()}`,
                          brand: brand.trim(),
                          price: parseFloat(priceStr),
                          part_number: sku,
                          partslotDescription: '',
                          image_url: `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${sku}.jpg`,
                          per_car_qty: 1,
                          quantity: 1,
                        });
                      }
                    }
                    
                    // Try pattern 3 if still no matches
                    if (parsedProducts.length === 0) {
                      matches = [...accumulatedContent.matchAll(pattern3)];
                      for (const match of matches) {
                        const [, sku, brand, name, priceStr] = match;
                        if (seenSkus.has(sku)) continue;
                        seenSkus.add(sku);
                        
                        parsedProducts.push({
                          id: sku,
                          sku: sku,
                          name: `${brand.trim()} ${name.trim()}`,
                          brand: brand.trim(),
                          price: parseFloat(priceStr),
                          part_number: sku,
                          partslotDescription: '',
                          image_url: `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${sku}.jpg`,
                          per_car_qty: 1,
                          quantity: 1,
                        });
                      }
                    }
                    
                    if (parsedProducts.length > 0) {
                      console.log(`[Product Parse] Found ${parsedProducts.length} products in Bob's response text`);
                      
                      const suggestionsEvent = `data: ${JSON.stringify({ 
                        type: "bob_suggestions", 
                        products: parsedProducts.slice(0, 6),
                        title: "Products",
                        partType: "Parts"
                      })}\n\n`;
                      controller.enqueue(encoder.encode(suggestionsEvent));
                      console.log("[Product Parse] Emitted bob_suggestions from parsed text:", parsedProducts.length, "products");
                    }
                  } catch (parseError) {
                    console.warn('[Product Parse] Failed to parse products from response:', parseError);
                  }
                }
                
                // Flush any remaining buffer
                if (buffer.trim()) {
                  controller.enqueue(encoder.encode(buffer));
                }
                break;
              }
              
              buffer += decoder.decode(value, { stream: true });
              
              // Process complete lines
              let newlineIndex;
              while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) {
                  controller.enqueue(encoder.encode(line + "\n"));
                  continue;
                }
                
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  controller.enqueue(encoder.encode(line + "\n"));
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  
                  if (content) {
                    // Accumulate content for cross-chunk marker detection
                    accumulatedContent += content;
                    
                    // Check accumulated content for complete vehicle marker
                    // Use regex that handles nested JSON - match from [ to ] including any characters
                    const markerRegex = /\[VEHICLE_CONFIRMED:(\{[\s\S]*?\})\]/;
                    const markerMatch = accumulatedContent.match(markerRegex);
                    
                    if (!vehicleEmitted && markerMatch) {
                      try {
                        let vehicleData = JSON.parse(markerMatch[1]);
                        
                        // CRITICAL: Validate against actual lookup data to prevent hallucination
                        const storedVehicleId = (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId;
                        const storedVehicleData = (conversationMessages as unknown as { _lookupVehicleData?: Record<string, unknown> })._lookupVehicleData;
                        const preProcessedVehicle = (conversationMessages as unknown as { _confirmedVehicle?: Record<string, unknown> })._confirmedVehicle;
                        
                        // Priority: Use pre-processed vehicle (already validated) > stored lookup data > AI's data
                        if (preProcessedVehicle) {
                          console.log("Using pre-processed (validated) vehicle data instead of streaming marker");
                          vehicleData = preProcessedVehicle;
                        } else if (storedVehicleId) {
                          const aiVehicleId = vehicleData.vehicle_id || vehicleData.id;
                          if (aiVehicleId !== storedVehicleId) {
                            console.warn(`STREAM HALLUCINATION BLOCKED: AI emitted vehicle_id ${aiVehicleId}, actual is ${storedVehicleId}`);
                          }
                          // Override with actual lookup data
                          vehicleData.vehicle_id = storedVehicleId;
                          vehicleData.id = storedVehicleId;
                          if (storedVehicleData) {
                            // Merge verified fields from actual API response
                            vehicleData.make = storedVehicleData.make || vehicleData.make;
                            vehicleData.model = storedVehicleData.model || vehicleData.model;
                            vehicleData.year = storedVehicleData.year || vehicleData.year;
                            vehicleData.variant = storedVehicleData.variant || vehicleData.variant;
                            vehicleData.rego = storedVehicleData.plate || storedVehicleData.rego || vehicleData.rego;
                            vehicleData.engine_size = storedVehicleData.engine_size || storedVehicleData.cc_rating || vehicleData.engine_size;
                            vehicleData.fuel_type = storedVehicleData.fuel_type || vehicleData.fuel_type;
                            vehicleData.vin = storedVehicleData.vin || vehicleData.vin;
                            vehicleData.engine_no = storedVehicleData.engine_no || vehicleData.engine_no;
                          }
                          console.log("Stream vehicle data corrected with lookup data:", vehicleData);
                        }
                        
                        // Emit vehicle_identified event with validated data
                        const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: vehicleData })}\n\n`;
                        controller.enqueue(encoder.encode(vehicleEvent));
                        console.log("Emitted vehicle_identified event (validated):", vehicleData);
                        vehicleEmitted = true;
                        
                        // Remove marker from accumulated content
                        accumulatedContent = accumulatedContent.replace(markerMatch[0], "");
                        
                        // Also remove from current chunk content if present
                        const cleanContent = content.replace(markerRegex, "");
                        if (cleanContent.trim()) {
                          parsed.choices[0].delta.content = cleanContent;
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n`));
                        }
                        continue;
                      } catch (e) {
                        console.error("Failed to parse vehicle marker:", e);
                      }
                    }
                  }
                  
                  // Pass through unchanged
                  controller.enqueue(encoder.encode(line + "\n"));
                } catch {
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              }
            }
          } catch (error) {
            console.error("Stream transform error:", error);
            controller.error(error);
          } finally {
            controller.close();
          }
        }
      });
      
      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // If we hit max loops, return an error
    console.error('Max tool calling loops reached');
    return new Response(JSON.stringify({ error: "Max tool calling iterations reached" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("Bob chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
