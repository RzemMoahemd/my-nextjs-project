-- Script pour créer un utilisateur admin
-- À exécuter manuellement dans Supabase SQL Editor

-- 1. D'abord, créer un user avec Supabase Auth UI ou via SQL (voir README)
-- 2. Ensuite, récupérer son ID:
SELECT id, email FROM auth.users WHERE email = 'admin@elegance.com';

-- 3. Ensuite, l'ajouter à la table admin_users (remplacer USER_ID par l'ID récupéré):
INSERT INTO admin_users (id, email, role)
VALUES ('USER_ID_HERE', 'admin@elegance.com', 'admin')
ON CONFLICT (id) DO NOTHING;
