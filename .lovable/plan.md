

# Counter-Proposal: GA4 vs Custom Table for Bob Activity Tracking

## Current State of Bob's Analytics

Bob already has a **dual-channel analytics system** built and ready:

1. **GA4 Integration** (`useBobAnalytics` hook) — fires events via `window.gtag()` when a `ga4Config.measurementId` is provided. Events include `bob_session_start`, `bob_message_sent`, `bob_vehicle_identified`, `bob_parts_viewed`, `bob_product_clicked`, `bob_add_to_cart`, `bob_checkout_started`, and more.

2. **Server-side callback** (`onAnalyticsEvent`) — fires the same events to a callback function, which can POST them to the `bob-analytics` edge function → `bob_analytics_events` table.

**Neither channel is currently active on the CARFIX production site.** No GA4 Measurement ID is configured, and the host site isn't wiring up the `onAnalyticsEvent` callback. The `bob_analytics_events` table contains only admin auth diagnostic events — zero conversation data.

---

## Option A: Use GA4 (Counter-Proposal)

### How it works
The CARFIX website adds Google Analytics (gtag.js) and passes the Measurement ID to Bob:

```tsx
<BobStandalone
  ga4Config={{ measurementId: 'G-XXXXXXXXXX' }}
  ...
/>
```

Bob immediately starts firing all 11 event types to GA4. The admin team queries GA4 via:
- **GA4 Dashboard** → Explore → filter by `bob_session_start` or `bob_message_sent`
- **GA4 Data API** (programmatic) → pull counts into their admin dashboard
- **BigQuery Export** (if GA4 is linked) → SQL queries

### What it satisfies
- "How many unique sessions had a Bob interaction in the last 7 days?" — YES, via `bob_session_start` event count
- Session-level grouping — YES, `session_id` is sent as a parameter
- Vehicle identification tracking — YES
- Product views and cart events — YES

### What it does NOT satisfy
- **Real-time count on the admin dashboard** — GA4 has 24-48hr data latency for reports (Realtime view exists but is limited to 30 minutes)
- **Custom SQL queries from the admin site** — the admin team would need GA4 API credentials and a separate integration
- **Upsert/conversation-level aggregation** — GA4 stores raw events, not conversation summaries

### Verdict
GA4 is excellent for marketing analytics and long-term reporting, but it is **not suitable as the data source for a real-time admin dashboard funnel**. The 24-48hr latency and the need for separate GA4 API integration make it a poor fit for "Talking to Bob: X" displayed live.

---

## Option B: Lightweight `bob_conversations` Table (Recommended Hybrid)

### Why both, not either/or
- **Enable GA4** for marketing/attribution analytics (free, zero maintenance)
- **Add `bob_conversations` table** for the admin dashboard's real-time funnel count

### Implementation plan

1. **Create `bob_conversations` table** — as proposed, with upsert-on-session logic. Simplified schema:
   - `id`, `session_id`, `started_at`, `last_message_at`, `message_count`, `channel`, `had_product_match`, `led_to_cart`, `vehicle_id`, `rego`

2. **Create `bob-conversation-track` edge function** — accepts upsert payload from Bob, uses service role to insert/update. One row per conversation, not per message.

3. **Wire into Bob's existing analytics hook** — add a `trackConversationActivity()` method that fires on `bob_message_sent`. This calls the new edge function with the session_id.

4. **Enable GA4 pass-through** — document that the CARFIX host site should pass `ga4Config={{ measurementId: 'G-...' }}` to get full GA4 coverage for free.

### What the admin dashboard gets
```sql
-- Funnel count: sessions talking to Bob in last 7 days
SELECT COUNT(DISTINCT session_id)
FROM bob_conversations
WHERE last_message_at >= now() - interval '7 days';

-- Conversion rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE had_product_match) as matched,
  COUNT(*) FILTER (WHERE led_to_cart) as carted
FROM bob_conversations
WHERE started_at >= now() - interval '7 days';
```

Real-time, queryable directly from the admin site, no GA4 API integration needed.

---

## Recommendation

**Do both.** Enable GA4 for the marketing team (one config line). Build the `bob_conversations` table for the admin dashboard's real-time funnel. They serve different audiences and complement each other perfectly.

### Technical details

- New table: `bob_conversations` with RLS (admin SELECT, service INSERT/UPDATE)
- New edge function: `bob-conversation-track` with upsert logic
- Widget change: fire conversation upsert from existing `trackMessageSent` flow
- No new secrets required — uses existing service role
- GA4: requires CARFIX host to add gtag.js and pass Measurement ID (host-side change, not Bob)

