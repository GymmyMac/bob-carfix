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

// ============= VEHICLE CANDIDATE TYPE =============
interface VehicleCandidate {
  vehicle_id: number | null;   // TecDoc ID - null if not in catalog
  carjam_id?: number;          // CarJam plate record ID (internal reference only)
  vehicle_name_nz?: string;
  make?: string;
  model?: string;
  start_year?: number;
  end_year?: number;
  year?: number | string;
  year_of_manufacture?: number;
  engine_code?: string;
  cc_rating?: number;
  fuel_type?: string;
  variant?: string;
  score?: number;
  plate?: string;
  rego?: string;
  power?: number;
  body_style?: string;
  kw?: number | null;
  cc?: number | null;
}

// ============= CONVERSATION STATE TYPES =============
type ConversationState = 
  | 'AWAITING_REGO'
  | 'AWAITING_VARIANT_SELECTION'  
  | 'VEHICLE_CONFIRMED'
  | 'CONVERSATION';

/**
 * Determine the current conversation state based on available context.
 */
function determineConversationState(
  vehicleContext: unknown,
  forcedCandidates: VehicleCandidate[],
  clientCandidates: VehicleCandidate[],
  deterministicVehicle: VehicleCandidate | null
): ConversationState {
  // Already have confirmed vehicle (from session or deterministic match)
  if (vehicleContext || deterministicVehicle) {
    return 'VEHICLE_CONFIRMED';
  }
  
  // Multiple variants found - need user selection
  if (forcedCandidates.length > 1 || clientCandidates.length > 1) {
    return 'AWAITING_VARIANT_SELECTION';
  }
  
  return 'AWAITING_REGO';
}

/**
 * Extract kW power rating from vehicle_name_nz (e.g., "TDI 103KW" -> 103)
 */
function extractKwFromVehicleName(name?: string): number | null {
  if (!name) return null;
  const match = name.match(/(\d{2,3})\s*KW/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract engine code from vehicle_name_nz (e.g., "CAMRY 2.4 2AZ-FE" -> "2AZ-FE")
 * Engine codes are typically patterns like: 1AZ-FE, 3S-GE, K20A, etc.
 */
function extractEngineCode(candidate: VehicleCandidate): string | null {
  // First check explicit engine_code field
  if (candidate.engine_code) return candidate.engine_code;
  
  // Try to extract from vehicle_name_nz
  if (candidate.vehicle_name_nz) {
    // Common engine code patterns: 1AZ-FE, 2AZ-FE, 3S-GE, K20A, etc.
    const match = candidate.vehicle_name_nz.match(/\b([0-9]?[A-Z]{1,3}[0-9]?[-]?[A-Z]{1,3}[A-Z]?)\b/);
    if (match && match[1].length >= 3) return match[1];
  }
  
  return null;
}

/**
 * Vehicle characterization based on make/model patterns and variant keywords.
 * This uses automotive industry knowledge to assign appropriate descriptors.
 */
interface CharacterizationRule {
  patterns: RegExp[];
  characterization: string;
}

// Model/variant keyword patterns mapped to characterizations
const MODEL_CHARACTERIZATIONS: CharacterizationRule[] = [
  // Performance/Sport variants
  { patterns: [/\bGT\b/i, /\bGTI\b/i, /\bGTS\b/i, /\bGT-R\b/i, /\bRS\b/i, /\bR\b(?!\w)/i], characterization: 'sporty' },
  { patterns: [/\bTYPE[\s-]?R\b/i, /\bSI\b/i, /\bSS\b/i, /\bVXR\b/i, /\bOPC\b/i], characterization: 'sporty' },
  { patterns: [/\bSTI\b/i, /\bWRX\b/i, /\bEVO\b/i, /\bNISMO\b/i, /\bTRD\b/i], characterization: 'sporty' },
  { patterns: [/\bM\s?SPORT\b/i, /\bAMG\b/i, /\bS[\s-]?LINE\b/i, /\bN[\s-]?LINE\b/i], characterization: 'sporty' },
  { patterns: [/SPORT/i, /\bSPORTIVO\b/i, /\bABARTH\b/i], characterization: 'sporty' },
  
  // Luxury/Premium variants
  { patterns: [/\bLIMITED\b/i, /\bPRIME\b/i, /\bPLATINUM\b/i, /\bPREMIUM\b/i], characterization: 'premium' },
  { patterns: [/\bEXECUTIVE\b/i, /\bELEGANCE\b/i, /\bAVANTGARDE\b/i], characterization: 'premium' },
  { patterns: [/\bLUXURY\b/i, /\bAMBIENTE\b/i, /\bTITANIUM\b/i], characterization: 'premium' },
  { patterns: [/\bSEL\b/i, /\bSEL\s?PLUS\b/i, /\bALTIMA\b/i], characterization: 'premium' },
  
  // Economy/Efficiency variants
  { patterns: [/\bECO\b/i, /\bBLUE\s?MOTION\b/i, /\bEFFICIENT\s?DYNAMICS\b/i], characterization: 'economical' },
  { patterns: [/\bHYBRID\b/i, /\bEV\b/i, /\bE-TRON\b/i, /\bPLUG[\s-]?IN\b/i], characterization: 'efficient' },
  { patterns: [/\bTDI\b/i, /\bCDI\b/i, /\bBLUE\s?HDI\b/i, /\bD4D\b/i], characterization: 'efficient' },
  
  // Workhorse/Utility variants
  { patterns: [/\bUTE\b/i, /\bCAB\s?CHASSIS\b/i, /\bWORKMATE\b/i], characterization: 'workhorse' },
  { patterns: [/\bTRADESMAN\b/i, /\b4X4\b/i, /\bALL[\s-]?WHEEL\b/i], characterization: 'capable' },
  { patterns: [/\bHIGHRIDER\b/i, /\bRUGGED\b/i, /\bTRAIL\b/i], characterization: 'rugged' },
  
  // Family/Comfort variants  
  { patterns: [/\bGLX\b/i, /\bGXL\b/i, /\bSX\b/i, /\bLX\b/i], characterization: 'well-equipped' },
  { patterns: [/\bFAMILY\b/i, /\bTOURING\b/i, /\bGRAND\b/i], characterization: 'comfortable' },
  { patterns: [/\bESTATE\b/i, /\bWAGON\b/i, /\bAVANT\b/i], characterization: 'practical' },
];

// Engine code personality lookup - takes priority over generic characterizations
// These are iconic/notable engine codes with distinct personalities
const ENGINE_CODE_PERSONALITIES: Record<string, string> = {
  // Toyota legendary engines
  '3SGE': 'rev-happy',      // BEAMS engine, high-revving naturally aspirated
  '3SGTE': 'turbocharged',  // Turbo version of 3S-GE, Celica GT-Four/MR2
  '2JZGTE': 'legendary',    // Supra's famous inline-6 turbo
  '2JZGE': 'smooth',        // NA version, still a great engine
  '1JZGTE': 'punchy',       // Smaller JZ turbo
  '1JZGE': 'refined',       // NA 2.5L inline-6
  '1GFE': 'sensible',       // Reliable economy engine
  '1GGTE': 'boosted',       // Turbo version
  '4AGE': 'zingy',          // High-revving AE86 engine
  '2AZFE': 'practical',     // Common Camry/RAV4 engine
  '1AZFE': 'frugal',        // Smaller version
  '1ZZFE': 'efficient',     // Corolla engine
  '2ZZGE': 'screamer',      // High-revving Celica/Lotus engine
  '1UZFE': 'silky',         // V8, Lexus LS400
  '1GRFE': 'gutsy',         // V6, Land Cruiser Prado
  
  // Nissan legendary engines
  'RB26DETT': 'iconic',     // GT-R's legendary twin-turbo
  'RB26': 'iconic',         // Short form
  'RB25DET': 'responsive',  // Single turbo RB
  'RB20DET': 'eager',       // Smaller RB turbo
  'SR20DET': 'tuner-favorite', // 180SX/Silvia turbo
  'SR20DE': 'peppy',        // NA version
  'VQ35DE': 'growly',       // 350Z/G35 V6
  'VQ37VHR': 'muscular',    // 370Z V6
  'VR38DETT': 'supercar',   // R35 GT-R twin-turbo V6
  'CA18DET': 'eager',       // Early Silvia turbo
  
  // Honda high-revving engines
  'K20A': 'vtec-powered',   // Type R engine
  'K20A2': 'rev-happy',     // RSX Type S
  'K24A': 'torquey',        // Larger K-series
  'B18C': 'screamer',       // Integra Type R
  'B16A': 'revvy',          // Civic Si
  'B16B': 'race-bred',      // EK9 Type R
  'F20C': 'legendary',      // S2000's 9000rpm engine
  'H22A': 'vtec-punchy',    // Prelude
  
  // Subaru boxer engines
  'EJ20': 'boxer-rumble',   // Classic WRX/STI
  'EJ25': 'torquey',        // Larger boxer
  'EJ207': 'rally-bred',    // STI spec
  'EJ255': 'boost-ready',   // WRX turbo
  'FA20': 'modern-flat',    // BRZ/86 engine
  
  // Mazda rotary and performance
  '13BREW': 'spinning',     // RX-8 rotary
  '13B': 'rotary',          // Generic rotary
  '13BT': 'turbo-rotary',   // FC RX-7 turbo
  'BPZE': 'peppy',          // MX-5 1.8
  'LFDE': 'practical',      // Mazda 3/6
  
  // Mitsubishi performance
  '4G63T': 'rally-bred',    // Evo turbo
  '4G63': 'proven',         // NA version
  '4B11T': 'modern-turbo',  // Evo X
  '6G72TT': 'twin-turbo',   // 3000GT VR4
  
  // European performance
  'N54': 'twin-turbo',      // BMW 335i
  'S54': 'motorsport',      // E46 M3
  'S65': 'v8-screamer',     // E90 M3
  'EA888': 'turbo-torque',  // VW/Audi 2.0T
  'M156': 'amg-power',      // AMG 6.2L V8
  'M113K': 'supercharged',  // AMG kompressor
  
  // Ford/Holden Australian
  'BARRA': 'aussie-legend', // Ford Falcon turbo 6
  'LS1': 'v8-rumble',       // Commodore/Monaro
  'LS2': 'v8-muscle',       // VE Commodore
  'LS3': 'track-ready',     // HSV
};

// Make-specific characterization modifiers
const MAKE_MODIFIERS: Record<string, { sportBias: number; luxuryBias: number }> = {
  'BMW': { sportBias: 0.3, luxuryBias: 0.3 },
  'MERCEDES': { sportBias: 0.1, luxuryBias: 0.4 },
  'MERCEDES-BENZ': { sportBias: 0.1, luxuryBias: 0.4 },
  'AUDI': { sportBias: 0.2, luxuryBias: 0.3 },
  'LEXUS': { sportBias: 0.1, luxuryBias: 0.4 },
  'PORSCHE': { sportBias: 0.5, luxuryBias: 0.2 },
  'SUBARU': { sportBias: 0.3, luxuryBias: 0 },
  'MAZDA': { sportBias: 0.2, luxuryBias: 0.1 },
  'TOYOTA': { sportBias: 0, luxuryBias: 0 },
  'HONDA': { sportBias: 0.1, luxuryBias: 0 },
  'NISSAN': { sportBias: 0.1, luxuryBias: 0 },
  'FORD': { sportBias: 0.1, luxuryBias: 0 },
  'HOLDEN': { sportBias: 0.2, luxuryBias: 0 },
  'HYUNDAI': { sportBias: 0, luxuryBias: 0 },
  'KIA': { sportBias: 0, luxuryBias: 0 },
  'VOLKSWAGEN': { sportBias: 0.1, luxuryBias: 0.1 },
  'MITSUBISHI': { sportBias: 0.1, luxuryBias: 0 },
  'SUZUKI': { sportBias: 0, luxuryBias: 0 },
};

/**
 * Normalize engine code for lookup (remove dashes, spaces, lowercase)
 */
function normalizeEngineCode(code: string): string {
  return code.toUpperCase().replace(/[-\s]/g, '');
}

/**
 * Get a characterization for a vehicle based on its attributes and relative position among variants.
 * Priority: Engine code personality > Model keywords > Power-based > Fuel type > CC rating
 */
function getVehicleCharacterization(
  candidate: VehicleCandidate,
  allCandidates: VehicleCandidate[]
): string {
  const vehicleName = candidate.vehicle_name_nz || '';
  const make = (candidate.make || '').toUpperCase();
  const variant = (candidate.variant || '').toUpperCase();
  const fullText = `${vehicleName} ${variant}`.toUpperCase();
  
  // FIRST PRIORITY: Check for engine code personality
  const engineCode = extractEngineCode(candidate);
  if (engineCode) {
    const normalizedCode = normalizeEngineCode(engineCode);
    const personality = ENGINE_CODE_PERSONALITIES[normalizedCode];
    if (personality) {
      console.log(`[Characterization] Engine code ${engineCode} -> ${personality}`);
      return personality;
    }
  }
  
  // Second: Check for explicit model/variant keyword matches
  for (const rule of MODEL_CHARACTERIZATIONS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(fullText)) {
        console.log(`[Characterization] Matched pattern ${pattern} -> ${rule.characterization}`);
        return rule.characterization;
      }
    }
  }
  
  // Third: Fall back to power-based characterization with make bias
  const kw = extractKwFromVehicleName(vehicleName);
  const allKw = allCandidates.map(c => extractKwFromVehicleName(c.vehicle_name_nz));
  const validKw = allKw.filter((k): k is number => k !== null);
  
  if (kw && validKw.length > 1) {
    const maxKw = Math.max(...validKw);
    const minKw = Math.min(...validKw);
    
    if (maxKw !== minKw) {
      const range = maxKw - minKw;
      let position = (kw - minKw) / range;
      
      // Apply make bias
      const makeBias = MAKE_MODIFIERS[make];
      if (makeBias) {
        position += makeBias.sportBias * 0.2;
      }
      
      // Assign characterization based on relative power
      if (position >= 0.75) return 'sporty';
      if (position >= 0.5) return 'punchy';
      if (position <= 0.25) return 'economical';
      return 'balanced';
    }
  }
  
  // Fourth: Use fuel type for characterization
  const fuel = (candidate.fuel_type || '').toLowerCase();
  if (fuel.includes('diesel')) return 'torquey';
  if (fuel.includes('hybrid') || fuel.includes('electric')) return 'efficient';
  
  // Fifth: Use CC rating for basic characterization
  const cc = candidate.cc_rating;
  if (cc) {
    if (cc >= 3000) return 'powerful';
    if (cc >= 2500) return 'punchy';
    if (cc <= 1500) return 'nimble';
  }
  
  return ''; // No characterization if we can't determine one
}

// ============= VARIANT CARD DATA FOR UI =============
interface VariantCardData {
  vehicle_id: number | null;   // Allow null for vehicles not in TecDoc catalog
  optionNumber: number;
  displayTitle: string;
  displaySubtitle: string;
  characterization: string;
  kw: number | null;
  cc: number | null;
  ccDisplay: string | null;
  fuelType: string | null;
  engineCode: string | null;
  make: string;
  model: string;
}

interface VariantListResult {
  text: string;
  cards: VariantCardData[];
  make: string;
  model: string;
}

/**
 * Generate variant data for both text display and UI cards.
 * Returns structured data for the shelf cards plus a readable text version.
 */
function generateVariantListData(candidates: VehicleCandidate[]): VariantListResult {
  if (candidates.length === 0) {
    return { text: '', cards: [], make: '', model: '' };
  }
  
  const make = candidates[0]?.make || '';
  const model = candidates[0]?.model || '';
  
  // Extract key attributes for each candidate
  const candidateData = candidates.map(c => ({
    candidate: c,
    cc: c.cc_rating || null,
    ccDisplay: c.cc_rating ? `${(c.cc_rating / 1000).toFixed(1)}L` : null,
    fuel: c.fuel_type || null,
    kw: extractKwFromVehicleName(c.vehicle_name_nz),
    engineCode: extractEngineCode(c),
    characterization: getVehicleCharacterization(c, candidates),
  }));
  
  // DEDUPLICATE: Group variants by their parts-relevant specs (kW, cc, fuel, engineCode)
  // Variants with identical specs use the same parts - only show one
  const seenSignatures = new Set<string>();
  const deduplicatedData = candidateData.filter(d => {
    const signature = [
      d.kw?.toString() || '',
      d.cc?.toString() || '',
      (d.fuel || '').toLowerCase(),
      (d.engineCode || '').toUpperCase(),
    ].join('|');
    
    if (seenSignatures.has(signature)) {
      console.log(`[Variant Dedup] Skipping duplicate signature: ${signature} for vehicle_id ${d.candidate.vehicle_id}`);
      return false;
    }
    seenSignatures.add(signature);
    return true;
  });
  
  console.log(`[Variant Dedup] Reduced ${candidateData.length} candidates to ${deduplicatedData.length} unique variants`);
  
  // If only one unique variant after dedup, return it directly (no selection needed)
  if (deduplicatedData.length === 1) {
    const d = deduplicatedData[0];
    return {
      text: '',
      cards: [{
        vehicle_id: d.candidate.vehicle_id,
        optionNumber: 1,
        displayTitle: d.candidate.vehicle_name_nz || `${d.candidate.make} ${d.candidate.model}`,
        displaySubtitle: '',
        characterization: d.characterization || '',
        kw: d.kw,
        cc: d.cc,
        ccDisplay: d.ccDisplay,
        fuelType: d.fuel,
        engineCode: d.engineCode,
        make: d.candidate.make || make,
        model: d.candidate.model || model,
      }],
      make,
      model,
    };
  }
  
  // Find which attributes differ between DEDUPLICATED candidates
  const allCc = deduplicatedData.map(d => d.cc);
  const allFuel = deduplicatedData.map(d => d.fuel);
  const allKw = deduplicatedData.map(d => d.kw);
  const allEngineCodes = deduplicatedData.map(d => d.engineCode);
  
  const ccDiffers = new Set(allCc.filter(Boolean)).size > 1;
  const fuelDiffers = new Set(allFuel.filter(Boolean)).size > 1;
  const kwDiffers = new Set(allKw.filter(Boolean)).size > 1;
  const engineCodeDiffers = new Set(allEngineCodes.filter(Boolean)).size > 1;
  
  const cards: VariantCardData[] = [];
  const textLines: string[] = [];
  
  deduplicatedData.forEach((d, i) => {
    const textParts: string[] = [];
    const subtitleParts: string[] = [];
    
    // Build display title with characterization
    const displayTitle = d.characterization 
      ? `The ${d.characterization} one`
      : d.candidate.vehicle_name_nz || `${d.candidate.make} ${d.candidate.model}`;
    
    // Add characterization to text version
    if (d.characterization) {
      textParts.push(`The ${d.characterization}`);
    }
    
    // Add kW if it differs
    if (kwDiffers && d.kw) {
      textParts.push(`${d.kw}kW`);
      subtitleParts.push(`${d.kw}kW`);
    }
    
    // Add CC if it differs
    if (ccDiffers && d.ccDisplay) {
      textParts.push(d.ccDisplay);
      subtitleParts.push(d.ccDisplay);
    }
    
    // Add fuel type if it differs
    if (fuelDiffers && d.fuel) {
      textParts.push(d.fuel);
      subtitleParts.push(d.fuel);
    }
    
    // Add engine code if it differs (key identifier!)
    if (engineCodeDiffers && d.engineCode) {
      textParts.push(`(${d.engineCode} engine)`);
      subtitleParts.push(`${d.engineCode} engine`);
    }
    
    // Build text line
    const textLine = textParts.length > 0
      ? `${i + 1}) ${textParts.join(' ')}`
      : `${i + 1}) ${d.candidate.vehicle_name_nz || `${d.candidate.make} ${d.candidate.model}`}`;
    textLines.push(textLine);
    
    // Build subtitle for card
    const displaySubtitle = subtitleParts.length > 0
      ? subtitleParts.join(' • ')
      : d.candidate.vehicle_name_nz || '';
    
    // Create card data
    cards.push({
      vehicle_id: d.candidate.vehicle_id,
      optionNumber: i + 1,
      displayTitle,
      displaySubtitle,
      characterization: d.characterization || '',
      kw: d.kw,
      cc: d.cc,
      ccDisplay: d.ccDisplay,
      fuelType: d.fuel,
      engineCode: d.engineCode,
      make: d.candidate.make || make,
      model: d.candidate.model || model,
    });
  });
  
  return {
    text: textLines.join('\n'),
    cards,
    make,
    model,
  };
}

/**
 * Generate a human-readable variant list for user selection.
 * Only shows differentiating attributes between candidates.
 * Does NOT include year ranges (we know the exact year from REGO).
 */
function generateVariantListText(candidates: VehicleCandidate[]): string {
  return generateVariantListData(candidates).text;
}

// ============= DETERMINISTIC VARIANT SELECTION =============
/**
 * Attempts to match user input to a vehicle candidate without relying on AI.
 * Returns the matched candidate or null if no confident match.
 */
function matchUserInputToCandidate(
  userMessage: string,
  candidates: VehicleCandidate[]
): { candidate: VehicleCandidate; method: string } | null {
  if (!candidates || candidates.length === 0) return null;
  
  const input = userMessage.trim().toLowerCase();
  console.log(`[Variant Matcher] Attempting to match: "${input.slice(0, 60)}" against ${candidates.length} candidates`);
  
  // Word-to-number mapping for spelled-out numbers
  const wordToNumber: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
  };
  
  // Convert spelled-out numbers to digits in input for matching
  let normalizedInput = input;
  for (const [word, num] of Object.entries(wordToNumber)) {
    normalizedInput = normalizedInput.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
  }
  
  // Method 1: Option number (e.g., "1", "2", "option 1", "the first one", "#2", "number two")
  const optionPatterns = [
    /^(\d+)$/,                           // Just "1" or "2"
    /^#?(\d+)$/,                         // "#1", "#2"
    /option\s*(\d+)/i,                   // "option 1", "option2"
    /number\s*(\d+)/i,                   // "number 1", "number 2" (after normalization)
    /^the\s*(first|second|third|fourth|fifth)/i,  // "the first one"
    /^(\d+)\s*(?:please|bob|mate)?$/i,   // "1 please", "2 bob", "3 mate"
  ];
  
  const ordinalMap: Record<string, number> = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5
  };
  
  for (const pattern of optionPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      let index: number;
      if (ordinalMap[match[1]?.toLowerCase()]) {
        index = ordinalMap[match[1].toLowerCase()] - 1;
      } else {
        index = parseInt(match[1], 10) - 1;
      }
      
      if (index >= 0 && index < candidates.length) {
        console.log(`[Variant Matcher] Matched by option number: index=${index}, method=option_number`);
        return { candidate: candidates[index], method: 'option_number' };
      }
    }
  }
  
  // Method 2: Direct vehicle_id match (user types exact ID)
  const idMatch = input.match(/^\d{4,6}$/);
  if (idMatch) {
    const typedId = parseInt(idMatch[0], 10);
    const candidateById = candidates.find(c => c.vehicle_id === typedId);
    if (candidateById) {
      console.log(`[Variant Matcher] Matched by direct vehicle_id: ${typedId}`);
      return { candidate: candidateById, method: 'direct_id' };
    }
  }
  
  // Method 3: Engine code match (e.g., "3S-GE", "1G-FE", "K20A")
  const engineCodePattern = /\b([A-Z0-9]{1,4}[-]?[A-Z]{1,3})\b/gi;
  const inputEngineCodes = [...input.matchAll(engineCodePattern)].map(m => m[1].toUpperCase().replace('-', ''));
  
  if (inputEngineCodes.length > 0) {
    for (const candidate of candidates) {
      const candidateCode = (candidate.engine_code || '').toUpperCase().replace('-', '');
      if (candidateCode && inputEngineCodes.includes(candidateCode)) {
        console.log(`[Variant Matcher] Matched by engine code: ${candidateCode}`);
        return { candidate, method: 'engine_code' };
      }
    }
  }
  
  // Method 4: CC rating / displacement (e.g., "2.0", "2.0L", "2000", "2000cc", "2 litre")
  const ccPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:l(?:itre)?|liter)?/i,  // "2.0", "2.0L", "2 litre"
    /(\d{3,4})\s*(?:cc)?/i,                       // "2000", "2000cc"
  ];
  
  for (const pattern of ccPatterns) {
    const match = input.match(pattern);
    if (match) {
      let ccValue = parseFloat(match[1]);
      // Convert litre to cc if < 10 (e.g., 2.0 -> 2000)
      if (ccValue < 10) ccValue *= 1000;
      
      // Find closest match within 100cc tolerance
      const closestCandidate = candidates.find(c => {
        const candidateCc = c.cc_rating || 0;
        return Math.abs(candidateCc - ccValue) < 100;
      });
      
      if (closestCandidate) {
        console.log(`[Variant Matcher] Matched by CC rating: ${ccValue} -> ${closestCandidate.cc_rating}`);
        return { candidate: closestCandidate, method: 'cc_rating' };
      }
    }
  }
  
  // Method 5: Power/kW match (e.g., "150kw", "103 kW")
  const kwPattern = /(\d{2,3})\s*(?:kw|kilowatt)/i;
  const kwMatch = input.match(kwPattern);
  if (kwMatch) {
    const kw = parseInt(kwMatch[1], 10);
    // Look for kW in vehicle_name_nz (e.g., "TDI 103KW")
    const candidateByKw = candidates.find(c => {
      const name = (c.vehicle_name_nz || '').toUpperCase();
      return name.includes(`${kw}KW`) || name.includes(`${kw} KW`);
    });
    if (candidateByKw) {
      console.log(`[Variant Matcher] Matched by kW rating: ${kw}kW`);
      return { candidate: candidateByKw, method: 'kw_rating' };
    }
  }
  
  // Method 6: Fuel type match (only if single candidate of that type)
  const fuelKeywords = ['petrol', 'diesel', 'hybrid', 'electric', 'gas', 'lpg'];
  const inputFuel = fuelKeywords.find(f => input.includes(f));
  if (inputFuel) {
    const fuelCandidates = candidates.filter(c => 
      (c.fuel_type || '').toLowerCase() === inputFuel
    );
    if (fuelCandidates.length === 1) {
      console.log(`[Variant Matcher] Matched by unique fuel type: ${inputFuel}`);
      return { candidate: fuelCandidates[0], method: 'fuel_type' };
    }
  }
  
  // Method 7: Substring match against vehicle_name_nz (fuzzy)
  // Only if strong match (multiple keywords match)
  const inputWords = input.split(/\s+/).filter(w => w.length > 2);
  let bestMatch: VehicleCandidate | null = null;
  let bestMatchScore = 0;
  
  for (const candidate of candidates) {
    const vehicleName = (candidate.vehicle_name_nz || '').toLowerCase();
    const matchingWords = inputWords.filter(w => vehicleName.includes(w));
    const score = matchingWords.length / Math.max(inputWords.length, 1);
    
    if (score > bestMatchScore && matchingWords.length >= 2) {
      bestMatchScore = score;
      bestMatch = candidate;
    }
  }
  
  if (bestMatch && bestMatchScore >= 0.5) {
    console.log(`[Variant Matcher] Matched by substring: score=${bestMatchScore.toFixed(2)}`);
    return { candidate: bestMatch, method: 'substring' };
  }
  
  // Method 8: Affirmative response when only 1 candidate exists OR top-scored
  const affirmativePatterns = [
    /^(yes|yeah|yep|yup|correct|that'?s? ?(it|right|the one)|sure|ok|okay|affirmative|confirm)/i,
    /^(got ?it|that ?one|the one)/i,
  ];
  
  const isAffirmative = affirmativePatterns.some(p => p.test(input));
  if (isAffirmative) {
    if (candidates.length === 1) {
      console.log(`[Variant Matcher] Matched by affirmative (single candidate)`);
      return { candidate: candidates[0], method: 'affirmative_single' };
    }
    // If there's a clear top-scored candidate, use that
    const sortedByScore = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sortedByScore[0].score && sortedByScore[0].score > (sortedByScore[1]?.score || 0)) {
      console.log(`[Variant Matcher] Matched by affirmative (top-scored: ${sortedByScore[0].score})`);
      return { candidate: sortedByScore[0], method: 'affirmative_top_scored' };
    }
  }
  
  // Method 9: Descriptive matching (e.g., "the bigger engine", "the smaller one", "newer", "older")
  const descriptivePatterns: Array<{ pattern: RegExp; compareFn: (a: VehicleCandidate, b: VehicleCandidate) => number }> = [
    { pattern: /big(?:ger)?|larger?|more\s*power/i, compareFn: (a, b) => (b.cc_rating || 0) - (a.cc_rating || 0) },
    { pattern: /small(?:er)?|lighter?|less\s*power/i, compareFn: (a, b) => (a.cc_rating || 0) - (b.cc_rating || 0) },
    { pattern: /newer|later|recent/i, compareFn: (a, b) => (b.start_year || 0) - (a.start_year || 0) },
    { pattern: /older|earlier|original/i, compareFn: (a, b) => (a.start_year || 0) - (b.start_year || 0) },
    { pattern: /more\s*(?:fuel\s*)?econom|efficient/i, compareFn: (a, b) => (a.cc_rating || 0) - (b.cc_rating || 0) }, // Smaller engine = more efficient
  ];

  for (const { pattern, compareFn } of descriptivePatterns) {
    if (pattern.test(input)) {
      const sorted = [...candidates].sort(compareFn);
      if (sorted[0]) {
        console.log(`[Variant Matcher] Matched by descriptive pattern: ${pattern.source}`);
        return { candidate: sorted[0], method: 'descriptive' };
      }
    }
  }
  
  console.log(`[Variant Matcher] No confident match found`);
  return null;
}

// ============= CANNED RESPONSE SYSTEM =============

// NZ Registration plate pattern detection
// Patterns: ABC123, ABC-123, AB1234, AB-1234, ABC12, 123ABC (older format)
function containsRegoPattern(text: string): boolean {
  // Normalize: uppercase for consistent matching
  const normalized = text.toUpperCase().trim();
  
  const patterns = [
    // Standard NZ plates: ABC123, ABC-123, ABC 123
    /(?:^|[\s,.])[A-Z]{3}[\s\-]?[0-9]{3}(?:$|[\s,.])/,
    // Older format: AB1234, AB-1234, AB 1234
    /(?:^|[\s,.])[A-Z]{2}[\s\-]?[0-9]{4}(?:$|[\s,.])/,
    // Personalized short: ABC12, ABC-12
    /(?:^|[\s,.])[A-Z]{3}[\s\-]?[0-9]{2}(?:$|[\s,.])/,
    // Reverse older format: 123ABC, 12ABC, 123-ABC
    /(?:^|[\s,.])[0-9]{2,3}[\s\-]?[A-Z]{3}(?:$|[\s,.])/,
  ];
  
  // Add padding spaces to ensure boundary matching works at string edges
  const paddedText = ' ' + normalized + ' ';
  const hasRego = patterns.some(p => p.test(paddedText));
  
  if (hasRego) {
    console.log(`[REGO Detection] Found registration pattern in: "${text.substring(0, 60)}..."`);
  }
  return hasRego;
}

/**
 * Extract REGO from text - returns the first matching NZ registration plate.
 * Used for forced tool calls when REGO is detected but AI fails to call lookup_vehicle.
 */
function extractRegoFromText(text: string): string | null {
  const normalized = text.toUpperCase();
  
  // Capture patterns - order matters (most common first)
  const capturePatterns = [
    // Standard: ABC123, ABC-123
    /\b([A-Z]{3}[\s\-]?[0-9]{3})\b/,
    // Older: AB1234, AB-1234  
    /\b([A-Z]{2}[\s\-]?[0-9]{4})\b/,
    // Short personalized: ABC12
    /\b([A-Z]{3}[\s\-]?[0-9]{2})\b/,
    // Reverse: 123ABC
    /\b([0-9]{2,3}[\s\-]?[A-Z]{3})\b/,
  ];
  
  for (const pattern of capturePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      // Normalize: remove spaces and hyphens
      const rego = match[1].replace(/[\s\-]/g, '');
      console.log(`[REGO Extract] Extracted plate: ${rego}`);
      return rego;
    }
  }
  
  return null;
}

// Keywords that indicate user is asking for vehicle-specific parts (need REGO)
const VEHICLE_SPECIFIC_KEYWORDS = [
  'brake', 'pad', 'rotor', 'filter', 'oil filter', 'air filter',
  'cabin filter', 'spark plug', 'wiper', 'clutch', 'timing belt',
  'suspension', 'shock', 'strut', 'cv joint', 'alternator', 'starter',
  'battery', 'radiator', 'thermostat', 'water pump', 'belt', 'gasket',
  'head gasket', 'engine mount', 'gearbox', 'transmission', 'exhaust',
  'muffler', 'catalytic', 'oxygen sensor', 'lambda', 'headlight', 'taillight',
  'service', 'parts for my', 'need parts', 'need a part'
];

// ============= ERROR ANALYTICS LOGGING =============
/**
 * Log error events to bob_error_logs for analytics and catalog expansion tracking.
 * Uses service role key to bypass RLS.
 */
async function logErrorEvent(
  errorType: string,
  vehicleContext: { vehicleId?: number; make?: string; model?: string; rego?: string },
  additionalData?: Record<string, unknown>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Error Analytics] Missing Supabase credentials, skipping log');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase.from('bob_error_logs').insert({
      error_type: errorType,
      vehicle_id: vehicleContext.vehicleId,
      vehicle_make: vehicleContext.make,
      vehicle_model: vehicleContext.model,
      rego: vehicleContext.rego,
      additional_data: additionalData || {},
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.warn('[Error Analytics] Failed to insert:', error);
    } else {
      console.log(`[Error Analytics] Logged: ${errorType} for vehicle_id=${vehicleContext.vehicleId}`);
    }
  } catch (e) {
    console.warn('[Error Analytics] Exception:', e);
  }
}

interface CannedResponseClip {
  transcript: string;
  audio_url: string;
  clip_key: string;
}

interface SearchingClip {
  transcript: string;
  audio_url: string;
  clip_key: string;
}

/**
 * Fetch a "searching" audio clip for real-time feedback during tool execution.
 * Returns null if no clip is configured or active.
 */
async function getSearchingClip(
  searchType: 'vehicle' | 'parts'
): Promise<SearchingClip | null> {
  const triggerMap = {
    vehicle: 'searching_vehicle',
    parts: 'searching_parts'
  };
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[Searching Clip] Missing Supabase credentials');
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('bob_audio_clips')
      .select('transcript, audio_url, clip_key')
      .eq('response_trigger', triggerMap[searchType])
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.log(`[Searching Clip] No clip found for ${searchType}:`, error?.message);
      return null;
    }
    
    const clipData = data as { transcript: string; audio_url: string; clip_key: string };
    console.log(`[Searching Clip] Found clip for ${searchType}:`, clipData.clip_key);
    return clipData;
  } catch (err) {
    console.error(`[Searching Clip] Error fetching ${searchType} clip:`, err);
    return null;
  }
}

/**
 * Check if we should bypass AI and return a canned response.
 * Returns the matching clip data or null if no match.
 */
async function checkCannedResponse(
  messages: Array<{ role: string; content: string }>,
  vehicleContext: unknown,
  customerEmail: string | null
): Promise<CannedResponseClip | null> {
  // Only check last user message
  const lastMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastMessage) return null;
  
  const userText = lastMessage.content.toLowerCase();
  
  // Check if this is a vehicle-specific request without vehicle context
  const isVehicleSpecificRequest = VEHICLE_SPECIFIC_KEYWORDS.some(kw => 
    userText.includes(kw.toLowerCase())
  );
  
  const hasVehicleContext = !!vehicleContext;
  
  // NEW: Check if user already provided a REGO in their message
  const userProvidedRego = containsRegoPattern(lastMessage.content);
  
  // Trigger: User asks for parts but no vehicle identified AND didn't provide REGO
  // If user provided REGO, let AI process it and call lookup_vehicle
  if (isVehicleSpecificRequest && !hasVehicleContext && !userProvidedRego) {
    console.log(`[Canned Response] Vehicle-specific request without REGO - triggering need_rego`);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('[Canned Response] Missing Supabase credentials');
        return null;
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Look for an active canned response for 'need_rego' trigger
      const { data, error } = await supabase
        .from('bob_audio_clips')
        .select('transcript, audio_url, clip_key')
        .eq('response_trigger', 'need_rego')
        .eq('bypass_ai', true)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        console.log('[Canned Response] No matching clip found:', error?.message);
        return null;
      }
      
      console.log(`[Canned Response] Matched 'need_rego' trigger for: "${userText.substring(0, 30)}..."`);
      return data as CannedResponseClip;
    } catch (err) {
      console.error('[Canned Response] Error checking clips:', err);
      return null;
    }
  }
  
  return null;
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
          vehicleid: { type: "number", description: "The vehicle ID from a previous lookup_vehicle result (found in the 'vehicle_id' field - MUST be numeric)" },
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
      description: "Fetch pre-configured CARFIX Service Packs with preparedTiers from the calculate-service-bundles API. Returns service bundles with Economy/Standard/Premium/Performance tiers. CRITICAL: Each tier in preparedTiers has 'isRecommended: true/false' - the tier with isRecommended=true is the 'CARFIX Value' option you MUST recommend. DO NOT assume Standard is the CARFIX Value - check the isRecommended flag! CALL THIS FIRST when customer asks about brakes, filters, oil, wipers, or any maintenance parts.",
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
  },
  {
    type: "function",
    function: {
      name: "diagnose_symptom",
      description: "Consult the CARFIX Expert Brain for technical analysis of vehicle symptoms or failures. Use when a customer describes a problem (e.g., 'brakes feel spongy', 'engine overheating', 'rattling noise'). Returns physics-based diagnosis with confidence tiers and optional commercial fix SKUs.",
      parameters: {
        type: "object",
        properties: {
          user_query: {
            type: "string",
            description: "The exact symptom description provided by the user."
          }
        },
        required: ["user_query"]
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

VEHICLE IDENTIFICATION:
- If customer mentions a NZ registration (REGO like ABC123), use lookup_vehicle with the plate
- For vehicle-specific parts (brakes, filters, etc), ALWAYS get their REGO first
- Once vehicle is confirmed, use retrieve_service_packages and retrieve_parts

GENERAL PRODUCTS (no vehicle needed):
- Tire shine, windscreen wash, car wash, polish, cleaning products
- For these, use search_general_products directly

SYMPTOM DIAGNOSIS:
- If a user reports a vehicle symptom (noise, vibration, warning light, performance issue), use diagnose_symptom with their exact description
- Present the physics logic in plain language, then recommend the fix part with pricing if available
- Use confidence_tier to calibrate language: "high" = definitive ("that's"), "medium" = likely ("sounds like"), "low" = possible ("could be")
- If no_match, acknowledge you couldn't find a specific bulletin and suggest they describe it differently or visit carfix.co.nz

KIWI STYLE:
- Use casual NZ expressions: "sweet as", "no worries", "mate", "chur"
- Be friendly but efficient - customers are busy`;

// ============= HOST CONFIG TYPES =============
interface HostConfig {
  baseUrl?: string;
  apiKey?: string;
  partnerCode?: string;
  customHeaders?: Record<string, string>;
}

interface HostContext {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
  vehicle?: {
    selectedVehicle?: {
      id?: number;
      vehicle_id?: number;
      make?: string;
      model?: string;
      year?: number | string;
      rego?: string;
    };
    garageVehicles?: Array<{
      id?: number;
      vehicle_id?: number;
      rego?: string;
      make?: string;
      model?: string;
      year?: number | string;
      variant?: string;
    }>;
    recentSearches?: string[];
  };
  cart?: {
    itemCount?: number;
    totalValue?: number;
  };
  history?: {
    lastOrderDate?: string;
    totalOrders?: number;
    loyaltyTier?: string;
  };
  currentPage?: string;
  metadata?: Record<string, unknown>;
}

// ============= API CONFIG =============
interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  customHeaders: Record<string, string>;
}

function buildApiConfig(hostConfig?: HostConfig): ApiConfig {
  // Default CARFIX API configuration
  const defaultConfig: ApiConfig = {
    baseUrl: 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1',
    apiKey: Deno.env.get('CARFIX_SERVICE_ROLE_KEY') || '',
    customHeaders: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHpqYmFzZHNmd29lcnV5eGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTIwNzQsImV4cCI6MjA3MTIyODA3NH0.wKoJ51_VPro_BrJz-A-NRpSmUW0XBP-7TJJcrhvYwxE'
    }
  };
  
  if (!hostConfig) {
    return defaultConfig;
  }
  
  return {
    baseUrl: hostConfig.baseUrl || defaultConfig.baseUrl,
    apiKey: hostConfig.apiKey || defaultConfig.apiKey,
    customHeaders: {
      ...defaultConfig.customHeaders,
      ...(hostConfig.customHeaders || {})
    }
  };
}

// ============= EXTERNAL API CALLS =============

async function lookupVehicle(
  args: { plate?: string; make?: string; model?: string; year?: number; cc_rating?: number; fuel_type?: string; body_style?: string; engine_number?: string },
  apiConfig: ApiConfig
): Promise<unknown> {
  const VEHICLE_LOOKUP_URL = `${apiConfig.baseUrl}/retrieve-vehicle-info`;
  
  try {
    const body: Record<string, unknown> = {};
    if (args.plate) body.plate = args.plate.toUpperCase().replace(/[\s-]/g, '');
    if (args.make) body.make = args.make;
    if (args.model) body.model = args.model;
    if (args.year) body.year = String(args.year);
    if (args.cc_rating) body.cc_rating = String(args.cc_rating);
    if (args.fuel_type) body.fuel_type = args.fuel_type;
    if (args.body_style) body.body_style = args.body_style;
    if (args.engine_number) body.engine_number = args.engine_number;
    
    console.log('Looking up vehicle with:', JSON.stringify(body));
    
    const response = await fetch(VEHICLE_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        ...apiConfig.customHeaders
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vehicle lookup failed:', response.status, errorText);
      return { error: `Vehicle lookup failed: ${response.status}` };
    }
    
    const data = await response.json();
    console.log('Vehicle lookup raw response:', JSON.stringify(data).substring(0, 500));
    return data;
  } catch (error) {
    console.error('Vehicle lookup error:', error);
    return { error: error instanceof Error ? error.message : 'Vehicle lookup failed' };
  }
}

async function searchWeb(query: string): Promise<unknown> {
  console.log('Searching web for:', query);
  // For now, return a placeholder - in production this would call a real search API
  return {
    results: [
      { title: "Web search not implemented", snippet: "This feature requires a web search API integration" }
    ]
  };
}

/**
 * Fetch parts with retry logic and graceful error handling.
 * Implements single retry with 2s delay on failure.
 */
async function retrieveParts(
  vehicleId: number | string,
  apiConfig: ApiConfig,
  partType?: string,
  retryCount = 0
): Promise<{ success: boolean; parts: unknown[]; error?: string; errorType?: string }> {
  const PARTS_URL = `${apiConfig.baseUrl}/retrieve-parts`;
  const MAX_RETRIES = 1;
  const RETRY_DELAY_MS = 2000;
  
  try {
    const numericId = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
    
    if (!Number.isFinite(numericId) || numericId <= 0) {
      console.error('[retrieveParts] Invalid vehicle ID:', vehicleId);
      return { success: false, parts: [], error: 'Invalid vehicle ID', errorType: 'invalid_input' };
    }
    
    // Build request body - use snake_case 'vehicle_id' for CARFIX API compatibility
    // Also pass as string per CARFIX API pattern (matches calculate-service-bundles)
    const body: Record<string, unknown> = { 
      vehicle_id: numericId,  // snake_case for CARFIX retrieve-parts API
      vehicleId: numericId,   // camelCase fallback for backward compatibility
      page_size: 500 // Request full catalog
    };
    if (partType) body.part_type = partType;
    
    console.log('[retrieveParts] Fetching parts for vehicle:', numericId, partType ? `(filtered: ${partType})` : '(full catalog)', retryCount > 0 ? `(retry ${retryCount})` : '');
    
    // Add timeout for slow connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const response = await fetch(PARTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        ...apiConfig.customHeaders
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('[retrieveParts] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[retrieveParts] Failed:', response.status, errorText.substring(0, 200));
      
      // Determine error type for appropriate user messaging
      let errorType = 'api_error';
      if (response.status === 500) {
        // Check if it's a "vehicle not found in database" error
        if (errorText.includes('Vehicle not found')) {
          errorType = 'vehicle_not_in_parts_db';
          console.log('[retrieveParts] Vehicle not in parts database - no parts catalogued');
        } else {
          errorType = 'server_error';
        }
      } else if (response.status === 429) {
        errorType = 'rate_limited';
      } else if (response.status === 404) {
        errorType = 'not_found';
      }
      
      // Retry on server errors (not on vehicle_not_in_parts_db as that's permanent)
      if (retryCount < MAX_RETRIES && errorType === 'server_error') {
        console.log(`[retrieveParts] Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return retrieveParts(vehicleId, apiConfig, partType, retryCount + 1);
      }
      
      return { 
        success: false, 
        parts: [], 
        error: `Parts lookup failed: ${response.status}`,
        errorType 
      };
    }
    
    const data = await response.json();
    const parts = data.parts || data.data || [];
    console.log('[retrieveParts] Success: received', parts.length, 'parts');
    
    return { success: true, parts };
  } catch (error) {
    console.error('[retrieveParts] Error:', error);
    
    // Handle specific error types
    let errorType = 'unknown_error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorType = 'timeout';
        console.log('[retrieveParts] Request timed out');
      } else if (error.message.includes('fetch')) {
        errorType = 'network_error';
      }
    }
    
    // Retry on timeout or network errors
    if (retryCount < MAX_RETRIES && (errorType === 'timeout' || errorType === 'network_error')) {
      console.log(`[retrieveParts] Retrying in ${RETRY_DELAY_MS}ms after ${errorType}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return retrieveParts(vehicleId, apiConfig, partType, retryCount + 1);
    }
    
    return { 
      success: false, 
      parts: [], 
      error: error instanceof Error ? error.message : 'Parts lookup failed',
      errorType 
    };
  }
}

// ============= CALCULATE SERVICE BUNDLES (preparedTiers) =============
async function fetchPreparedServiceBundles(
  vehicleId: number,
  apiConfig: ApiConfig
): Promise<{ success: boolean; packages: unknown[]; error?: string }> {
  const BUNDLES_URL = `${apiConfig.baseUrl}/calculate-service-bundles`;
  
  try {
    console.log('[ServiceBundles] Fetching bundles for vehicle:', vehicleId);
    
    const response = await fetch(BUNDLES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        ...apiConfig.customHeaders
      },
      body: JSON.stringify({ vehicleId: String(vehicleId) })
    });
    
    console.log('[ServiceBundles] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ServiceBundles] Failed:', response.status, errorText.substring(0, 200));
      return { success: false, packages: [], error: `Service bundles failed: ${response.status}` };
    }
    
    const data = await response.json();
    
    // Extract packages from nested structure
    const packages = data.data?.servicePackages || data.servicePackages || data.packages || [];
    console.log('[ServiceBundles] Success: received', packages.length, 'packages');
    
    // Log first package structure for debugging
    if (packages.length > 0) {
      const first = packages[0];
      console.log('[ServiceBundles] First package:', first.id, first.title, 
        'preparedTiers:', first.preparedTiers?.length || 0,
        'from_price:', first.from_price);
    }
    
    return { success: true, packages };
  } catch (error) {
    console.error('[ServiceBundles] Error:', error);
    return { success: false, packages: [], error: error instanceof Error ? error.message : 'Service bundles failed' };
  }
}

async function retrieveServicePackages(
  vehicleId: number | string,
  apiConfig: ApiConfig
): Promise<{ success: boolean; packages: unknown[]; error?: string }> {
  const numericId = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
  
  if (!Number.isFinite(numericId) || numericId <= 0) {
    console.error('[retrieveServicePackages] Invalid vehicle ID:', vehicleId);
    return { success: false, packages: [], error: 'Invalid vehicle ID' };
  }
  
  // Use the calculate-service-bundles endpoint for preparedTiers data
  return fetchPreparedServiceBundles(numericId, apiConfig);
}

/**
 * Filter service packages to only include those with valid preparedTiers
 * (Required for CARFIX parity - no partslots contamination)
 */
function filterDisplayablePackages(packages: unknown[]): unknown[] {
  if (!packages || !Array.isArray(packages)) return [];
  
  return packages.filter((pkg: any) => {
    if (!pkg || !pkg.id) return false;
    
    // Must have preparedTiers with at least one visible tier
    if (!pkg.preparedTiers || !Array.isArray(pkg.preparedTiers)) {
      console.log(`[filterDisplayable] Rejecting "${pkg.title}" - no preparedTiers`);
      return false;
    }
    
    const visibleTiers = pkg.preparedTiers.filter((t: any) => !t.isHidden);
    if (visibleTiers.length === 0) {
      console.log(`[filterDisplayable] Rejecting "${pkg.title}" - no visible tiers`);
      return false;
    }
    
    // Must have valid pricing
    const hasValidPrice = visibleTiers.some((t: any) => t.totalPrice > 0);
    if (!hasValidPrice) {
      console.log(`[filterDisplayable] Rejecting "${pkg.title}" - no valid tier prices`);
      return false;
    }
    
    return true;
  });
}

async function searchGeneralProducts(query: string): Promise<unknown> {
  console.log('Searching general products for:', query);
  // Placeholder - would call CARFIX product search API
  return {
    products: [],
    message: "General product search - connect to CARFIX catalog API"
  };
}

// ============= PARTNER API CALLS =============
const PARTNER_API_URL = 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api';
const PARTNER_API_KEY = Deno.env.get('CARFIX_PARTNER_API_KEY') || 'bob_carfix_p4rtner_2024_x7kL9mNqR3wY5vBc';

async function callPartnerAPI(action: string, params: Record<string, unknown>): Promise<unknown> {
  try {
    const response = await fetch(PARTNER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-Key': PARTNER_API_KEY
      },
      body: JSON.stringify({ action, ...params })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Partner API ${action} failed:`, response.status, errorText);
      return { error: `${action} failed: ${response.status}` };
    }
    
    return response.json();
  } catch (error) {
    console.error(`Partner API ${action} error:`, error);
    return { error: error instanceof Error ? error.message : `${action} failed` };
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

// ============= BRAIN DIAGNOSTIC API =============
const CARFIX_BRAIN_BASE = 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1';
const CARFIX_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHpqYmFzZHNmd29lcnV5eGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NTIwNzQsImV4cCI6MjA3MTIyODA3NH0.wKoJ51_VPro_BrJz-A-NRpSmUW0XBP-7TJJcrhvYwxE';

async function diagnoseBrainSymptom(userQuery: string): Promise<unknown> {
  console.log('[Brain] Diagnosing symptom:', userQuery);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${CARFIX_BRAIN_BASE}/query-brain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CARFIX_ANON_KEY,
        'x-partner-key': PARTNER_API_KEY,
      },
      body: JSON.stringify({ query: userQuery }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Brain] query-brain failed:', response.status, errText.substring(0, 200));
      return { error: `Brain diagnosis failed: ${response.status}`, no_match: true };
    }

    const data = await response.json();
    console.log('[Brain] Response:', JSON.stringify(data).substring(0, 500));
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    console.error('[Brain] Error:', isTimeout ? 'Timeout after 10s' : error);
    return { error: isTimeout ? 'Brain diagnosis timed out' : 'Brain diagnosis failed', no_match: true };
  }
}

async function lookupPartBySku(sku: string): Promise<unknown> {
  console.log('[Brain] Looking up SKU:', sku);
  try {
    const response = await fetch(`${CARFIX_BRAIN_BASE}/lookup-part-sku`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CARFIX_ANON_KEY,
        'x-partner-key': PARTNER_API_KEY,
      },
      body: JSON.stringify({ sku }),
    });

    if (!response.ok) {
      console.error('[Brain] lookup-part-sku failed:', response.status);
      return { error: `SKU lookup failed: ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    console.error('[Brain] SKU lookup error:', error);
    return { error: 'SKU lookup failed' };
  }
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
      case "diagnose_symptom": {
        const brainResult = await diagnoseBrainSymptom(args.user_query) as any;

        // If no match or error, return as-is for the AI to handle gracefully
        if (brainResult.no_match || brainResult.error) {
          console.log('[Brain] No diagnosis found or error');
          return { no_match: true, message: brainResult.error || 'No matching diagnosis found', raw: brainResult };
        }

        // Enrich any commercial SKUs with catalog pricing
        const diagnosisTrace = brainResult.diagnosis_trace || brainResult.results || [];
        const enrichedTrace = await Promise.all(
          diagnosisTrace.map(async (entry: any) => {
            if (entry.commercial_sku) {
              const partData = await lookupPartBySku(String(entry.commercial_sku));
              return { ...entry, catalog_part: partData };
            }
            return entry;
          })
        );

        return {
          no_match: false,
          confidence_tier: brainResult.confidence_tier || brainResult.confidence || 'unknown',
          diagnosis_trace: enrichedTrace,
          summary: brainResult.summary || null,
        };
      }
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
      // Multi-tenant support
      hostConfig,
      hostContext,
      // NEW: Vehicle candidates from previous multi-match response
      vehicleCandidates
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
    // DEBUG: Log vehicleCandidates regardless of whether they exist
    console.log(`[DEBUG] vehicleCandidates in request body:`, JSON.stringify(vehicleCandidates ? vehicleCandidates.slice(0, 2) : null));
    console.log(`[DEBUG] vehicleCandidates count:`, vehicleCandidates?.length || 0);
    
    if (vehicleCandidates && vehicleCandidates.length > 0) {
      console.log(`[Variant Selection] ✅ Received ${vehicleCandidates.length} candidates from client`);
    } else {
      console.log(`[Variant Selection] ⚠️ No vehicleCandidates in request body`);
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

    // ============= FORCED REGO LOOKUP (BYPASS AI UNRELIABILITY) =============
    // If user message contains a REGO and we don't have vehicle context,
    // force the lookup_vehicle call BEFORE going to AI
    let forcedLookupResult: {
      success?: boolean; 
      vehicle?: Record<string, unknown>; 
      vehicles?: Array<Record<string, unknown>>;
      plate?: string;
      error?: string;
    } | null = null;
    let forcedCandidates: VehicleCandidate[] = [];
    let forcedSingleVehicle: VehicleCandidate | null = null;
    let noTecDocMatch = false;  // Flag for vehicles without TecDoc mapping
    
    const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const lastUserContent = lastUserMessage?.content || '';
    
    // Only force lookup if: no vehicle context, no existing candidates, and message contains REGO
    if (!vehicleContext && (!vehicleCandidates || vehicleCandidates.length === 0)) {
      const extractedRego = extractRegoFromText(lastUserContent);
      if (extractedRego) {
        console.log(`[Forced REGO Lookup] Detected REGO in message, forcing lookup: ${extractedRego}`);
        
        try {
          const lookupResult = await lookupVehicle({ plate: extractedRego }, apiConfig) as {
            success?: boolean; 
            vehicle?: Record<string, unknown>; 
            vehicles?: Array<Record<string, unknown>>;
            error?: string;
          };
          forcedLookupResult = lookupResult;
          
          if (lookupResult?.success) {
            const vehicles = lookupResult.vehicles || [];
            const carJamVehicle = lookupResult.vehicle;
            
            // Enhanced logging: trace CarJam vs TecDoc ID sources
            console.log(`[Vehicle Lookup] Response structure: CarJam id=${carJamVehicle?.id}, TecDoc vehicles=${vehicles.length}`);
            if (vehicles.length > 0) {
              console.log(`[Vehicle Lookup] TecDoc vehicle_ids: ${vehicles.map((v: any) => v.vehicle_id).join(', ')}`);
            }
            
            if (vehicles.length > 1) {
              // Multiple variants - store candidates using TecDoc vehicle_ids ONLY
              forcedCandidates = vehicles.map((v: any) => ({
                vehicle_id: v.vehicle_id,  // ✅ ONLY use vehicle_id from TecDoc, never fall back to id
                carjam_id: carJamVehicle?.id as number | undefined,
                vehicle_name_nz: v.vehicle_name_nz,
                make: v.make,
                model: v.model,
                start_year: v.start_year,
                end_year: v.end_year,
                year: (carJamVehicle?.year_of_manufacture ?? v.year ?? v.start_year) as number,
                year_of_manufacture: (carJamVehicle?.year_of_manufacture as number | undefined),
                engine_code: v.engine_code,
                cc_rating: v.cc_rating,
                fuel_type: v.fuel_type,
                variant: v.variant,
                score: v.score,
                plate: extractedRego,
              })) as VehicleCandidate[];
              console.log(`[Forced REGO Lookup] Multiple TecDoc variants found: ${forcedCandidates.length}`);
              
            } else if (vehicles.length === 1) {
              // ✅ Single TecDoc match - ALWAYS use vehicle_id from vehicles[] array
              const tecDocVehicle = vehicles[0];
              
              // Year validation warning - detect mismatches between CarJam and TecDoc data
              const displayYear = carJamVehicle?.year_of_manufacture || tecDocVehicle.start_year;
              if (carJamVehicle?.year_of_manufacture && tecDocVehicle.start_year && tecDocVehicle.end_year) {
                if (carJamVehicle.year_of_manufacture < tecDocVehicle.start_year || 
                    carJamVehicle.year_of_manufacture > tecDocVehicle.end_year) {
                  console.warn(`[Year Validation] Mismatch: year_of_manufacture=${carJamVehicle.year_of_manufacture} outside TecDoc range ${tecDocVehicle.start_year}-${tecDocVehicle.end_year}`);
                }
              }
              
              forcedSingleVehicle = {
                // ✅ CRITICAL: Use vehicle_id from TecDoc vehicles[] array
                vehicle_id: tecDocVehicle.vehicle_id as number,
                carjam_id: carJamVehicle?.id as number | undefined,
                make: (tecDocVehicle.make || carJamVehicle?.make) as string,
                model: (tecDocVehicle.model || carJamVehicle?.model) as string,
                // Display year from CarJam (actual registration), internal matching from TecDoc
                year: displayYear as number,
                year_of_manufacture: carJamVehicle?.year_of_manufacture as number | undefined,
                start_year: tecDocVehicle.start_year as number | undefined,
                end_year: tecDocVehicle.end_year as number | undefined,
                variant: (tecDocVehicle.variant || tecDocVehicle.vehicle_name_nz) as string,
                cc_rating: (tecDocVehicle.cc_rating || carJamVehicle?.cc_rating) as number,
                fuel_type: (tecDocVehicle.fuel_type || carJamVehicle?.fuel_type) as string,
                engine_code: tecDocVehicle.engine_code as string | undefined,
                plate: extractedRego,
              };
              console.log(`[Forced REGO Lookup] Single TecDoc match: vehicle_id=${forcedSingleVehicle!.vehicle_id} (CarJam id=${carJamVehicle?.id})`);
              
            } else if (carJamVehicle && vehicles.length === 0) {
              // ⚠️ CarJam found vehicle but NO TecDoc matches - cannot look up parts
              console.warn(`[Forced REGO Lookup] CarJam found plate ${extractedRego} but no TecDoc matches - vehicle not in parts catalog`);
              
              // Still store the vehicle for display, but mark as no TecDoc ID
              forcedSingleVehicle = {
                vehicle_id: null, // ← Explicitly null - no TecDoc mapping
                carjam_id: carJamVehicle.id as number,
                make: carJamVehicle.make as string,
                model: carJamVehicle.model as string,
                year: carJamVehicle.year_of_manufacture as number,
                year_of_manufacture: carJamVehicle.year_of_manufacture as number,
                variant: carJamVehicle.submodel as string,
                cc_rating: carJamVehicle.cc_rating as number,
                fuel_type: carJamVehicle.fuel_type as string,
                plate: extractedRego,
              };
              
              // Flag this for error handling - skip parts fetch
              noTecDocMatch = true;
              console.log(`[Forced REGO Lookup] Marked noTecDocMatch=true for ${extractedRego}`);
            }
          }
        } catch (err) {
          console.error('[Forced REGO Lookup] Error:', err);
        }
      }
    }

    // ============= CANNED RESPONSE SYSTEM =============
    // Check if we can bypass AI entirely for common triggers
    // NOTE: Only check canned response if we didn't just force a REGO lookup
    const cannedResponse = (!forcedLookupResult && !forcedCandidates.length && !forcedSingleVehicle)
      ? await checkCannedResponse(messages, vehicleContext, customerEmail)
      : null;
    
    if (cannedResponse) {
      console.log(`[Canned Response] Bypassing AI with: "${cannedResponse.transcript.substring(0, 50)}..."`);
      
      // Return canned response as SSE stream (no AI call)
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Emit the canned text as if it were streamed
          const textEvent = `data: ${JSON.stringify({
            choices: [{ delta: { content: cannedResponse.transcript } }]
          })}\n\n`;
          controller.enqueue(encoder.encode(textEvent));
          
          // Emit audio_url hint for frontend to play exact audio
          const audioHint = `data: ${JSON.stringify({
            type: 'audio_hint',
            audio_url: cannedResponse.audio_url,
            clip_key: cannedResponse.clip_key
          })}\n\n`;
          controller.enqueue(encoder.encode(audioHint));
          
          // End stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // ============= STATE-DRIVEN RESPONSE GENERATION =============
    // Determine conversation state BEFORE deciding whether to call AI
    const allCandidates = [
      ...(vehicleCandidates as VehicleCandidate[] || []),
      ...forcedCandidates
    ];
    
    // Try deterministic match if we have candidates
    let deterministicVehicle: VehicleCandidate | null = forcedSingleVehicle;
    let deterministicSelectionMethod: string | null = forcedSingleVehicle ? 'forced_single_match' : null;
    
    // CRITICAL: Only run the matcher if:
    // 1. We don't already have a confirmed vehicle
    // 2. Candidates exist from a PREVIOUS message (vehicleCandidates from client), not from a forced lookup in THIS message
    // 3. forcedCandidates.length === 0 means we didn't just do a REGO lookup in this request
    //    (if we did, the user's message IS the REGO, not a variant selection)
    const candidatesFromPreviousMessage = vehicleCandidates as VehicleCandidate[] || [];
    const shouldRunMatcher = !deterministicVehicle && 
                              candidatesFromPreviousMessage.length > 0 && 
                              forcedCandidates.length === 0 &&  // Don't match if we just looked up a REGO
                              !vehicleContext;
    
    if (shouldRunMatcher && lastUserContent) {
      console.log(`[Variant Matcher] Running matcher against ${candidatesFromPreviousMessage.length} candidates from previous message`);
      const matchResult = matchUserInputToCandidate(lastUserContent, candidatesFromPreviousMessage);
      if (matchResult) {
        deterministicVehicle = matchResult.candidate;
        deterministicSelectionMethod = matchResult.method;
        console.log(`[Variant Selection] Deterministically matched vehicle_id=${deterministicVehicle.vehicle_id} via ${deterministicSelectionMethod}`);
      }
    } else if (!deterministicVehicle && forcedCandidates.length > 0) {
      console.log(`[Variant Matcher] Skipping matcher - this message contains the REGO, not a variant selection`);
    }
    
    // Determine current conversation state
    const conversationState = determineConversationState(
      vehicleContext,
      forcedCandidates,
      vehicleCandidates as VehicleCandidate[] || [],
      deterministicVehicle
    );
    
    console.log(`[State Machine] Determined state: ${conversationState}`, {
      hasVehicleContext: !!vehicleContext,
      forcedCandidatesCount: forcedCandidates.length,
      clientCandidatesCount: (vehicleCandidates as VehicleCandidate[] || []).length,
      deterministicMatch: deterministicSelectionMethod,
    });
    
    // ============= STATE: AWAITING_VARIANT_SELECTION =============
    // When we have multiple variants and no deterministic match, bypass AI entirely
    // and generate a structured variant list directly
    if (conversationState === 'AWAITING_VARIANT_SELECTION' && !deterministicVehicle) {
      console.log(`[State Machine] AWAITING_VARIANT_SELECTION - generating deterministic variant list with UI cards`);
      
      // Generate both text and structured card data
      const variantData = generateVariantListData(allCandidates);
      const { text: variantList, cards, make, model } = variantData;
      
      const responseText = `I found ${cards.length} versions of the ${make} ${model}. Which one is yours?\n\n${variantList}\n\nJust say the number or tap your choice, mate.`;
      
      // Return deterministic response as SSE stream (no AI call)
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Emit conversation state event first
          const stateEvent = `data: ${JSON.stringify({ 
            type: "conversation_state", 
            state: conversationState,
            candidates: allCandidates 
          })}\n\n`;
          controller.enqueue(encoder.encode(stateEvent));
          
          // Emit vehicle candidates for client storage (backwards compatibility)
          const candidatesEvent = `data: ${JSON.stringify({ 
            type: "vehicle_candidates_found", 
            candidates: allCandidates 
          })}\n\n`;
          controller.enqueue(encoder.encode(candidatesEvent));
          
          // NEW: Emit variant_selection_required with structured card data for UI
          const variantSelectionEvent = `data: ${JSON.stringify({
            type: "variant_selection_required",
            candidates: cards,
            make,
            model,
            promptText: `I found ${cards.length} versions of the ${make} ${model}. Which one is yours?`
          })}\n\n`;
          controller.enqueue(encoder.encode(variantSelectionEvent));
          
          // Emit the variant list text as if it were streamed (for TTS)
          const textEvent = `data: ${JSON.stringify({
            choices: [{ delta: { content: responseText } }]
          })}\n\n`;
          controller.enqueue(encoder.encode(textEvent));
          
          // End stream - no audio_hint since we want TTS for this
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Load prompts from database and build system prompt
    const dbPrompts = await fetchPromptsFromDB();
    const baseSystemPrompt = buildSystemPromptFromDB(dbPrompts);
    
    // Build enhanced system prompt if vehicle context is provided from session
    let enhancedSystemPrompt = baseSystemPrompt;
    
    // Use deterministic vehicle if matched, otherwise use session context
    const effectiveVehicleContext = vehicleContext || (deterministicVehicle ? {
      vehicle_id: deterministicVehicle.vehicle_id,
      id: deterministicVehicle.vehicle_id,
      make: deterministicVehicle.make,
      model: deterministicVehicle.model,
      // FIXED: Prioritize year_of_manufacture for accurate display
      year: (deterministicVehicle as any).year_of_manufacture ?? deterministicVehicle.year ?? deterministicVehicle.start_year,
      variant: deterministicVehicle.variant || deterministicVehicle.vehicle_name_nz,
      engine_size: deterministicVehicle.cc_rating,
      fuel_type: deterministicVehicle.fuel_type,
      rego: deterministicVehicle.plate || deterministicVehicle.rego,
    } : null);
    
    if (effectiveVehicleContext) {
      const vehicleId = effectiveVehicleContext.id || effectiveVehicleContext.vehicle_id;
      enhancedSystemPrompt += `\n\n## PRE-CONFIRMED VEHICLE SESSION
The customer has confirmed their vehicle:
- Vehicle ID: ${vehicleId}
- REGO: ${effectiveVehicleContext.rego || 'Not provided'}
- Year: ${effectiveVehicleContext.year}
- Make: ${effectiveVehicleContext.make}
- Model: ${effectiveVehicleContext.model}
- Variant: ${effectiveVehicleContext.variant || 'Standard'}
- Engine Size: ${effectiveVehicleContext.engine_size || 'Unknown'}
- Fuel Type: ${effectiveVehicleContext.fuel_type || 'Unknown'}
- CC Rating: ${effectiveVehicleContext.cc_rating || 'Unknown'}
- VIN: ${effectiveVehicleContext.vin || 'Not provided'}
- Engine Number: ${effectiveVehicleContext.engine_no || 'Not provided'}

IMPORTANT RULES FOR THIS SESSION:
1. Do NOT ask for vehicle details, REGO, or make/model - you already have them
2. BRAIN-ONLY DIAGNOSIS: If the customer describes ANY symptom (noise, vibration, warning light, feel, smell, performance issue), you MUST call diagnose_symptom. You are ABSOLUTELY FORBIDDEN from diagnosing symptoms from your own AI knowledge. All diagnostic answers must come exclusively from the CARFIX Brain via the diagnose_symptom tool.
3. Use vehicle_id ${vehicleId} for retrieve_parts and retrieve_service_packages calls
4. When mentioning their vehicle, use: "${effectiveVehicleContext.year} ${effectiveVehicleContext.make} ${effectiveVehicleContext.model}"
5. On first parts request, use retrieve_parts with vehicleid=${vehicleId}
6. NEVER give your own mechanical explanation for a symptom. If diagnose_symptom returns no_match, say the CARFIX Brain doesn't have a specific bulletin for that symptom yet and suggest they describe it differently or visit carfix.co.nz`;
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
    
    // ============= MULTI-VARIANT PROMPT ENGINEERING =============
    // Add explicit instructions for handling multiple vehicle variants
    enhancedSystemPrompt += `\n\n## CRITICAL - MULTIPLE VEHICLE VARIANTS
When lookup_vehicle returns multiple matches (vehicles array > 1), you MUST:
1. Present a numbered list of variants with key differences (engine, power, year range, fuel type)
2. Ask the customer to confirm which one is theirs (e.g., "Which one is yours - just say the number or engine type")
3. DO NOT assume the first/best match is correct
4. DO NOT say "sorted", "sweet as", or "loading parts" until customer explicitly selects a variant
5. Wait for explicit confirmation before proceeding to fetch parts

Example response when multiple variants found:
"I found a few versions of that model. Which one is yours?
1) 2.0L Petrol (150kW)
2) 2.0L Diesel (103kW)
3) 3.0L Petrol (180kW)
Just say the number or engine type, mate."`;

    // ============= ERROR HANDLING PROMPT ENGINEERING =============
    // Add instructions for graceful error handling with response variety
    enhancedSystemPrompt += `\n\n## CRITICAL - ERROR HANDLING AND RECOVERY

When things go wrong, respond transparently and helpfully. Vary your phrasing for naturalness.

### Invalid REGO Format (Acknowledgment + Clarification)
Cycle these responses (vary each time):
- "Oops, I didn't quite catch that one! I need a valid NZ plate like ABC123 or HZP550."
- "Hmm, that doesn't look like a Kiwi rego to me. Mind trying again? Format's usually ABC123."
- "No luck with that plate, mate. Double-check it's a standard NZ format like ABC123?"

### Vehicle Not Found in Database
Cycle these responses:
- "Couldn't find a match for [REGO] in the system. Might be too new or an import. Try the make, model, and year?"
- "Hmm, [REGO] isn't showing up. Sometimes newer cars take a while to get catalogued. Got the make and model handy?"
- "No joy on [REGO], mate. Could be a typo, or it might be a fresh import. Mind double-checking?"

### Parts Fetch Error (vehicle_not_in_parts_db)
Cycle these responses - direct to carfix.co.nz:
- "Ah, Bob's parts system isn't set up for your [VEHICLE] yet. Head over to carfix.co.nz and browse manually – the team there will sort you!"
- "No parts coming up for your [VEHICLE] in my system – sometimes happens with imports. Try carfix.co.nz for the full catalogue!"
- "Drawing a blank for your [VEHICLE], mate. Best bet is to pop over to carfix.co.nz and browse there!"

### Parts Fetch Error (server_error/timeout/network)
Cycle these responses (add Bob personality):
- "Bob's taking a quick pit stop! Having trouble connecting – try refreshing, or hop over to carfix.co.nz while we sort this out."
- "Bit of a glitch on my end, mate. Give the page a refresh, or browse directly at carfix.co.nz."
- "She's playing up a bit – connection trouble. Try again in a tick, or carfix.co.nz has what you need!"

### Empty Results (Parts search succeeded but zero results)
Cycle these responses:
- "Hmm, no parts showing for your [VEHICLE] in our catalogue – common with imports. Try carfix.co.nz for the full range!"
- "Nothing coming up for that one. Head to carfix.co.nz and browse manually – they'll have it sorted!"

### General Rules:
- NEVER output "undefined", "null", or empty template variables - if a value is missing, omit it
- NEVER invent products or prices not in tool results
- NEVER offer "universal products" or "accessories" – Bob doesn't have this capability
- ALWAYS empower users: provide clear next steps, suggest retry or website
- ALWAYS direct to carfix.co.nz as the fallback recovery path
- Kiwi-friendly tone: apologetic yet optimistic ("she'll be right" attitude)`;

    // Build conversation with system prompt
    const conversationMessages: Message[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
    ];

    // ============= STORE FORCED LOOKUP CANDIDATES =============
    // If we forced a REGO lookup and got multiple variants, store them for emission
    if (forcedCandidates.length > 0) {
      console.log(`[Forced REGO Lookup] Storing ${forcedCandidates.length} candidates for multi-variant handling`);
      (conversationMessages as unknown as { _multipleVehicleCandidates?: VehicleCandidate[] })._multipleVehicleCandidates = forcedCandidates;
      (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = true;
      (conversationMessages as unknown as { _vehicleCandidatesToEmit?: VehicleCandidate[] })._vehicleCandidatesToEmit = forcedCandidates;
      
      // Add context message so AI knows about the variants
      const variantList = forcedCandidates.map((c, i) => {
        const cc = c.cc_rating ? `${(c.cc_rating / 1000).toFixed(1)}L` : '';
        const fuel = c.fuel_type || '';
        const eng = c.engine_code || '';
        return `${i + 1}) ${c.vehicle_name_nz || `${c.make} ${c.model}`} ${cc} ${fuel} ${eng}`.trim();
      }).join('\n');
      
      conversationMessages.push({
        role: "system",
        content: `[VEHICLE LOOKUP COMPLETED - MULTIPLE VARIANTS FOUND]
The customer's REGO returned ${forcedCandidates.length} possible vehicle variants:
${variantList}

You MUST present these options to the customer and ask them to confirm which one is theirs.
DO NOT assume any variant. DO NOT say parts are loading. Wait for their selection.`
      });
    }

    // ============= DETERMINISTIC PARTS FETCH =============
    // If we deterministically matched a vehicle, fetch parts/packages NOW
    // This happens BEFORE calling the AI, ensuring reliable data loading
    if (deterministicVehicle && deterministicVehicle.vehicle_id) {
      const vehicleId = deterministicVehicle.vehicle_id;
      console.log(`[Deterministic Fetch] Fetching parts and packages for vehicle_id=${vehicleId}`);
      
      // Store confirmed vehicle for emission
      (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = {
        vehicle_id: vehicleId,
        make: deterministicVehicle.make,
        model: deterministicVehicle.model,
        // FIXED: Prioritize year_of_manufacture for accurate year display
        year: (deterministicVehicle as any).year_of_manufacture ?? deterministicVehicle.year ?? deterministicVehicle.start_year,
        variant: deterministicVehicle.variant || deterministicVehicle.vehicle_name_nz,
        engine_size: deterministicVehicle.cc_rating,
        fuel_type: deterministicVehicle.fuel_type,
        rego: deterministicVehicle.plate || deterministicVehicle.rego,
      };
      (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId = vehicleId;
      (conversationMessages as unknown as { _deterministicMatch?: boolean })._deterministicMatch = true;
      
      // Clear multi-vehicle flags since we now have a confirmed selection
      (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = false;
      
      // Fetch parts and packages in parallel
      const [partsResult, packagesResult] = await Promise.all([
        retrieveParts(vehicleId, apiConfig),
        retrieveServicePackages(vehicleId, apiConfig)
      ]);
      
      // Track if we had errors for context injection
      let fetchErrorContext = '';
      
      if (partsResult.success && partsResult.parts.length > 0) {
        console.log(`[Deterministic Fetch] Got ${partsResult.parts.length} parts`);
        (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = partsResult.parts;
      } else if (!partsResult.success) {
        // Store error type for appropriate response generation
        console.log(`[Deterministic Fetch] Parts fetch failed: ${partsResult.errorType} - ${partsResult.error}`);
        (conversationMessages as unknown as { _partsErrorType?: string })._partsErrorType = partsResult.errorType || 'unknown';
        
        // Log error for analytics
        await logErrorEvent(partsResult.errorType || 'unknown', {
          vehicleId: vehicleId,
          make: deterministicVehicle.make,
          model: deterministicVehicle.model,
          rego: deterministicVehicle.plate || deterministicVehicle.rego,
        }, { 
          rawError: partsResult.error,
          fetchType: 'deterministic_fetch'
        });
        
        if (partsResult.errorType === 'vehicle_not_in_parts_db') {
          fetchErrorContext = `\n\n[PARTS FETCH RESULT] Vehicle_id ${vehicleId} not in parts catalog. 
Direct customer to carfix.co.nz for manual browsing. 
DO NOT offer universal products or accessories – Bob cannot access these.
Use varied, Kiwi-friendly phrasing. Log this for catalog expansion tracking.`;
        } else if (['server_error', 'timeout', 'network_error'].includes(partsResult.errorType || '')) {
          fetchErrorContext = `\n\n[PARTS FETCH RESULT] Technical issue (${partsResult.errorType}). 
Suggest page refresh or carfix.co.nz fallback. 
Add light humor – "Bob's taking a pit stop!" 
This is recoverable; offer retry or website.`;
        } else {
          fetchErrorContext = `\n\n[PARTS FETCH RESULT] Unknown error (${partsResult.errorType}). 
Apologize and direct to carfix.co.nz.`;
        }
      } else {
        // Success but empty
        console.log(`[Deterministic Fetch] Parts fetch succeeded but returned 0 parts`);
        
        // Log empty results for catalog expansion tracking
        await logErrorEvent('empty_results', {
          vehicleId: vehicleId,
          make: deterministicVehicle.make,
          model: deterministicVehicle.model,
          rego: deterministicVehicle.plate || deterministicVehicle.rego,
        }, { 
          fetchType: 'deterministic_fetch',
          partsCount: 0
        });
        
        fetchErrorContext = `\n\n[PARTS FETCH RESULT] Search completed, zero matches. 
Direct to carfix.co.nz. 
Use encouraging phrasing – "common with imports" or "catalogue is growing". 
DO NOT suggest fallback products Bob cannot access.`;
      }
      
      if (packagesResult.success && packagesResult.packages.length > 0) {
        const displayable = filterDisplayablePackages(packagesResult.packages);
        console.log(`[Deterministic Fetch] Got ${displayable.length} displayable packages`);
        (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayable;
        
        // If we have packages but no parts, that's still useful
        if (fetchErrorContext && displayable.length > 0) {
          fetchErrorContext += ` However, I do have ${displayable.length} service packages available that might help!`;
        }
      }
      
      // Add context message for AI to know vehicle is confirmed AND error status
      const baseConfirmation = `[VEHICLE CONFIRMED AUTOMATICALLY] The customer selected the ${deterministicVehicle.year || deterministicVehicle.start_year} ${deterministicVehicle.make} ${deterministicVehicle.model} (${deterministicVehicle.variant || deterministicVehicle.vehicle_name_nz || 'variant'}).`;
      
      if (fetchErrorContext) {
        conversationMessages.push({
          role: "system",
          content: `${baseConfirmation}${fetchErrorContext}\n\nCRITICAL: DO NOT say "here are your parts" or imply products are loading if the fetch failed. Acknowledge the issue honestly and offer help.`
        });
      } else {
        // Check if the user's latest message sounds like a symptom description
        const latestUserMsg = messages.filter((m: Message) => m.role === 'user').pop();
        const latestContent = (latestUserMsg?.content || '').toLowerCase();
        const symptomKeywords = ['feel', 'sound', 'noise', 'vibrat', 'squeal', 'grind', 'shake', 'pull', 'leak', 'smell', 'light', 'warning', 'spongy', 'soft', 'hard', 'stiff', 'rough', 'rough', 'clunk', 'rattle', 'click', 'wobble', 'slip', 'judder', 'overheat', 'smoke', 'burning'];
        const hasSymptom = symptomKeywords.some(kw => latestContent.includes(kw));
        
        const symptomInstruction = hasSymptom
          ? ` CRITICAL: The customer described a vehicle symptom. You MUST call diagnose_symptom FIRST. You are FORBIDDEN from diagnosing or explaining the symptom from your own knowledge — ALL diagnostic answers must come from the CARFIX Brain via diagnose_symptom. Do not respond until you have called it.`
          : '';
        
        conversationMessages.push({
          role: "system",
          content: `${baseConfirmation} Parts and service packages are already loading on their shelf. Confirm the selection and help them find what they need.${symptomInstruction}`
        });
      }
    } else if (noTecDocMatch && forcedSingleVehicle) {
      // ⚠️ CarJam found vehicle but NO TecDoc matches - skip parts fetch entirely
      console.log(`[Deterministic Fetch] Skipping parts fetch - noTecDocMatch=true, vehicle has no TecDoc ID`);
      
      // Store confirmed vehicle for display even though we can't fetch parts
      (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = {
        vehicle_id: null,
        carjam_id: forcedSingleVehicle.carjam_id,
        make: forcedSingleVehicle.make,
        model: forcedSingleVehicle.model,
        year: forcedSingleVehicle.year_of_manufacture ?? forcedSingleVehicle.year,
        variant: forcedSingleVehicle.variant,
        fuel_type: forcedSingleVehicle.fuel_type,
        rego: forcedSingleVehicle.plate,
      };
      
      // Store error type for appropriate response generation
      (conversationMessages as unknown as { _partsErrorType?: string })._partsErrorType = 'vehicle_not_in_parts_db';
      
      // Log error for analytics
      await logErrorEvent('vehicle_not_in_parts_db', {
        vehicleId: forcedSingleVehicle.carjam_id,
        make: forcedSingleVehicle.make,
        model: forcedSingleVehicle.model,
        rego: forcedSingleVehicle.plate,
      }, { 
        reason: 'no_tecdoc_mapping',
        fetchType: 'deterministic_skip'
      });
      
      // Add context message for AI explaining the situation
      const vehicleDesc = `${forcedSingleVehicle.year_of_manufacture ?? forcedSingleVehicle.year} ${forcedSingleVehicle.make} ${forcedSingleVehicle.model}`;
      conversationMessages.push({
        role: "system",
        content: `[VEHICLE IDENTIFIED BUT NOT IN PARTS CATALOG] The customer's ${vehicleDesc} was found in the registration database but is NOT in Bob's parts catalog.

CRITICAL INSTRUCTIONS:
1. Do NOT say "here are your parts" or suggest products are loading
2. Do NOT offer "universal" products or accessories – Bob cannot access these
3. ACKNOWLEDGE the vehicle and apologize that it's not in the system yet
4. DIRECT them to carfix.co.nz for manual browsing
5. Use VARIED, Kiwi-friendly phrasing – examples:
   - "Ah, Bob's parts system isn't set up for your ${vehicleDesc} yet. Head over to carfix.co.nz and browse manually – the team there will sort you!"
   - "She's a beauty, but I don't have her in my catalog yet, mate. Jump on carfix.co.nz and the crew will hook you up!"
   - "No worries – bit of a gap in my database for this one. Check out carfix.co.nz – they've got the goods!"

Use light humor and be helpful while being honest about the limitation.`
      });
    }

    // ============= SYMPTOM DETECTION FOR FORCED BRAIN CALL =============
    // Detect symptom BEFORE entering the tool loop so we can force tool_choice on first call
    const latestUserMsgForSymptom = messages.filter((m: Message) => m.role === 'user').pop();
    const latestUserContentForSymptom = (latestUserMsgForSymptom?.content || '').toLowerCase();
    const symptomKeywordsGlobal = ['feel', 'sound', 'noise', 'vibrat', 'squeal', 'grind', 'shake', 'pull', 'leak', 'smell', 'warning', 'spongy', 'soft', 'stiff', 'clunk', 'rattle', 'click', 'wobble', 'slip', 'judder', 'overheat', 'smoke', 'burning', 'rough', 'hard pedal', 'grinding', 'pulsing', 'shudder', 'shimmy', 'dart', 'wander', 'steer', 'misfir', 'backfire', 'hesitat', 'surge', 'idle', 'stall', 'crank', 'won\'t start', 'hard to start', 'dies', 'cuts out', 'overheating'];
    const hasSymptomGlobal = effectiveVehicleContext && symptomKeywordsGlobal.some(kw => latestUserContentForSymptom.includes(kw));
    
    if (hasSymptomGlobal) {
      console.log('[Brain] Symptom detected in user message - will FORCE diagnose_symptom on first loop iteration');
    }

    // Tool calling loop - may require multiple iterations
    let loopCount = 0;
    const maxLoops = 5; // Prevent infinite loops
    
    while (loopCount < maxLoops) {
      loopCount++;
      console.log(`Tool calling loop iteration ${loopCount}`);
      
      // Force diagnose_symptom on FIRST iteration if a symptom was detected
      // This prevents Bob from answering from his own knowledge instead of the Brain
      const forceBrainCall = hasSymptomGlobal && loopCount === 1;
      const toolChoiceOverride = forceBrainCall
        ? { type: "function", function: { name: "diagnose_symptom" } }
        : "auto";
      
      if (forceBrainCall) {
        console.log('[Brain] FORCING tool_choice=diagnose_symptom to prevent AI self-answer');
      }
      
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
          tool_choice: toolChoiceOverride,
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
      const choice = aiResponse.choices[0];
      const assistantMessage = choice.message;
      
      // Check if there are tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log('Processing', assistantMessage.tool_calls.length, 'tool calls');
        
        // Add assistant message with tool calls to conversation
        conversationMessages.push({
          role: "assistant",
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls
        });
        
        // Process each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          console.log('Tool call:', toolCall.function.name, toolCall.function.arguments);
          
          // Check for searching audio clips before executing tool
          if (toolCall.function.name === 'lookup_vehicle') {
            const searchingClip = await getSearchingClip('vehicle');
            if (searchingClip) {
              const existingEvents = (conversationMessages as unknown as { _searchingEventsToEmit?: unknown[] })._searchingEventsToEmit || [];
              (conversationMessages as unknown as { _searchingEventsToEmit?: unknown[] })._searchingEventsToEmit = [
                ...existingEvents,
                {
                  type: 'bob_searching',
                  search_type: 'vehicle',
                  transcript: searchingClip.transcript,
                  audio_url: searchingClip.audio_url,
                  clip_key: searchingClip.clip_key
                }
              ];
            }
          } else if (toolCall.function.name === 'retrieve_parts' || toolCall.function.name === 'retrieve_service_packages') {
            // Only play parts searching audio if vehicle is ALREADY confirmed
            // (effectiveVehicleContext exists from session or previous confirmation)
            if (effectiveVehicleContext) {
              const searchingClip = await getSearchingClip('parts');
              if (searchingClip) {
                const existingEvents = (conversationMessages as unknown as { _searchingEventsToEmit?: unknown[] })._searchingEventsToEmit || [];
                // Only add parts searching if not already queued
                const alreadyHasParts = existingEvents.some((e: any) => e.search_type === 'parts');
                if (!alreadyHasParts) {
                  console.log(`[Searching Audio] Vehicle confirmed, queuing parts searching audio`);
                  (conversationMessages as unknown as { _searchingEventsToEmit?: unknown[] })._searchingEventsToEmit = [
                    ...existingEvents,
                    {
                      type: 'bob_searching',
                      search_type: 'parts',
                      transcript: searchingClip.transcript,
                      audio_url: searchingClip.audio_url,
                      clip_key: searchingClip.clip_key
                    }
                  ];
                }
              }
            } else {
              console.log(`[Searching Audio] Vehicle NOT confirmed yet, skipping parts searching audio`);
            }
          }
          
          const result = await executeToolCall(toolCall, apiConfig);
          
          // ============= VEHICLE LOOKUP PROCESSING =============
          // Handle vehicle lookup results - store data for validation and emit events
          if (toolCall.function.name === "lookup_vehicle") {
            const vehicleResult = result as { 
              success?: boolean; 
              vehicle?: Record<string, unknown>; 
              vehicles?: Array<Record<string, unknown>>;
              error?: string;
            };
            
            if (vehicleResult.success) {
              // Check for multiple matches vs single match
              const vehicles = vehicleResult.vehicles || [];
              const singleVehicle = vehicleResult.vehicle;
              
              if (vehicles.length > 1) {
                // MULTIPLE MATCHES - Store candidates and flag for variant selection
                console.log(`[Vehicle Lookup] Multiple matches: ${vehicles.length} variants`);
                
                // Extract minimal candidate data for client storage
                const candidateList: VehicleCandidate[] = vehicles.map((v: any) => ({
                  vehicle_id: v.vehicle_id || v.id,
                  vehicle_name_nz: v.vehicle_name_nz,
                  make: v.make,
                  model: v.model,
                  start_year: v.start_year,
                  end_year: v.end_year,
                  year: v.year,
                  engine_code: v.engine_code,
                  cc_rating: v.cc_rating,
                  fuel_type: v.fuel_type,
                  variant: v.variant,
                  score: v.score,
                  plate: (vehicleResult as any).plate || (vehicleResult.vehicle as any)?.rego,
                }));
                
                // Store for fallback detection
                (conversationMessages as unknown as { _multipleVehicleCandidates?: VehicleCandidate[] })._multipleVehicleCandidates = candidateList;
                (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = true;
                
                // Store candidates to emit to client
                (conversationMessages as unknown as { _vehicleCandidatesToEmit?: VehicleCandidate[] })._vehicleCandidatesToEmit = candidateList;
                
                console.log(`[Vehicle Lookup] Stored ${candidateList.length} candidates for emission`);
                
              } else if (singleVehicle || vehicles.length === 1) {
                // SINGLE MATCH - Auto-confirm
                const vehicle = singleVehicle || vehicles[0];
                const vehicleId = (vehicle.vehicle_id || vehicle.id) as number;
                
                console.log(`[Vehicle Lookup] Single match - auto-confirming vehicle_id=${vehicleId}`);
                
                // Store lookup data for validation
                (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId = vehicleId;
                (conversationMessages as unknown as { _lookupVehicleData?: Record<string, unknown> })._lookupVehicleData = vehicle;
                
                // Auto-confirm and fetch parts/packages
                (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = {
                  vehicle_id: vehicleId,
                  make: vehicle.make,
                  model: vehicle.model,
                  year: vehicle.year || vehicle.start_year,
                  variant: vehicle.variant || vehicle.vehicle_name_nz,
                  engine_size: vehicle.cc_rating,
                  fuel_type: vehicle.fuel_type,
                  rego: (vehicleResult as any).plate || vehicle.rego,
                };
                
                // Fetch parts and packages
                const [partsResult, packagesResult] = await Promise.all([
                  retrieveParts(vehicleId, apiConfig),
                  retrieveServicePackages(vehicleId, apiConfig)
                ]);
                
                if (partsResult.success && partsResult.parts.length > 0) {
                  console.log(`[Vehicle Lookup] Auto-fetch: ${partsResult.parts.length} parts`);
                  (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = partsResult.parts;
                }
                
                if (packagesResult.success && packagesResult.packages.length > 0) {
                  const displayable = filterDisplayablePackages(packagesResult.packages);
                  console.log(`[Vehicle Lookup] Auto-fetch: ${displayable.length} packages`);
                  (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayable;
                }
              }
            }
          }
          
          // ============= PARTS/PACKAGES TOOL RESULT PROCESSING =============
          if (toolCall.function.name === "retrieve_parts") {
            const partsResult = result as { success?: boolean; parts?: unknown[] };
            if (partsResult.success && partsResult.parts && partsResult.parts.length > 0) {
              console.log('Storing', partsResult.parts.length, 'parts for emission');
              (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = partsResult.parts;
            }
          }
          
          if (toolCall.function.name === "retrieve_service_packages") {
            const packagesResult = result as { success?: boolean; packages?: unknown[] };
            if (packagesResult.success && packagesResult.packages && packagesResult.packages.length > 0) {
              const displayable = filterDisplayablePackages(packagesResult.packages);
              console.log('Storing', displayable.length, 'service packages for emission');
              (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayable;
            }
          }
          
          // Add tool result to conversation
          conversationMessages.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });
        }
        
        // Continue loop to get next response
        continue;
      }
      
      // No tool calls - we have the final response
      // ============= FALLBACK VARIANT CONFIRMATION =============
      // Check if AI verbally confirmed a variant without explicit marker
      // CRITICAL: Only use fallback if we're NOT in multi-variant selection mode
      // During multi-variant, we need the user to explicitly select, not Bob auto-confirming
      const storedCandidates = (conversationMessages as unknown as { _multipleVehicleCandidates?: VehicleCandidate[] })._multipleVehicleCandidates;
      const alreadyFetchedPackages = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit;
      const alreadyConfirmed = (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle;
      const multipleVehiclesPending = (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound;
      
      // Only try fallback if we have candidates AND haven't already confirmed
      // AND we're NOT in multi-variant pending state (prevents false confirmation on Bob's first response)
      if (storedCandidates && storedCandidates.length > 0 && !alreadyConfirmed && !multipleVehiclesPending) {
        // Check AI response for confirmation patterns
        // NOTE: These patterns are ONLY triggered when multipleVehiclesPending is false
        // (i.e., when user has explicitly selected a variant in their message)
        const aiContent = (assistantMessage.content || "").toLowerCase();
        
        // TIGHTENED: Only patterns that indicate explicit selection confirmation
        // Removed broad patterns like "sweet as", "nice one", "all good" that can trigger
        // on Bob's initial multi-variant response
        const confirmationPatterns = [
          /that'?s?\s*(the\s+one|correct|right|it)/i,
          /got\s*(it|ya|cha).*\b(parts|shelf|loading|fetching)\b/i,  // Tightened: need "parts" context
          /confirmed.*vehicle/i,
          /loading.*parts.*for.*your/i,
          /fetching.*parts/i,
        ];
        
        const isVerbalConfirmation = confirmationPatterns.some(p => p.test(aiContent));
        
        if (isVerbalConfirmation) {
          console.log('[Fallback Confirmation] Detected verbal confirmation in AI response');
          
          // Use first candidate (highest scored)
          const fallbackVehicle = storedCandidates[0];
          const vehicleId = fallbackVehicle.vehicle_id;
          
          if (vehicleId && vehicleId > 0) {
            console.log(`[Fallback Confirmation] Using first stored candidate: vehicle_id=${vehicleId}`);
            
            // Store confirmed vehicle for emission
            (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle = {
              vehicle_id: vehicleId,
              make: fallbackVehicle.make,
              model: fallbackVehicle.model,
              year: fallbackVehicle.year || fallbackVehicle.start_year,
              variant: fallbackVehicle.variant || fallbackVehicle.vehicle_name_nz,
              engine_size: fallbackVehicle.cc_rating,
              fuel_type: fallbackVehicle.fuel_type,
              rego: fallbackVehicle.plate || fallbackVehicle.rego,
            };
            
            // Clear the multiple vehicles flag since we now have a selection
            (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = false;
            
            // Fetch ALL parts for this vehicle
            const allParts = await retrieveParts(vehicleId, apiConfig);
            if (allParts.success && allParts.parts && allParts.parts.length > 0) {
              console.log(`[Fallback Confirmation] Fetched ${allParts.parts.length} parts`);
              (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit = allParts.parts;
            }
            
            // Fetch service packages
            if (!alreadyFetchedPackages?.length) {
              const servicePackagesResult = await retrieveServicePackages(vehicleId, apiConfig);
              if (servicePackagesResult.success && servicePackagesResult.packages && servicePackagesResult.packages.length > 0) {
                const displayablePackages = filterDisplayablePackages(servicePackagesResult.packages);
                console.log(`[Fallback Confirmation] Fetched ${displayablePackages.length} service packages`);
                (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit = displayablePackages;
              }
            }
            
            // Store lookup ID for consistency
            (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId = vehicleId;
          }
        }
      }
      
      // ============= SINGLE SOURCE OF TRUTH: Inject Display Context into AI =============
      const displayedPackages = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit || [];
      const displayedParts = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit || [];
      
      if (displayedPackages.length > 0 || displayedParts.length > 0) {
        // ============= CARFIX VALUE TIER SUMMARY (Regression Prevention) =============
        // Generate explicit recommended tier summary to ensure AI quotes correct prices
        // See: .lovable/plan.md - "Layer 4: Fix 3 - Explicit CARFIX VALUE Price"
        const generateRecommendedTierSummary = (packages: any[]): string => {
          const summaries: string[] = [];
          
          for (const pkg of packages) {
            if (pkg.preparedTiers && Array.isArray(pkg.preparedTiers)) {
              // Validate tiers have isRecommended flag
              const hasRecommended = pkg.preparedTiers.some((t: any) => t.isRecommended === true);
              if (!hasRecommended) {
                console.warn(`[VALIDATION] Package ${pkg.id} has no recommended tier!`);
              }
              
              const recommended = pkg.preparedTiers.find((t: any) => t.isRecommended === true);
              if (recommended) {
                summaries.push(
                  `📍 ${pkg.title}: CARFIX VALUE = ${recommended.tierName} tier at $${recommended.totalPrice.toFixed(2)}`
                );
              }
            }
          }
          
          return summaries.length > 0 
            ? `\n\n=== CARFIX VALUE TIERS (SPEAK THESE PRICES) ===\n${summaries.join('\n')}\n===`
            : '';
        };
        
        const carfixValueSummary = generateRecommendedTierSummary(displayedPackages as any[]);
        
        const packageSummary = displayedPackages.length > 0 
          ? `SERVICE PACKAGES (${displayedPackages.length}):\n${(displayedPackages as any[]).map(p => {
              // Include tier breakdown for AI context
              const tierInfo = p.preparedTiers?.filter((t: any) => !t.isHidden)?.map((t: any) => 
                `  - ${t.tierName}: $${t.totalPrice?.toFixed(2) || 'N/A'}${t.isRecommended ? ' (CARFIX VALUE)' : ''}`
              ).join('\n') || '';
              return `- ${p.title}: from $${p.from_price}\n${tierInfo}`;
            }).join('\n')}${carfixValueSummary}`
          : 'No service packages displayed.';
        
        const partsSummary = displayedParts.length > 0 
          ? `PARTS: ${displayedParts.length} individual parts available` 
          : '';
        
        const displayContext = `[CUSTOMER DISPLAY STATE - WHAT THE CUSTOMER SEES RIGHT NOW]
The customer's shelf currently shows:

${packageSummary}
${partsSummary}

IMPORTANT: 
1. Only reference products/packages from this list
2. When recommending a service package, ALWAYS quote the CARFIX VALUE tier price (marked above)
3. DO NOT quote the cheapest (Economy) price - quote the recommended tier price
4. The recommended tier is what appears as "CARFIX VALUE" on the customer's screen`;
        
        conversationMessages.push({
          role: "system",
          content: displayContext
        });
        console.log(`[Display Context] Injected: ${displayedPackages.length} packages, ${displayedParts.length} parts`);
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
      
      // Check data to emit
      const partsToEmit = (conversationMessages as unknown as { _partsToEmit?: unknown[] })._partsToEmit;
      const servicePackagesToEmit = (conversationMessages as unknown as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit;
      const multipleVehiclesFound = (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound;
      const vehicleCandidatesToEmit = (conversationMessages as unknown as { _vehicleCandidatesToEmit?: VehicleCandidate[] })._vehicleCandidatesToEmit;
      const confirmedVehicleStored = (conversationMessages as unknown as { _confirmedVehicle?: unknown })._confirmedVehicle;
      
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformedStream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let accumulatedContent = "";
          let vehicleEmitted = false;
          let partsEmitted = false;
          
          // ============= EMIT SEARCHING EVENTS FIRST =============
          const searchingEventsToEmit = (conversationMessages as unknown as { _searchingEventsToEmit?: Array<{
            type: string;
            search_type: string;
            transcript: string;
            audio_url: string;
            clip_key: string;
          }> })._searchingEventsToEmit;
          
          if (searchingEventsToEmit && searchingEventsToEmit.length > 0) {
            for (const searchEvent of searchingEventsToEmit) {
              const event = `data: ${JSON.stringify(searchEvent)}\n\n`;
              controller.enqueue(encoder.encode(event));
              console.log(`[Stream] Emitted bob_searching: ${searchEvent.search_type}`);
            }
          }
          
          // ============= EMIT VEHICLE CANDIDATES (for client storage) =============
          if (vehicleCandidatesToEmit && vehicleCandidatesToEmit.length > 0 && multipleVehiclesFound) {
            const candidatesEvent = `data: ${JSON.stringify({ 
              type: "vehicle_candidates_found", 
              candidates: vehicleCandidatesToEmit 
            })}\n\n`;
            controller.enqueue(encoder.encode(candidatesEvent));
            console.log(`[Stream] Emitted vehicle_candidates_found: ${vehicleCandidatesToEmit.length} candidates`);
          }
          
          // Emit stored confirmed vehicle FIRST (before parts/packages)
          if (confirmedVehicleStored) {
            const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: confirmedVehicleStored })}\n\n`;
            controller.enqueue(encoder.encode(vehicleEvent));
            console.log("[Stream] Emitted vehicle_identified from stored data");
            vehicleEmitted = true;
          }
          
          // Emit multiple_vehicles_found event if applicable
          if (multipleVehiclesFound && !confirmedVehicleStored) {
            const multipleEvent = `data: ${JSON.stringify({ type: "multiple_vehicles_found" })}\n\n`;
            controller.enqueue(encoder.encode(multipleEvent));
            console.log("[Stream] Emitted multiple_vehicles_found event");
          }
          
          // Track emitted package IDs to prevent duplicates
          const emittedPackageIds = new Set<string>();
          
          // Process service packages
          let packagesToSend = servicePackagesToEmit;
          if (packagesToSend && packagesToSend.length > 0) {
            const packagesWithPrices = packagesToSend.map((pkg: any) => {
              if (!pkg || !pkg.id) return null;
              if (emittedPackageIds.has(pkg.id)) return null;
              
              if (pkg.preparedTiers && Array.isArray(pkg.preparedTiers)) {
                const visibleTiers = pkg.preparedTiers.filter((t: any) => !t.isHidden);
                if (visibleTiers.length > 0) {
                  const minPrice = Math.min(...visibleTiers.map((t: any) => t.totalPrice || 0));
                  if (minPrice > 0) {
                    return {
                      id: pkg.id,
                      title: pkg.title,
                      description: pkg.description,
                      from_price: pkg.from_price || minPrice,
                      estimated_time: pkg.estimated_time,
                      difficulty_level: pkg.difficulty_level,
                      bundle_discount_percentage: pkg.bundle_discount_percentage,
                      icon_url: pkg.icon_url,
                      carfixValueTier: pkg.carfixValueTier,
                      preparedTiers: pkg.preparedTiers
                    };
                  }
                }
              }
              return null;
            }).filter(Boolean);
            
            packagesWithPrices.forEach((pkg: any) => {
              if (pkg?.id) emittedPackageIds.add(pkg.id);
            });
            
            packagesToSend = packagesWithPrices;
          }
          
          // Emit service_packages_found event
          if (packagesToSend && packagesToSend.length > 0) {
            const packagesEvent = `data: ${JSON.stringify({ type: "service_packages_found", packages: packagesToSend })}\n\n`;
            controller.enqueue(encoder.encode(packagesEvent));
            console.log("[Stream] Emitted service_packages_found:", packagesToSend.length, "packages");
          }
          
          // Check for cart items
          const cartItemsToEmit = (conversationMessages as unknown as { _cartItemsToEmit?: Array<{ productName: string; quantity: number }> })._cartItemsToEmit;
          if (cartItemsToEmit && cartItemsToEmit.length > 0) {
            const cartEvent = `data: ${JSON.stringify({ type: "cart_updated", items: cartItemsToEmit })}\n\n`;
            controller.enqueue(encoder.encode(cartEvent));
            console.log("[Stream] Emitted cart_updated:", cartItemsToEmit.length, "items");
          }
          
          // ============= PARTS EMISSION LOGIC =============
          // Check for parts error type
          const partsErrorType = (conversationMessages as unknown as { _partsErrorType?: string })._partsErrorType;
          
          // CRITICAL: Only emit no_parts_found if we actually tried to fetch parts
          // and got nothing - NOT during multi-vehicle selection phase
          if (partsToEmit && partsToEmit.length > 0) {
            const partsEvent = `data: ${JSON.stringify({ type: "parts_found", parts: partsToEmit })}\n\n`;
            controller.enqueue(encoder.encode(partsEvent));
            console.log("[Stream] Emitted parts_found:", partsToEmit.length, "parts");
            partsEmitted = true;
          } else if (!multipleVehiclesFound && confirmedVehicleStored) {
            // Vehicle confirmed but no parts - determine the reason
            if (partsErrorType) {
              // Emit specific error event with context for frontend handling
              const errorEvent = `data: ${JSON.stringify({ 
                type: "parts_fetch_error", 
                errorType: partsErrorType,
                message: partsErrorType === 'vehicle_not_in_parts_db' 
                  ? 'This vehicle is not in the parts catalog yet'
                  : partsErrorType === 'timeout'
                  ? 'Parts lookup timed out - try again'
                  : partsErrorType === 'network_error'
                  ? 'Connection issue - check your internet'
                  : 'Unable to load parts at the moment',
                canRetry: ['timeout', 'network_error', 'server_error'].includes(partsErrorType)
              })}\n\n`;
              controller.enqueue(encoder.encode(errorEvent));
              console.log(`[Stream] Emitted parts_fetch_error: ${partsErrorType}`);
            } else {
              // No error type means parts fetch succeeded but returned empty
              const noPartsEvent = `data: ${JSON.stringify({ 
                type: "no_parts_found",
                reason: "empty_result"
              })}\n\n`;
              controller.enqueue(encoder.encode(noPartsEvent));
              console.log("[Stream] Emitted no_parts_found (confirmed vehicle, 0 parts)");
            }
          } else if (multipleVehiclesFound) {
            // During variant selection - do NOT emit no_parts_found
            console.log("[Stream] Skipping no_parts_found - awaiting variant selection");
          }
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Check for complete vehicle marker at stream end
                if (!vehicleEmitted) {
                  const markerRegex = /\[VEHICLE_CONFIRMED:(\{[\s\S]*?\})\]/;
                  const markerMatch = accumulatedContent.match(markerRegex);
                  if (markerMatch) {
                    try {
                      let vehicleData = JSON.parse(markerMatch[1]);
                      
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
                      console.log("[Stream End] Emitted vehicle_identified (validated)");
                      vehicleEmitted = true;
                    } catch (e) {
                      console.error("Failed to parse vehicle marker at stream end:", e);
                    }
                  }
                }
                
                // Flush remaining buffer
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
                    accumulatedContent += content;
                    
                    // Check for vehicle marker
                    const markerRegex = /\[VEHICLE_CONFIRMED:(\{[\s\S]*?\})\]/;
                    const markerMatch = accumulatedContent.match(markerRegex);
                    
                    if (!vehicleEmitted && markerMatch) {
                      try {
                        let vehicleData = JSON.parse(markerMatch[1]);
                        
                        const storedVehicleId = (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId;
                        const storedVehicleData = (conversationMessages as unknown as { _lookupVehicleData?: Record<string, unknown> })._lookupVehicleData;
                        const preProcessedVehicle = (conversationMessages as unknown as { _confirmedVehicle?: Record<string, unknown> })._confirmedVehicle;
                        
                        if (preProcessedVehicle) {
                          vehicleData = preProcessedVehicle;
                        } else if (storedVehicleId) {
                          const aiVehicleId = vehicleData.vehicle_id || vehicleData.id;
                          if (aiVehicleId !== storedVehicleId) {
                            console.warn(`STREAM HALLUCINATION BLOCKED: AI=${aiVehicleId}, actual=${storedVehicleId}`);
                          }
                          vehicleData.vehicle_id = storedVehicleId;
                          vehicleData.id = storedVehicleId;
                          if (storedVehicleData) {
                            vehicleData.make = storedVehicleData.make || vehicleData.make;
                            vehicleData.model = storedVehicleData.model || vehicleData.model;
                            vehicleData.year = storedVehicleData.year || vehicleData.year;
                            vehicleData.variant = storedVehicleData.variant || vehicleData.variant;
                            vehicleData.rego = storedVehicleData.plate || storedVehicleData.rego || vehicleData.rego;
                          }
                        }
                        
                        const vehicleEvent = `data: ${JSON.stringify({ type: "vehicle_identified", vehicle: vehicleData })}\n\n`;
                        controller.enqueue(encoder.encode(vehicleEvent));
                        console.log("[Stream] Emitted vehicle_identified (validated)");
                        vehicleEmitted = true;
                        
                        accumulatedContent = accumulatedContent.replace(markerMatch[0], "");
                        
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
