-- Update active backdrop with counter overlay URL from Supabase Storage
UPDATE bob_backdrops 
SET counter_overlay_url = 'https://gjoguxzstsihhxvdgpto.supabase.co/storage/v1/object/public/bob-images/counter/bob-counter.png',
    updated_at = now()
WHERE id = '26d4c0f8-77dc-491b-9e2c-f476c59fddda';