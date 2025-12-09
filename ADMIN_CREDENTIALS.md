# Configuration Administrateur - ELEGANCE

## Étape 1 : Créer un compte administrateur dans Supabase

Pour accéder au back-office admin, vous devez d'abord créer un utilisateur administrateur.

### Créer l'utilisateur dans Supabase Auth :

1. **Allez sur votre tableau de bord Supabase**
   - URL: https://app.supabase.com

2. **Navigez vers Authentication > Users**
   - Cliquez sur "Add user"

3. **Entrez les identifiants d'administration par défaut:**
   \`\`\`
   Email: admin@elegance.com
   Password: Admin123!@#
   \`\`\`

4. **Cliquez sur "Create user"**

5. **Copiez l'ID utilisateur (UUID)** généré

### Étape 2 : Ajouter le rôle admin dans la base de données

Une fois l'utilisateur créé, vous devez le lier à la table `admin_users` :

1. **Allez sur SQL Editor dans Supabase**

2. **Exécutez la requête SQL suivante** (remplacez USER_ID par l'UUID copié) :

\`\`\`sql
INSERT INTO admin_users (id, email, role) 
VALUES ('VOTRE_USER_ID_ICI', 'admin@elegance.com', 'admin')
ON CONFLICT (id) DO NOTHING;
\`\`\`

**Exemple avec un ID réel :**
\`\`\`sql
INSERT INTO admin_users (id, email, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin@elegance.com', 'admin')
ON CONFLICT (id) DO NOTHING;
\`\`\`

## Étape 3 : Accéder au Back-office

1. **Allez sur** `https://votre-site.com/admin`

2. **Vous serez redirigé vers la page de connexion** `/admin/login`

3. **Connectez-vous avec :**
   - Email: `admin@elegance.com`
   - Mot de passe: `Admin123!@#`

4. **Vous accédez au dashboard admin !**

## Fonctionnalités du Back-office

### Dashboard
- Voir le nombre total de produits
- Voir combien de produits sont en stock
- Voir combien de produits sont en rupture

### Gestion des produits
- **Ajouter un produit** : Cliquez sur "Ajouter un produit"
  - Nom, description, prix
  - Catégorie (T-Shirts, Jeans, Hoodies, etc.)
  - Tailles disponibles
  - Upload d'images
  - Statut stock

- **Modifier un produit** : Cliquez sur "Modifier" dans la table
  - Changez tous les détails
  - Mettez à jour les images

- **Supprimer un produit** : Cliquez sur "Supprimer"
  - Le produit disparaît immédiatement du site

## Identifiants de test

**Email:** admin@elegance.com
**Mot de passe:** Admin123!@#

⚠️ **Important :** Changez ces identifiants dans un environnement de production !

## Dépannage

**Q: Je reçois "Accès refusé. Vous n'êtes pas administrateur"**
- Vérifiez que vous avez exécuté la requête SQL pour ajouter le rôle admin

**Q: Je reçois "Email ou mot de passe incorrect"**
- Vérifiez que le compte a été créé dans Supabase Auth
- Assurez-vous que le mot de passe est correct

**Q: Je suis redirigé vers la page de connexion après la connexion**
- Vérifiez que votre ID utilisateur (UUID) est correct dans la requête SQL
