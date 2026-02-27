# DB System Prompt Updates — COMPLETED

All 4 database updates have been applied to the `bob_prompts` table:

| Prompt | Action | Status |
|---|---|---|
| `identity_and_tone` (order 1) | Appended KIWI STYLE slang mapping | ✅ Done |
| `rules_and_guardrails` (order 2) | Appended confidence_tier calibration, ERROR RECOVERY (merged from prompt 5), RETURNING CUSTOMER GREETING RULES | ✅ Done |
| `vehicle_identification` (order 3) | No changes needed | ✅ Unchanged |
| `sales_flow` (order 4) | Appended SHELF TALKER PROTOCOL, PREFERRED BRAND RULES | ✅ Done |
| `error_handling` (order 5) | Deactivated (`is_active = false`) — content merged into prompt 2 | ✅ Done |

Combined with the edge function token optimizations (Steps 1-6), total savings are ~4,000-6,000 tokens per request.
