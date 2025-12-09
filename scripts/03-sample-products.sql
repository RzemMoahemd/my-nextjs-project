-- Insérer des produits d'exemple

INSERT INTO products (name, description, price, category, sizes, in_stock) VALUES
(
  'T-Shirt Premium Noir',
  'T-shirt premium en coton 100%, confortable et durable. Coupe classique, lavable en machine.',
  29.99,
  'T-Shirts',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  true
),
(
  'Jean Slim Bleu',
  'Jean slim confortable avec stretch. Coupe parfaite et coloris bleu intemporel.',
  59.99,
  'Jeans',
  ARRAY['32', '34', '36', '38', '40', '42'],
  true
),
(
  'Hoodie Gris',
  'Hoodie en molleton épais, parfait pour les journées froides. Avec poches kangourou.',
  49.99,
  'Hoodies',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  true
),
(
  'Chemise Blanche',
  'Chemise blanche classique en coton, parfaite pour le bureau ou les occasions formelles.',
  44.99,
  'Chemises',
  ARRAY['S', 'M', 'L', 'XL'],
  true
),
(
  'Pantalon Chino Beige',
  'Pantalon chino confortable en coton, idéal pour un style casual-chic.',
  54.99,
  'Pantalons',
  ARRAY['30', '32', '34', '36', '38'],
  true
),
(
  'Veste Noire',
  'Veste noire classique, polyvalente et tendance. Parfaite pour compléter n''importe quelle tenue.',
  89.99,
  'Vestes',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  false
);
