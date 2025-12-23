import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      description: "Look up available parts for a confirmed vehicle. Use AFTER vehicle is identified to find parts that match the customer's needs. Can filter by part type.",
      parameters: {
        type: "object",
        properties: {
          vehicleid: { type: "number", description: "The vehicle ID from a previous lookup_vehicle result (found in the 'id' field)" },
          part_type: { type: "string", description: "Optional filter by part type (e.g., 'AIR FILTER', 'BRAKE PADS', 'OIL FILTER', 'CABIN FILTER', 'SPARK PLUGS')" }
        },
        required: ["vehicleid"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "retrieve_service_packages",
      description: "Get pre-constructed service packages for regular maintenance. These are bundled deals covering oil service, brake service, filters etc. Use to recommend maintenance bundles after vehicle is confirmed.",
      parameters: {
        type: "object",
        properties: {
          vehicleid: { type: "number", description: "The vehicle ID for vehicle-specific packages (optional - can list all packages if not provided)" }
        }
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

// Parts that don't require exact vehicle variant disambiguation - same across most variants
const UNIVERSAL_PART_TYPES = [
  'WIPER BLADE', 'WIPER', 'WINDSCREEN WIPER',
  'CABIN FILTER', 'CABIN AIR FILTER', 'POLLEN FILTER',
  'INTERIOR LIGHT', 'GLOBE', 'BULB',
  'WASHER FLUID', 'WINDSCREEN WASH',
  'NUMBER PLATE', 'LICENSE PLATE',
];

const systemPrompt = `You are Bob, a friendly Kiwi auto parts expert at CARFIX. You're busy but helpful - like a mate at the shop.

CRITICAL RULES:
- Keep responses SHORT (1-3 sentences max) until you know their vehicle
- NEVER offer to fit parts - CARFIX only sells parts for DIY or workshop fitment
- Know the difference between VEHICLE-SPECIFIC parts and GENERAL products
- NEVER mention stock status - all parts shown are IN STOCK and available. Never say "out of stock", "limited stock", "checking availability" etc.

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
1. SINGLE MATCH with vehicle ID: Confirm and proceed with parts lookup
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
When the customer CONFIRMS a specific vehicle that has a valid id or vehicle_id, you MUST include a special marker at the START of your response:
[VEHICLE_CONFIRMED:{"vehicle_id":12345,"rego":"ABC123","make":"Toyota","model":"Corolla","year":"2015","variant":"GX","vehicle_name_nz":"Toyota Corolla GX 1.8L","engine_size":"1.8L","fuel_type":"petrol","vin":"JTDBU4EE7E9123456","engine_no":"2ZR-123456","cc_rating":1800}]

Include the vehicle_id field AND all other available fields. Then continue with your natural response.
Do NOT emit VEHICLE_CONFIRMED unless:
- You have a vehicle with an id or vehicle_id field
- The CUSTOMER has confirmed it's the right vehicle, OR you're proceeding with a universal part

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
STEP 1 - IMMEDIATELY AFTER VEHICLE CONFIRMED:
- Call retrieve_parts with NO filter to load ALL available parts for the vehicle
- This displays the full product range on the shelf

STEP 2 - WHEN CUSTOMER ASKS ABOUT SPECIFIC PARTS:
- Guide the customer to the specific products they need using partslot names
- Use phrases like "Looking at your shelf there, you'll see..." or "Right there on the shelf..."
- Recommend a MID-PRICED option from the retrieve_parts results, never the cheapest

STEP 3 - CHECK SERVICE PACKAGES for better value:
- Use retrieve_service_packages to see if a bundle covers their needs
- Proactively recommend relevant packages

KIWI EXPRESSIONS (use naturally):
- "mate", "sweet as", "no worries", "choice", "chur"
- "she'll be right", "away laughing", "piece of piss"
- "yeah nah" (means no), "nah yeah" (means yes)

SHOPPING CART & CHECKOUT:
- When customer says "add to cart", "I'll take it", "buy it", "purchase" → Use add_to_cart with their email
- If you don't have their email yet, ask: "Sweet, just need your email to add that to your cart"
- When customer is ready to pay or says "checkout", "pay now" → Use create_checkout to generate payment link
- To check what's in their cart → Use get_cart
- At conversation start, if you have their email → Consider using get_customer_context to personalize
- When checkout URL is returned, present it naturally: "Choice! Here's your checkout link: [URL]. Click through to complete payment."
- ALWAYS confirm what was added: "Added [product] to your cart. Anything else, or ready to checkout?"

TONE: Relaxed, efficient, knowledgeable. Match their energy.`;

async function lookupVehicle(args: Record<string, unknown>): Promise<unknown> {
  console.log('Looking up vehicle with args:', JSON.stringify(args));
  const carfixServiceRoleKey = Deno.env.get("CARFIX_SERVICE_ROLE_KEY");
  
  try {
    const response = await fetch(
      "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-vehicle-info",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${carfixServiceRoleKey}`,
        },
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
    
    // Check if the API returned multiple vehicle candidates (variants)
    if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
      console.log(`Found ${data.vehicles.length} vehicle candidates`);
      // Return the full list for AI to present options to customer
      return { 
        success: true, 
        multiple_matches: true,
        vehicles: data.vehicles,
        message: `Found ${data.vehicles.length} potential vehicle matches. Present these options to the customer to confirm which one is theirs.`
      };
    }
    
    // Single match or direct vehicle object
    if (data.vehicle) {
      console.log('Single vehicle match:', data.vehicle.id || data.vehicle.vehicle_id || 'NO ID');
      return data;
    }
    
    // Direct vehicle data (has id field)
    if (data.id || data.vehicle_id) {
      console.log('Direct vehicle with ID:', data.id || data.vehicle_id);
      return { success: true, vehicle: data };
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

async function retrieveParts(vehicleId: number, partType?: string): Promise<{ success: boolean; parts?: unknown[]; total_found?: number; filter_applied?: string; error?: string }> {
  console.log('Retrieving parts for vehicle:', vehicleId, 'part_type:', partType);
  const carfixServiceRoleKey = Deno.env.get("CARFIX_SERVICE_ROLE_KEY");
  
  try {
    const response = await fetch(
      "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-parts",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${carfixServiceRoleKey}`,
        },
        body: JSON.stringify({ 
          vehicleid: String(vehicleId),
          page_size: 200,  // Request up to 200 parts instead of default 20
          ...(partType && { part_type: partType })  // Server-side filtering
        })
      }
    );
    
    if (!response.ok) {
      console.error('Parts lookup failed:', response.status);
      return { success: false, error: `Parts lookup failed with status ${response.status}` };
    }
    
    const data = await response.json();
    console.log('Parts lookup result:', JSON.stringify(data).substring(0, 500));
    
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

async function retrieveServicePackages(vehicleId?: number): Promise<unknown> {
  console.log('Calling calculate-service-bundles for vehicle:', vehicleId);
  
  try {
    const body = vehicleId ? { vehicleId: vehicleId } : {};
    
    const response = await fetch(
      "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/calculate-service-bundles",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "apikey": Deno.env.get("CARFIX_SERVICE_ROLE_KEY") || "",
        },
        body: JSON.stringify(body)
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Service bundles lookup failed:', response.status, errorBody);
      return { success: false, error: `Service bundles lookup failed with status ${response.status}` };
    }
    
    const data = await response.json();
    console.log('Service bundles result:', JSON.stringify(data).substring(0, 500));
    
    // Handle both old format (data.packages) and new calculate-service-bundles format (data.servicePackages or data.data.servicePackages)
    const packages = data.servicePackages || data.data?.servicePackages || data.packages || data;
    console.log('Extracted packages:', Array.isArray(packages) ? packages.length : 'not array');
    
    return { 
      success: true, 
      packages: packages,
      total_found: Array.isArray(packages) ? packages.length : 1
    };
  } catch (error) {
    console.error('Service bundles error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function searchGeneralProducts(query: string): Promise<{ success: boolean; products?: unknown[]; total_found?: number; error?: string }> {
  console.log('Searching general products for:', query);
  const carfixServiceRoleKey = Deno.env.get("CARFIX_SERVICE_ROLE_KEY");
  
  // For now, return a placeholder response since we don't have a general products API yet
  // This can be connected to a real endpoint when available
  try {
    // TODO: Connect to real general products API when available
    // For now, return helpful response indicating these products exist
    const generalProducts = [
      { name: "Tire Shine Spray", sku: "TS-001", price: 12.99, in_stock: true },
      { name: "Windscreen Wash 2L", sku: "WW-002", price: 8.99, in_stock: true },
      { name: "Car Wash Concentrate", sku: "CW-003", price: 15.99, in_stock: true },
      { name: "Interior Polish", sku: "IP-004", price: 14.99, in_stock: true },
      { name: "Microfiber Cloth Pack", sku: "MC-005", price: 9.99, in_stock: true },
    ];
    
    // Filter based on query
    const searchTerms = query.toLowerCase().split(' ');
    const matchedProducts = generalProducts.filter(p => 
      searchTerms.some(term => p.name.toLowerCase().includes(term))
    );
    
    return {
      success: true,
      products: matchedProducts.length > 0 ? matchedProducts : generalProducts.slice(0, 3),
      total_found: matchedProducts.length > 0 ? matchedProducts.length : 3
    };
  } catch (error) {
    console.error('General products search error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
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

async function executeToolCall(toolCall: { function: { name: string; arguments: string }; id: string }): Promise<unknown> {
  const { name, arguments: argsString } = toolCall.function;
  
  try {
    const args = JSON.parse(argsString);
    
    switch (name) {
      case "lookup_vehicle":
        return await lookupVehicle(args);
      case "search_web":
        return await searchWeb(args.query);
      case "retrieve_parts":
        return await retrieveParts(args.vehicleid, args.part_type);
      case "retrieve_service_packages":
        return await retrieveServicePackages(args.vehicleid);
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
    const { messages, vehicleContext, customerEmail, autoFetchParts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    // Handle auto-fetch parts mode - just fetch parts and packages, no AI response
    if (autoFetchParts && vehicleContext) {
      const vehicleId = vehicleContext.id || vehicleContext.vehicle_id;
      console.log('Auto-fetching parts for vehicle ID:', vehicleId);
      
      // Create SSE stream for auto-fetch
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      // Fetch parts and packages in parallel
      (async () => {
        try {
          const [partsResult, packagesResult] = await Promise.all([
            retrieveParts(vehicleId),
            retrieveServicePackages(vehicleId)
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

    // Build enhanced system prompt if vehicle context is provided from session
    let enhancedSystemPrompt = systemPrompt;
    
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
          const result = await executeToolCall(toolCall);
          
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
            const allParts = await retrieveParts(vehicleId);
            
            if (allParts.success && allParts.parts && allParts.parts.length > 0) {
              partsFoundResult = allParts.parts;
              console.log(`Auto-loaded ${allParts.parts.length} parts for vehicle`);
            }
            
            // ALSO fetch service packages - store FULL packages for frontend display
            const servicePackagesResult = await retrieveServicePackages(vehicleId);
            const servicePackagesData = servicePackagesResult as { success?: boolean; packages?: unknown[] };
            
            if (servicePackagesData.success && servicePackagesData.packages && servicePackagesData.packages.length > 0) {
              // Store full service packages for emission to frontend
              (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = servicePackagesData.packages;
              console.log(`Auto-loaded ${servicePackagesData.packages.length} service packages for vehicle`);
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
          const partsResult = result as { success?: boolean; parts?: unknown[] };
          if (partsResult.success && partsResult.parts && partsResult.parts.length > 0) {
            // Merge parts (don't replace - might have service package parts already)
            partsFoundResult = partsFoundResult ? [...partsFoundResult, ...partsResult.parts] : partsResult.parts;
            console.log(`Added ${partsResult.parts.length} parts from retrieve_parts call`);
          }
        }
        
        // Also capture parts from service packages
        if (toolCall.function.name === "retrieve_service_packages") {
          const extractedParts = extractPartsFromPackages(result);
          
          if (extractedParts.length > 0) {
            console.log(`Adding ${extractedParts.length} parts from service packages to results`);
            partsFoundResult = partsFoundResult ? [...partsFoundResult, ...extractedParts] : extractedParts;
          } else if (!partsFoundResult || partsFoundResult.length === 0) {
            console.log('Service packages empty and no parts loaded - customer may need guidance');
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
          
          if (vehicleId) {
            console.log(`Detected VEHICLE_CONFIRMED in AI response, using vehicle_id: ${vehicleId}`);
            
            // STORE the confirmed vehicle for emission in streaming handler
            // This ensures the same vehicle ID used for parts/packages is sent to frontend
            (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = confirmedVehicle;
            
            console.log('Auto-fetching parts and service packages for confirmed vehicle...');
            
            // Fetch ALL parts for this vehicle
            const allParts = await retrieveParts(vehicleId);
            if (allParts.success && allParts.parts && allParts.parts.length > 0) {
              console.log(`Fetched ${allParts.parts.length} parts for confirmed vehicle`);
              (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = allParts.parts;
            }
            
            // Fetch service packages for this vehicle
            const servicePackagesResult = await retrieveServicePackages(vehicleId);
            const servicePackagesData = servicePackagesResult as { success?: boolean; packages?: unknown[] };
            
            if (servicePackagesData.success && servicePackagesData.packages && servicePackagesData.packages.length > 0) {
              console.log(`Fetched ${servicePackagesData.packages.length} service packages for confirmed vehicle`);
              (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = servicePackagesData.packages;
            }
          }
        } catch (e) {
          console.error('Failed to parse VEHICLE_CONFIRMED marker in AI response:', e);
        }
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
          
          // Emit service_packages_found event FIRST (before parts) for synchronized display
          if (servicePackagesToEmit && servicePackagesToEmit.length > 0) {
            const packagesEvent = `data: ${JSON.stringify({ type: "service_packages_found", packages: servicePackagesToEmit })}\n\n`;
            controller.enqueue(encoder.encode(packagesEvent));
            console.log("Emitted service_packages_found event:", servicePackagesToEmit.length, "packages");
          }
          
          // Emit parts_found event immediately if we have parts from tool call
          if (partsToEmit && partsToEmit.length > 0) {
            const partsEvent = `data: ${JSON.stringify({ type: "parts_found", parts: partsToEmit })}\n\n`;
            controller.enqueue(encoder.encode(partsEvent));
            console.log("Emitted parts_found event:", partsToEmit.length, "parts");
            partsEmitted = true;
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
                      const vehicleData = JSON.parse(markerMatch[1]);
                      const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: vehicleData })}\n\n`;
                      controller.enqueue(encoder.encode(vehicleEvent));
                      console.log("Emitted vehicle_identified event (end of stream):", vehicleData);
                      vehicleEmitted = true;
                    } catch (e) {
                      console.error("Failed to parse vehicle marker at stream end:", e);
                    }
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
                        const vehicleData = JSON.parse(markerMatch[1]);
                        // Emit vehicle_identified event
                        const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: vehicleData })}\n\n`;
                        controller.enqueue(encoder.encode(vehicleEvent));
                        console.log("Emitted vehicle_identified event:", vehicleData);
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
