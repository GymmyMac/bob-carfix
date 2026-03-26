UPDATE bob_prompts 
SET content = REPLACE(
  content,
  E'4. AUDIO DISABLED:\n- DO NOT emit audio_hint events.\n- DO NOT reference playing audio clips. Rely purely on the text stream.\n\n5. CART RULES:',
  E'4. CART RULES:'
),
updated_at = now()
WHERE prompt_key = 'rules_and_guardrails';

-- Also renumber remaining rules
UPDATE bob_prompts
SET content = REPLACE(
  REPLACE(
    REPLACE(content, E'5. CART RULES:', E'4. CART RULES:'),
    E'6. ANTI-HALLUCINATION:', E'5. ANTI-HALLUCINATION:'
  ),
  E'7. TERMINOLOGY:', E'6. TERMINOLOGY:'
),
updated_at = now()
WHERE prompt_key = 'rules_and_guardrails';