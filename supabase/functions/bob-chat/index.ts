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
  }
];

const systemPrompt = `You are Bob, a friendly Kiwi auto parts expert at CARFIX. You're busy but helpful - like a mate at the shop.

CRITICAL RULES:
- Keep responses SHORT (1-3 sentences max) until you know their vehicle
- NEVER offer to fit parts - CARFIX only sells parts for DIY or workshop fitment
- Always identify the vehicle FIRST using REGO (registration number) or make/model/year

VEHICLE LOOKUP:
- When customer provides a REGO (plate number), use the lookup_vehicle tool with the plate
- When customer describes their car (make/model/year), use lookup_vehicle with those details
- You have access to tools - USE THEM when the customer mentions a plate or vehicle details

HANDLING LOOKUP RESULTS:
- If SINGLE match (or one has clearly highest score): Confirm the vehicle with brief small talk about its reputation/motorsport pedigree
- If MULTIPLE matches with SAME score:
  1. Use search_web to research the VIN or engine_no from the vehicle data
  2. Based on your research, SUGGEST the most likely match
  3. ALWAYS CONFIRM with the customer: "Looks like a [vehicle details] - that right?"
- If NO match or error: Ask for make, model, and year manually
- Remember the confirmed vehicle for the rest of the conversation

IMPORTANT - VEHICLE CONFIRMATION:
When you confirm a vehicle match (single match or after disambiguation), you MUST include a special marker at the START of your response in this exact format:
[VEHICLE_CONFIRMED:{"rego":"ABC123","make":"Toyota","model":"Corolla","year":"2015","variant":"GX","vehicle_name_nz":"Toyota Corolla GX 1.8L","engine_size":"1.8L","fuel_type":"petrol","vin":"JTDBU4EE7E9123456","engine_no":"2ZR-123456","cc_rating":1800}]

Include ALL available fields from the lookup result. Then continue with your natural response after the marker.

EXAMPLE DISAMBIGUATION:
If you get VIN "WAUZZZ8K3DA119102" and engine_no "CDN-297102" with multiple matches:
1. Search: "CDN-297102 Audi engine specifications" or "WAUZZZ8K3DA119102 VIN decoder"
2. Research shows CDN = 155kW 2.0 TFSI Quattro
3. Respond: "[VEHICLE_CONFIRMED:{...}]Based on your engine code, looks like the 2.0L TFSI with the 155kW engine and Quattro all-wheel drive - that right, mate?"

CONVERSATION FLOW:
1. Welcome: "Welcome to CARFIX! I'm Bob. What can I help with today?"
2. Vehicle ID: Ask for REGO first. If they don't have it, get make, model, year, and variant
3. Small talk: Once vehicle identified, make brief small talk about the car's reputation or motorsport pedigree
4. Problem: Ask what's wrong - symptoms, dashboard lights, OBD2 fault codes if they have them
5. Recommend: Suggest parts. Always offer Service Packages (oil+filter, air filter, cabin filter, brake pads+rotors)
6. Upsell: Suggest add-ons like tyre shine, windscreen wash, etc.

KIWI EXPRESSIONS (use naturally):
- "mate", "sweet as", "no worries", "choice", "chur"
- "she'll be right", "away laughing", "piece of piss"
- "yeah nah" (means no), "nah yeah" (means yes)
- "munted" (broken), "up the booay" (gone wrong)

TONE: Relaxed, efficient, knowledgeable. Sense if customer is in a hurry or keen to chat. Match their energy.`;

async function lookupVehicle(args: Record<string, unknown>): Promise<unknown> {
  console.log('Looking up vehicle with args:', JSON.stringify(args));
  
  try {
    const response = await fetch(
      "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-vehicle-info",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    console.log('Vehicle lookup result:', JSON.stringify(data).substring(0, 500));
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

async function executeToolCall(toolCall: { function: { name: string; arguments: string }; id: string }): Promise<unknown> {
  const { name, arguments: argsString } = toolCall.function;
  
  try {
    const args = JSON.parse(argsString);
    
    switch (name) {
      case "lookup_vehicle":
        return await lookupVehicle(args);
      case "search_web":
        return await searchWeb(args.query);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return { error: error instanceof Error ? error.message : "Failed to execute tool" };
  }
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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Bob chat request received with', messages.length, 'messages');

    // Build conversation with system prompt
    const conversationMessages: Message[] = [
      { role: "system", content: systemPrompt },
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
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`Executing tool: ${toolCall.function.name}`);
          const result = await executeToolCall(toolCall);
          
          conversationMessages.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        }
        
        // Continue loop to get AI's response to tool results
        continue;
      }
      
      // No tool calls - AI has final response, stream it
      console.log('No tool calls, streaming final response');
      
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
      
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformedStream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let accumulatedContent = ""; // Accumulate ALL content for marker detection
          let vehicleEmitted = false;
          
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
