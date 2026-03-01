

# Plan: Create CARFIX Collaboration Document

## Purpose
Create a markdown file (`BOB-CARFIX-COLLABORATION.md`) at the project root that gives the CARFIX admin team a clear overview of Bob's features, functionality, integration points, and current status — so they can collaborate effectively without needing to read the codebase.

## Document Structure

The file will cover:

1. **What Is Bob** — One-paragraph summary of Bob as an AI sales assistant widget embedded on the CARFIX website
2. **Architecture Overview** — ASCII diagram showing: CARFIX Website → Bob Widget (NPM package) → Bob Backend (edge functions) → CARFIX Product API
3. **Feature Inventory** — Table of every feature with status (Active / Disabled / In Development):
   - Conversational AI (LLM-powered chat with Kiwi personality)
   - Vehicle identification (NZ Rego lookup + manual make/model)
   - Service package recommendations (brake, oil, filter bundles with tier cards)
   - Individual parts search
   - Symptom-based diagnosis ("Brain" diagnostic flow)
   - Push-to-Talk voice input
   - Text-to-Speech responses (Google TTS + ElevenLabs)
   - Session handoff (vehicle context from main site)
   - Returning customer recognition
   - Spark Deals (promotional banners)
   - Cart integration (onAddToCart callback)
   - Checkout (Stripe URL generation)
   - Analytics tracking
   - Early microphone permission
   - Shelf Talker / brand affinity
   - Promotions engine
   - Bundle discount pricing
4. **Admin Panel Features** — What the admin site controls:
   - Prompts Manager (Bob's system prompts)
   - Animation Gallery (upload, assign to states, AI builder)
   - Backdrop Manager (background/counter images)
   - Voice Settings (TTS voice, speed)
   - Theme Settings (colours, blur, opacity)
   - Tenant Manager (multi-partner config)
   - Promotions Manager (time-limited deals)
   - Spark Deals Settings
   - LLM Model Selector
   - Audio Clips Manager
   - Data tab (CSV upload)
   - Monitor tab (system status)
5. **Backend Functions** — Table of edge functions and their purpose
6. **CARFIX API Integration Points** — Which external CARFIX endpoints Bob calls
7. **Current Version & Status** — v3.2.3, test coverage, known issues
8. **Routes** — The three app routes (/, /ask-bob, /admin) and their purpose

## Implementation
- Single new file: `BOB-CARFIX-COLLABORATION.md` at project root
- No code changes required

