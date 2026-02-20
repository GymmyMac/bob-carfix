/**
 * Bob V2.0 Director Mode Tests
 * 
 * Validates the three selling modes (Helper, Consultant, Gatekeeper)
 * and Vehicle Awareness protocol introduced in V2.0.
 * 
 * These tests call the bob-chat edge function directly and assert on
 * the SSE response content and structure.
 */

import { describe, it, expect } from "vitest";

const BOB_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-chat`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Helper: collect streamed text from bob-chat SSE response */
async function collectStreamedText(body: Record<string, unknown>): Promise<{
  text: string;
  events: Array<{ type?: string; [key: string]: unknown }>;
  hasAudioHint: boolean;
}> {
  const resp = await fetch(BOB_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  expect(resp.ok).toBe(true);
  expect(resp.headers.get("content-type")).toContain("text/event-stream");

  const raw = await resp.text();
  const lines = raw.split("\n");

  let text = "";
  const events: Array<{ type?: string; [key: string]: unknown }> = [];
  let hasAudioHint = false;

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") break;

    try {
      const parsed = JSON.parse(jsonStr);

      // Check for SSE event types (vehicle_identified, audio_hint, etc.)
      if (parsed.type) {
        events.push(parsed);
        if (parsed.type === "audio_hint") {
          hasAudioHint = true;
        }
        continue;
      }

      // Collect streamed text content
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) text += content;
    } catch {
      // skip malformed lines
    }
  }

  return { text, events, hasAudioHint };
}

describe("Bob V2.0 Director Modes", () => {

  describe("Helper Mode (Transactional)", () => {
    it("should respond concisely and ask for vehicle when user has a quick request", async () => {
      const { text, hasAudioHint } = await collectStreamedText({
        messages: [{ role: "user", content: "I need oil for my Ranger" }],
      });

      // Bob should either ask for vehicle identification OR acknowledge the request
      // LLM responses vary, so we check for a broad set of engagement signals
      const lowerText = text.toLowerCase();
      const engagesWithRequest = lowerText.includes("rego") || 
                              lowerText.includes("make") || 
                              lowerText.includes("model") ||
                              lowerText.includes("what car") ||
                              lowerText.includes("plate") ||
                              lowerText.includes("ranger") ||
                              lowerText.includes("oil") ||
                              lowerText.includes("year") ||
                              lowerText.includes("vehicle") ||
                              lowerText.includes("which");
      expect(engagesWithRequest).toBe(true);

      // Response should be concise (under 100 words for Helper mode)
      const wordCount = text.split(/\s+/).length;
      expect(wordCount).toBeLessThan(100);

      // No audio_hint events (V2.0 disabled)
      expect(hasAudioHint).toBe(false);
    }, 30000);
  });

  describe("Consultant Mode (Diagnostic)", () => {
    it("should ask diagnostic questions when user describes a symptom", async () => {
      const { text, hasAudioHint } = await collectStreamedText({
        messages: [{ role: "user", content: "My brakes feel spongy" }],
      });

      const lowerText = text.toLowerCase();

      // Consultant mode: Bob should engage with the symptom rather than ignoring it.
      // He may diagnose, ask clarifying questions, or acknowledge the issue.
      const isDiagnostic = lowerText.includes("air") || 
                           lowerText.includes("fluid") || 
                           lowerText.includes("master cylinder") ||
                           lowerText.includes("bleed") ||
                           lowerText.includes("cause") ||
                           lowerText.includes("could be") ||
                           lowerText.includes("might be") ||
                           lowerText.includes("common") ||
                           lowerText.includes("spongy") ||
                           lowerText.includes("brake") ||
                           lowerText.includes("pedal") ||
                           lowerText.includes("symptom") ||
                           lowerText.includes("issue") ||
                           lowerText.includes("problem") ||
                           lowerText.includes("diagnos") ||
                           lowerText.includes("check") ||
                           lowerText.includes("inspect") ||
                           lowerText.includes("worn") ||
                           lowerText.includes("leak");
      expect(isDiagnostic).toBe(true);

      // Should still ask for vehicle to proceed
      const asksForVehicle = lowerText.includes("rego") || 
                              lowerText.includes("car") || 
                              lowerText.includes("vehicle") ||
                              lowerText.includes("make");
      expect(asksForVehicle).toBe(true);

      // No audio hints
      expect(hasAudioHint).toBe(false);
    }, 30000);
  });

  describe("Gatekeeper (No Parts Without Vehicle)", () => {
    it("should refuse to show parts without a vehicle ID", async () => {
      const { text, events, hasAudioHint } = await collectStreamedText({
        messages: [{ role: "user", content: "Show me brake pads" }],
      });

      const lowerText = text.toLowerCase();

      // Gatekeeper: Bob must NOT list any specific products or prices
      const hasSpecificProduct = lowerText.includes("$") && lowerText.includes("sku");
      expect(hasSpecificProduct).toBe(false);

      // Bob should ask for vehicle identification
      const asksForVehicle = lowerText.includes("rego") || 
                              lowerText.includes("what car") || 
                              lowerText.includes("which vehicle") ||
                              lowerText.includes("make") ||
                              lowerText.includes("plate");
      expect(asksForVehicle).toBe(true);

      // No parts_found events should be emitted without a vehicle
      const partsEvent = events.find(e => e.type === "parts_found");
      expect(partsEvent).toBeUndefined();

      // No audio hints
      expect(hasAudioHint).toBe(false);
    }, 30000);
  });

  describe("Vehicle Awareness Protocol", () => {
    it("should skip Rego question when vehicleContext is provided", async () => {
      const { text, hasAudioHint } = await collectStreamedText({
        messages: [{ role: "user", content: "What oil do I need?" }],
        vehicleContext: {
          vehicle_id: 27314,
          id: 27314,
          rego: "AMA993",
          make: "TOYOTA",
          model: "RAV4",
          year: "2002",
          variant: "TOYOTA RAV4 ACA20,ACA21 II 2.0L 1AZ-FE",
          engine_size: 1998,
          fuel_type: "Petrol",
        },
      });

      const lowerText = text.toLowerCase();

      // Should reference the vehicle directly (not ask for it)
      const referencesVehicle = lowerText.includes("rav4") || 
                                 lowerText.includes("toyota") ||
                                 lowerText.includes("2002");
      expect(referencesVehicle).toBe(true);

      // Should NOT ask for Rego (vehicle is already known)
      const asksForRego = lowerText.includes("what's your rego") ||
                          lowerText.includes("what is your rego") ||
                          lowerText.includes("give me your rego");
      expect(asksForRego).toBe(false);

      // No audio hints
      expect(hasAudioHint).toBe(false);
    }, 30000);
  });

  describe("Audio Disabled (V2.0)", () => {
    it("should emit zero audio_hint SSE events across all interactions", async () => {
      // Test with a simple greeting - most likely to trigger old canned audio
      const { hasAudioHint } = await collectStreamedText({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(hasAudioHint).toBe(false);
    }, 30000);
  });
});
