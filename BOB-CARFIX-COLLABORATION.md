# Bob × CARFIX — Collaboration Overview

> **Version:** 3.2.3 · **Last updated:** 1 March 2026

---

## 1. What Is Bob

Bob is an AI-powered sales assistant widget embedded on the CARFIX website. He identifies a customer's vehicle (via NZ Rego or manual make/model), recommends service packages and individual parts across quality tiers (Economy → Performance), handles symptom-based diagnosis, and guides users to checkout — all delivered with a friendly Kiwi personality, animated character, and optional voice interaction.

---

## 2. Architecture Overview

```
┌─────────────────────────┐
│   CARFIX Website        │
│   (carfix.co.nz)        │
│                         │
│  ┌───────────────────┐  │
│  │  Bob Widget (NPM) │  │  @gymmymac/bob-widget v3.2.3
│  │  React component   │  │  Embedded via <BobStandalone>
│  └────────┬──────────┘  │
└───────────┼─────────────┘
            │ HTTPS
            ▼
┌─────────────────────────┐
│  Bob Backend             │
│  (Supabase Edge Funcs)   │  bob-chat, bob-tts, bob-analytics, etc.
│                          │
│  Database tables:        │  bob_prompts, bob_animations, bob_settings,
│  bob_tenants, etc.       │  bob_partners, bob_theme_settings, etc.
└────────────┬─────────────┘
             │ HTTPS
             ▼
┌─────────────────────────┐
│  CARFIX Product API      │
│  (flpzjbasdsfwoeruyxgp)  │  retrieve-vehicle-info
│                          │  calculate-service-bundles
└──────────────────────────┘
```

---

## 3. Feature Inventory

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | **Conversational AI** | LLM-powered chat with Kiwi personality & guardrails | ✅ Active |
| 2 | **Vehicle Identification — Rego** | NZ registration plate lookup via CARFIX API | ✅ Active |
| 3 | **Vehicle Identification — Manual** | Make / model / year / engine fallback | ✅ Active |
| 4 | **Service Package Recommendations** | Brake, oil, filter bundles with Economy→Performance tier cards | ✅ Active |
| 5 | **Individual Parts Search** | Single-part lookup by category | ✅ Active |
| 6 | **Symptom-Based Diagnosis ("Brain")** | Guided diagnostic flow from symptoms → likely parts | ✅ Active |
| 7 | **Push-to-Talk (PTT)** | Long-press mic button for voice input via Web Speech API | ✅ Active |
| 8 | **Text-to-Speech — Google TTS** | Bob speaks responses via Google Cloud TTS | ✅ Active |
| 9 | **Text-to-Speech — ElevenLabs** | Premium voice option via ElevenLabs API | ✅ Active |
| 10 | **Early Microphone Permission** | Proactive browser mic prompt on widget load | ✅ Active |
| 11 | **Session Handoff** | Vehicle context passed from main CARFIX site to Bob | ✅ Active |
| 12 | **Returning Customer Recognition** | localStorage-based returning user detection + greeting | ✅ Active |
| 13 | **Spark Deals** | Promotional banners for time-limited offers | ✅ Active |
| 14 | **Cart Integration** | `onAddToCart` callback to host site cart system | ✅ Active |
| 15 | **Checkout** | Stripe checkout URL generation | ✅ Active |
| 16 | **Analytics Tracking** | Event logging (session, vehicle, product, checkout) to database | ✅ Active |
| 17 | **Brand Affinity / Shelf Talker** | Preferred brand talk-tracks per category | ✅ Active |
| 18 | **Promotions Engine** | Time-limited deals with priority & discount config | ✅ Active |
| 19 | **Bundle Discount Pricing** | Server-calculated multi-item pricing (rotors as pairs, spark plugs ×n) | ✅ Active |
| 20 | **Multi-Tenant Support** | Partner-based config (API keys, feature flags, branding) | ✅ Active |
| 21 | **Animated Bob Character** | State-driven sprite animation (idle, thinking, talking, happy, etc.) | ✅ Active |
| 22 | **Swipeable Bob (Mobile)** | Swipe-up to reveal chat, swipe-down to dismiss | ✅ Active |
| 23 | **Health Check** | Runtime self-diagnostic for API connectivity | ✅ Active |

---

## 4. Admin Panel Features

The admin site (`/admin` route) provides the CARFIX team with control over Bob's behaviour without code changes.

| Tab / Section | What It Controls |
|---------------|-----------------|
| **Prompts Manager** | Bob's system prompts — Identity & Tone, Rules & Guardrails, Vehicle ID flow, Sales Flow, Error Handling. Each prompt can be toggled active/inactive. |
| **Animation Gallery** | Upload character sprites, assign to animation states (idle, thinking, talking, happy, etc.), set sequence order. Includes AI Animation Builder for batch analysis. |
| **Looks Manager** | Group animations into "Looks" (outfits/themes) that can be switched. |
| **Backdrop Manager** | Background wall images and counter overlay images with height/opacity controls. |
| **Voice Settings** | TTS provider selection (Google / ElevenLabs), voice name, speed, pitch. |
| **Theme Settings** | Colour palette (HSL), backdrop blur intensity, overlay opacity. |
| **Tenant Manager** | Multi-partner configuration — tenant codes, domains, active status. |
| **Promotions Manager** | Create/edit time-limited promotions with brand/category targeting, discount %, priority, and talk-tracks. |
| **Spark Deals Settings** | Configure promotional banner content and timing. |
| **LLM Model Selector** | Choose AI model provider and model (per tenant). |
| **Audio Clips Manager** | Upload pre-recorded audio clips with trigger contexts (greeting, rego search, etc.) that bypass TTS. |
| **Data Tab** | CSV chunk uploader for bulk data import (OEM crossover data, etc.). |
| **Image Library** | Browse and manage uploaded images across all categories. |

---

## 5. Backend Functions (Edge Functions)

| Function | Purpose |
|----------|---------|
| `bob-chat` | Main conversational AI endpoint — receives message history, returns streamed LLM response |
| `bob-tts` | Google Cloud Text-to-Speech — converts Bob's text responses to audio |
| `bob-tts-elevenlabs` | ElevenLabs TTS — premium voice alternative |
| `bob-analytics` | Receives and stores analytics events (session, vehicle, product, checkout) |
| `spark-deals` | Serves active promotional deal data |
| `session-handoff` | Transfers vehicle context from CARFIX main site to Bob widget |
| `analyze-animation-batch` | AI-powered analysis of uploaded animation frames |
| `admin-auth-diagnostic` | Diagnostic endpoint for admin authentication troubleshooting |

---

## 6. CARFIX API Integration Points

Bob calls two external CARFIX API endpoints (hosted on a separate Supabase project):

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `retrieve-vehicle-info` | POST | Identify vehicle from rego or make/model | `{ "plate": "ABC123" }` or `{ "make", "model", "year", ... }` | `vehicles[]` with numeric `vehicle_id` |
| `calculate-service-bundles` | POST | Get service packages with pre-calculated tier pricing | `{ "vehicleId": 42899 }` | `servicePackages[].preparedTiers[]` — ready-to-render, no client-side transformation |

**Key rule:** Bob consumes `preparedTiers[]` directly. No client-side price calculation, tier deduplication, or image URL construction. The API provides everything ready to render.

---

## 7. Database Tables

| Table | Purpose |
|-------|---------|
| `bob_prompts` | System prompts (per tenant) |
| `bob_animations` | Animation frame images with state assignments |
| `animation_states` | State definitions (idle, thinking, talking, etc.) |
| `bob_looks` | Animation outfit/theme groupings |
| `bob_backdrops` | Background and counter images |
| `bob_settings` | Key-value settings store |
| `bob_theme_settings` | Colour/style configuration |
| `bob_tenants` | Multi-tenant definitions |
| `bob_partners` | Partner integration configs (API keys, feature flags, origins) |
| `bob_promotions` | Time-limited promotional deals |
| `bob_brand_affinity` | Brand preference talk-tracks |
| `bob_audio_clips` | Pre-recorded audio clips |
| `bob_analytics_events` | Analytics event log |
| `bob_error_logs` | Error tracking |
| `bob_api_config` | Per-tenant API endpoint configuration |
| `bob_llm_config` | Per-tenant LLM provider/model config |
| `oem_crossover` | OEM part number cross-reference data |
| `user_roles` | Admin/moderator/user role assignments |

---

## 8. App Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page — CARFIX storefront with embedded Bob widget |
| `/ask-bob` | Standalone full-screen Bob experience |
| `/admin` | Protected admin panel (requires admin role) |

---

## 9. Current Status

- **Widget version:** 3.2.3 (published as `@gymmymac/bob-widget` on NPM)
- **Test coverage:** Unit tests for callbacks, bundle discounts, rear brake filtering, PTT long-press, quick reply + stop speech
- **E2E tests:** Playwright specs for critical flows
- **Known browser considerations:**
  - Safari/iOS may re-prompt for microphone permission per session
  - Chrome/Android remembers mic permission permanently per domain

---

## 10. Widget Integration (for CARFIX developers)

The simplest integration uses `BobStandalone`:

```tsx
import { BobStandalone } from '@gymmymac/bob-widget';

<BobStandalone
  partnerCode="carfix"
  onAddToCart={(item) => addToCart(item)}
  onNavigateToProductPage={(product) => navigate(`/product/${product.sku}`)}
/>
```

Bob auto-configures from the `bob_partners` database table using the `partnerCode`. No manual API keys or Supabase URLs needed in the host code.

### Key Callbacks

| Callback | When It Fires |
|----------|--------------|
| `onVehicleIdentified` | Vehicle confirmed via rego or manual entry |
| `onAddToCart` | User adds a product to cart |
| `onCheckoutRequested` | Checkout URL generated |
| `onNavigateToProductPage` | User clicks product for full details |
| `onAnalyticsEvent` | Every trackable event (for server-side analytics) |
| `onError` | Any error during Bob operation |
