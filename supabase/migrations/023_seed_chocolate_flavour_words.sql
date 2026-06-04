-- Chocolate vocabulary: distinguish milk vs dark chocolate.
-- 'dark-chocolate' base token added in src/lib/gelato-tokens.ts.
-- chocolade/chocola -> milk/standard brown; pure/dark -> dark chocolate.
-- The compound parser skips unknown words (e.g. "melk"/"milk"), so
-- "melk chocola(de)" falls through to the chocola(de) brown base, while
-- "pure chocola" is captured by 'pure' winning as the dark base.

INSERT INTO public.flavour_words
  (word, role, color, layer, default_crumble_color, default_crumble_token, token_name)
VALUES
  ('chocolade', 'base', '#6B3E1E', 'base', NULL, NULL, 'chocolate-brown'),
  ('chocola',   'base', '#6B3E1E', 'base', NULL, NULL, 'chocolate-brown'),
  ('pure',      'base', '#3A2218', 'base', NULL, NULL, 'dark-chocolate'),
  ('dark',      'base', '#3A2218', 'base', NULL, NULL, 'dark-chocolate')
ON CONFLICT (word) DO UPDATE SET
  role                  = EXCLUDED.role,
  color                 = EXCLUDED.color,
  layer                 = EXCLUDED.layer,
  default_crumble_color = EXCLUDED.default_crumble_color,
  default_crumble_token = EXCLUDED.default_crumble_token,
  token_name            = EXCLUDED.token_name;

-- "dark chocolate" / "pure chocolade" resolve via the catalogue at Layer 1,
-- which used the same chocolate-brown as milk. Repoint to the dark token so
-- dark chocolate is visually distinct.
UPDATE public.flavours
   SET base_token = 'dark-chocolate'
 WHERE slug = 'cioccolato-fondente'
   AND base_token = 'chocolate-brown';
