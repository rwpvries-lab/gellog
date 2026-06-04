-- Seed missing Dutch flavour words into the flavour_words lookup.
-- Tokens reference src/lib/gelato-tokens.ts (banana-yellow + white-chocolate added there).
-- aardbei/aardbeien are seeded as BASE words so compounds like "aardbeien mango"
-- resolve to a strawberry base + mango drizzle (per agreed verification).

INSERT INTO public.flavour_words
  (word, role, color, layer, default_crumble_color, default_crumble_token, token_name)
VALUES
  ('aardbei',   'base',     '#F9A8D4', 'base',    NULL, NULL, 'strawberry-pink'),
  ('aardbeien', 'base',     '#F9A8D4', 'base',    NULL, NULL, 'strawberry-pink'),
  ('mokka',     'base',     '#5C3A21', 'base',    NULL, NULL, 'coffee-mocha'),
  ('banaan',    'base',     '#F4D35E', 'base',    NULL, NULL, 'banana-yellow'),
  ('witte',     'base',     '#F3E5C0', 'base',    NULL, NULL, 'white-chocolate'),
  ('framboos',  'modifier', '#D9486A', 'drizzle', NULL, NULL, 'raspberry-ripple')
ON CONFLICT (word) DO UPDATE SET
  role                  = EXCLUDED.role,
  color                 = EXCLUDED.color,
  layer                 = EXCLUDED.layer,
  default_crumble_color = EXCLUDED.default_crumble_color,
  default_crumble_token = EXCLUDED.default_crumble_token,
  token_name            = EXCLUDED.token_name;

-- Standalone "banaan"/"banana" resolves via the catalogue (Layer 1) before the
-- compound parser, so retarget the Banana base token off the fuzzy mango-yellow.
UPDATE public.flavours
   SET base_token = 'banana-yellow'
 WHERE slug = 'banana'
   AND base_token = 'mango-yellow';
